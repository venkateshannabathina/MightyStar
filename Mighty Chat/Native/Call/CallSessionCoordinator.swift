import Foundation

/// Serializes call state changes and executes local cancellation effects before publishing UI state.
/// Network and audio adapters are injected; provider callbacks must carry a Ticket.
final class CallSessionCoordinator {
    struct Ports {
        var stopOutput: () -> Void
        var cancelOldGeneration: () -> Void
        var resetAvatar: () -> Void
        var closeSession: () -> Void
        var discardInput: () -> Void
        var resetInput: () -> Void
    }

    private let control: DispatchQueue
    private let queueKey = DispatchSpecificKey<Bool>()
    private var state = CallState()
    private let ports: Ports
    var onState: ((CallState) -> Void)?

    init(queue: DispatchQueue = DispatchQueue(label: "MightyChat.CallControl", qos: .userInitiated), ports: Ports) {
        control = queue; self.ports = ports
        control.setSpecific(key: queueKey, value: true)
    }

    /// For callers outside the control queue. Also provides an ordering barrier for queued events.
    func snapshot() -> CallState {
        if DispatchQueue.getSpecific(key: queueKey) == true { return state }
        return control.sync { state }
    }

    func submit(_ event: CallState.Event) {
        if DispatchQueue.getSpecific(key: queueKey) == true { apply(event); return }
        control.async { [self] in
            apply(event)
        }
    }

    func submit(_ ticket: CallState.Ticket, ifCurrent event: CallState.Event) {
        if DispatchQueue.getSpecific(key: queueKey) == true {
            if state.accepts(ticket) { apply(event) }
            return
        }
        control.async { [self] in
            guard state.accepts(ticket) else { return }
            apply(event)
        }
    }

    private func apply(_ event: CallState.Event) {
        let effects = state.apply(event)
        for effect in effects {
            switch effect {
            case .stopOutput: ports.stopOutput()
            case .cancelOldGeneration: ports.cancelOldGeneration()
            case .resetAvatar: ports.resetAvatar()
            case .closeSession: ports.closeSession()
            case .discardInput: ports.discardInput()
            case .resetInput: ports.resetInput()
            }
        }
        let snapshot = state
        DispatchQueue.main.async { [weak self] in self?.onState?(snapshot) }
    }
}
