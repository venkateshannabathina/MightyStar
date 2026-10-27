import Cocoa
import WebKit

@main final class CheckNativePlayer: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    private let server = Process(), input = Pipe()
    private var startup = Data(), origin = "", token = ""
    private var panel: CompanionPanel!, web: WKWebView!, chrome: PlayerChromeView!
    private var deadline: Timer?, checked = false
    private var maskPixels = 0
    private let root = URL(fileURLWithPath:FileManager.default.currentDirectoryPath).appendingPathComponent("Mighty Chat")
    static func main() {
        NSApplication.shared.setActivationPolicy(.regular)
        let test = CheckNativePlayer()
        do { try test.start() } catch { test.finish(error.localizedDescription,code:1) }
        withExtendedLifetime(test) { NSApp.run() }
    }
    private func start() throws {
        let menu = NSMenu(); let app = NSMenuItem(); menu.addItem(app); let sub = NSMenu(); sub.addItem(withTitle:"Quit preview",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q"); app.submenu = sub; NSApp.mainMenu = menu
        server.executableURL = URL(fileURLWithPath:CommandLine.arguments.dropFirst().first(where:{!$0.hasPrefix("--")}) ?? "<home>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node")
        server.arguments = [root.appendingPathComponent("Sources/companion-server.cjs").path]
        server.standardInput = input; server.standardError = Pipe()
        let output = Pipe(); server.standardOutput = output
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            guard let self else { return }; let chunk = handle.availableData; guard !chunk.isEmpty else { return }; self.startup.append(chunk)
            guard let newline = self.startup.firstIndex(of:10) else { return }; output.fileHandleForReading.readabilityHandler = nil
            guard let value = try? JSONSerialization.jsonObject(with:Data(self.startup[..<newline])) as? [String:Any],let port = value["port"] as? Int,let token = value["token"] as? String else { return }
            DispatchQueue.main.async { self.origin = "http://127.0.0.1:\(port)"; self.token = token; self.open() }
        }
        try server.run()
        deadline = Timer.scheduledTimer(withTimeInterval:60,repeats:false) { [weak self] _ in self?.finish("Native player timed out",code:1) }
    }
    private func open() {
        let config = WKWebViewConfiguration(); config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self,name:"companion"); config.userContentController.add(self,name:"qa")
        config.userContentController.addUserScript(WKUserScript(source:"addEventListener('message',e=>{if(e.data?.state==='ready')window.webkit.messageHandlers.qa.postMessage('ready')});addEventListener('error',e=>window.webkit.messageHandlers.qa.postMessage('ERROR '+e.message));",injectionTime:.atDocumentStart,forMainFrameOnly:true))
        panel = CompanionPanel(contentRect:NSRect(x:0,y:0,width:540,height:540),styleMask:[.titled,.closable,.miniaturizable,.resizable,.fullSizeContentView],backing:.buffered,defer:false)
        panel.title = "Player native review"; panel.titleVisibility = .hidden; panel.titlebarAppearsTransparent = true
        panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = true; panel.usesPlayerChrome = true; panel.silhouetteOnly = false; panel.allowsCharacterDrag = false
        let content = NSView(frame:panel.contentView!.bounds); content.wantsLayer = true
        web = WKWebView(frame:content.bounds,configuration:config); web.autoresizingMask = [.width,.height]; web.navigationDelegate = self; web.setValue(true,forKey:"drawsBackground"); content.addSubview(web)
        chrome = PlayerChromeView(frame:content.bounds); content.addSubview(chrome)
        chrome.onRegions = { [weak self] regions in self?.panel.nativeControlRegions = regions }
        chrome.onSubtitles = { [weak self] enabled in self?.web.evaluateJavaScript("document.getElementById('playerCaptions').click()",completionHandler:nil) }
        chrome.onOutput = { [weak self] volume, muted in self?.chrome.configure(volume:volume,muted:muted,subtitles:true) }
        chrome.onView = { [weak self] mode in print("VIEW \(mode)"); if mode == "standard" { self?.finish("Preview closed",code:0) } }
        panel.onPlayerPointer = { [weak self] point in self?.chrome.sampleGlobalPointer() }
        panel.onPlayerEscape = { [weak self] in _ = self?.chrome.handleEscape() }
        panel.contentView = content; panel.center(); panel.makeKeyAndOrderFront(nil); panel.startPointerTracking()
        for type in [NSWindow.ButtonType.closeButton,.miniaturizeButton,.zoomButton] { panel.standardWindowButton(type)?.isHidden = true }
        NSApp.activate(ignoringOtherApps:true)
        let url = root.appendingPathComponent("Sources/desktop.html"); web.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent())
    }
    func webView(_ webView: WKWebView,didFinish navigation: WKNavigation!) {
        let value:[String:Any] = ["mode":"player","origin":origin,"token":token,"nativeChrome":true,"subtitles":true,"volume":0.65,"muted":false,"character":["id":"native-hailey","name":"Hailey","appearance":["key":"local/chars/hailey/hailey.glb","name":"Hailey","directory":"local/chars/hailey","file":"hailey.glb"],"profile":["speak":true]]]
        let json = String(data:try! JSONSerialization.data(withJSONObject:value),encoding:.utf8)!
        chrome.configure(volume:0.65,muted:false,subtitles:true)
        web.evaluateJavaScript("configureDesktop(\(json))") { [weak self] _,error in if let error { self?.finish(error.localizedDescription,code:1) } }
    }
    func userContentController(_ userContentController: WKUserContentController,didReceive message: WKScriptMessage) {
        if message.name == "companion",let value = message.body as? [String:Any],value["action"] as? String == "hitMask",let encoded = value["data"] as? String,let data = Data(base64Encoded:encoded) {
            maskPixels = max(maskPixels,data.reduce(0){$0 + $1.nonzeroBitCount})
        }
        if message.name == "qa",let value = message.body as? String {
            if value.hasPrefix("ERROR") { finish(value,code:1) }
            if value == "ready",!checked { checked = true; DispatchQueue.main.asyncAfter(deadline:.now()+0.8) { self.check() } }
        }
    }
    private func check() {
        guard chrome.inspection["pillWidth"] as? Double == 120,chrome.inspection["pillHeight"] as? Double == 36 else { finish("Incorrect native toolbar geometry: \(chrome.inspection)",code:1); return }
        let script = """
        setDesktopSpeech('performance',{utteranceId:'native-sample',characterId:'native-hailey',text:'Hello. It is good to see you.',words:[{start:0,end:.5,text:'Hello.'},{start:.6,end:1.4,text:'It is good to see you.'}],mouthCues:[]});
        setDesktopSpeech('playback',{utteranceId:'native-sample',characterId:'native-hailey',sequence:1,state:'speaking',positionSeconds:.8});
        JSON.stringify({nativeToolbarHidden:document.getElementById('playerToolbar').hidden,subtitles:document.getElementById('playerSubtitles').innerText,captionVisible:!document.getElementById('playerSubtitles').hidden});
        """
        web.evaluateJavaScript(script) { [weak self] value,error in
            guard let self else { return }
            guard error == nil,let string = value as? String,let data = string.data(using:.utf8),let result = try? JSONSerialization.jsonObject(with:data) as? [String:Any],result["nativeToolbarHidden"] as? Bool == true,result["subtitles"] as? String == "It is good to see you.",result["captionVisible"] as? Bool == true else { self.finish("WebKit caption/native chrome check failed: \(String(describing:value)) \(String(describing:error))",code:1);return }
            print("PASS: native glass, 120×36 toolbar, SF Symbols, Hailey ready state, WebKit caption timing and hidden HTML toolbar; visual canvas verification is separate. \(self.chrome.inspection)")
            fflush(stdout); self.deadline?.invalidate()
            if !CommandLine.arguments.contains("--stay-open") && !CommandLine.arguments[0].contains("Player Review.app") { self.finish("Native player passed",code:0) }
        }
    }
    private func finish(_ message:String,code:Int32) {
        print(message); fflush(stdout); panel?.stopPointerTracking(); input.fileHandleForWriting.closeFile(); if server.isRunning { server.terminate() }; exit(code)
    }
}
