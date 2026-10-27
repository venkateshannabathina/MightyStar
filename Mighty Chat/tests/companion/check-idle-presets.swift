import Cocoa
import WebKit
import CryptoKit

// Run from the workspace root. Uses a temporary WebKit store, the source
// renderer and already-cached character assets; never opens the installed app.
private final class IdlePresetPanel: NSPanel {
    override var canBecomeKey: Bool { true }
}

@main final class CheckIdlePresets: NSObject, WKNavigationDelegate {
    private let server = Process(), serverInput = Pipe()
    private var startup = Data(), token = "", origin = ""
    private var panel: NSPanel!, web: WKWebView!
    private var deadline: Timer?, readyPoll: Timer?
    private var finished = false, checkingReady = false
    private var session = 0, preset = 0
    private var firstSample: [String:Any]?, firstPixels: [UInt8] = []
    private var reports: [[String:Any]] = []
    private var output: URL!
    private let styles = ["male", "female", "dwarf2"]
    private let appearances: [[String:String]] = [
        ["key":"local/chars/hailey/hailey.glb", "name":"Hailey", "directory":"local/chars/hailey", "file":"hailey.glb"],
        ["key":"ww/chars/Lynae/Lynae/Lynae.pmx", "name":"Lynae", "directory":"ww/chars/Lynae/Lynae", "file":"Lynae.pmx"]
    ]
    // Each starting style is delivered before loading/binding the character.
    // Live switching then exercises all three presets on both rig formats.
    private let sessions = [(appearance:0, start:"male"), (appearance:1, start:"female"), (appearance:0, start:"dwarf2")]
    private var currentAppearance: [String:String] { appearances[sessions[session].appearance] }
    private var orderedStyles: [String] { [sessions[session].start] + styles.filter { $0 != sessions[session].start } }
    private var currentStyle: String { orderedStyles[preset] }
    private var label: String { "\(session + 1)-\(currentAppearance["name"]!.lowercased())-\(currentStyle)" }

    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        let test = CheckIdlePresets()
        do { try test.start() } catch { test.finish("FAIL: \(error.localizedDescription)", code:1) }
        withExtendedLifetime(test) { app.run() }
    }

    private func start() throws {
        let workspace = URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
        let appRoot = workspace.appendingPathComponent("Mighty Chat")
        output = appRoot.appendingPathComponent("build/idle-presets-review")
        try FileManager.default.createDirectory(at:output, withIntermediateDirectories:true)
        try requireCachedLynae()
        let node = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "<home>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
        server.executableURL = URL(fileURLWithPath:node)
        server.arguments = [appRoot.appendingPathComponent("Sources/companion-server.cjs").path]
        server.standardInput = serverInput
        let pipe = Pipe(); server.standardOutput = pipe; server.standardError = Pipe()
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            guard let self else { return }
            let chunk = handle.availableData
            guard !chunk.isEmpty else { return }
            self.startup.append(chunk)
            guard self.startup.count < 16384, let newline = self.startup.firstIndex(of:10) else { return }
            pipe.fileHandleForReading.readabilityHandler = nil
            guard let ready = try? JSONSerialization.jsonObject(with:Data(self.startup[..<newline])) as? [String:Any],
                  let port = ready["port"] as? Int, port > 0, let token = ready["token"] as? String else {
                DispatchQueue.main.async { self.finish("FAIL: Invalid local backend startup", code:1) }; return
            }
            DispatchQueue.main.async {
                self.token = token; self.origin = "http://127.0.0.1:\(port)"; self.openSession()
            }
        }
        deadline = Timer.scheduledTimer(withTimeInterval:150, repeats:false) { [weak self] _ in
            self?.finish("FAIL: Idle preset verification exceeded 150 seconds", code:1)
        }
        try server.run()
    }

    private func requireCachedLynae() throws {
        let cache = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Mighty Chat/Character Assets")
        func cachedURL(_ relative:String) -> URL {
            let hash = SHA256.hash(data:Data(relative.utf8)).map { String(format:"%02x", $0) }.joined()
            return cache.appendingPathComponent(hash + ".asset")
        }
        let key = appearances[1]["key"]!
        let manifestURL = URL(fileURLWithPath:cachedURL(key).path + ".json")
        guard let data = try? Data(contentsOf:manifestURL),
              let manifest = try? JSONSerialization.jsonObject(with:data) as? [String:Any],
              let files = manifest["files"] as? [String], files.first == key,
              files.allSatisfy({ ((try? cachedURL($0).resourceValues(forKeys:[.fileSizeKey]).fileSize) ?? 0) > 0 }) else {
            throw NSError(domain:"IdlePresetQA", code:1, userInfo:[NSLocalizedDescriptionKey:"Lynae and her textures must already be cached. This test does not download models."])
        }
    }

    private func openSession() {
        guard !finished else { return }
        preset = 0; firstSample = nil
        web?.stopLoading(); panel?.orderOut(nil)
        panel = IdlePresetPanel(contentRect:NSRect(x:0,y:0,width:640,height:800), styleMask:[.borderless], backing:.buffered, defer:false)
        panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false
        panel.isFloatingPanel = true; panel.level = .floating; panel.hidesOnDeactivate = false
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.addUserScript(WKUserScript(source:"Math.random=()=>0.1;window.qaErrors=[];addEventListener('error',e=>qaErrors.push(e.message));addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));", injectionTime:.atDocumentStart, forMainFrameOnly:true))
        web = WKWebView(frame:panel.contentView!.bounds, configuration:configuration)
        web.autoresizingMask = [.width,.height]; web.navigationDelegate = self
        web.setValue(false,forKey:"drawsBackground")
        panel.contentView = web; panel.center(); panel.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps:true)
        web.load(URLRequest(url:URL(string:origin + "/Companion/index.html?inspect=1")!))
    }

    func webView(_ webView:WKWebView, didFinish navigation:WKNavigation!) {
        guard webView === web else { return }
        // Mimic a saved profile arriving before the asynchronous asset load.
        send(["type":"mighty-companion-control", "idleStyle":currentStyle, "playing":true,
              "desktopInteraction":true, "framing":"full", "pointer":["x":0.8,"y":-0.4,"valid":true]]) { [weak self] in
            guard let self else { return }
            self.send(["type":"mighty-companion-load", "token":self.token, "appearance":self.currentAppearance,
                       "idleStyle":self.currentStyle]) {
                self.readyPoll = Timer.scheduledTimer(withTimeInterval:0.2, repeats:true) { [weak self] _ in self?.checkReady() }
            }
        }
    }
    func webView(_ webView:WKWebView, didFail navigation:WKNavigation!, withError error:Error) { finish("FAIL: \(error.localizedDescription)", code:1) }
    func webView(_ webView:WKWebView, didFailProvisionalNavigation navigation:WKNavigation!, withError error:Error) { finish("FAIL: \(error.localizedDescription)", code:1) }
    func webViewWebContentProcessDidTerminate(_ webView:WKWebView) { finish("FAIL: Native WebKit renderer terminated", code:1) }

    private func send(_ message:[String:Any], _ completion:@escaping () -> Void) {
        guard let data = try? JSONSerialization.data(withJSONObject:message), let json = String(data:data,encoding:.utf8) else {
            finish("FAIL: Could not encode renderer control", code:1); return
        }
        web.evaluateJavaScript("window.postMessage(\(json),location.origin)") { [weak self] _,error in
            guard let self, !self.finished else { return }
            if let error { self.finish("FAIL: \(error.localizedDescription)",code:1); return }
            completion()
        }
    }
    private func inspect(_ completion:@escaping ([String:Any]) -> Void) {
        web.evaluateJavaScript("JSON.stringify({ready:document.getElementById('status').hidden,failed:document.getElementById('status').classList.contains('failed'),errors:window.qaErrors,...window.mightyCompanionInspect?.()})") { [weak self] value,error in
            guard let self, !self.finished else { return }
            guard error == nil, let text = value as? String, let data = text.data(using:.utf8),
                  let state = try? JSONSerialization.jsonObject(with:data) as? [String:Any] else {
                self.finish("FAIL: Could not inspect native idle renderer",code:1); return
            }
            if state["failed"] as? Bool == true { self.finish("FAIL: \(self.label) model load failed",code:1); return }
            if let errors = state["errors"] as? [String], !errors.isEmpty { self.finish("FAIL: Renderer errors: \(errors.joined(separator:"; "))",code:1); return }
            completion(state)
        }
    }
    private func checkReady() {
        guard !checkingReady else { return }; checkingReady = true
        inspect { [weak self] state in
            guard let self else { return }; self.checkingReady = false
            guard state["ready"] as? Bool == true, state["key"] as? String == self.currentAppearance["key"] else { return }
            if self.sessions[self.session].appearance == 0 {
                guard let lighting = state["lighting"] as? [String:Any] else { return }
                if lighting["environmentFailed"] as? Bool == true { self.finish("FAIL: Hailey studio environment failed",code:1); return }
                guard lighting["environmentReady"] as? Bool == true else { return }
            }
            self.readyPoll?.invalidate(); self.readyPoll = nil
            guard self.validate(state) else { return }
            // Rig binding resets pointer attention. Native tracking continually
            // refreshes this signal after the character becomes ready.
            self.send(["type":"mighty-companion-control", "pointer":["x":0.8,"y":-0.4,"valid":true]]) {
                self.after(0.9) { self.beginSample() }
            }
        }
    }

    @discardableResult private func validate(_ state:[String:Any]) -> Bool {
        guard let bones = state["bones"] as? [[String:Any]], bones.count > 20,
              bones.allSatisfy({ bone in
                  guard let rotation = bone["rotation"] as? [Double], rotation.count == 4,
                        let position = bone["position"] as? [Double], position.count == 3 else { return false }
                  return (rotation + position).allSatisfy { $0.isFinite }
              }), let sequence = state["idle"] as? [String:Any],
              let primary = sequence["primary"] as? [String:Any],
              primary["clipIndex"] as? Int == styles.firstIndex(of:currentStyle),
              let idle = state["idlePreset"] as? [String:Any], idle["style"] as? String == currentStyle,
              let sensitivity = idle["sensitivity"] as? Double, abs(sensitivity - 0.35) < 1e-9,
              let yaw = idle["yaw"] as? Double, let pitch = idle["pitch"] as? Double,
              yaw.isFinite, pitch.isFinite, abs(yaw) <= 0.258, abs(pitch) <= 0.154 else {
            finish("FAIL: \(label) has invalid bones, selected style, sensitivity or gaze bounds",code:1); return false
        }
        if currentAppearance["name"] == "Hailey", bones.count != 247 { finish("FAIL: Hailey skeleton changed",code:1); return false }
        if currentStyle != "male", idle["mouseLook"] as? Bool == true { finish("FAIL: Female idle unexpectedly tracks the mouse",code:1); return false }
        return true
    }
    private func beginSample() {
        inspect { [weak self] state in
            guard let self, self.validate(state) else { return }
            self.firstSample = state
            self.capture { png,pixels in
                self.firstPixels = pixels
                try? png.write(to:self.output.appendingPathComponent(self.label + "-start.png"))
                self.after(1.8) { self.endSample() }
            }
        }
    }
    private func endSample() {
        inspect { [weak self] state in
            guard let self, self.validate(state), let before = self.firstSample else { return }
            guard !self.same(before["bones"],state["bones"]), !self.same(before["idle"],state["idle"]) else {
                self.finish("FAIL: \(self.label) idle bones or animation clock did not advance",code:1); return
            }
            if self.currentStyle == "male", (state["idlePreset"] as? [String:Any])?["mouseLook"] as? Bool != true {
                self.finish("FAIL: \(self.label) did not reach the deterministic mouse glance",code:1); return
            }
            self.capture { png,pixels in
                var changed = 0
                if pixels.count == self.firstPixels.count {
                    for index in stride(from:0,to:pixels.count,by:4) {
                        if (0..<4).contains(where:{ abs(Int(pixels[index+$0]) - Int(self.firstPixels[index+$0])) > 3 }) { changed += 1 }
                    }
                }
                try? png.write(to:self.output.appendingPathComponent(self.label + "-motion.png"))
                self.reports.append(["model":self.currentAppearance["name"]!, "initialStyle":self.sessions[self.session].start,
                    "style":self.currentStyle, "bones":(state["bones"] as? [Any])?.count ?? 0,
                    "idlePreset":state["idlePreset"] ?? [:], "visibleChangedPixels":changed,
                    "finiteMovingBones":true, "render":state["render"] ?? [:]])
                if self.preset == 0 { self.checkPause() } else { self.nextPreset() }
            }
        }
    }
    private func checkPause() {
        send(["type":"mighty-companion-control","playing":false]) {
            self.after(0.15) {
                self.inspect { paused in
                    self.after(0.45) {
                        self.inspect { frozen in
                            guard self.same(paused["idle"],frozen["idle"]), self.same(paused["idlePreset"],frozen["idlePreset"]), self.same(paused["bones"],frozen["bones"]) else {
                                self.finish("FAIL: \(self.label) pause did not freeze pose and gaze",code:1); return
                            }
                            self.send(["type":"mighty-companion-control","playing":true]) {
                                self.after(0.45) {
                                    self.inspect { resumed in
                                        guard self.validate(resumed), !self.same(frozen["idle"],resumed["idle"]) else {
                                            self.finish("FAIL: \(self.label) resume did not advance animation",code:1); return
                                        }
                                        self.reports[self.reports.count - 1]["pauseResume"] = true
                                        self.nextPreset()
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    private func nextPreset() {
        preset += 1
        if preset == styles.count {
            session += 1
            if session == sessions.count { saveReport(); return }
            openSession(); return
        }
        send(["type":"mighty-companion-control", "idleStyle":currentStyle,
              "pointer":["x":0.8,"y":-0.4,"valid":true]]) {
            self.after(0.9) { self.beginSample() }
        }
    }

    private func capture(_ completion:@escaping (Data,[UInt8]) -> Void) {
        // Reading immediately after the renderer's next frame includes WebGL
        // pixels that WKWebView.takeSnapshot occasionally omits on this Mac.
        web.callAsyncJavaScript("return await new Promise(resolve=>requestAnimationFrame(()=>resolve(document.querySelector('canvas').toDataURL('image/png'))))", arguments:[:], in:nil, in:.page) { [weak self] result in
            guard let self, !self.finished else { return }
            guard case .success(let value) = result, let url = value as? String, let marker = url.range(of:","),
                  let png = Data(base64Encoded:String(url[marker.upperBound...])), let bitmap = NSBitmapImageRep(data:png) else {
                self.finish("FAIL: Native GPU frame capture failed",code:1); return
            }
            var pixels = [UInt8](), visible = 0
            pixels.reserveCapacity(180 * 225 * 4)
            for y in 0..<225 {
                for x in 0..<180 {
                    let color = bitmap.colorAt(x:min(bitmap.pixelsWide-1,x*bitmap.pixelsWide/180), y:min(bitmap.pixelsHigh-1,y*bitmap.pixelsHigh/225))?.usingColorSpace(.deviceRGB) ?? .clear
                    if color.alphaComponent > 0.1 { visible += 1 }
                    for component in [color.redComponent,color.greenComponent,color.blueComponent,color.alphaComponent] {
                        pixels.append(UInt8(max(0,min(255,Int((component*255).rounded())))))
                    }
                }
            }
            guard visible > 500 else { self.finish("FAIL: \(self.label) has no visible rendered character",code:1); return }
            completion(png,pixels)
        }
    }
    private func same(_ left:Any?, _ right:Any?) -> Bool {
        guard let left, let right, let a = try? JSONSerialization.data(withJSONObject:left,options:.sortedKeys),
              let b = try? JSONSerialization.data(withJSONObject:right,options:.sortedKeys) else { return false }
        return a == b
    }
    private func after(_ seconds:Double, _ completion:@escaping () -> Void) {
        DispatchQueue.main.asyncAfter(deadline:.now()+seconds) { [weak self] in
            guard let self, !self.finished else { return }; completion()
        }
    }
    private func saveReport() {
        do {
            for name in ["Hailey","Lynae"] {
                guard reports.contains(where:{ $0["model"] as? String == name && ($0["visibleChangedPixels"] as? Int ?? 0) > 4 }) else {
                    finish("FAIL: \(name) has no verified GPU motion between samples",code:1); return
                }
            }
            let summary:[String:Any] = ["isolatedWebKitStore":true, "savedStartupStyles":styles,
                "models":["Hailey GLB","Lynae PMX"], "checks":reports, "errors":[]]
            let data = try JSONSerialization.data(withJSONObject:summary,options:[.prettyPrinted,.sortedKeys])
            try data.write(to:output.appendingPathComponent("native-idle-presets.json"))
            finish("PASS: Native Hailey/Lynae rendering, three saved startup styles, all live preset changes, finite moving bones, GPU motion, gaze bounds and pause/resume; \(output.path)",code:0)
        } catch { finish("FAIL: \(error.localizedDescription)",code:1) }
    }
    private func finish(_ message:String, code:Int32) {
        guard !finished else { return }; finished = true
        readyPoll?.invalidate(); deadline?.invalidate(); panel?.orderOut(nil)
        web?.stopLoading(); web?.loadHTMLString("",baseURL:nil)
        try? serverInput.fileHandleForWriting.close()
        if server.isRunning { server.terminate() }
        print(token.isEmpty ? message : message.replacingOccurrences(of:token,with:"[redacted]"))
        exit(code)
    }
}
