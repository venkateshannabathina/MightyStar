import Foundation

/// Owns one call. UI and provider callbacks enter on main; audio and transport keep their own queues.
/// Hold-to-talk is the release-safe input mode until a validated VAD and echo path are available.
final class LiveCallRuntime {
    private let energyEnabled = true
    private let gesturesEnabled = ProcessInfo.processInfo.environment["MIGHTY_GESTURES_V2"] == "1"
    private let exprEnabled = true
    private let streamEnabled = ProcessInfo.processInfo.environment["MIGHTY_STREAM_CHAT"] == "1"
    private var sentenceEvents: [[String: Any]] = []
    private var faceExpression: [String:Any] = ["mood":"neutral", "intensity":0]
    private let memoryEnabled = ProcessInfo.processInfo.environment["MIGHTY_MEMORY_V1"] != "0"
    private let sessionId = UUID().uuidString
    private let character: [String: Any]
    private let characterId: String
    private let origin: String
    private let token: String
    private let audio: AudioHost
    private let endpoint = EndpointController(mode: .holdToTalk)
    private let inputLevelMeter = InputLevelMeter()
    private let backend = BackendConnection()
    private lazy var playback = PlaybackEngine(audio: audio, origin: origin, token: token)
    private lazy var coordinator = CallSessionCoordinator(queue: .main, ports: .init(
        stopOutput: { [weak self] in self?.audio.stopOutput(); self?.playback.cancel() },
        cancelOldGeneration: { [weak self] in self?.sendGenerationAdvance() },
        resetAvatar: { [weak self] in self?.resetAvatar() },
        closeSession: { [weak self] in self?.backend.close() },
        discardInput: { [weak self] in self?.endpoint.discard() },
        resetInput: { [weak self] in self?.endpoint.discard() }))
    private var generation = 0
    private var turnId = "session"
    private var active = false
    private var pendingCommitAt: Double?
    private var pendingHold = false
    private var ending = false
    private var history: [[String: String]]
    private var chunks: [Int: [String: Any]] = [:]
    private var visibleChunk = -1
    private var speechSequence = 0
    private var responseText = ""
    private var displayedText = ""
    private var perfClock: (offset: Double, uncertainty: Double)?
    private var perfUploads: [Task<Void, Never>] = []
    private var perfPublished: [String: Int] = [:]
    private var startTask: Task<Void, Never>?
    var onStatus: ((String, String) -> Void)?
    var onMessage: ((String, String) -> Void)?
    var onPhase: (([String: Any]) -> Void)?
    var onTurnMeta: (([String: Any]) -> Void)?
    var onPerformance: (([String: Any]) -> Void)?
    var onPlayback: (([String: Any]) -> Void)?
    var onInputLevel: ((Double) -> Void)?

    init(character: [String: Any], origin: String, token: String, history: [[String: String]]) throws {
        guard let id = character["id"] as? String, !id.isEmpty else { throw RuntimeError.invalidCharacter }
        self.character = character; characterId = id; self.origin = origin; self.token = token
        self.history = history.filter { ["user", "assistant"].contains($0["role"] ?? "") && !($0["content"] ?? "").isEmpty }.suffix(16).map { $0 }
        audio = try AudioHost()
        audio.setOutputMuted((character["profile"] as? [String:Any])?["speak"] as? Bool == false)
        wire()
    }

    enum RuntimeError: Error { case invalidCharacter }

    private func identity() -> [String: Any] {
        ["sessionId": sessionId, "characterId": characterId, "generation": generation, "turnId": turnId]
    }
    private func ticket() -> CallState.Ticket {
        .init(sessionId: sessionId, characterId: characterId, generation: generation, turnId: turnId)
    }
    private func wire() {
        coordinator.onState = { [weak self] state in
            guard let self, !self.ending else { return }
            let label: String
            switch state.lifecycle {
            case .connecting: label = "Connecting…"
            case .reconnecting: label = "Connection lost"
            case .failed: label = "Call failed"
            case .idle: label = "Call ended"
            case .ending: label = "Ending…"
            case .active:
                if state.input == .speaking { label = "Listening…" }
                else if state.input == .finalizing { label = "Replying…" }
                else if state.output == .playing { label = "Speaking…" }
                else if state.output == .generating || state.output == .buffering { label = "Replying…" }
                else { label = "Hold to talk" }
            }
            self.onStatus?(state.lifecycle == .active ? "active" : "connecting", label)
        }
        endpoint.onSpeechStart = { [weak self] in DispatchQueue.main.async { self?.speechStarted() } }
        endpoint.onSpeechEnd = { [weak self] in
            let stamp = NativeTurnTiming.shared.enabled ? NativeTurnTiming.now() : nil
            DispatchQueue.main.async {
                if self?.pendingCommitAt == nil { self?.pendingCommitAt = stamp }
                self?.coordinator.submit(.userSpeechEnded)
                self?.faceEvent("input.commit", phase: "thinking")
            }
        }
        endpoint.onUtterance = { [weak self] data, rate in DispatchQueue.main.async { self?.commit(data, rate: rate) } }
        endpoint.onDiscardedUtterance = { [weak self] in DispatchQueue.main.async { self?.coordinator.submit(.discardUserInput); self?.faceEvent("cancel") } }
        audio.onCapture = { [weak self] samples, rate in
            guard let self else { return }
            self.endpoint.ingest(samples, sampleRate: rate)
            guard let reading = self.inputLevelMeter.ingest(samples) else { return }
            DispatchQueue.main.async { [weak self] in
                guard let self, self.active, self.pendingHold, !self.ending,
                      self.inputLevelMeter.isCurrent(reading) else { return }
                self.onInputLevel?(reading.level)
            }
        }
        audio.onRouteChange = { [weak self] in
            guard let self, self.active, !self.ending else { return }
            self.coordinator.submit(.audioRouteChanged)
        }
        audio.onOutputFailure = { [weak self] error in self?.fail(error.localizedDescription) }
        backend.onEvent = { [weak self] event in DispatchQueue.main.async { self?.receive(event) } }
        backend.onFailure = { [weak self] error in DispatchQueue.main.async { self?.fail(error.localizedDescription) } }
        playback.onError = { [weak self] error in DispatchQueue.main.async { self?.fail(error.localizedDescription) } }
        playback.onSnapshot = { [weak self] snapshot in DispatchQueue.main.async { self?.playbackSnapshot(snapshot) } }
        playback.onChunkPlayed = { [weak self] ticket, index in DispatchQueue.main.async { self?.chunkPlayed(ticket, index: index) } }
        playback.onChunkPrepared = { [weak self] chunk in
            DispatchQueue.main.async {
                guard let self, chunk.identity == self.ticket(),
                      var value = self.chunks[chunk.index] else { return }
                let duration = Double(chunk.buffer.frameLength) / chunk.buffer.format.sampleRate
                for key in ["words", "mouthCues"] {
                    if let cues = value[key] as? [[String: Any]] {
                        value[key] = cues.map { cue in
                            var shifted = cue
                            for field in ["start", "end"] {
                                if let time = cue[field] as? Double { shifted[field] = min(duration, max(0, time - chunk.leadingTrimSeconds)) }
                            }
                            return shifted
                        }
                    }
                }
                value["durationSeconds"] = duration
                if let time = value["lastWordEndSeconds"] as? Double { value["lastWordEndSeconds"] = min(duration, max(0, time - chunk.leadingTrimSeconds)) }
                self.chunks[chunk.index] = value
            }
        }

    }

    private func faceEvent(_ type: String, phase: String = "") {
        guard exprEnabled || gesturesEnabled else { return }
        var value: [String: Any] = ["type": type, "characterId": characterId, "identity": identity(), "expression":faceExpression]
        if NativeTurnTiming.shared.enabled { value["debugPerf"] = ["identity": identity(), "phase": phase] }
        onPhase?(value)
    }
    func start() {
        guard !ending else { return }
        coordinator.submit(.start(sessionId: sessionId, characterId: characterId))
        onStatus?("connecting", "Starting microphone…")
        startTask = Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                #if MIGHTY_VOICE_TESTING
                if ProcessInfo.processInfo.environment["MIGHTY_OUTPUT_ONLY_FIXTURE"] == "1" { try audio.startOutputFixture() }
                else { try await audio.start() }
                #else
                try await audio.start()
                #endif
                guard !ending else { audio.stop(); return }
                await syncPerfClock()
                guard !ending else { return }
                playback.beginGeneration(0)
                backend.connect(origin: origin, token: token, identity: identity(), character: character)
            } catch { fail(error.localizedDescription) }
        }
    }
    #if MIGHTY_VOICE_TESTING
    // Test-only input fixture: uses the real hold endpoint, transcription, reply,
    // speech generation, decoder, native player, and playback acknowledgements.
    func submitVoiceFixture(_ samples: [Float], sampleRate: Double) {
        audio.onCapture = nil
        let captureRate = audio.sampleRate > 0 ? audio.sampleRate : sampleRate
        let scale = captureRate / sampleRate
        let converted = (0..<Int(Double(samples.count) * scale)).map { index -> Float in
            let position = Double(index) / scale
            let lower = min(samples.count - 1, Int(position))
            let upper = min(samples.count - 1, lower + 1)
            return samples[lower] + (samples[upper] - samples[lower]) * Float(position - Double(lower))
        }
        beginHold()
        endpoint.ingest(converted, sampleRate: captureRate)
        endHold()
    }
    #endif
    func setOutputMuted(_ muted: Bool) { audio.setOutputMuted(muted) }
    func setOutputVolume(_ volume: Double) { audio.setOutputVolume(volume) }
    func beginHold() {
        guard !ending else { return }
        pendingCommitAt = nil
        pendingHold = true
        if active { inputLevelMeter.setHeld(true); endpoint.beginHold() }
    }
    func endHold() {
        if NativeTurnTiming.shared.enabled && pendingHold { pendingCommitAt = NativeTurnTiming.now() }
        pendingHold = false
        inputLevelMeter.setHeld(false)
        onInputLevel?(0)
        guard active, !ending else { return }
        endpoint.endHold()
    }
    func sendText(_ raw: String) {
        let text = String(raw.trimmingCharacters(in: .whitespacesAndNewlines).prefix(5000))
        guard active, !ending, !text.isEmpty, coordinator.snapshot().input != .speaking else { return }
        speechStarted()
        coordinator.submit(.userSpeechEnded)
        coordinator.submit(.commitUser(turnId: turnId, generation: generation))
        NativeTurnTiming.shared.mark(ticket(), "input_commit")
        faceEvent("text.submit", phase: "thinking")
        publishPerf()
        backend.send(type: "turn.text", identity: identity(), fields: memoryEnabled ? ["characterId": characterId, "userMessage": text, "clientTurnId": turnId] : ["text": text, "history": history])
        history.append(["role": "user", "content": text]); trimHistory()
        onMessage?("user", text)
    }
    func end() { shutdown(reportIdle: true) }
    private func shutdown(reportIdle: Bool) {
        guard !ending else { return }
        faceEvent("cancel")
        ending = true; active = false; pendingHold = false
        inputLevelMeter.setHeld(false)
        onInputLevel?(0)
        startTask?.cancel(); startTask = nil
        endpoint.discard()
        coordinator.submit(.end)
        backend.send(type: "session.close", identity: identity())
        audio.stop()
        resetAvatar()
        if reportIdle { onStatus?("idle", "Call ended") }
    }
    private func fail(_ detail: String) {
        guard !ending else { return }
        faceEvent("error")
        NSLog("Live call failed: %@", detail)
        onStatus?("error", detail)
        onMessage?("error", detail)
        shutdown(reportIdle: false)
    }
    private func sendGenerationAdvance() {
        guard !ending else { return }
        generation += 1
        turnId = "pending"
        chunks.removeAll(); visibleChunk = -1
        responseText = ""; displayedText = ""; sentenceEvents = []
        playback.beginGeneration(generation)
        backend.send(type: "generation.advance", identity: identity())
    }
    private func speechStarted() {
        guard active, !ending else { return }
        coordinator.submit(.userSpeechConfirmed)
        _ = coordinator.snapshot() // barrier: local stop and generation advance finish before input commit
        turnId = UUID().uuidString
        NativeTurnTiming.shared.mark(ticket(), "input_begin")
        faceEvent("input.begin", phase: "listening")
        if NativeTurnTiming.shared.enabled { onPerformance?(["debugPerf": ["identity": identity(), "phase": "listening"]]) }
        onStatus?("active", "Listening…")
    }
    private func commit(_ data: Data, rate: Int) {
        guard active, !ending, data.count >= 2 else { return }
        coordinator.submit(.commitUser(turnId: turnId, generation: generation))
        NativeTurnTiming.shared.mark(ticket(), "input_commit", at: pendingCommitAt)
        pendingCommitAt = nil
        faceEvent("input.commit", phase: "thinking")
        publishPerf()
        var fields: [String: Any] = ["format": "pcm16le", "sampleRate": rate, "totalBytes": data.count, "history": memoryEnabled ? [] : history]
        if memoryEnabled { fields["clientTurnId"] = turnId; fields["characterId"] = characterId }
        backend.send(type: "input.begin", identity: identity(), fields: fields)
        for offset in stride(from: 0, to: data.count, by: 32_768) {
            backend.sendAudio(data.subdata(in: offset..<min(offset + 32_768, data.count)))
        }
        backend.send(type: "input.commit", identity: identity())
        onStatus?("active", "Replying…")
    }
    private func receive(_ event: [String: Any]) {
        guard !ending, let type = event["type"] as? String,
              let id = event["identity"] as? [String: Any],
              id["sessionId"] as? String == sessionId,
              id["characterId"] as? String == characterId else { return }
        if type == "session.ready" {
            active = true
            coordinator.submit(.connected(sessionId: sessionId))
            onStatus?("active", "Hold to talk")
            if pendingHold { inputLevelMeter.setHeld(true); endpoint.beginHold() }
            return
        }
        guard id["generation"] as? Int == generation else { return }
        if type != "generation.accepted", id["turnId"] as? String != turnId { return }
        switch type {
        case "transcript.final":
            faceEvent("transcript.final", phase: "thinking")
            guard let text = event["text"] as? String, !text.isEmpty else { return }
            history.append(["role": "user", "content": text]); trimHistory()
            onMessage?("user", text)
        case "transcript.empty":
            faceEvent("cancel")
            coordinator.submit(.speechEnded(ticket()))
            onStatus?("active", "Hold to talk")
        case "speech.chunk.ready":
            guard let index = event["index"] as? Int, let audioId = event["audioId"] as? String else { return }
            if let expression = event["expression"] as? [String:Any] { faceExpression = expression }
            chunks[index] = event
            coordinator.submit(.speechBuffered(ticket()))
            playback.prepare(identity: ticket(), index: index, audioId: audioId)
        case "speech.audio.complete":
            if chunks.isEmpty { faceEvent("audio.complete"); coordinator.submit(.speechEnded(ticket())) }
            else { playback.markResponseComplete(generation) }
        case "sentence.start":
            if streamEnabled {
                var item: [String: Any] = [:]
                for key in ["index", "e", "i", "g", "p"] { item[key] = event[key] }
                sentenceEvents.append(item)
            }
        case "assistant.delta":
            responseText += event["text"] as? String ?? ""
        case "response.complete":
            if let expression = event["expression"] as? [String:Any] { faceExpression = expression }
            faceEvent("response.complete")
            responseText = event["text"] as? String ?? responseText
            publishReply()
        case "response.error":
            faceEvent("error")
            if event["stage"] as? String != "speech" { publishReply() }
            onMessage?("error", event["error"] as? String ?? "Call response failed. Hold Fn to try again.")
            if event["stage"] as? String != "speech" {
                coordinator.submit(.speechEnded(ticket()))
                onStatus?("active", "Hold to talk")
            }
        default: break
        }
    }
    private func playbackSnapshot(_ snapshot: PlaybackEngine.Snapshot) {
        guard active, !ending, snapshot.identity == ticket() else { return }
        if snapshot.state == "playing", snapshot.chunkIndex != visibleChunk, let chunk = chunks[snapshot.chunkIndex] {
            visibleChunk = snapshot.chunkIndex
            var performance: [String: Any] = [
                "version": 1, "utteranceId": chunk["audioId"] ?? "", "characterId": characterId,
                "appearanceKey": (character["appearance"] as? [String: Any])?["key"] ?? "",
                "text": chunk["text"] ?? "", "words": chunk["words"] ?? [],
                "durationSeconds": chunk["durationSeconds"] ?? 0, "quality": chunk["quality"] ?? "audio-only",
                "mouthCues": chunk["mouthCues"] ?? [], "expression": chunk["expression"] ?? faceExpression
            ]
            if energyEnabled, snapshot.energy != nil, (chunk["mouthCues"] as? [[String:Any]] ?? []).isEmpty { performance["quality"] = "energy-envelope" }
            if exprEnabled || gesturesEnabled { performance["identity"] = identity(); performance["sentenceCues"] = chunk["sentenceCues"] ?? [] }
            if NativeTurnTiming.shared.enabled { performance["debugPerf"] = ["identity": identity(), "phase": "speaking"] }
            onPerformance?(performance)
            coordinator.submit(.speechStarted(ticket()))
        }
        publishPerf()
        guard visibleChunk >= 0, let visible = chunks[visibleChunk], let utteranceId = visible["audioId"] as? String else { return }
        speechSequence += 1
        var fields: [String: Any] = ["utteranceId": utteranceId, "characterId": characterId, "sequence": speechSequence,
                     "positionSeconds": Double(snapshot.playedSamplesInChunk) / snapshot.sampleRate,
                     "playbackRate": 1, "state": snapshot.state == "playing" ? "speaking" : snapshot.state == "buffering" ? "paused" : snapshot.state]
        if NativeTurnTiming.shared.enabled { fields["debugPerf"] = NativeTurnTiming.shared.deltas(ticket()) }
        if let energy = snapshot.energy { fields["energy"] = energy }
        onPlayback?(fields)
        if snapshot.state == "ended" { faceEvent("audio.complete"); coordinator.submit(.speechEnded(ticket())) }
    }
    private func perfRequest(_ path: String, body: [String: Any]) -> URLRequest? {
        guard let url = URL(string: origin + path), let data = try? JSONSerialization.data(withJSONObject: body) else { return nil }
        var request = URLRequest(url: url); request.httpMethod = "POST"; request.timeoutInterval = 5
        request.setValue(token, forHTTPHeaderField: "X-Mighty-Token")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = data
        return request
    }
    private func syncPerfClock() async {
        guard NativeTurnTiming.shared.enabled else { return }
        // Four timestamps, five probes. Lowest round-trip bound wins; no wall clocks.
        for _ in 0..<5 {
            guard let request = perfRequest("/api/debug/perf/clock", body: [:]) else { return }
            let sent = NativeTurnTiming.now()
            guard let (data, response) = try? await URLSession.shared.data(for: request) else { continue }
            let received = NativeTurnTiming.now()
            guard (response as? HTTPURLResponse)?.statusCode == 200,
                  let value = try? JSONSerialization.jsonObject(with: data) as? [String: Double],
                  let b1 = value["receivedMs"], let b2 = value["sentMs"] else { continue }
            let uncertainty = max(0, ((received - sent) - (b2 - b1)) / 2)
            if uncertainty <= 1000 && (perfClock == nil || uncertainty < perfClock!.uncertainty) {
                perfClock = ((b1 - sent + b2 - received) / 2, uncertainty)
            }
        }
    }
    private func publishPerf() {
        guard NativeTurnTiming.shared.enabled, let clock = perfClock else { return }
        let stamps = NativeTurnTiming.shared.timestamps(ticket())
        let key = "\(sessionId):\(generation):\(turnId)"
        guard !stamps.isEmpty, stamps.count > (perfPublished[key] ?? 0) else { return }
        if perfPublished.count > 128 { perfPublished.removeAll() }
        perfPublished[key] = stamps.count
        guard let request = perfRequest("/api/debug/perf/sample", body: ["identity": identity(), "source": "native",
             "timestamps": stamps, "offsetMs": clock.offset, "uncertaintyMs": clock.uncertainty]) else { return }
        if perfUploads.count > 128 { perfUploads.removeAll() }
        perfUploads.append(Task { _ = try? await URLSession.shared.data(for: request) })
    }
    func exportPerformance() async throws -> Data {
        for task in perfUploads { await task.value }
        guard NativeTurnTiming.shared.enabled, let url = URL(string: origin + "/api/debug/perf/export") else { throw RuntimeError.invalidCharacter }
        var request = URLRequest(url: url); request.setValue(token, forHTTPHeaderField: "X-Mighty-Token")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw RuntimeError.invalidCharacter }
        return data
    }
    private func chunkPlayed(_ playedTicket: CallState.Ticket, index: Int) {
        guard active, !ending, playedTicket == ticket(), chunks[index] != nil else { return }
        backend.send(type: "playback.progress", identity: identity(), fields: ["chunkIndex": index])
    }
    private func publishReply() {
        guard !responseText.isEmpty, displayedText.isEmpty else { return }
        displayedText = responseText
        history.append(["role": "assistant", "content": responseText]); trimHistory()
        onMessage?("assistant", responseText)
        if streamEnabled { onTurnMeta?(["characterId": characterId, "turnId": turnId, "sentenceEvents": sentenceEvents]) }
    }
    private func trimHistory() { if history.count > 16 { history.removeFirst(history.count - 16) } }
    private func resetAvatar() {
        guard visibleChunk >= 0, let audioId = chunks[visibleChunk]?["audioId"] as? String else { return }
        speechSequence += 1
        onPlayback?(["utteranceId": audioId, "characterId": characterId, "sequence": speechSequence,
                     "positionSeconds": 0, "playbackRate": 1, "state": "cancelled"])
        visibleChunk = -1
    }
}
