import Foundation

@main struct CheckInputLevel {
    static func main() {
        let meter = InputLevelMeter()
        let quiet = Array(repeating: Float(0.002), count: 960)
        let voice = Array(repeating: Float(0.05), count: 960)
        precondition(meter.ingest(voice, at: 0) == nil, "idle capture must not emit microphone levels")
        meter.setHeld(true)
        let first = meter.ingest(voice, at: 0)!
        precondition(first.level > 0.25 && first.level < 1, "ordinary speech should produce a visible, normalized level")
        precondition(meter.isCurrent(first))
        precondition(meter.ingest(voice, at: 39_000_000) == nil, "capture is throttled to at most 25 readings per second")
        let second = meter.ingest(voice, at: 40_000_000)!
        precondition(second.level > first.level, "attack smoothing should approach the measured voice level")

        meter.setHeld(false)
        precondition(!meter.isCurrent(second), "release invalidates a queued reading before delivery")
        precondition(meter.ingest(voice, at: 80_000_000) == nil)
        meter.setHeld(true)
        precondition(!meter.isCurrent(second), "a new hold must not revive an old hold's queued reading")
        let quietReading = meter.ingest(quiet, at: 80_000_000)!
        precondition(quietReading.level < 0.01, "a quiet microphone should stay almost flat")
        precondition(meter.ingest([], at: 120_000_000) == nil)
        let invalid = meter.ingest([Float.nan, Float.infinity, -Float.infinity], at: 120_000_000)!
        precondition(invalid.level.isFinite && invalid.level >= 0 && invalid.level <= 1)
        let loud = meter.ingest([2, -2, 1, -1], at: 160_000_000)!
        precondition(loud.level.isFinite && loud.level > 0.5 && loud.level <= 1, "clipped samples remain normalized")
        var last = loud
        for tick in 5...25 { last = meter.ingest([0,0,0,0], at: UInt64(tick) * 40_000_000)! }
        precondition(last.level == 0, "silence smoothly settles back to zero")
        print("Input level normalization, silence, throttling, release and stale-hold checks passed")
    }
}
