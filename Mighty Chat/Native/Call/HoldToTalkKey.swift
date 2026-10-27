import Cocoa

struct HoldKeyState {
    private var held = false
    private var armed = false
    mutating func update(down: Bool, enabled: Bool) -> Bool? {
        guard enabled else { return reset() }
        if !armed { if !down { armed = true }; return nil }
        guard down != held else { return nil }
        held = down; return down
    }
    mutating func reset() -> Bool? {
        armed = false
        guard held else { return nil }
        held = false; return false
    }
}

/// Observes only modifier state, without recording keystrokes or installing an event tap.
final class HoldToTalkKey {
    static let choices = ["Control + Option", "Right Command", "Control", "Option", "Shift", "Fn"]
    static func isValid(_ shortcut: String) -> Bool {
        if shortcut == "Right Command" { return true }
        let parts = shortcut.components(separatedBy:" + ")
        return !parts.isEmpty && parts.count <= 5 && Set(parts).count == parts.count && parts.allSatisfy { ["Control","Option","Shift","Command","Fn"].contains($0) }
    }
    static func flags(for shortcut: String) -> NSEvent.ModifierFlags {
        var flags: NSEvent.ModifierFlags = []
        for part in shortcut.components(separatedBy:" + ") {
            switch part { case "Control": flags.insert(.control); case "Option": flags.insert(.option); case "Shift": flags.insert(.shift); case "Command": flags.insert(.command); case "Fn": flags.insert(.function); default: break }
        }
        return flags
    }
    var capturing = false
    var onCaptured: ((String) -> Void)?
    var onTextMode: (() -> Void)?
    private var lastFlags: NSEvent.ModifierFlags = []
    private var controlDownAt = Date.distantPast
    private var lastControlTap = Date.distantPast
    private var controlWasAlone = false
    var onChange: ((Bool) -> Void)?
    var isEnabled: (() -> Bool)?
    private var timer: Timer?
    private var state = HoldKeyState()
    private var shortcutName = ""
    private var shortcutFlags: NSEvent.ModifierFlags = []
    func start() {
        guard timer == nil else { return }
        let timer = Timer(timeInterval: 0.02, repeats: true) { [weak self] _ in self?.poll() }
        RunLoop.main.add(timer, forMode: .common); self.timer = timer
    }
    func stop() { timer?.invalidate(); timer = nil; release() }
    func release() { if let edge = state.reset() { onChange?(edge) } }
    private func poll() {
        let name = UserDefaults.standard.string(forKey: "holdToTalkKey") ?? "Fn"
        let flags = NSEvent.modifierFlags.intersection([.control,.option,.shift,.command,.function])
        defer { lastFlags = flags }
        if capturing {
            if flags != lastFlags && !flags.isEmpty {
                let keys: [(NSEvent.ModifierFlags,String)] = [(.control,"Control"),(.option,"Option"),(.shift,"Shift"),(.command,"Command"),(.function,"Fn")]
                onCaptured?(keys.filter { flags.contains($0.0) }.map { $0.1 }.joined(separator:" + "))
            }
            if let edge = state.reset() { onChange?(edge) }
            return
        }
        let enabled = isEnabled?() == true
        if enabled {
            if flags == .control && lastFlags.isEmpty { controlDownAt=Date(); controlWasAlone=true }
            else if !flags.isEmpty && flags != .control { controlWasAlone=false; lastControlTap = .distantPast }
            if flags.isEmpty && lastFlags == .control && controlWasAlone && Date().timeIntervalSince(controlDownAt) < 0.3 {
                if Date().timeIntervalSince(lastControlTap) < 0.45 { onTextMode?(); lastControlTap = .distantPast }
                else { lastControlTap=Date() }
            }
        } else { lastControlTap = .distantPast; controlWasAlone=false }
        if name != shortcutName {
            shortcutName = name
            shortcutFlags = Self.flags(for:name)
        }
        let required = shortcutFlags
        let down = name == "Right Command" ? CGEventSource.keyState(.combinedSessionState,key:54) : !required.isEmpty && flags == required
        if let edge = state.update(down:down,enabled:enabled) { onChange?(edge) }
    }
    deinit { timer?.invalidate() }
}
