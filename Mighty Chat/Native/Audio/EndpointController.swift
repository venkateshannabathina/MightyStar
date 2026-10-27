import Foundation

/// Converts captured mono float samples into bounded utterances. Energy detection is a provisional
/// adapter; production hands-free mode requires a validated speech detector and echo-capable route.
final class EndpointController {
    enum Mode { case automatic, holdToTalk }
    private let queue = DispatchQueue(label: "MightyChat.Endpoint", qos: .userInitiated)
    private var mode: Mode
    private var sampleRate: Int = 0
    private var preRoll: [Float] = []
    private var current: [Float] = []
    private var speaking = false
    private var candidateSamples = 0
    private var quietSamples = 0
    private var held = false
    var onUtterance: ((Data, Int) -> Void)?
    var onSpeechStart: (() -> Void)?
    var onSpeechEnd: (() -> Void)?
    var onDiscardedUtterance: (() -> Void)?

    init(mode: Mode) { self.mode = mode }

    func setMode(_ value: Mode) { queue.async { self.reset(); self.mode = value } }
    func beginHold() {
        queue.async {
            guard self.mode == .holdToTalk, !self.held else { return }
            self.reset()
            self.held = true
            // A manual hold starts a new recording; don't include the assistant's preceding audio.
            self.onSpeechStart?()
        }
    }
    func endHold() {
        queue.async {
            guard self.mode == .holdToTalk, self.held else { return }
            self.held = false
            self.finalize()
        }
    }
    func discard() { queue.async { self.reset() } }
    func ingest(_ samples: [Float], sampleRate rawRate: Double) {
        queue.async {
            let rate = Int(rawRate.rounded())
            guard rate >= 8000, rate <= 96000, !samples.isEmpty else { return }
            if self.sampleRate != 0 && self.sampleRate != rate {
                let interrupted = self.held || self.speaking
                self.reset()
                if interrupted {
                    self.onSpeechEnd?()
                    self.onDiscardedUtterance?()
                }
            }
            self.sampleRate = rate
            let limit = min(rate * 30, 1_048_576)
            if self.mode == .holdToTalk {
                if self.held {
                    self.current.append(contentsOf: samples.prefix(max(0, limit - self.current.count)))
                    if self.current.count >= limit { self.held = false; self.finalize() }
                } else { self.updatePreRoll(samples, rate: rate) }
                return
            }
            let rms = sqrt(samples.reduce(Float(0)) { $0 + $1 * $1 } / Float(samples.count))
            let voiceLike = rms >= 0.018 // provisional energy threshold; not a validated VAD probability
            if self.speaking {
                self.current.append(contentsOf: samples.prefix(max(0, limit - self.current.count)))
                self.quietSamples = voiceLike ? 0 : self.quietSamples + samples.count
                if self.quietSamples >= Int(Double(rate) * 0.45) || self.current.count >= limit { self.finalize() }
            } else {
                self.updatePreRoll(samples, rate: rate)
                self.candidateSamples = voiceLike ? self.candidateSamples + samples.count : 0
                if self.candidateSamples >= Int(Double(rate) * 0.12) {
                    self.speaking = true
                    self.current = self.preRoll
                    self.preRoll.removeAll(keepingCapacity: true)
                    self.quietSamples = 0
                    self.onSpeechStart?()
                }
            }
        }
    }

    private func updatePreRoll(_ samples: [Float], rate: Int) {
        preRoll.append(contentsOf: samples)
        let maximum = Int(Double(rate) * 0.25)
        if preRoll.count > maximum { preRoll.removeFirst(preRoll.count - maximum) }
    }
    private func reset() {
        preRoll.removeAll(keepingCapacity: true)
        current.removeAll(keepingCapacity: true)
        speaking = false; held = false; candidateSamples = 0; quietSamples = 0
    }
    private func finalize() {
        let recorded = current
        let rate = sampleRate
        let hadSpeech = speaking || held || !recorded.isEmpty
        current.removeAll(keepingCapacity: true)
        speaking = false; candidateSamples = 0; quietSamples = 0
        onSpeechEnd?()
        let energy = recorded.reduce(Float(0)) { $0 + $1 * $1 } / Float(max(1, recorded.count))
        guard hadSpeech, recorded.count >= Int(Double(rate) * 0.15), energy >= 0.000004 else {
            onDiscardedUtterance?(); return
        }
        var pcm = Data(count: recorded.count * 2)
        pcm.withUnsafeMutableBytes { bytes in
            guard let words = bytes.bindMemory(to: Int16.self).baseAddress else { return }
            for index in recorded.indices {
                let scaled = max(-1, min(1, recorded[index])) * 32767
                words[index] = Int16(scaled.rounded()).littleEndian
            }
        }
        onUtterance?(pcm, rate)
    }
}
