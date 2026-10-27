import Cocoa
import AVFoundation

/// Real providers and native audio, controlled spoken inputs. No keys or content in output.
@main struct Baseline {
    @MainActor static func main() {
        let application = NSApplication.shared
        application.setActivationPolicy(.accessory)
        Task { @MainActor in
            var server: Process?, input: Pipe?, runtime: LiveCallRuntime?
            let targetTurns = Int(ProcessInfo.processInfo.environment["MIGHTY_BASELINE_TURNS"] ?? "20") ?? 20
            let inputOffset = Int(ProcessInfo.processInfo.environment["MIGHTY_BASELINE_INPUT_OFFSET"] ?? "0") ?? 0
            guard (0...100).contains(inputOffset), (1...100).contains(targetTurns) else { exit(1) }
            var finished = false, completed = 0, submitted = 0, draining = false
            var results: [[String: Any]] = []
            let installed = URL(fileURLWithPath: CommandLine.arguments[1])
            let source = URL(fileURLWithPath: CommandLine.arguments[2])
            let outputRoot = URL(fileURLWithPath: CommandLine.arguments[3])
            func finish(_ ok: Bool, _ stage: String) {
                guard !finished else { return }; finished = true
                runtime?.end(); try? input?.fileHandleForWriting.close(); server?.terminate()
                let summary: [String: Any] = ["completed": completed, "submitted": submitted, "success": ok, "stage": stage, "turns": results,
                    "configuration": ["flags": Dictionary(uniqueKeysWithValues: ["MIGHTY_STREAM_CHAT","MIGHTY_MEMORY_V1","MIGHTY_EXPR_V2","MIGHTY_ENERGY_JAW","MIGHTY_GESTURES_V2","MIGHTY_DEBUG_PERF"].map { ($0,ProcessInfo.processInfo.environment[$0] == "1") }),
                                      "replyModel":"openai/gpt-oss-20b","speechProvider":"edge","inputOffset":inputOffset,"input":"five controlled recorded speech fixtures, cycling","scope":"real STT/reply/Edge and native sample-clock playback; no renderer or acoustic onset"]]
                if let data = try? JSONSerialization.data(withJSONObject: summary, options: [.prettyPrinted, .sortedKeys]) {
                    try? data.write(to: outputRoot.appendingPathComponent("run.json"), options: .atomic)
                }
                print("WP0 baseline: \(completed)/\(targetTurns) completed; \(stage)"); fflush(stdout); exit(ok ? 0 : 1)
            }
            do {
                let store = CredentialStore(agentURL: installed.appendingPathComponent("Contents/Resources/credential-agent"))
                var environment = ProcessInfo.processInfo.environment
                for provider in ["groq", "openai", "anthropic", "gemini"] { environment.removeValue(forKey: provider.uppercased() + "_API_KEY") }
                guard let key = store.read("groq", reload: true) else {
                    finish(false, "saved-groq-key-unavailable-status-\(store.readStatus("groq") ?? 0)"); return
                }
                environment["GROQ_API_KEY"] = key; environment["MIGHTY_AI_PROVIDER"] = "groq"
                environment["MIGHTY_DEBUG_PERF"] = "1"; environment.removeValue(forKey: "MIGHTY_AI_MODEL")
                let process = Process(), outputPipe = Pipe(), stdinPipe = Pipe()
                process.executableURL = installed.appendingPathComponent("Contents/Resources/node")
                process.arguments = [source.appendingPathComponent("Sources/companion-server.cjs").path]
                process.environment = environment; process.standardOutput = outputPipe; process.standardInput = stdinPipe
                // Provider errors are represented by bounded status codes, never response content.
                process.standardError = FileHandle.nullDevice; server = process; input = stdinPipe; try process.run()
                var line = Data()
                while true {
                    let byte = outputPipe.fileHandleForReading.readData(ofLength: 1)
                    guard !byte.isEmpty else { finish(false, "server-start-failed"); return }
                    if byte == Data([10]) { break }; line.append(byte)
                    if line.count > 8192 { finish(false, "invalid-readiness"); return }
                }
                let ready = try JSONSerialization.jsonObject(with: line) as! [String: Any]
                let origin = "http://127.0.0.1:\(ready["port"] as! Int)", token = ready["token"] as! String
                let prompts = ["Hello, how are you today?", "What is your favorite season and why?", "Tell me one small thing that makes you happy.", "Do you prefer the mountains or the beach?", "What would you like to do on a rainy day?"]
                var fixtures: [(samples: [Float], rate: Double)] = []
                for text in prompts {
                    var request = URLRequest(url: URL(string: origin + "/api/tts")!); request.httpMethod = "POST"; request.timeoutInterval = 45
                    request.setValue(token, forHTTPHeaderField: "X-Mighty-Token"); request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    request.httpBody = try JSONSerialization.data(withJSONObject: ["text": text, "profile": ["ttsProvider": "edge", "voice": "en-US-AvaMultilingualNeural"]])
                    let (data, response) = try await URLSession.shared.data(for: request)
                    guard (response as? HTTPURLResponse)?.statusCode == 200,
                          let speech = try JSONSerialization.jsonObject(with: data) as? [String: Any], let audioId = speech["audioId"] as? String else { finish(false, "input-generation-failed"); return }
                    var audioRequest = URLRequest(url: URL(string: origin + "/api/audio/\(audioId).mp3")!); audioRequest.setValue(token, forHTTPHeaderField: "X-Mighty-Token")
                    let (audioData, _) = try await URLSession.shared.data(for: audioRequest)
                    let buffer = try PlaybackEngine.decodeMP3(audioData)
                    fixtures.append((Array(UnsafeBufferPointer(start: buffer.floatChannelData![0], count: Int(buffer.frameLength))), buffer.format.sampleRate))
                }
                let character: [String: Any] = ["id": "wp0-baseline", "name": "Mira", "description": "A warm friend. Answer in one or two short sentences.", "profile": ["aiProvider": "groq", "aiModel": "openai/gpt-oss-20b", "ttsProvider": "edge", "voice": "en-US-AvaMultilingualNeural", "speak": true]]
                let call = try LiveCallRuntime(character: character, origin: origin, token: token, history: [])
                runtime = call
                var transcript = false, reply = false, played = false
                func submitNext() {
                    guard !finished, submitted < targetTurns else { return }
                    let fixture = fixtures[(submitted + inputOffset) % fixtures.count]
                    submitted += 1; transcript = false; reply = false; played = false; draining = false
                    print("WP0: real voice turn \(submitted)/\(targetTurns)"); fflush(stdout)
                    call.submitVoiceFixture(fixture.samples, sampleRate: fixture.rate)
                    let expected = submitted
                    Task { @MainActor in
                        try? await Task.sleep(nanoseconds: 60_000_000_000)
                        if !finished && submitted == expected && completed < expected { finish(false, "turn-timeout") }
                    }
                }
                call.onStatus = { state, label in
                    if state == "error" { finish(false, "runtime-error") }
                    if state == "active" && label == "Hold to talk" && submitted == 0 { submitNext() }
                }
                call.onMessage = { role, message in
                    if role == "user" { transcript = true }; if role == "assistant" { reply = true }
                    if role == "error" {
                        let category = message.contains("empty reply") ? "empty-reply" : message.contains("connection failed") ? "provider-connect-error" : message.contains("interrupted the reply") ? "provider-stream-error" : message.contains("timeout") ? "first-token-timeout" : message.contains("Voice playback") ? "speech-error" : message.contains("failed (") ? "provider-http-error" : "provider-or-playback-error"
                        finish(false, category)
                    }
                }
                call.onPlayback = { event in
                    if event["state"] as? String == "speaking" { played = true }
                    if event["state"] as? String == "ended", !draining, played, transcript, reply {
                        draining = true; completed += 1
                        results.append(["index": completed, "status": "complete", "inputIndex": (completed - 1 + inputOffset) % 5])
                        Task { @MainActor in
                            do {
                                let data = try await call.exportPerformance()
                                try data.write(to: outputRoot.appendingPathComponent("turns.jsonl"), options: .atomic)
                                if completed == targetTurns { finish(true, "complete") }
                                else { try? await Task.sleep(nanoseconds: 150_000_000); submitNext() }
                            } catch { finish(false, "export-failed") }
                        }
                    }
                }
                call.start()
                Task { @MainActor in
                    try? await Task.sleep(nanoseconds: 1_200_000_000_000); finish(false, "series-timeout")
                }
            } catch { finish(false, "setup-failed") }
        }
        application.run()
    }
}
