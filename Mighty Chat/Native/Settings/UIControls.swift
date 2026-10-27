import Cocoa
import AVFoundation

/// Native operations exposed by the reference-matched settings UI.
final class UIControls {
    var send: ((String, [String: Any]) -> Void)?
    var window: (() -> NSWindow?)?
    var endCall: (() -> Void)?
    var captureShortcut: ((Bool) -> Void)?
    private var testHost: AudioHost?
    private var testTask: Task<Void, Never>?
    private var testGeneration = 0
    private var deviceObservers: [NSObjectProtocol] = []

    init() {
        for name in [AVCaptureDevice.wasConnectedNotification, AVCaptureDevice.wasDisconnectedNotification] {
            deviceObservers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                self?.stopTest(); self?.reportDevices()
                self?.send?("mightyUIMicrophone", ["error":"Audio devices changed. Choose your microphone and test again."])
            })
        }
    }
    deinit { deviceObservers.forEach(NotificationCenter.default.removeObserver); testTask?.cancel(); testHost?.stop() }

    @discardableResult func handle(_ body: [String: Any]) -> Bool {
        guard let action = body["action"] as? String else { return false }
        switch action {
        case "uiState":
            let d = UserDefaults.standard
            send?("mightyUIState", ["name":NSFullUserName(), "preferences":[
                "showDock":d.object(forKey:"mightyShowDock") as? Bool ?? true,
                "screenRecordings":d.object(forKey:"mightyScreenRecordings") as? Bool ?? true,
                "microphone":d.string(forKey:"mightyMicrophone") ?? "default",
                "shortcut":d.string(forKey:"holdToTalkKey") ?? "Control + Option",
                "folderName":d.string(forKey:"mightyWorkspaceFolder").map { URL(fileURLWithPath:$0).lastPathComponent } ?? "MightyStar default"
            ]])
            return true
        case "uiPreference":
            guard let key = body["key"] as? String else { return true }
            if key == "showDock", let value = body["value"] as? Bool {
                UserDefaults.standard.set(value, forKey:"mightyShowDock")
                NSApp.setActivationPolicy(value ? .regular : .accessory)
                window?()?.makeKeyAndOrderFront(nil)
            } else if key == "screenRecordings", let value = body["value"] as? Bool {
                UserDefaults.standard.set(value,forKey:"mightyScreenRecordings")
                window?()?.sharingType = value ? .readOnly : .none
            } else if key == "microphone", let value = body["value"] as? String,
                      value == "default" || AudioHost.availableInputs().contains(where: { $0.uniqueID == value }) {
                stopTest(); endCall?()
                UserDefaults.standard.set(value,forKey:"mightyMicrophone")
            }
            return true
        case "uiDevices": reportDevices(); return true
        case "uiMicTest":
            if body["enabled"] as? Bool == true { startTest() } else { stopTest() }; return true
        case "uiChooseFolder":
            let panel = NSOpenPanel(); panel.canChooseDirectories = true; panel.canChooseFiles = false; panel.allowsMultipleSelection = false
            panel.prompt = "Choose folder"; panel.message = "Choose the folder for your MightyStar workspace."
            if panel.runModal() == .OK, let url = panel.url {
                UserDefaults.standard.set(url.path,forKey:"mightyWorkspaceFolder")
                send?("mightyUIFolder",["name":url.lastPathComponent])
            }
            return true
        case "uiCaptureShortcut": captureShortcut?(body["enabled"] as? Bool == true); return true
        case "uiShortcut":
            if let shortcut = body["shortcut"] as? String, HoldToTalkKey.isValid(shortcut) {
                UserDefaults.standard.set(shortcut,forKey:"holdToTalkKey")
                captureShortcut?(false)
                send?("mightyUIShortcut",["shortcut":shortcut])
            }
            return true
        case "copyText":
            if let text=body["text"] as? String, text.count <= 1_000_000 {
                NSPasteboard.general.clearContents(); NSPasteboard.general.setString(text,forType:.string)
            }
            return true
        case "openAccessibility":
            if let url=URL(string:"x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility") { NSWorkspace.shared.open(url) }
            return true
        case "uiQuit": NSApp.terminate(nil); return true
        default: return false
        }
    }
    func reportDevices() {
        send?("mightyUIDevices",["devices":AudioHost.availableInputs().map{["id":$0.uniqueID,"name":$0.localizedName]},"selected":UserDefaults.standard.string(forKey:"mightyMicrophone") ?? "default"])
    }
    func stopTest() {
        testGeneration += 1
        testTask?.cancel(); testTask=nil
        testHost?.stop(); testHost=nil
    }
    private func startTest() {
        stopTest(); endCall?()
        let generation = testGeneration
        testTask = Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let host = try AudioHost(); self.testHost=host
                host.onCapture = { [weak self, weak host] samples, _ in
                    let rms=sqrt(samples.reduce(Float(0)){$0+$1*$1}/Float(max(1,samples.count)))
                    DispatchQueue.main.async {
                        guard let self, self.testGeneration == generation else { return }
                        self.send?("mightyUIMicrophone",["level":min(1,Double(rms)*12),"name":host?.inputDeviceName ?? "selected microphone"])
                    }
                }
                try await host.start()
                guard !Task.isCancelled, self.testGeneration == generation else { host.stop(); return }
            } catch {
                guard self.testGeneration == generation else { return }
                self.stopTest(); self.send?("mightyUIMicrophone",["error":error.localizedDescription])
            }
        }
    }
}
