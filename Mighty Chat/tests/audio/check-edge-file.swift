import Foundation
import AVFoundation

@main struct CheckEdgeFile {
    static func main() throws {
        let file = try AVAudioFile(forReading: URL(fileURLWithPath: CommandLine.arguments[1]))
        precondition(file.processingFormat.sampleRate == 24000)
        precondition(file.processingFormat.channelCount == 1)
        precondition(file.length > 0)
        let seconds = Double(file.length) / file.processingFormat.sampleRate
        print("Decoded Edge fixture: \(file.length) samples, \(seconds) seconds")
    }
}
