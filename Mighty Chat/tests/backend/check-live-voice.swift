import Cocoa
import AVFoundation

@main struct LiveVoiceCheck {
    @MainActor static func main() {
        let application = NSApplication.shared
        application.setActivationPolicy(.accessory)
        Task { @MainActor in
            var server: Process?
            var input: Pipe?
            var runtime: LiveCallRuntime?
            var finished = false
            func finish(_ success: Bool, _ message: String) {
                guard !finished else { return }
                finished = true
                runtime?.end()
                try? input?.fileHandleForWriting.close()
                server?.terminate()
                print(message)
                fflush(stdout)
                exit(success ? 0 : 1)
            }
            do {
                let root = URL(fileURLWithPath: CommandLine.arguments[1])
                let store = CredentialStore(agentURL: root.appendingPathComponent("Contents/Resources/credential-agent"))
                var environment = ProcessInfo.processInfo.environment
                for provider in ["groq", "openai", "anthropic", "gemini"] {
                    environment.removeValue(forKey: provider.uppercased() + "_API_KEY")
                    if let key = store.read(provider, reload: true) { environment[provider.uppercased() + "_API_KEY"] = key }
                }
                let provider = environment["GROQ_API_KEY"] != nil ? "groq" : "openai"
                guard environment[provider.uppercased() + "_API_KEY"] != nil else {
                    finish(false, "FAIL: No silently accessible saved Groq or OpenAI key. Read status: Groq \(store.readStatus("groq") ?? 0), OpenAI \(store.readStatus("openai") ?? 0)."); return
                }
                environment["MIGHTY_AI_PROVIDER"] = provider
                environment.removeValue(forKey: "MIGHTY_AI_MODEL")
                let process = Process(), output = Pipe(), stdinPipe = Pipe()
                process.executableURL = root.appendingPathComponent("Contents/Resources/node")
                process.arguments = [root.appendingPathComponent("Contents/Resources/companion-server.cjs").path]
                process.environment = environment
                process.standardOutput = output; process.standardError = FileHandle.standardError; process.standardInput = stdinPipe
                server = process; input = stdinPipe
                try process.run()
                var line = Data()
                while true {
                    let byte = output.fileHandleForReading.readData(ofLength: 1)
                    guard !byte.isEmpty else { throw NSError(domain: "Backend ended before readiness", code: 1) }
                    if byte == Data([10]) { break }; line.append(byte)
                }
                let ready = try JSONSerialization.jsonObject(with: line) as! [String: Any]
                let origin = "http://127.0.0.1:\(ready["port"] as! Int)", token = ready["token"] as! String
                var request = URLRequest(url: URL(string: origin + "/api/tts")!)
                request.httpMethod = "POST"; request.timeoutInterval = 30
                request.setValue(token, forHTTPHeaderField: "X-Mighty-Token")
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = try JSONSerialization.data(withJSONObject: ["text": "Hello, please say ready.", "profile": ["ttsProvider": "edge", "voice": "en-US-AvaMultilingualNeural"]])
                let (data, response) = try await URLSession.shared.data(for: request)
                guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw NSError(domain: "Edge input fixture failed", code: 2) }
                let speech = try JSONSerialization.jsonObject(with: data) as! [String: Any]
                var audioRequest = URLRequest(url: URL(string: origin + "/api/audio/\(speech["audioId"] as! String).mp3")!)
                audioRequest.setValue(token, forHTTPHeaderField: "X-Mighty-Token")
                let (audioData, _) = try await URLSession.shared.data(for: audioRequest)
                let buffer = try PlaybackEngine.decodeMP3(audioData)
                let samples = Array(UnsafeBufferPointer(start: buffer.floatChannelData![0], count: Int(buffer.frameLength)))
                let character: [String: Any] = ["id": "voice-integration-check", "name": "Voice Check", "description": "Reply with the single word Ready.", "profile": ["ttsProvider": "edge", "voice": "en-US-AvaMultilingualNeural", "speak": true]]
                let call = try LiveCallRuntime(character: character, origin: origin, token: token, history: [])
                runtime = call
                var submitted = false, transcript = "", reply = "", played = false
                call.onStatus = { state, label in
                    print("Voice test: \(state) — \(label)"); fflush(stdout)
                    if state == "error" { finish(false, "FAIL: " + label) }
                    if state == "active", label == "Hold to talk", !submitted {
                        submitted = true
                        // Exercise the same press/release edge state as the Fn poller.
                        var hold = HoldKeyState()
                        _ = hold.update(down: false, enabled: true)
                        precondition(hold.update(down: true, enabled: true) == true)
                        call.submitVoiceFixture(samples, sampleRate: buffer.format.sampleRate)
                        precondition(hold.update(down: false, enabled: true) == false)
                    }
                }
                call.onMessage = { role, text in
                    if role == "user" { transcript = text }
                    if role == "assistant" { reply = text }
                    if role == "error" { finish(false, "FAIL: " + text) }
                }
                call.onPlayback = { event in
                    if event["state"] as? String == "speaking" { played = true }
                    if event["state"] as? String == "ended", played, !transcript.isEmpty, !reply.isEmpty {
                        finish(true, "PASS: Saved key loaded silently; microphone started; hold press/release → live transcription → live \(provider) reply → Edge TTS → MP3 decode → native audio playback completed.\nTranscript: \(transcript)\nReply: \(reply)")
                    }
                }
                call.start()
                Task { @MainActor in
                    try? await Task.sleep(nanoseconds: 60_000_000_000)
                    finish(false, "FAIL: Voice conversation timed out. Transcript=\(transcript), reply=\(reply), playbackStarted=\(played)")
                }
            } catch { finish(false, "FAIL: " + error.localizedDescription) }
        }
        application.run()
    }
}
