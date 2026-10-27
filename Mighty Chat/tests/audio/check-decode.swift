import Foundation
import AVFoundation

@main struct CheckDecode {
    static func main() throws {
        let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
        let buffer = try PlaybackEngine.decodeMP3(data)
        precondition(buffer.frameLength > 0)
        precondition(buffer.format.sampleRate == 24000 && buffer.format.channelCount == 1)
        print("Native decoded phrase: \(buffer.frameLength) samples")
    }
}
