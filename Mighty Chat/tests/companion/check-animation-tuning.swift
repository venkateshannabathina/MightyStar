import Cocoa
import WebKit

// Isolated native editor, real renderer and bundled Hailey. No user profiles or keys.
@main final class AnimationTuningCheck: NSObject {
    private var server: Process!, input: Pipe!, window: NSWindow!, editor: CharacterEditorController!, web: WKWebView!
    private var origin = "", token = "", output = ""
    private var finished = false, polling = false
    private var timer: Timer?
    private var saved: [String:Any]?
    private var originalRotation: [Double] = []
    private let appearance: [String:String] = ["key":"local/chars/hailey/hailey.glb","name":"Hailey","directory":"local/chars/hailey","file":"hailey.glb"]
    static func main() {
        let app = NSApplication.shared; app.setActivationPolicy(.accessory)
        let test = AnimationTuningCheck()
        do { try test.start() } catch { test.finish("Setup: \(error)") }
        withExtendedLifetime(test) { app.run() }
    }
    private func descendants(_ view: NSView) -> [NSView] { [view] + view.subviews.flatMap { descendants($0) } }
    private func start() throws {
        server = Process(); input = Pipe(); let pipe = Pipe()
        server.executableURL = URL(fileURLWithPath:CommandLine.arguments[1])
        server.arguments = [CommandLine.arguments[2]]; output = CommandLine.arguments[3]
        server.standardInput = input; server.standardOutput = pipe; server.standardError = FileHandle.nullDevice
        try server.run()
        var line = Data()
        while true {
            let byte = pipe.fileHandleForReading.readData(ofLength:1)
            if byte == Data([10]) { break }
            guard !byte.isEmpty else { throw URLError(.cannotConnectToHost) }; line.append(byte)
        }
        let ready = try JSONSerialization.jsonObject(with:line) as! [String:Any]
        origin = "http://127.0.0.1:\(ready["port"] as! Int)"; token = ready["token"] as! String
        window = NSWindow(contentRect:NSRect(x:0,y:0,width:1100,height:860),styleMask:[.titled,.closable],backing:.buffered,defer:false)
        window.setFrameOrigin(NSPoint(x:60,y:50)); window.title = "Animation tuning · isolated verification"
        openEditor(["id":"animation-tuning-fixture","name":"Hailey","appearance":appearance,"description":"Keep personality","profile":["aiProvider":"groq","aiModel":"fixture-model","memories":"Keep memory"]])
        window.orderFront(nil)
        timer = Timer.scheduledTimer(withTimeInterval:0.25,repeats:true) { [weak self] _ in self?.waitForRig() }
        DispatchQueue.main.asyncAfter(deadline:.now()+50) { self.finish("Timed out waiting for the native editor") }
    }
    private func openEditor(_ character: [String:Any]) {
        editor = CharacterEditorController(character:character,catalog:[appearance],origin:origin,token:token,credentials:CredentialStore(service:"animation-tuning-fixture"))
        editor.onSave = { [weak self] draft, done in self?.saved = draft; done(nil) }
        window.contentView = editor.view; editor.view.frame = window.contentView!.bounds
        web = descendants(editor.view).compactMap { $0 as? WKWebView }.first!
        web.load(URLRequest(url:URL(string:origin+"/Companion/index.html?inspect=1")!))
        let tabs = descendants(editor.view).compactMap { $0 as? NSSegmentedControl }.first!
        guard tabs.segmentCount == 5, tabs.label(forSegment:2) == "Editor" else { finish("Missing Editor tab"); return }
        tabs.selectedSegment = 2; editor.perform(NSSelectorFromString("changeTab"))
        guard let tools = descendants(editor.view).compactMap({ $0 as? NSSegmentedControl }).first(where:{ $0.segmentCount == 3 && $0.label(forSegment:0) == "Facial" }), tools.label(forSegment:1) == "Bone Animation", tools.label(forSegment:2) == "Clothes" else { finish("Missing Editor tools"); return }
        for section in [0,2,1] {
            let current = descendants(editor.view).compactMap { $0 as? NSSegmentedControl }.first { $0.segmentCount == 3 && $0.label(forSegment:0) == "Facial" }!
            current.selectedSegment = section; editor.perform(NSSelectorFromString("changeEditorSection:"),with:current)
        }
    }
    private func evaluate(_ script: String, _ completion: @escaping (Any?) -> Void) {
        web.evaluateJavaScript(script) { value,error in
            guard error == nil else { self.finish("Renderer JavaScript: \(error!)"); return }
            completion(value)
        }
    }
    private func waitForRig() {
        guard !polling, !finished else { return }; polling = true
        web.evaluateJavaScript("window.mightyAnimationTuning?.().bones.length || 0") { result,_ in
            self.polling = false
            guard (result as? Int ?? 0) > 0 else { return }
            self.timer?.invalidate(); self.checkControls()
        }
    }
    private func click(_ title: String) {
        guard let button = descendants(editor.view).compactMap({$0 as? NSButton}).first(where:{$0.title == title}) else { finish("Missing control: \(title)"); return }
        button.performClick(nil)
    }
    private var sliders: [NSSlider] { descendants(editor.view).compactMap { $0 as? NSSlider }.sorted { $0.tag < $1.tag } }
    private func edit(_ index: Int, _ value: Double) {
        let slider = sliders[index]; slider.doubleValue = value
        slider.sendAction(slider.action,to:slider.target)
    }
    private func rotation(_ completion: @escaping ([Double]) -> Void) {
        evaluate("window.mightyCompanionInspect().bones.find(b=>b.name==='Bip001-Spine3').rotation") { result in
            guard let value = result as? [Double], value.count == 4, value.allSatisfy({$0.isFinite}) else { self.finish("Invalid spine rotation"); return }
            completion(value)
        }
    }
    private func same(_ a: [Double], _ b: [Double]) -> Bool { abs(zip(a,b).map(*).reduce(0,+)) > 1-0.000001 }
    private func afterFrame(_ completion: @escaping () -> Void) { DispatchQueue.main.asyncAfter(deadline:.now()+0.15,execute:completion) }
    private func checkControls() {
        click("Precision rotation…")
        guard sliders.count == 5, sliders[0].isEnabled else { finish("Native bone controls were not enabled for the loaded rig"); return }
        click("Pause preview")
        afterFrame {
            self.rotation { base in
                self.originalRotation = base; self.edit(0,18); self.edit(4,0.75)
                self.afterFrame {
                    self.rotation { tuned in
                        guard !self.same(base,tuned) else { self.finish("Paused bone adjustment did not reach the renderer"); return }
                        self.click("Reset joint")
                        self.afterFrame {
                            self.rotation { reset in
                                guard self.same(base,reset) else { self.finish("Reset joint did not restore the animated pose"); return }
                                self.click("Undo")
                                self.afterFrame {
                                    self.rotation { undo in
                                        guard self.same(tuned,undo) else { self.finish("Undo did not restore tuning"); return }
                                        self.click("Redo"); self.click("Undo")
                                        self.editor.perform(NSSelectorFromString("saveEdit"))
                                        self.afterFrame { self.checkSaved() }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    private func checkSaved() {
        guard let draft = saved, let profile = draft["profile"] as? [String:Any],
              let tuning = profile["animationTuning"] as? [String:Any],
              let bones = tuning["bones"] as? [String:[Double]], bones["Spine2"]?[0] == 18,
              tuning["speed"] as? Double == 0.75, profile["memories"] as? String == "Keep memory" else {
            finish("Native save lost tuning or unrelated profile data"); return
        }
        editor.stop(); openEditor(draft)
        timer = Timer.scheduledTimer(withTimeInterval:0.25,repeats:true) { [weak self] _ in
            guard let self, !self.polling else { return }; self.polling = true
            self.web.evaluateJavaScript("window.mightyAnimationTuning?.()") { result,_ in
                self.polling = false
                guard let info = result as? [String:Any], (info["bones"] as? [Any])?.isEmpty == false else { return }
                self.timer?.invalidate()
                self.click("Precision rotation…")
                guard info["speed"] as? Double == 0.75, self.sliders[0].doubleValue == 18 else { self.finish("Reopening the editor lost saved tuning"); return }
                self.editor.view.layoutSubtreeIfNeeded()
                self.web.takeSnapshot(with:nil) { _,_ in
                    guard let image = self.editor.view.bitmapImageRepForCachingDisplay(in:self.editor.view.bounds) else { self.finish("Screenshot unavailable"); return }
                    self.editor.view.cacheDisplay(in:self.editor.view.bounds,to:image)
                    do { try image.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:self.output)) }
                    catch { self.finish("Screenshot write failed"); return }
                    self.finish(nil)
                }
            }
        }
    }
    private func finish(_ error: String?) {
        guard !finished else { return }; finished = true; timer?.invalidate(); editor?.stop()
        try? input?.fileHandleForWriting.close(); server?.terminate()
        print(error.map { "FAIL: \($0)" } ?? "PASS: native Editor tab, real paused bone edit, reset, undo/redo, saved profile and reopened tuning")
        exit(error == nil ? 0 : 1)
    }
}
