import Foundation

@main struct CheckNativeConnection {
    static func main() throws {
        let server = Process()
        server.executableURL = URL(fileURLWithPath: CommandLine.arguments[1])
        server.arguments = [CommandLine.arguments[2]]
        let stdout = Pipe()
        server.standardOutput = stdout
        server.standardError = Pipe()
        server.standardInput = Pipe()
        try server.run()
        defer { server.terminate(); server.waitUntilExit() }
        var line = Data()
        while true {
            let next = stdout.fileHandleForReading.readData(ofLength: 1)
            guard !next.isEmpty else { fatalError("Backend exited before readiness") }
            if next == Data([10]) { break }
            line.append(next)
        }
        let ready = try JSONSerialization.jsonObject(with: line) as! [String: Any]
        let port = ready["port"] as! Int
        let token = ready["token"] as! String
        let identity: [String: Any] = ["sessionId": "native-test", "characterId": "character", "generation": 0, "turnId": "session"]
        let connection = BackendConnection()
        let received = DispatchSemaphore(value: 0)
        var result = "no response"
        connection.onEvent = { event in result = event["type"] as? String ?? "bad response"; received.signal() }
        connection.onFailure = { error in result = String(describing: error); received.signal() }
        connection.connect(origin: "http://127.0.0.1:\(port)", token: token, identity: identity, character: ["id": "fixture-character", "name": "Fixture"])
        precondition(received.wait(timeout: .now() + 5) == .success, "Native client timed out")
        precondition(result == "session.ready", "Native client received \(result)")
        let nextEvent = DispatchSemaphore(value: 0)
        connection.onEvent = { event in result = event["type"] as? String ?? "bad response"; nextEvent.signal() }
        connection.send(type: "input.begin", identity: identity, fields: ["format": "pcm16le", "sampleRate": 16000, "totalBytes": 4])
        connection.sendAudio(Data([0, 0, 0, 0]))
        connection.send(type: "input.commit", identity: identity)
        precondition(nextEvent.wait(timeout: .now() + 5) == .success, "Native audio upload timed out")
        precondition(result == "response.error", "Native client audio upload received \(result)")
        connection.close()
        print("Native WebSocket handshake and binary audio upload passed")
    }
}
