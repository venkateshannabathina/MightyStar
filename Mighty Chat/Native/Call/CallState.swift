import Foundation

/// Pure state reducer. The native coordinator applies events on one serial executor and performs
/// the returned effects in order. No provider callback may mutate this state directly.
struct CallState {
    enum Lifecycle: Equatable { case idle, connecting, active, reconnecting, ending, failed }
    enum Input: Equatable { case muted, quiet, speaking, finalizing }
    enum Output: Equatable { case idle, generating, buffering, playing }
    enum Effect: Equatable { case stopOutput, cancelOldGeneration, resetAvatar, closeSession, discardInput, resetInput }
    struct Ticket: Hashable {
        let sessionId: String
        let characterId: String
        let generation: Int
        let turnId: String
    }
    enum Event {
        case start(sessionId: String, characterId: String)
        case connected(sessionId: String)
        case userSpeechConfirmed
        case userSpeechEnded
        case discardUserInput
        case commitUser(turnId: String, generation: Int)
        case speechBuffered(Ticket)
        case speechStarted(Ticket)
        case speechEnded(Ticket)
        case mute(Bool)
        case audioRouteChanged
        case disconnect
        case end
        case fail
    }

    private(set) var lifecycle: Lifecycle = .idle
    private(set) var input: Input = .quiet
    private(set) var output: Output = .idle
    private(set) var sessionId: String?
    private(set) var characterId: String?
    private(set) var generation = 0
    private(set) var turnId: String?

    func accepts(_ ticket: Ticket) -> Bool {
        lifecycle == .active && ticket.sessionId == sessionId && ticket.characterId == characterId &&
            ticket.generation == generation && ticket.turnId == turnId
    }

    @discardableResult mutating func apply(_ event: Event) -> [Effect] {
        switch event {
        case let .start(id, character):
            guard lifecycle == .idle || lifecycle == .failed else { return [] }
            sessionId = id; characterId = character; generation = 0; turnId = nil
            lifecycle = .connecting; input = .quiet; output = .idle
            return []
        case let .connected(id):
            guard lifecycle == .connecting && sessionId == id else { return [] }
            lifecycle = .active
            return []
        case .userSpeechConfirmed:
            guard lifecycle == .active && input != .muted && input != .speaking else { return [] }
            let hadOutput = output != .idle
            generation += 1
            turnId = nil
            input = .speaking; output = .idle
            return hadOutput ? [.stopOutput, .resetAvatar, .cancelOldGeneration] : [.cancelOldGeneration]
        case .userSpeechEnded:
            guard lifecycle == .active && input == .speaking else { return [] }
            input = .finalizing
            return []
        case .discardUserInput:
            guard lifecycle == .active && input == .finalizing else { return [] }
            input = .quiet; output = .idle; turnId = nil
            return []
        case let .commitUser(id, inputGeneration):
            guard lifecycle == .active && input == .finalizing && inputGeneration == generation && !id.isEmpty else { return [] }
            turnId = id; input = .quiet; output = .generating
            return []
        case let .speechBuffered(ticket):
            guard accepts(ticket), output == .generating || output == .buffering else { return [] }
            output = .buffering
            return []
        case let .speechStarted(ticket):
            guard accepts(ticket), output == .buffering else { return [] }
            output = .playing
            return []
        case let .speechEnded(ticket):
            guard accepts(ticket), output == .playing || output == .buffering || output == .generating else { return [] }
            output = .idle; turnId = nil
            return [.resetAvatar]
        case let .mute(value):
            guard lifecycle == .active else { return [] }
            guard (input == .muted) != value else { return [] }
            input = value ? .muted : .quiet
            return value ? [.discardInput] : [.resetInput]
        case .audioRouteChanged:
            guard lifecycle == .active else { return [] }
            generation += 1; turnId = nil; output = .idle
            if input != .muted { input = .quiet }
            return [.stopOutput, .resetAvatar, .cancelOldGeneration, .discardInput, .resetInput]
        case .disconnect:
            guard lifecycle == .active else { return [] }
            generation += 1; turnId = nil; output = .idle; input = .quiet
            lifecycle = .reconnecting
            return [.stopOutput, .resetAvatar, .cancelOldGeneration]
        case .end, .fail:
            guard lifecycle != .idle else { return [] }
            generation += 1; turnId = nil; output = .idle; input = .quiet
            lifecycle = event.isFailure ? .failed : .idle
            sessionId = nil; characterId = nil
            return [.stopOutput, .resetAvatar, .cancelOldGeneration, .closeSession]
        }
    }
}

private extension CallState.Event {
    var isFailure: Bool { if case .fail = self { return true }; return false }
}
