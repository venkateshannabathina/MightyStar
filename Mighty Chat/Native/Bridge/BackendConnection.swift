import Foundation

/// One authenticated local WebSocket per call. All writes and sequence numbers stay on `queue`.
/// Reconnection is a new call session; no old messages are replayed automatically.
final class BackendConnection {
    enum ConnectionError: Error { case invalidOrigin, invalidMessage, disconnected }

    private let queue = DispatchQueue(label: "MightyChat.BackendConnection", qos: .userInitiated)
    private var session: URLSession?
    private var socket: URLSessionWebSocketTask?
    private var nextSequence = 0
    private var lastIncomingSequence = -1
    private var outgoing: [URLSessionWebSocketTask.Message] = []
    private var sending = false
    var onEvent: (([String: Any]) -> Void)?
    var onFailure: ((Error) -> Void)?

    func connect(origin: String, token: String, identity: [String: Any], character: [String: Any]) {
        queue.async { [self] in
            guard socket == nil else { return }
            guard var url = URLComponents(string: origin), url.host == "127.0.0.1" else {
                onFailure?(ConnectionError.invalidOrigin); return
            }
            url.scheme = "ws"; url.path = "/api/call"; url.query = nil; url.fragment = nil
            guard let endpoint = url.url else { onFailure?(ConnectionError.invalidOrigin); return }
            var request = URLRequest(url: endpoint)
            request.setValue(token, forHTTPHeaderField: "X-Mighty-Token")
            let configuration = URLSessionConfiguration.ephemeral
            configuration.timeoutIntervalForRequest = 10
            session = URLSession(configuration: configuration)
            let task = session!.webSocketTask(with: request)
            socket = task
            nextSequence = 0; lastIncomingSequence = -1
            task.resume()
            receive(task)
            enqueue(type: "session.open", identity: identity, fields: ["character": character])
        }
    }

    func send(type: String, identity: [String: Any], fields: [String: Any] = [:]) {
        queue.async { [self] in enqueue(type: type, identity: identity, fields: fields) }
    }

    func sendAudio(_ samples: Data) {
        queue.async { [self] in
            guard socket != nil, !samples.isEmpty, samples.count <= 32768 else { onFailure?(ConnectionError.invalidMessage); return }
            outgoing.append(.data(samples))
            flush()
        }
    }

    private func enqueue(type: String, identity: [String: Any], fields: [String: Any] = [:]) {
        guard socket != nil else { onFailure?(ConnectionError.disconnected); return }
        var body = fields
        body["version"] = 2
        body["type"] = type
        body["eventId"] = UUID().uuidString
        body["sequence"] = nextSequence
        body["identity"] = identity
        guard CallProtocolValidator.envelope(body),
              let data = try? JSONSerialization.data(withJSONObject: body),
              let text = String(data: data, encoding: .utf8) else { onFailure?(ConnectionError.invalidMessage); return }
        nextSequence += 1
        outgoing.append(.string(text))
        flush()
    }

    private func flush() {
        guard !sending, let task = socket, !outgoing.isEmpty else { return }
        sending = true
        let next = outgoing.removeFirst()
        task.send(next) { [weak self] error in
            self?.queue.async { [weak self] in
                guard let self else { return }
                self.sending = false
                if let error { self.onFailure?(error); self.closeOnQueue(); return }
                self.flush()
            }
        }
    }

    private func receive(_ task: URLSessionWebSocketTask) {
        task.receive { [weak self] result in
            self?.queue.async { [weak self] in
                guard let self, self.socket === task else { return }
                switch result {
                case let .failure(error):
                    self.onFailure?(error); self.closeOnQueue()
                case let .success(message):
                    guard case let .string(text) = message,
                          text.utf8.count <= CallProtocolValidator.maxControlBytes,
                          let data = text.data(using: .utf8),
                          let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          CallProtocolValidator.envelope(value),
                          let sequence = value["sequence"] as? Int,
                          sequence > self.lastIncomingSequence else {
                        self.onFailure?(ConnectionError.invalidMessage); self.closeOnQueue(); return
                    }
                    self.lastIncomingSequence = sequence
                    self.onEvent?(value)
                    self.receive(task)
                }
            }
        }
    }

    func close() { queue.async { [self] in closeOnQueue() } }

    private func closeOnQueue() {
        socket?.cancel(with: .normalClosure, reason: nil)
        session?.invalidateAndCancel()
        socket = nil; session = nil
        outgoing.removeAll(); sending = false
    }
}
