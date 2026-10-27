import Foundation

/// Measures capture samples off the main thread without letting an old hold's
/// queued readings reach a later hold. This meter never changes recorded audio.
final class InputLevelMeter {
    struct Reading {
        let level: Double
        fileprivate let generation: UInt64
    }

    private let lock = NSLock()
    private var held = false
    private var generation: UInt64 = 0
    private var lastReadingTime: UInt64?
    private var smoothedLevel = 0.0
    private let interval: UInt64 = 40_000_000

    func setHeld(_ value: Bool) {
        lock.lock(); defer { lock.unlock() }
        guard value != held else { return }
        held = value
        generation &+= 1
        lastReadingTime = nil
        smoothedLevel = 0
    }

    func ingest(_ samples: [Float], at time: UInt64 = DispatchTime.now().uptimeNanoseconds) -> Reading? {
        lock.lock(); defer { lock.unlock() }
        guard held, !samples.isEmpty else { return nil }
        if let previous = lastReadingTime, time >= previous, time - previous < interval { return nil }
        lastReadingTime = time
        let energy = samples.reduce(0.0) { sum, sample in
            let value = sample.isFinite ? min(1.0, abs(Double(sample))) : 0
            return sum + value * value
        } / Double(samples.count)
        let decibels = 20 * log10(max(sqrt(energy), 0.000_001))
        let level = min(1, max(0, (decibels + 54) / 42))
        let smoothing = level > smoothedLevel ? 0.6 : 0.3
        smoothedLevel += (level - smoothedLevel) * smoothing
        if smoothedLevel < 0.005 { smoothedLevel = 0 }
        return Reading(level: smoothedLevel, generation: generation)
    }

    func isCurrent(_ reading: Reading) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return held && generation == reading.generation
    }
}
