import Foundation

@main struct CheckEndpoint {
    static func main() {
        let endpoint = EndpointController(mode: .automatic)
        let finished = DispatchSemaphore(value: 0)
        var captured = 0
        endpoint.onUtterance = { data, rate in
            precondition(rate == 16000 && data.count > 3200)
            captured += 1; finished.signal()
        }
        let silence = [Float](repeating: 0, count: 1600)
        let voice = [Float](repeating: 0.1, count: 1600)
        for _ in 0..<3 { endpoint.ingest(silence, sampleRate: 16000) }
        for _ in 0..<4 { endpoint.ingest(voice, sampleRate: 16000) }
        for _ in 0..<6 { endpoint.ingest(silence, sampleRate: 16000) }
        precondition(finished.wait(timeout: .now() + 3) == .success && captured == 1)
        let manual = EndpointController(mode: .holdToTalk)
        let held = DispatchSemaphore(value: 0)
        manual.onUtterance = { data, _ in precondition(data.count > 0); held.signal() }
        manual.beginHold()
        manual.ingest(voice, sampleRate: 16000)
        manual.ingest(voice, sampleRate: 16000)
        manual.endHold()
        precondition(held.wait(timeout: .now() + 3) == .success)
        let discarded = DispatchSemaphore(value: 0)
        manual.onDiscardedUtterance = { discarded.signal() }
        manual.beginHold()
        manual.ingest(silence, sampleRate: 16000)
        manual.ingest(silence, sampleRate: 16000)
        manual.endHold()
        precondition(discarded.wait(timeout: .now() + 3) == .success, "Silent holds must not go to STT")
        manual.beginHold(); manual.endHold()
        precondition(discarded.wait(timeout: .now() + 3) == .success, "Short taps must return to listening")
        let bounded = DispatchSemaphore(value: 0)
        manual.beginHold()
        manual.ingest(voice, sampleRate: 48000)
        precondition(discarded.wait(timeout: .now() + 3) == .success, "Input route changes must release the current hold")
        let capped = EndpointController(mode: .holdToTalk)
        capped.onUtterance = { data, _ in precondition(data.count == 2_097_152); bounded.signal() }
        capped.beginHold()
        for _ in 0..<257 { capped.ingest([Float](repeating: 0.1, count: 4096), sampleRate: 96000) }
        precondition(bounded.wait(timeout: .now() + 3) == .success, "Max utterance must not exceed transport limit")
        print("Automatic endpoint and hold-to-talk fixture checks passed")
    }
}
