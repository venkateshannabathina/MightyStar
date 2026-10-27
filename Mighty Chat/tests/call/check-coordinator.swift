import Foundation

@main struct CheckCallCoordinator {
    static func main() {
        var received: [String] = []
        let ports = CallSessionCoordinator.Ports(
            stopOutput: { received.append("stop") },
            cancelOldGeneration: { received.append("cancel") },
            resetAvatar: { received.append("reset") },
            closeSession: { received.append("close") },
            discardInput: { received.append("discard") },
            resetInput: { received.append("inputReset") }
        )
        let coordinator = CallSessionCoordinator(ports: ports)
        coordinator.submit(.start(sessionId: "s", characterId: "c"))
        coordinator.submit(.connected(sessionId: "s"))
        coordinator.submit(.userSpeechConfirmed)
        coordinator.submit(.userSpeechEnded)
        coordinator.submit(.commitUser(turnId: "t", generation: 1))
        let current = CallState.Ticket(sessionId: "s", characterId: "c", generation: 1, turnId: "t")
        coordinator.submit(current, ifCurrent: .speechBuffered(current))
        coordinator.submit(current, ifCurrent: .speechStarted(current))
        precondition(coordinator.snapshot().output == .playing)
        received.removeAll()
        coordinator.submit(.userSpeechConfirmed)
        coordinator.submit(current, ifCurrent: .speechStarted(current))
        precondition(coordinator.snapshot().output == .idle)
        precondition(received == ["stop", "reset", "cancel"], "stop before backend cancellation; stale callback ignored")
        let localQueue = DispatchQueue(label: "fixture.executor")
        var sameQueue = false
        let local = CallSessionCoordinator(queue: localQueue, ports: ports)
        localQueue.sync {
            local.submit(.start(sessionId: "local", characterId: "c"))
            sameQueue = local.snapshot().lifecycle == .connecting
        }
        precondition(sameQueue, "Queue-local submit and snapshot must not deadlock")
        print("Call coordinator effect ordering checks passed")
    }
}
