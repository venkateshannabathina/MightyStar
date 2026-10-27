import Foundation

@main struct CheckProtocol {
    static func main() throws {
        let root = URL(fileURLWithPath: CommandLine.arguments[1])
        for (name, expected) in [("valid-snapshot", true), ("invalid-stale-shape", false), ("invalid-sample", false)] {
            let data = try Data(contentsOf: root.appendingPathComponent("\(name).json"))
            let value = try JSONSerialization.jsonObject(with: data)
            precondition(CallProtocolValidator.playbackSnapshot(value) == expected, name)
        }
        print("Swift protocol fixtures passed")
    }
}
