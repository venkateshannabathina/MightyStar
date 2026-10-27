import Foundation
import AVFoundation

// Isolate queued native PCM playback from the backend, providers and Director.
@main struct MultiChunkCheck {
    @MainActor static func main() async throws {
        let audio = try AudioHost()
        var routeChanges = 0
        audio.onRouteChange = { routeChanges += 1 }
        try await audio.start()
        defer { audio.stop() }
        audio.setOutputMuted(true)
        // Device negotiation can restart AVAudioEngine after capture starts.
        // Test the steady queue only after a quiet route interval, and still
        // reject any interruption during the measured buffers.
        var previousRoutes = routeChanges
        var quietTicks = 0
        for _ in 0..<50 {
            try await Task.sleep(nanoseconds: 100_000_000)
            if routeChanges == previousRoutes { quietTicks += 1 }
            else { previousRoutes = routeChanges; quietTicks = 0 }
            if quietTicks >= 20 { break }
        }
        let routesAtStart = routeChanges
        let buffer = try PlaybackEngine.decodeMP3(Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
        let lock = NSLock()
        var completions: [Int] = []
        for index in 0..<2 {
            try audio.schedulePCM(buffer) {
                lock.lock(); completions.append(index); lock.unlock()
            }
        }
        var maximum: Int64 = 0
        var completed: [Int] = []
        for _ in 0..<1200 {
            maximum = max(maximum, audio.playedSamples ?? 0)
            completed = lock.withLock { completions }
            if completed.count == 2 { break }
            try await Task.sleep(nanoseconds: 10_000_000)
        }
        print("Native queue: frames per buffer=\(buffer.frameLength), maximum observed sample=\(maximum), completion indices=\(completed), route changes=\(routeChanges)")
        guard quietTicks >= 20, routeChanges == routesAtStart, completed == [0, 1], maximum > Int64(buffer.frameLength) else {
            print("FAIL: Two queued PCM buffers must reach the second buffer on the actual player clock.")
            exit(1)
        }
        print("PASS: Two queued PCM buffers, ordered played callbacks and second-buffer sample clock.")
    }
}
