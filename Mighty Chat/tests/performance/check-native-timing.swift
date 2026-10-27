import Foundation
@main struct CheckNativeTiming {
    static func main() {
        let timing = NativeTurnTiming.shared
        let id = CallState.Ticket(sessionId:"s",characterId:"c",generation:1,turnId:"t")
        timing.mark(id,"input_commit")
        if !timing.enabled {
            precondition(timing.timestamps(id).isEmpty); print("PASS: Native timing disabled by default"); return
        }
        let stamped = CallState.Ticket(sessionId:"stamp",characterId:"c",generation:1,turnId:"t")
        let captured = NativeTurnTiming.now() - 5
        timing.mark(stamped,"input_commit",at:captured)
        precondition(timing.timestamps(stamped)["input_commit"] == captured)
        let first = timing.timestamps(id)["input_commit"]!
        timing.mark(id,"input_commit"); precondition(timing.timestamps(id)["input_commit"] == first)
        timing.mark(id,"playback_start"); precondition(timing.deltas(id)["playback_start"]! >= 0)
        timing.mark(id,"chunk_0_start",at:first+5)
        timing.mark(id,"chunk_0_end",at:first+100)
        timing.mark(id,"chunk_1_start",at:first+110)
        timing.mark(id,"chunk_64_end")
        precondition(timing.timestamps(id)["chunk_0_start"] == first+5)
        precondition(timing.timestamps(id)["chunk_64_end"] == nil)
        timing.mark(id,"content"); precondition(timing.timestamps(id)["content"] == nil)
        for i in 2...130 {
            timing.mark(.init(sessionId:"s",characterId:"c",generation:i,turnId:"t"),"input_commit")
        }
        precondition(timing.timestamps(id).isEmpty)
        let sameTurn = CallState.Ticket(sessionId:"s2",characterId:"c",generation:130,turnId:"t")
        precondition(timing.timestamps(sameTurn).isEmpty)
        print("PASS: Native timing monotonic, first occurrence, bounded ring, identity isolation and allowlist")
    }
}
