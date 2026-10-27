import Foundation
import AVFoundation

private final class CompletionFlag {
    private let lock = NSLock()
    private var value = false
    func finish() { lock.lock(); value = true; lock.unlock() }
    func isFinished() -> Bool { lock.lock(); defer { lock.unlock() }; return value }
}
private final class CaptureCount {
    private let lock = NSLock()
    private var value = 0
    func add(_ count: Int) { lock.lock(); value += count; lock.unlock() }
    func read() -> Int { lock.lock(); defer { lock.unlock() }; return value }
}

@main struct CheckLiveOutput {
    static func main() async throws {
        let host = try AudioHost()
        let captured = CaptureCount()
        host.onCapture = { samples, _ in captured.add(samples.count) }
        try await host.start()
        defer { host.stop() }
        let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
        let buffer = try PlaybackEngine.decodeMP3(data)
        let peak = UnsafeBufferPointer(start: buffer.floatChannelData![0], count: Int(buffer.frameLength)).reduce(Float(0)) { max($0, abs($1)) }
        precondition(peak > 0.01, "Decoded speech is silent")
        let played = CompletionFlag()
        try host.schedulePCM(buffer) { played.finish() }
        var maximumClock: Int64 = 0
        for _ in 0..<45 {
            try await Task.sleep(nanoseconds: 100_000_000)
            maximumClock = max(maximumClock, host.playedSamples ?? 0)
            if played.isFinished() { break }
        }
        precondition(maximumClock >= Int64(buffer.frameLength) / 2, "Player clock did not advance")
        precondition(played.isFinished(), "Speech did not reach the played-back callback")
        precondition(captured.read() > 0, "Microphone stopped during output")
        print("Live output passed: input=\(host.inputDeviceName), captured=\(captured.read()), decoded=\(buffer.frameLength), clock=\(maximumClock), peak=\(peak)")
    }
}
