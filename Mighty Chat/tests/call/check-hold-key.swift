import Cocoa
@main struct CheckHoldKey {
    static func main() {
        precondition(HoldToTalkKey.isValid("Control + Option"))
        precondition(HoldToTalkKey.isValid("Control + Fn"))
        precondition(HoldToTalkKey.isValid("Right Command"))
        precondition(!HoldToTalkKey.isValid("Control + Control"))
        precondition(!HoldToTalkKey.isValid("Control + X"))
        precondition(!HoldToTalkKey.isValid(""))
        precondition(HoldToTalkKey.flags(for:"Control + Option") == [.control,.option])
        precondition(HoldToTalkKey.flags(for:"Control + Fn") == [.control,.function])
        var state = HoldKeyState()
        precondition(state.update(down: true, enabled: true) == nil)
        precondition(state.update(down: false, enabled: true) == nil)
        precondition(state.update(down: true, enabled: true) == true)
        precondition(state.update(down: true, enabled: true) == nil)
        precondition(state.update(down: false, enabled: true) == false)
        precondition(state.update(down: false, enabled: true) == nil)
        precondition(state.update(down: true, enabled: true) == true)
        precondition(state.update(down: true, enabled: false) == false)
        precondition(state.update(down: true, enabled: true) == nil)
        precondition(state.update(down: false, enabled: true) == nil)
        precondition(state.update(down: true, enabled: true) == true)
        precondition(state.reset() == false)
        precondition(state.reset() == nil)
        print("Hold key press/release, repeat, settings and sleep reset checks passed")
    }
}
