import Foundation
import AVFoundation

/// One native player and its decoded-sample clock. Network/decode work is off the audio callback.
final class PlaybackEngine: @unchecked Sendable {
    // AVAudioPCMBuffer is filled before this wrapper crosses to the serial playback queue.
    private struct DecodedBuffer: @unchecked Sendable { let value: AVAudioPCMBuffer }
    struct Chunk {
        let identity: CallState.Ticket
        let index: Int
        let audioId: String
        let buffer: AVAudioPCMBuffer
        let leadingTrimSeconds: Double
    }
    struct Snapshot {
        let identity: CallState.Ticket
        let clockEpoch: Int
        let sequence: Int
        let chunkId: String?
        let chunkIndex: Int
        let playedSamplesInChunk: Int64
        let sampleRate: Double
        let state: String
        var energy: Double? = nil
    }
    enum PlaybackError: Error { case badAudioID, downloadFailed, audioTooLarge, unsupportedAudioFormat }

    private let energyEnabled = true
    private let audio: AudioHost
    private let origin: String
    private let token: String
    private let control = DispatchQueue(label: "MightyChat.Playback", qos: .userInitiated)
    private var timer: DispatchSourceTimer?
    private var downloadTasks: [Int: Task<Void, Never>] = [:]
    private var ready: [Int: Chunk] = [:]
    private var scheduled: [(chunk: Chunk, start: Int64, end: Int64)] = []
    private var nextIndex = 0
    private var scheduledSamples: Int64 = 0
    private var generation = -1
    private var clockEpoch = 0
    private var sequence = 0
    private var responseComplete = false
    private var lastTicket: CallState.Ticket?
    private var lastIndex = 0
    var onSnapshot: ((Snapshot) -> Void)?
    var onChunkPrepared: ((Chunk) -> Void)?
    var onChunkPlayed: ((CallState.Ticket, Int) -> Void)?
    var onError: ((Error) -> Void)?

    init(audio: AudioHost, origin: String, token: String) {
        self.audio = audio; self.origin = origin; self.token = token
        let source = DispatchSource.makeTimerSource(queue: control)
        source.schedule(deadline: .now() + .milliseconds(40), repeating: .milliseconds(40))
        source.setEventHandler { [weak self] in self?.emitSnapshot() }
        source.resume(); timer = source
    }
    deinit { timer?.cancel(); for task in downloadTasks.values { task.cancel() } }

    func beginGeneration(_ value: Int) {
        control.async { [self] in
            guard value > generation else { return }
            reset()
            generation = value
        }
    }
    func cancel() { control.async { [self] in reset(); generation += 1 } }
    func markResponseComplete(_ value: Int) { control.async { [self] in if value == generation { responseComplete = true; emitSnapshot() } } }

    func prepare(identity: CallState.Ticket, index: Int, audioId: String) {
        control.async { [self] in
            guard identity.generation == generation, index >= nextIndex, index < nextIndex + 8,
                  UUID(uuidString: audioId) != nil else { onError?(PlaybackError.badAudioID); return }
            lastTicket = identity; lastIndex = index
            let task = Task { [weak self] in
                guard let self else { return }
                do {
                    let decoded = DecodedBuffer(value: try await self.downloadAndDecode(audioId))
                    self.control.async { [weak self] in
                        guard let self else { return }
                        guard self.generation == identity.generation else { return }
                        self.downloadTasks[index] = nil
                        self.acceptDecoded(identity: identity, index: index, audioId: audioId, buffer: decoded.value)
                    }
                } catch {
                    self.control.async { [weak self] in
                        guard let self, self.generation == identity.generation else { return }
                        self.downloadTasks[index] = nil
                        self.onError?(error)
                    }
                }
            }
            downloadTasks[index] = task
        }
    }

    private func acceptDecoded(identity: CallState.Ticket, index: Int, audioId: String, buffer: AVAudioPCMBuffer) {
        guard identity.generation == generation else { return }
        let trimmed = Self.trimSpeechSilence(buffer)
        let chunk = Chunk(identity: identity, index: index, audioId: audioId, buffer: trimmed.0, leadingTrimSeconds: trimmed.1)
        ready[index] = chunk; onChunkPrepared?(chunk); scheduleReady()
    }
    #if MIGHTY_VOICE_TESTING
    func prepareFixture(identity: CallState.Ticket, index: Int = 0, buffer: AVAudioPCMBuffer) {
        let decoded = DecodedBuffer(value: buffer)
        control.async { [self] in
            lastTicket = identity
            acceptDecoded(identity: identity, index: index, audioId: UUID().uuidString, buffer: decoded.value)
        }
    }
    var onQueuedFixture: ((CallState.Ticket, Int, Int64, AVAudioPCMBuffer, Int64) -> Void)?
    #endif

    private func downloadAndDecode(_ audioId: String) async throws -> AVAudioPCMBuffer {
        guard let base = URL(string: origin), let url = URL(string: "/api/audio/\(audioId).mp3", relativeTo: base)?.absoluteURL else { throw PlaybackError.badAudioID }
        var request = URLRequest(url: url)
        request.setValue(token, forHTTPHeaderField: "X-Mighty-Token")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw PlaybackError.downloadFailed }
        guard !data.isEmpty, data.count <= 2 * 1024 * 1024 else { throw PlaybackError.audioTooLarge }
        return try Self.decodeMP3(data)
    }

    static func decodeMP3(_ data: Data) throws -> AVAudioPCMBuffer {
        let suffix = data.prefix(4) == Data("RIFF".utf8) ? "wav" : "mp3"
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent("mighty-decode-\(UUID().uuidString).\(suffix)")
        try data.write(to: fileURL, options: .atomic)
        defer { try? FileManager.default.removeItem(at: fileURL) }
        let file = try AVAudioFile(forReading: fileURL, commonFormat: .pcmFormatFloat32, interleaved: false)
        guard file.processingFormat.sampleRate == 24_000, file.processingFormat.channelCount == 1,
              file.length > 0, file.length < 24_000 * 30 else { throw PlaybackError.unsupportedAudioFormat }
        let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length))!
        try file.read(into: buffer)
        guard buffer.frameLength > 0 else { throw PlaybackError.unsupportedAudioFormat }
        return buffer
    }

    /// Preserve the recorded utterance; remove external codec padding with short breath margins.
    static func trimSpeechSilence(_ buffer: AVAudioPCMBuffer) -> (AVAudioPCMBuffer, Double) {
        guard buffer.format.sampleRate == 24_000, buffer.format.channelCount == 1,
              let samples = buffer.floatChannelData?[0] else { return (buffer, 0) }
        let length = Int(buffer.frameLength), window = 240
        var first: Int?, last = 0
        for start in stride(from: 0, to: length, by: window) {
            let end = min(start + window, length)
            var power: Float = 0
            for i in start..<end { power += samples[i] * samples[i] }
            if power / Float(end-start) > 0.000001 { if first == nil { first = start }; last = end }
        }
        guard let first else { return (buffer, 0) }
        let trim = max(0, first - 480), end = min(length, last + 1440)
        guard trim > 0 || end < length,
              let result = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: AVAudioFrameCount(end-trim)),
              let destination = result.floatChannelData?[0] else { return (buffer, 0) }
        result.frameLength = AVAudioFrameCount(end-trim)
        destination.update(from: samples.advanced(by: trim), count: end-trim)
        return (result, Double(trim) / 24_000)
    }

    /// Trailing 20 ms of decoded samples that have actually passed the player clock.
    /// Runs on the control queue, never on the audio callback; no samples are retained.
    static func energy(_ buffer: AVAudioPCMBuffer, playedSamples: Int64) -> Double {
        guard buffer.format.sampleRate.isFinite, buffer.format.sampleRate > 0,
              let channels = buffer.floatChannelData, buffer.format.channelCount > 0 else { return 0 }
        let end = Int(max(0, min(Int64(buffer.frameLength), playedSamples)))
        let start = max(0, end - Int(buffer.format.sampleRate * 0.02))
        guard end > start else { return 0 }
        var sum = 0.0
        for channel in 0..<Int(buffer.format.channelCount) {
            for index in start..<end { let sample = Double(channels[channel][index]); if sample.isFinite { sum += sample * sample } }
        }
        let rms = sqrt(sum / Double((end - start) * Int(buffer.format.channelCount)))
        return min(1, sqrt(max(0, (rms - 0.008) * 6)))
    }

    private func scheduleReady() {
        while let chunk = ready.removeValue(forKey: nextIndex) {
            let start = scheduledSamples
            let end = start + Int64(chunk.buffer.frameLength)
            let epoch = clockEpoch
            scheduled.append((chunk, start, end))
            scheduledSamples = end
            nextIndex += 1
            do {
                #if MIGHTY_VOICE_TESTING
                onQueuedFixture?(chunk.identity, chunk.index, start, chunk.buffer, audio.playedSamples ?? 0)
                #endif
                try audio.schedulePCM(chunk.buffer) { [weak self] in
                    self?.control.async { [weak self] in self?.finished(chunk, epoch: epoch) }
                }
            } catch { onError?(error); reset(); return }
        }
        emitSnapshot()
    }

    private func finished(_ chunk: Chunk, epoch: Int) {
        guard chunk.identity.generation == generation, epoch == clockEpoch else { return }
        NativeTurnTiming.shared.mark(chunk.identity, "chunk_\(chunk.index)_end")
        onChunkPlayed?(chunk.identity, chunk.index)
        scheduled.removeAll { $0.chunk.index == chunk.index }
        if scheduled.isEmpty {
            audio.stopOutput()
            scheduledSamples = 0
            clockEpoch += 1
            emitSnapshot()
        }
    }

    private func emitSnapshot() {
        guard generation >= 0 else { return }
        let renderedSamples = audio.playedSamples
        let played = max(Int64(0), renderedSamples ?? 0)
        let active = scheduled.first { played >= $0.start && played < $0.end }
        let reference = active?.chunk ?? scheduled.first?.chunk
        guard let identity = reference?.identity ?? lastTicket else { return }
        let fullyDrained = responseComplete && scheduled.isEmpty && ready.isEmpty && downloadTasks.isEmpty
        if active != nil, let renderedSamples, renderedSamples > 0 { NativeTurnTiming.shared.mark(identity, "playback_start") }
        if NativeTurnTiming.shared.enabled, let active, let renderedSamples, renderedSamples > active.start {
            let positionMs = Double(renderedSamples - active.start) / audio.playbackFormat.sampleRate * 1000
            NativeTurnTiming.shared.mark(identity, "chunk_\(active.chunk.index)_start", at: NativeTurnTiming.now() - positionMs)
        }
        if fullyDrained { NativeTurnTiming.shared.mark(identity, "audio_complete") }
        let state = active == nil ? (fullyDrained ? "ended" : "buffering") : "playing"
        let value = Snapshot(identity: identity, clockEpoch: clockEpoch, sequence: sequence,
                             chunkId: active?.chunk.audioId, chunkIndex: active?.chunk.index ?? reference?.index ?? lastIndex,
                             playedSamplesInChunk: active.map { played - $0.start } ?? 0,
                             sampleRate: audio.playbackFormat.sampleRate, state: state,
                             energy: energyEnabled ? active.map { Self.energy($0.chunk.buffer, playedSamples: played - $0.start) } ?? 0 : nil)
        sequence += 1
        onSnapshot?(value)
    }

    private func reset() {
        if let identity = lastTicket {
            onSnapshot?(Snapshot(identity: identity, clockEpoch: clockEpoch, sequence: sequence,
                                 chunkId: nil, chunkIndex: lastIndex, playedSamplesInChunk: 0,
                                 sampleRate: audio.playbackFormat.sampleRate, state: "cancelled", energy: energyEnabled ? 0 : nil))
        }
        for task in downloadTasks.values { task.cancel() }
        downloadTasks.removeAll(); ready.removeAll(); scheduled.removeAll()
        audio.stopOutput()
        nextIndex = 0; scheduledSamples = 0; responseComplete = false; lastTicket = nil; lastIndex = 0
        clockEpoch += 1; sequence += 1
    }
}

/// Native monotonic stamps are translated by a measured clock offset before export.
final class NativeTurnTiming: @unchecked Sendable {
    static let shared = NativeTurnTiming()
    let enabled = ProcessInfo.processInfo.environment["MIGHTY_DEBUG_PERF"] == "1"
    private let lock = NSLock()
    private var rows: [CallState.Ticket: [String: Double]] = [:]
    private var order: [CallState.Ticket] = []
    static func now() -> Double { ProcessInfo.processInfo.systemUptime * 1000 }
    func mark(_ identity: CallState.Ticket, _ name: String, at timestamp: Double? = nil) {
        guard enabled else { return }
        let chunkStamp = name.range(of: "^chunk_([0-9]|[1-5][0-9]|6[0-3])_(start|end)$", options: .regularExpression) != nil
        guard ["input_begin", "input_commit", "playback_start", "audio_complete"].contains(name) || chunkStamp else { return }
        lock.lock(); defer { lock.unlock() }
        if rows[identity] == nil {
            rows[identity] = [:]; order.append(identity)
            if order.count > 128 { rows.removeValue(forKey: order.removeFirst()) }
        }
        if rows[identity]?[name] == nil { rows[identity]?[name] = timestamp ?? Self.now() }
    }
    func timestamps(_ identity: CallState.Ticket) -> [String: Double] {
        lock.lock(); defer { lock.unlock() }; return rows[identity] ?? [:]
    }
    func deltas(_ identity: CallState.Ticket) -> [String: Double] {
        let marks = timestamps(identity)
        guard let start = marks["input_commit"] else { return [:] }
        return marks.mapValues { $0 - start }
    }
}
