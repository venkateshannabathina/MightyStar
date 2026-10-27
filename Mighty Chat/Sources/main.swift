import Cocoa
import WebKit
import Security
import LocalAuthentication

final class CompanionWebView: WKWebView {
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

private final class AudioSpikeMetrics {
    private let lock = NSLock()
    private var count = 0
    private var peak: Float = 0
    func add(_ samples: [Float]) {
        let localPeak = samples.reduce(Float(0)) { max($0, abs($1)) }
        lock.lock(); count += samples.count; peak = max(peak, localPeak); lock.unlock()
    }
    func snapshot() -> (Int, Float) {
        lock.lock(); defer { lock.unlock() }
        return (count, peak)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler, NSWindowDelegate {
    var window: NSWindow!
    var web: WKWebView!
    private var companionWindow: CompanionPanel?
    private var desktopWeb: WKWebView?
    private var playerChrome: PlayerChromeView?
    private var desktopConfig: [String: Any]?
    private var desktopMode = "overlay"
    private var restoringDesktopFrame = false
    private var statusItem: NSStatusItem!
    private var selectedCharacter: [String:Any]?
    private var onboardingController: OnboardingController?
    private var initialFlowStarted = false
    private var pendingOnboardingLaunch: [String: String]?
    private var applyingOnboardingLaunch = false

    private var statusMode = "standard"
    private var statusPlaying = true
    private var outputVolume: Double = UserDefaults.standard.object(forKey:"companionOutputVolume") == nil ? 1 : min(1,max(0,UserDefaults.standard.double(forKey:"companionOutputVolume")))
    private var outputMuted = UserDefaults.standard.bool(forKey:"companionOutputMuted")
    private var playerSubtitles = UserDefaults.standard.object(forKey:"playerSubtitles") == nil ? true : UserDefaults.standard.bool(forKey:"playerSubtitles")
    private func syncCompanionOutput() {
        liveCall?.setOutputVolume(outputVolume)
        liveCall?.setOutputMuted(outputMuted || ((selectedCharacter?["profile"] as? [String:Any])?["speak"] as? Bool == false))
        playerChrome?.configure(volume:outputVolume,muted:outputMuted,subtitles:playerSubtitles)
        callJavaScript("setCompanionOutput",["volume":outputVolume,"muted":outputMuted])
        sendDesktopSpeech(kind:"output",value:["volume":outputVolume,"muted":outputMuted])
    }
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if sender === companionWindow, desktopMode == "player" { returnToChatView(); return false }
        return true
    }
    func windowDidResize(_ notification: Notification) { savePlayerFrame(notification); playerChrome?.positionInHost() }
    func windowDidMove(_ notification: Notification) { savePlayerFrame(notification) }
    private func savePlayerFrame(_ notification: Notification) {
        if let panel = notification.object as? NSWindow, panel === companionWindow, desktopMode == "player", !restoringDesktopFrame {
            UserDefaults.standard.set(NSStringFromRect(panel.frame),forKey:"companionFrame-player")
        }
    }
    private let talkKey = HoldToTalkKey()
    private var keyboardHeld = false
    // The hint teaches the shortcut once per app launch, including when the
    // desktop web view is closed and recreated during the same launch.
    private var talkHintDismissed = false
    private var desktopTalkHeld = false
    private var desktopInputLevel = 0.0
    private var callState = "idle"
    private var callLabel = "Ready"
    private let credentials = CredentialStore()
    private var settingsController: AISettingsController?
    private var characterEditor: CharacterEditorController?
    private var studioSettingsVisible = false
    private lazy var homeBackgrounds: HomeBackgroundStore = {
        let store = HomeBackgroundStore()
        store.send = { [weak self] name, value in self?.callJavaScript(name, value) }
        store.window = { [weak self] in self?.window }
        return store
    }()
    private lazy var uiControls: UIControls = {
        let controller = UIControls()
        controller.send = { [weak self] name, value in self?.callJavaScript(name,value) }
        controller.window = { [weak self] in self?.window }
        controller.endCall = { [weak self] in self?.liveCall?.end() }
        controller.captureShortcut = { [weak self] enabled in self?.talkKey.capturing=enabled; self?.talkKey.release() }
        return controller
    }()
    private var aiProvider: String { UserDefaults.standard.string(forKey: "aiProvider") ?? "groq" }
    private func refreshStatusMenu() {
        if statusItem == nil { statusItem = NSStatusBar.system.statusItem(withLength:NSStatusItem.variableLength) }
        let name = selectedCharacter?["name"] as? String ?? "MightyStar"
        statusItem.button?.image = NSImage(systemSymbolName: keyboardHeld && liveCall != nil ? "mic.fill" : "waveform", accessibilityDescription: "Live conversation")
        statusItem.button?.imagePosition = .imageLeading
        statusItem.button?.title = " " + String(name.prefix(12)) + (liveCall == nil ? "" : " · " + callLabel)
        statusItem.button?.toolTip = name + " · Hold " + (UserDefaults.standard.string(forKey: "holdToTalkKey") ?? "Fn") + " to talk"
        let menu = NSMenu()
        let heading = NSMenuItem(title:name + " · " + (liveCall == nil ? "Ready" : callLabel),action:nil,keyEquivalent:"")
        menu.addItem(heading); menu.addItem(.separator())
        let callItem = menu.addItem(withTitle: liveCall == nil ? "Start conversation" : "End conversation", action: #selector(statusCall), keyEquivalent: "")
        callItem.target = self; callItem.isEnabled = selectedCharacter != nil
        for (title,action) in [("Ask · Open chat",#selector(statusAsk)),("AI & voice settings",#selector(statusSettings)),(statusPlaying ? "Live action · Pause idle" : "Live action · Resume idle",#selector(statusMotion))] {
            let item = menu.addItem(withTitle:title,action:action,keyEquivalent:"");item.target=self;item.isEnabled=selectedCharacter != nil
        }
        let views = NSMenu(); let parent = menu.addItem(withTitle:"View mode",action:nil,keyEquivalent:"");parent.submenu=views
        for mode in ["standard","overlay","portrait","player","screensaver","holographic"] {
            let item = views.addItem(withTitle:mode == "standard" ? "Chat" : mode == "player" ? "Player View" : mode.capitalized,action:#selector(statusView(_:)),keyEquivalent:"")
            item.target=self;item.representedObject=mode;item.state=statusMode == mode ? .on : .off;item.isEnabled=selectedCharacter != nil
        }
        menu.addItem(.separator());let quit=menu.addItem(withTitle:"Quit MightyStar",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"");quit.target=NSApp
        statusItem.menu=menu
    }
    @objc private func statusCall() {
        if let call = liveCall { keyboardHeld = false; call.end() }
        else { web.evaluateJavaScript("window.startKeyboardCall?.()", completionHandler: nil) }
    }
    private func handleTalkKey(_ down: Bool) {
        keyboardHeld = down
        updateDesktopTalkHeld(down)
        if down {
            if let call = liveCall { call.beginHold() }
            else { web.evaluateJavaScript("window.startKeyboardCall?.()", completionHandler: nil) }
        } else { liveCall?.endHold() }
        refreshStatusMenu()
    }
    private func updateDesktopTalkHeld(_ held: Bool) {
        var script = ""
        if held && !talkHintDismissed {
            talkHintDismissed = true
            script += "window.setDesktopTalkHintDismissed?.(true);"
        }
        desktopTalkHeld = held
        script += "window.setDesktopTalkHeld?.(\(held));"
        if !held {
            desktopInputLevel = 0
            script += "window.setDesktopInputLevel?.(0);"
        }
        desktopWeb?.evaluateJavaScript(script,completionHandler:nil)
    }
    private func reportCallStatus(_ state: String, _ label: String) {
        callState = state
        callLabel = label == "Hold to talk" ? "Ready" : label
        if state == "idle" || state == "error" {
            keyboardHeld = false
            updateDesktopTalkHeld(false)
        }
        callJavaScript("liveCallStatus", ["state":state, "label":label])
        if let data = try? JSONSerialization.data(withJSONObject: [state,label]), let json = String(data:data,encoding:.utf8) {
            desktopWeb?.evaluateJavaScript("window.setDesktopCallStatus?.(...\(json))",completionHandler:nil)
        }
        refreshStatusMenu()
    }
    private func returnToChatView() {
        closeDesktop(); statusMode = "standard"; refreshStatusMenu()
        window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps:true)
        // A presentation change keeps the live call and current reply running.
        web.evaluateJavaScript("chooseViewMode('standard')",completionHandler:nil)
    }
    @objc private func statusAsk() {closeDesktop();statusMode="standard";refreshStatusMenu();window.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true);web.evaluateJavaScript("window.companionHostAction('ask')",completionHandler:nil)}
    @objc private func statusSettings() {window.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true);web.evaluateJavaScript("openCharacterSettings()",completionHandler:nil)}
    @objc private func statusMotion() {statusPlaying.toggle();refreshStatusMenu();desktopConfig?["playing"]=statusPlaying;desktopWeb?.evaluateJavaScript("window.setDesktopMotion(\(statusPlaying))",completionHandler:nil);web.evaluateJavaScript("window.setCompanionMotion(\(statusPlaying))",completionHandler:nil)}
    @objc private func statusView(_ sender:NSMenuItem) {
        guard let mode=sender.representedObject as? String else{return}
        web.evaluateJavaScript("chooseViewMode('\(mode)')",completionHandler:nil)
    }
    private func configuration(homeBackgrounds enabled: Bool = false) -> WKWebViewConfiguration {
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "companion")
        if enabled {
            config.setURLSchemeHandler(homeBackgrounds, forURLScheme: "mighty-background")
            config.userContentController.addUserScript(WKUserScript(source: "window.mightyOnboardingManaged=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        return config
    }
    private var backendStartID = UUID()
    private var companionServer: Process?
    private var serverInput: Pipe?
    private var companionOrigin: String?
    private var companionToken: String?
    private var activeSpeechPerformance: [String:Any]?
    private var activeSpeechSnapshot: [String:Any]?
    private var facePhases: [String:[String:Any]] = [:]
    private var liveCall: LiveCallRuntime?

    private func callJavaScript(_ name: String, _ value: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: value),
              let json = String(data: data, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.\(name)?.(\(json))", completionHandler: nil)
    }
    private func startLiveCall(_ body: [String: Any]) {
        guard liveCall == nil, let character = body["character"] as? [String: Any],
              let selected = selectedCharacter, character["id"] as? String == selected["id"] as? String else { return }
        let requestedProvider = (character["profile"] as? [String:Any])?["aiProvider"] as? String ?? aiProvider
        let replyProvider = ["groq","openai","gemini","anthropic"].contains(requestedProvider) ? requestedProvider : aiProvider
        guard credentials.read(replyProvider) != nil else {
            reportCallStatus("error", "Paste your " + replyProvider.capitalized + " API key in AI & Voice Settings and save it once.")
            return
        }
        if ["anthropic","gemini"].contains(replyProvider) && credentials.read("groq") == nil && credentials.read("openai") == nil {
            reportCallStatus("error", "Add a Groq or OpenAI key for voice transcription. Your chosen model still handles replies."); return
        }
        guard let origin = companionOrigin, let token = companionToken else {
            reportCallStatus("error", "The local backend is still starting.")
            return
        }
        let history = body["history"] as? [[String: String]] ?? []
        do {
            let call = try LiveCallRuntime(character: character, origin: origin, token: token, history: history)
            liveCall = call
            syncCompanionOutput()
            call.onStatus = { [weak self, weak call] state, label in
                guard let self, let call, self.liveCall === call else { return }
                if state == "idle" || state == "error" { self.liveCall = nil }
                self.reportCallStatus(state,label)
            }
            call.onInputLevel = { [weak self, weak call] value in
                guard let self, let call, self.liveCall === call else { return }
                let level = self.desktopTalkHeld && value.isFinite ? min(1,max(0,value)) : 0
                self.desktopInputLevel = level
                self.desktopWeb?.evaluateJavaScript("window.setDesktopInputLevel?.(\(level))",completionHandler:nil)
            }
            call.onMessage = { [weak self] role, text in self?.callJavaScript("liveCallMessage", ["role":role, "text":text]) }
            call.onPhase = { [weak self] value in self?.callJavaScript("liveCallSpeech", ["kind":"phase", "value":value]) }
            call.onTurnMeta = { [weak self] meta in self?.callJavaScript("liveCallTurnMeta", meta) }
            call.onPerformance = { [weak self] value in
                self?.callJavaScript("liveCallSpeech", ["kind":"performance", "value":value])
            }
            call.onPlayback = { [weak self] value in
                self?.callJavaScript("liveCallSpeech", ["kind":"playback", "value":value])
            }
            call.start()
            if keyboardHeld { call.beginHold() }
        } catch { reportCallStatus("error",error.localizedDescription) }
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        if ProcessInfo.processInfo.environment["MIGHTY_AUDIO_SPIKE"] == "1" {
            Task { @MainActor in
                do {
                    let host = try AudioHost()
                    let metrics = AudioSpikeMetrics()
                    host.onCapture = { samples, _ in metrics.add(samples) }
                    try await host.start()
                    NSLog("Audio spike: input %@ at %.0f Hz, voice processing %@", host.inputDeviceName, host.sampleRate, host.voiceProcessingEnabled ? "enabled" : "unavailable")
                    host.playFixtureTone()
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    let (samples, peak) = metrics.snapshot()
                    NSLog("Audio spike: captured %d samples, peak %.6f, overruns %llu", samples, peak, host.captureOverruns)
                    host.stop()
                } catch { NSLog("Audio spike failed: %@", String(describing: error)) }
                NSApp.terminate(nil)
            }
            return
        }
        let menu = NSMenu()
        let appItem = NSMenuItem(); menu.addItem(appItem)
        let appMenu = NSMenu(); appItem.submenu = appMenu
        appMenu.addItem(withTitle: "About MightyStar", action: #selector(about), keyEquivalent: "")
        appMenu.addItem(withTitle: "Settings…", action: #selector(statusSettings), keyEquivalent: ",")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit MightyStar", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let editItem = NSMenuItem(); editItem.title = "Edit"; menu.addItem(editItem)
        let edit = NSMenu(title: "Edit"); editItem.submenu = edit
        for (title, action, key) in [("Undo", "undo:", "z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] { edit.addItem(withTitle: title, action: Selector(action), keyEquivalent: key) }
        NSApp.mainMenu = menu
        refreshStatusMenu()
        let windowStyle: NSWindow.StyleMask = [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView]
        // Include the transparent title bar in the default 16:9 window geometry.
        let launchFrame = NSRect(x: 0, y: 0, width: 1280, height: 720)
        window = NSWindow(contentRect: NSWindow.contentRect(forFrameRect: launchFrame, styleMask: windowStyle), styleMask: windowStyle, backing: .buffered, defer: false)
        window.title = "MightyStar"; window.titleVisibility = .hidden; window.titlebarAppearsTransparent = true
        window.minSize = NSSize(width: 880, height: 600)
        window.backgroundColor = NSColor(calibratedRed:34.0/255.0,green:39.0/255.0,blue:43.0/255.0,alpha:1)
        window.appearance = NSAppearance(named:.darkAqua)
        window.sharingType = UserDefaults.standard.object(forKey:"mightyScreenRecordings") as? Bool == false ? .none : .readOnly
        web = WKWebView(frame: window.contentView!.bounds, configuration: configuration(homeBackgrounds: true))
        web.autoresizingMask = [.width, .height]; web.uiDelegate = self; web.navigationDelegate = self
        let content = NSView(frame:window.contentView!.bounds)
        content.addSubview(web)
        window.contentView = content
        let url = Bundle.main.url(forResource: "index", withExtension: "html")!
        web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        credentials.onLoaded = { [weak self] in
            guard let self, self.liveCall == nil else { return }
            self.stopCompanionServer(); self.startCompanionServer()
        }
        startCompanionServer()
        window.center() // The welcome surface or selected overlay owns first presentation.
        talkKey.isEnabled = { [weak self] in
            guard let self else { return false }
            return self.selectedCharacter != nil && !self.studioSettingsVisible && self.characterEditor == nil && self.settingsController?.window?.isVisible != true && UserDefaults.standard.object(forKey: "holdToTalkEnabled") as? Bool != false
        }
        talkKey.onChange = { [weak self] down in self?.handleTalkKey(down) }
        talkKey.onCaptured = { [weak self] shortcut in self?.callJavaScript("mightyUICaptured",["shortcut":shortcut]) }
        talkKey.onTextMode = { [weak self] in
            guard let self else { return }
            self.window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps:true)
            self.web.evaluateJavaScript("window.mightyUITextMode?.()",completionHandler:nil)
        }
        talkKey.start()
        if UserDefaults.standard.object(forKey:"mightyShowDock") as? Bool == false { NSApp.setActivationPolicy(.accessory) }
        NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.willSleepNotification, object: nil, queue: .main) { [weak self] _ in
            self?.talkKey.release(); self?.liveCall?.end()
        }
    }
    private func beginInitialFlowIfNeeded() {
        guard !initialFlowStarted else { return }
        initialFlowStarted = true
        let defaults = UserDefaults.standard
        let provider = defaults.string(forKey: "aiProvider") ?? "groq"
        if defaults.bool(forKey: "onboardingV01Complete"),
           let character = defaults.string(forKey: "onboardingCharacter"),
           OnboardingController.characters.contains(character), credentials.read(provider) != nil {
            pendingOnboardingLaunch = ["character": character, "provider": provider, "model": defaults.string(forKey: "aiModel") ?? "openai/gpt-oss-20b"]
            attemptOnboardingLaunch()
        } else {
            let controller = OnboardingController(credentials: credentials)
            controller.onComplete = { [weak self] character, provider, model in
                guard let self else { return }
                self.pendingOnboardingLaunch = ["character": character, "provider": provider, "model": model]
                self.stopCompanionServer(); self.startCompanionServer()
            }
            onboardingController = controller
            controller.showWindow(nil)
            controller.window?.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
        }
    }
    private func attemptOnboardingLaunch() {
        guard !applyingOnboardingLaunch, companionOrigin != nil, let launch = pendingOnboardingLaunch,
              let data = try? JSONSerialization.data(withJSONObject: launch), let json = String(data: data, encoding: .utf8) else { return }
        applyingOnboardingLaunch = true
        web.evaluateJavaScript("window.mightyLaunchOnboardedCharacter?.(\(json)) ?? false") { [weak self] value, error in
            guard let self else { return }
            self.applyingOnboardingLaunch = false
            guard error == nil, value as? Bool == true else { return }
            UserDefaults.standard.set(true, forKey: "onboardingV01Complete")
            UserDefaults.standard.set(launch["character"], forKey: "onboardingCharacter")
            self.pendingOnboardingLaunch = nil
            self.onboardingController?.finish(); self.onboardingController = nil
            self.window.orderOut(nil)
        }
    }
    private func startCompanionServer() {
        let startID = UUID()
        backendStartID = startID
        credentials.loadSavedKeys { [weak self] in
            guard let self, self.backendStartID == startID else { return }
            self.launchCompanionServer()
            self.beginInitialFlowIfNeeded()
        }
    }
    private func launchCompanionServer() {
        guard let resources = Bundle.main.resourceURL else { return }
        let input = Pipe()
        let server = Process()
        server.executableURL = resources.appendingPathComponent("node")
        server.arguments = [resources.appendingPathComponent("companion-server.cjs").path]
        server.standardInput = input
        var environment = AppEnvironment.backendEnvironment(ProcessInfo.processInfo.environment)
        for provider in ["groq", "openai", "anthropic", "gemini"] {
            environment.removeValue(forKey: provider.uppercased() + "_API_KEY")
            if let key = credentials.read(provider) { environment[provider.uppercased() + "_API_KEY"] = key }
        }
        let python = resources.appendingPathComponent("Python/bin/python3").path
        if FileManager.default.isExecutableFile(atPath: python) {
            environment["MIGHTY_MIND_PYTHON"] = python
            environment["MIGHTY_PYTHON"] = python
        }
        environment["MIGHTY_AI_PROVIDER"] = aiProvider
        environment["MIGHTY_AI_MODEL"] = UserDefaults.standard.string(forKey: "aiModel") ?? (aiProvider == "anthropic" ? "claude-sonnet-4-20250514" : aiProvider == "openai" ? "gpt-4.1-mini" : "openai/gpt-oss-20b")
        server.environment = environment
        let output = Pipe()
        server.standardOutput = output
        server.standardError = FileHandle.standardError
        var startupData = Data()
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            startupData.append(handle.availableData)
            guard startupData.count < 16384, let newline = startupData.firstIndex(of: 10) else { return }
            let jsonData = Data(startupData[..<newline])
            guard
                  let value = try? JSONSerialization.jsonObject(with: jsonData) as? [String:Any],
                  let port = value["port"] as? Int, port > 0,
                  let token = value["token"] as? String, !token.isEmpty else { return }
            handle.readabilityHandler = nil
            DispatchQueue.main.async {
                guard self?.companionServer === server else { return }
                self?.companionOrigin = "http://127.0.0.1:\(port)"
                self?.companionToken = token
                self?.configureCompanion()
                if self?.desktopConfig != nil {
                    self?.desktopConfig?["origin"] = self?.companionOrigin
                    self?.desktopConfig?["token"] = token
                    self?.sendDesktopConfiguration()
                }
            }
        }
        do { try server.run(); companionServer = server; serverInput = input }
        catch { NSLog("Companion viewer could not start: %@", error.localizedDescription) }
    }
    private func stopCompanionServer() {
        backendStartID = UUID()
        try? serverInput?.fileHandleForWriting.close()
        if companionServer?.isRunning == true { companionServer?.terminate() }
        serverInput = nil; companionServer = nil; companionOrigin = nil; companionToken = nil
    }
    private func configureCompanion() {
        guard let origin = companionOrigin, let token = companionToken else { return }
        web.evaluateJavaScript("window.configureCompanion?.('\(origin)','\(token)')") { [weak self] _, _ in self?.attemptOnboardingLaunch() }
        syncCompanionOutput()
        characterEditor?.updateSession(origin:origin,token:token)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if webView === desktopWeb {
            sendDesktopConfiguration()
            DispatchQueue.main.asyncAfter(deadline:.now()+3) { [weak self,weak webView] in
                guard let self,let webView,webView === self.desktopWeb else { return }
                webView.evaluateJavaScript("JSON.stringify({mode:document.body.className,hidden:document.hidden,width:innerWidth,height:innerHeight,canvasFrame:document.getElementById('viewer').getBoundingClientRect().toJSON()})") { value,error in
                    NSLog("Player surface state %@; mask bytes %d",String(describing:value ?? error?.localizedDescription ?? "unavailable"), self.companionWindow?.hitMap?.bytes.filter { $0 != 0 }.count ?? -1)
                }
            }
        } else { configureCompanion() }
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // A terminated WebKit process leaves a transparent panel behind. Reload
        // its trusted entry point; didFinish replays the current session/config.
        if webView === desktopWeb, let url = Bundle.main.url(forResource:"desktop",withExtension:"html") {
            companionWindow?.hitMap = nil
            webView.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent())
        } else if webView === web { webView.reload() }
    }
    private func sendDesktopConfiguration() {
        guard var value = desktopConfig else { return }
        value["talkHintDismissed"] = talkHintDismissed
        value["talkHeld"] = desktopTalkHeld
        value["volume"] = outputVolume
        value["muted"] = outputMuted
        value["subtitles"] = playerSubtitles
        value["nativeChrome"] = playerChrome != nil
        playerChrome?.configure(volume:outputVolume,muted:outputMuted,subtitles:playerSubtitles)
        guard let data = try? JSONSerialization.data(withJSONObject: value), let json = String(data: data, encoding: .utf8) else { return }
        desktopWeb?.evaluateJavaScript("window.configureDesktop(\(json))") { _, error in if let error { NSLog("Player configuration failed: %@",error.localizedDescription) } }
        desktopWeb?.evaluateJavaScript("window.setDesktopInputLevel?.(\(desktopInputLevel))",completionHandler:nil)
        if let statusData = try? JSONSerialization.data(withJSONObject: [callState,callLabel]),
           let statusJSON = String(data:statusData,encoding:.utf8) {
            desktopWeb?.evaluateJavaScript("window.setDesktopCallStatus?.(...\(statusJSON))",completionHandler:nil)
        }
        if let character = value["character"] as? [String:Any], let id = character["id"] as? String,
           let phase = facePhases[id] { sendDesktopSpeech(kind:"phase",value:phase) }
        if let performance = activeSpeechPerformance { sendDesktopSpeech(kind:"performance",value:performance) }
        if let snapshot = activeSpeechSnapshot { sendDesktopSpeech(kind:"playback",value:snapshot) }
    }
    private func sendDesktopSpeech(kind:String,value:[String:Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject:value), let json = String(data:data,encoding:.utf8),
              let kindData = try? JSONSerialization.data(withJSONObject:kind,options:.fragmentsAllowed), let kindJSON = String(data:kindData,encoding:.utf8) else { return }
        desktopWeb?.evaluateJavaScript("window.setDesktopSpeech?.(\(kindJSON),\(json))",completionHandler:nil)
    }
    private func closeDesktop() {
        companionWindow?.stopPointerTracking()
        companionWindow?.orderOut(nil)
        desktopWeb?.loadHTMLString("", baseURL: nil)
        companionWindow = nil; desktopWeb = nil; desktopConfig = nil; playerChrome = nil
    }
    private func showDesktop(mode: String, character: [String: Any], playing: Bool, keepChatVisible: Bool = false) {
        guard let origin = companionOrigin, ["overlay","portrait","player","screensaver","holographic"].contains(mode) else { return }
        restoringDesktopFrame = true
        defer { restoringDesktopFrame = false }
        let oldCharacter = desktopConfig?["character"] as? [String:Any]
        let oldAppearance = oldCharacter?["appearance"] as? [String:Any]
        let newAppearance = character["appearance"] as? [String:Any]
        let characterChanged = oldCharacter?["id"] as? String != character["id"] as? String || oldAppearance?["key"] as? String != newAppearance?["key"] as? String
        let previousMode = desktopMode
        if companionWindow != nil, (previousMode == "player") != (mode == "player") { closeDesktop() }
        let creating = companionWindow == nil
        desktopMode = mode; statusMode = mode; refreshStatusMenu()
        desktopConfig = ["origin":origin,"token":companionToken ?? "","mode":mode,"character":character,"playing":playing,"shortcut":UserDefaults.standard.string(forKey:"holdToTalkKey") ?? "Fn"]
        if companionWindow == nil {
            let panel = CompanionPanel(contentRect: NSRect(x:0,y:0,width:360,height:620), styleMask:mode == "player" ? [.titled,.closable,.miniaturizable,.resizable,.fullSizeContentView] : [.borderless,.resizable], backing:.buffered, defer:false)
            panel.isFloatingPanel = true; panel.level = .floating; panel.isOpaque = false; panel.backgroundColor = .clear
            panel.hasShadow = false; panel.hidesOnDeactivate = false; panel.collectionBehavior = [.canJoinAllSpaces,.fullScreenAuxiliary]
            panel.minSize = NSSize(width:280,height:360)
            panel.onContextMenu = { [weak self] point in
                if self?.desktopMode == "player" { self?.playerChrome?.showViewMenu(); return }
                self?.desktopWeb?.evaluateJavaScript("window.openDesktopMenu?.(\(point.x),\(point.y))",completionHandler:nil)
            }
            panel.onDismissMenu = { [weak self] in
                self?.desktopWeb?.evaluateJavaScript("window.dismissDesktopMenu?.()",completionHandler:nil)
            }
            panel.onDismissControls = { [weak self] in
                self?.playerChrome?.dismissTransient()
                self?.desktopWeb?.evaluateJavaScript("window.dismissDesktopControls?.()",completionHandler:nil)
            }
            panel.onCharacterHover = { [weak self] hovered in
                self?.desktopWeb?.evaluateJavaScript("window.setDesktopHover?.(\(hovered))",completionHandler:nil)
            }
            panel.onGazePointer = { [weak self] point, valid in
                self?.desktopWeb?.evaluateJavaScript("window.setDesktopPointer?.(\(point.x),\(point.y),\(valid))",completionHandler:nil)
            }
            panel.onMoved = { [weak self] frame in
                guard let self else { return }
                UserDefaults.standard.set(NSStringFromRect(frame),forKey:"companionFrame-" + self.desktopMode)
            }
            let viewer = CompanionWebView(frame:panel.contentView!.bounds,configuration:configuration())
            viewer.autoresizingMask = [.width,.height]; viewer.navigationDelegate = self; viewer.setValue(false,forKey:"drawsBackground")
            let content = NSView(frame:panel.contentView!.bounds)
            viewer.frame = content.bounds
            content.addSubview(viewer)
            let chrome = PlayerChromeView(frame:content.bounds)
            content.addSubview(chrome)
            playerChrome = chrome
            chrome.onOutput = { [weak self] volume, muted in
                guard let self else { return }
                self.outputVolume = volume; self.outputMuted = muted
                UserDefaults.standard.set(volume,forKey:"companionOutputVolume")
                UserDefaults.standard.set(muted,forKey:"companionOutputMuted")
                self.syncCompanionOutput()
            }
            chrome.onSubtitles = { [weak self] enabled in
                self?.playerSubtitles = enabled
                UserDefaults.standard.set(enabled,forKey:"playerSubtitles")
                self?.sendDesktopConfiguration()
            }
            chrome.onView = { [weak self] mode in
                guard let self else { return }
                if mode == "standard" { self.returnToChatView() }
                else if let character = self.selectedCharacter {
                    self.showDesktop(mode:mode,character:character,playing:self.statusPlaying)
                    self.callJavaScript("companionModeChanged",["mode":mode])
                }
            }
            chrome.onRegions = { [weak panel] regions in panel?.nativeControlRegions = regions }
            panel.onPlayerPointer = { [weak chrome] point in if chrome?.isHidden == false { chrome?.sampleGlobalPointer() } }
            panel.onPlayerEscape = { [weak self,weak chrome] in
                if chrome?.handleEscape() != true { self?.returnToChatView() }
            }
            panel.contentView = content; companionWindow = panel; desktopWeb = viewer
        }
        guard let panel = companionWindow, let screen = window.screen ?? NSScreen.main else { return }
        if characterChanged {
            panel.hitMap = nil
            panel.refreshPointer()
        }
        desktopWeb?.setValue(false,forKey:"drawsBackground")
        panel.usesPlayerChrome = mode == "player"
        playerChrome?.setPlayerVisible(mode == "player")
        if mode != "player" { panel.nativeControlRegions = [] }
        panel.endCornerResize()
        // A second view request during bootstrap updates desktopConfig above.
        // Let the first navigation finish rather than cancelling it mid-load.
        let needsDesktopLoad = creating || (desktopWeb?.url == nil && desktopWeb?.isLoading != true)
        if needsDesktopLoad { desktopWeb?.stopLoading() }
        let desiredStyle: NSWindow.StyleMask = mode == "player" ? [.titled,.closable,.miniaturizable,.resizable,.fullSizeContentView] : [.borderless,.resizable]
        if panel.styleMask != desiredStyle { panel.styleMask = desiredStyle }
        panel.titleVisibility = .hidden
        panel.titlebarAppearsTransparent = true
        panel.isMovableByWindowBackground = false
        panel.hasShadow = mode == "player"
        panel.minSize = mode == "player" ? NSSize(width:320,height:320) : NSSize(width:280,height:360)
        panel.contentAspectRatio = mode == "player" ? NSSize(width:1,height:1) : NSSize.zero
        panel.delegate = self
        for type in [NSWindow.ButtonType.closeButton,.miniaturizeButton,.zoomButton] { panel.standardWindowButton(type)?.isHidden = mode == "player" }
        playerChrome?.needsLayout = true
        panel.silhouetteOnly = mode == "overlay"
        panel.allowsCharacterDrag = mode == "overlay" || mode == "portrait"
        if creating || previousMode != mode {
            panel.hitMap = nil
            let area = screen.visibleFrame
            if mode == "screensaver" || mode == "holographic" { panel.setFrame(screen.frame,display:true) }
            else {
                let playerSide = min(540,area.width,area.height)
                let size = mode == "player" ? NSSize(width:playerSide,height:playerSide) : mode == "portrait" ? NSSize(width:300,height:440) : NSSize(width:360,height:min(650,area.height))
                var rect = NSRect(x:area.midX-size.width/2,y:area.midY-size.height/2,width:size.width,height:size.height)
                if let saved = UserDefaults.standard.string(forKey:"companionFrame-" + mode) {
                    let stored = NSRectFromString(saved)
                    if stored.width >= 280, stored.width <= 1000, stored.height >= (mode == "player" ? 320 : 360), stored.height <= 1200,
                       NSScreen.screens.contains(where: { $0.visibleFrame.intersection(stored).width >= min(stored.width,100) && $0.visibleFrame.intersection(stored).height >= min(stored.height,100) }) { rect = stored }
                }
                panel.setFrame(rect,display:true)
            }
        }
        if creating { panel.startPointerTracking() }
        if keepChatVisible { panel.orderFront(nil) }
        else { panel.makeKeyAndOrderFront(nil); window.orderOut(nil) }
        if let content = panel.contentView {
            desktopWeb?.frame = content.bounds
            playerChrome?.positionInHost()
            content.layoutSubtreeIfNeeded()
            NSLog("Player renderer frame %@",NSStringFromRect(desktopWeb?.frame ?? .zero))
        }
        // Load only after the native content hierarchy is stable.
        // Begin/restart its first navigation only after the hierarchy is stable.
        if needsDesktopLoad {
            let url = Bundle.main.url(forResource:"desktop",withExtension:"html")!
            desktopWeb?.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent())
        } else { sendDesktopConfiguration() }
    }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let url = message.frameInfo.request.url, url.isFileURL,
              url.deletingLastPathComponent().standardizedFileURL == Bundle.main.resourceURL?.standardizedFileURL,
              let body = message.body as? [String:Any], let action = body["action"] as? String else { return }
        let desktop = message.webView === desktopWeb
        if message.webView === web && homeBackgrounds.handle(body) { return }
        if !desktop && uiControls.handle(body) { return }
        if desktop, action == "hitMask" {
            guard let panel = companionWindow, let width = body["width"] as? Int, let height = body["height"] as? Int,
                  let viewportWidth = body["viewportWidth"] as? Double, let viewportHeight = body["viewportHeight"] as? Double,
                  abs(viewportWidth - panel.frame.width) < 2, abs(viewportHeight - panel.frame.height) < 2,
                  let base64 = body["data"] as? String,
                  let mask = CompanionHitMap(width:width,height:height,base64:base64) else { return }
            panel.hitMap = mask; panel.refreshPointer(); return
        }
        if desktop, action == "interactionRegions" {
            guard let regions = body["regions"] as? [[String:Double]], regions.count <= 8 else { return }
            companionWindow?.controlRegions = regions.compactMap { r in
                guard let x=r["x"], let y=r["y"], let w=r["width"], let h=r["height"],
                      [x,y,w,h].allSatisfy({$0.isFinite}), w>0,h>0,w<=1,h<=1 else {return nil}
                return NSRect(x:x,y:y,width:w,height:h).intersection(NSRect(x:0,y:0,width:1,height:1))
            }
            companionWindow?.refreshPointer(); return
        }
        if desktop, action == "resizeCorner", let panel=companionWindow, panel.allowsCharacterDrag,
           let phase=body["phase"] as? String {
            if phase == "end" { panel.endCornerResize(); return }
            guard let x=body["x"] as? Double, let y=body["y"] as? Double, x.isFinite,y.isFinite else { return }
            if phase == "begin", let value=body["corner"] as? String, let corner=CompanionResize.Corner(rawValue:value) {
                panel.beginCornerResize(corner,at:NSPoint(x:x,y:y))
            } else if phase == "move" { panel.updateCornerResize(at:NSPoint(x:x,y:y)) }
            return
        }
        if action == "playerOutput" {
            if let volume = body["volume"] as? Double, volume.isFinite { outputVolume = min(1,max(0,volume)) }
            if let muted = body["muted"] as? Bool { outputMuted = muted }
            UserDefaults.standard.set(outputVolume,forKey:"companionOutputVolume")
            UserDefaults.standard.set(outputMuted,forKey:"companionOutputMuted")
            syncCompanionOutput(); return
        }
        if desktop, action == "playerSubtitles", let enabled = body["enabled"] as? Bool {
            playerSubtitles = enabled
            UserDefaults.standard.set(enabled,forKey:"playerSubtitles"); return
        }
        if desktop, action == "desktopTalk" {
            // Match the main chat's click-to-record toggle. A second click while
            // connecting is ignored there, so it must not collapse this UI.
            if callState != "connecting" { updateDesktopTalkHeld(!desktopTalkHeld) }
            web.evaluateJavaScript("window.toggleDesktopTalk?.()",completionHandler:nil); return
        }
        if desktop, action == "desktopMotion" { statusMotion(); return }
        if desktop, action == "desktopIdleStyle",
           let characterID = body["characterId"] as? String, characterID == selectedCharacter?["id"] as? String,
           let idleStyle = body["idleStyle"] as? String, ["male","female","dwarf2"].contains(idleStyle) {
            // The main view owns persistence and publishes a fresh character
            // only after saving succeeds, keeping both views in agreement.
            callJavaScript("applyIdleStyle",["characterId":characterID,"idleStyle":idleStyle]); return
        }
        if desktop, action == "desktopMute" {
            guard var character = selectedCharacter else { return }
            var profile = character["profile"] as? [String:Any] ?? [:]
            let speak = profile["speak"] as? Bool == false
            profile["speak"] = speak; character["profile"] = profile; selectedCharacter = character
            syncCompanionOutput()
            callJavaScript("applyVoiceSettings", ["characterId":character["id"] ?? "", "profile":profile])
            if !speak { web.evaluateJavaScript("cancelCharacterSpeech()",completionHandler:nil) }
            desktopConfig?["character"] = character; sendDesktopConfiguration(); return
        }
        if desktop, action == "desktopHide" {
            liveCall?.end(); closeDesktop(); statusMode="standard"; refreshStatusMenu()
            web.evaluateJavaScript("cancelCharacterSpeech();window.companionDidClose()",completionHandler:nil)
            window.makeKeyAndOrderFront(nil); return
        }
        if desktop, action == "desktopSize", let name = body["size"] as? String,
           let factor = ["small":0.8,"medium":1.0,"large":1.2][name],
           let panel=companionWindow, panel.allowsCharacterDrag {
            let base = desktopMode == "portrait" ? NSSize(width:300,height:440) : NSSize(width:360,height:650)
            let available = (panel.screen ?? NSScreen.main)?.visibleFrame ?? panel.frame
            let height = min(base.height * factor,available.height)
            let width = max(280,base.width * height / base.height)
            let rect = NSRect(x:max(available.minX,min(panel.frame.midX-width/2,available.maxX-width)),y:max(available.minY,min(panel.frame.minY,available.maxY-height)),width:width,height:height)
            panel.hitMap=nil;panel.setFrame(rect,display:true)
            UserDefaults.standard.set(NSStringFromRect(rect),forKey:"companionFrame-" + desktopMode);return
        }
        if action == "selection", !desktop {
            if let id = (body["character"] as? [String: Any])?["id"] as? String,
               let old = selectedCharacter?["id"] as? String, id != old { liveCall?.end() }
            selectedCharacter = body["character"] as? [String:Any]
            if UserDefaults.standard.bool(forKey: "onboardingV01Complete"),
               let profile = selectedCharacter?["profile"] as? [String: Any], let key = profile["personaId"] as? String,
               OnboardingController.characters.contains(key) { UserDefaults.standard.set(key, forKey: "onboardingCharacter") }

            syncCompanionOutput()
            if let mode=body["mode"] as? String {statusMode=mode}
            if desktopConfig != nil, let character = selectedCharacter {
                let previous = desktopConfig?["character"] as? [String:Any]
                let oldAppearance = previous?["appearance"] as? [String:Any]
                let nextAppearance = character["appearance"] as? [String:Any]
                if previous?["id"] as? String != character["id"] as? String || oldAppearance?["key"] as? String != nextAppearance?["key"] as? String {
                    companionWindow?.hitMap = nil
                    companionWindow?.refreshPointer()
                }
                desktopConfig?["character"] = character; sendDesktopConfiguration()
            }
            refreshStatusMenu();return
        }
        if action == "voicePreviewStatus", !desktop, let text = body["text"] as? String { settingsController?.reportPreview(String(text.prefix(300))); characterEditor?.reportPreview(String(text.prefix(300))); return }
        if action == "editCharacter", !desktop, message.webView === web,
           let character = body["character"] as? [String:Any], let catalog = body["catalog"] as? [[String:Any]], catalog.count <= 2000 {
            showCharacterEditor(character:character,catalog:catalog); return
        }
        if action == "aiSettings", !desktop { showAISetup(); return }
        if action == "settingsVisibility", !desktop { studioSettingsVisible = body["visible"] as? Bool == true; talkKey.release(); if !studioSettingsVisible { uiControls.stopTest() }; return }
        if action == "studioSettingsStatus", !desktop {
            var available: [String: Bool] = [:]
            for id in ["groq", "openai", "anthropic"] { available[id] = credentials.read(id) != nil }
            callJavaScript("studioSettingsStatus", ["provider": aiProvider, "model": UserDefaults.standard.string(forKey: "aiModel") ?? (aiProvider == "anthropic" ? "claude-sonnet-4-20250514" : aiProvider == "openai" ? "gpt-4.1-mini" : "openai/gpt-oss-20b"), "shortcut": UserDefaults.standard.string(forKey: "holdToTalkKey") ?? "Fn", "keys": available]); return
        }
        if action == "saveStudioSettings", !desktop { saveStudioSettings(body); return }

        if action == "callStart", !desktop { startLiveCall(body); return }
        if action == "callEnd", !desktop { updateDesktopTalkHeld(false); liveCall?.end(); return }
        if action == "callHoldBegin", !desktop { updateDesktopTalkHeld(true); liveCall?.beginHold(); return }
        if action == "callHoldEnd", !desktop { updateDesktopTalkHeld(false); liveCall?.endHold(); return }
        if action == "callText", !desktop, let text = body["text"] as? String { liveCall?.sendText(text); return }
        if action == "modeStatus", !desktop {if let mode=body["mode"] as? String {statusMode=mode};refreshStatusMenu();return}
        if action == "speech", !desktop, let kind = body["kind"] as? String, let value = body["value"] as? [String:Any] {
            if kind == "phase", let id = value["characterId"] as? String {
                var phase = value
                if phase["expression"] == nil { phase["expression"] = facePhases[id]?["expression"] }
                facePhases[id] = phase
                if facePhases.count > 64, let old = facePhases.keys.first(where: { $0 != id }) { facePhases.removeValue(forKey:old) }
            }
            if kind == "performance" { activeSpeechPerformance=value }
            else if kind == "playback" {
                activeSpeechSnapshot=value
                if let state=value["state"] as? String, ["ended","cancelled","error"].contains(state) { activeSpeechPerformance=nil }
            }
            sendDesktopSpeech(kind:kind,value:value);return
        }
        if action == "view", !desktop, let mode = body["mode"] as? String, let character = body["character"] as? [String:Any] { showDesktop(mode:mode,character:character,playing:body["playing"] as? Bool ?? true,keepChatVisible:body["keepChatVisible"] as? Bool ?? false) }
        else if action == "close", !desktop { closeDesktop(); window.makeKeyAndOrderFront(nil) }
        else if action == "motion", let playing = body["playing"] as? Bool {
            statusPlaying = playing; desktopConfig?["playing"] = playing; refreshStatusMenu()
            desktopWeb?.evaluateJavaScript("window.setDesktopMotion(\(playing))",completionHandler:nil)
        }
        else if desktop && (action == "ask" || action == "settings" || action == "file") {
            closeDesktop(); window.makeKeyAndOrderFront(nil)
            web.evaluateJavaScript("window.companionDidClose();window.companionHostAction('\(action == "file" ? "ask" : action)')",completionHandler:nil)
            if action == "file" {
                let chooser = NSOpenPanel(); chooser.allowedFileTypes = ["txt","md","csv","json","log"]
                chooser.allowsMultipleSelection = false; chooser.canChooseDirectories = false
                chooser.beginSheetModal(for:window) { [weak self] result in
                    guard result == .OK, let url = chooser.url else { return }
                    guard let size = try? url.resourceValues(forKeys:[.fileSizeKey]).fileSize, size <= 100000,
                          let text = try? String(contentsOf:url,encoding:.utf8) else {
                        self?.web.evaluateJavaScript("toast('Choose a UTF-8 text file smaller than 100 KB.')",completionHandler:nil);return
                    }
                    self?.callJavaScript("attachDesktopTextFile",["name":url.lastPathComponent,"text":text])
                }
            }
        } else if desktop && action == "desktopMode", let mode = body["mode"] as? String {
            if mode == "standard" { returnToChatView() }
            else if mode == "docked" {closeDesktop();window.makeKeyAndOrderFront(nil);web.evaluateJavaScript("window.companionHostAction('docked')",completionHandler:nil)}
            else if let character = desktopConfig?["character"] as? [String:Any] {
                showDesktop(mode:mode,character:character,playing:desktopConfig?["playing"] as? Bool ?? true)
                callJavaScript("companionModeChanged",["mode":mode])
            }
        } else if desktop && (action == "move" || action == "resize"), desktopMode != "screensaver", desktopMode != "holographic", let panel = companionWindow,
                  let dx = body["dx"] as? Double, let dy = body["dy"] as? Double, dx.isFinite, dy.isFinite {
            var frame = panel.frame
            if action == "move" { frame.origin.x += max(-100,min(100,dx)); frame.origin.y -= max(-100,min(100,dy)) }
            else { let h = max(280,min(1200,frame.height+dy));frame.origin.y -= h-frame.height;frame.size.height=h;frame.size.width=max(220,min(1000,frame.width+dx)) }
            panel.setFrame(frame,display:true)
        }
    }
    func applicationWillTerminate(_ notification: Notification) {
        uiControls.stopTest()
        talkKey.stop()
        liveCall?.end()
        closeDesktop()
        stopCompanionServer()
    }
    private func saveStudioSettings(_ body: [String: Any]) {
        func report(_ ok: Bool, _ message: String) { callJavaScript("studioSettingsSaved", ["ok":ok,"message":message]) }
        guard let id = body["characterId"] as? String, id == selectedCharacter?["id"] as? String,
              let provider = body["provider"] as? String, ["groq","openai","anthropic"].contains(provider),
              let model = body["model"] as? String, !model.isEmpty, model.count <= 100,
              let profile = body["profile"] as? [String: Any],
              let keys = body["keys"] as? [String: String],
              let shortcut = body["shortcut"] as? String, HoldToTalkKey.isValid(shortcut) else { report(false,"Settings were not valid. Reopen this panel and retry."); return }
        for providerID in ["groq","openai","anthropic"] {
            let key = keys[providerID] ?? ""
            if !key.isEmpty && (key.count > 1024 || !key.hasPrefix(providerID == "groq" ? "gsk_" : "sk-") || key.contains(where: { $0.isWhitespace })) { report(false,"Check the \(providerID) API key format."); return }
        }
        for providerID in ["groq","openai","anthropic"] {
            if let key = keys[providerID], !key.isEmpty, !credentials.save(key, provider: providerID) { report(false,"Keychain could not save \(providerID). Paste the key again in AI Setup and save it once."); return }
        }
        liveCall?.end()
        UserDefaults.standard.set(provider, forKey:"aiProvider")
        UserDefaults.standard.set(model, forKey:"aiModel")
        UserDefaults.standard.set(shortcut, forKey:"holdToTalkKey")
        selectedCharacter?["profile"] = profile
        callJavaScript("applyVoiceSettings", ["characterId":id,"profile":profile])
        stopCompanionServer(); startCompanionServer(); refreshStatusMenu()
        report(true,"Saved.")
    }
    private func showCharacterEditor(character: [String:Any], catalog: [[String:Any]]) {
        guard characterEditor == nil, let origin = companionOrigin, let token = companionToken else { return }
        talkKey.release(); liveCall?.end()
        web.evaluateJavaScript("cancelCharacterSpeech()",completionHandler:nil)
        let editor = CharacterEditorController(character:character,catalog:catalog,origin:origin,token:token,credentials:credentials)
        editor.onCancel = { [weak self] in self?.closeCharacterEditor() }
        editor.onSave = { [weak self] draft, done in
            guard let self, let data = try? JSONSerialization.data(withJSONObject:draft), let json = String(data:data,encoding:.utf8) else { done("Character data couldn’t be read."); return }
            self.web.evaluateJavaScript("window.applyNativeCharacterEditor(\(json))") { [weak self] value,error in
                if error != nil { done("The character could not be saved. Please try again."); return }
                guard let result = value as? [String:Any], result["ok"] as? Bool == true else { done((value as? [String:Any])?["error"] as? String ?? "Please try again."); return }
                done(nil); self?.closeCharacterEditor()
            }
        }
        editor.onPreview = { [weak self] profile in self?.callJavaScript("previewVoiceSettings",["profile":profile]) }
        editor.onCredentialsChanged = { [weak self] in self?.stopCompanionServer(); self?.startCompanionServer() }
        characterEditor = editor
        guard let content = window.contentView else { characterEditor = nil; return }
        editor.view.frame = content.bounds; editor.view.autoresizingMask = [.width,.height]
        content.addSubview(editor.view); web.isHidden = true
        window.makeFirstResponder(editor.view)
    }
    private func closeCharacterEditor() {
        characterEditor?.stop(); characterEditor = nil; web.isHidden = false
        web.evaluateJavaScript("cancelCharacterSpeech()",completionHandler:nil)
        window.makeFirstResponder(web)
    }
    @objc private func showAISetup() {
        if let settings = settingsController, settings.window?.isVisible == true { settings.window?.makeKeyAndOrderFront(nil); return }
        let controller = AISettingsController(credentials: credentials, profile: selectedCharacter?["profile"] as? [String: Any] ?? [:], characterName: selectedCharacter?["name"] as? String ?? "the selected character")
        let characterID = selectedCharacter?["id"] as? String
        controller.onSave = { [weak self] provider, model, profile in
            guard let self else { return }
            self.liveCall?.end()
            UserDefaults.standard.set(provider, forKey: "aiProvider")
            UserDefaults.standard.set(model, forKey: "aiModel")
            self.stopCompanionServer(); self.startCompanionServer()
            if let characterID {
                self.callJavaScript("applyVoiceSettings", ["characterId": characterID, "profile": profile])
                if self.selectedCharacter?["id"] as? String == characterID { self.selectedCharacter?["profile"] = profile }
            }
        }
        controller.onPreview = { [weak self] profile in
            guard let self else { return }
            self.liveCall?.end()
            self.callJavaScript("previewVoiceSettings", ["profile": profile])
        }
        settingsController = controller; controller.showWindow(nil); controller.window?.makeKeyAndOrderFront(nil)
    }
    @objc func about() { let alert = NSAlert(); alert.messageText = "MightyStar"; alert.informativeText = "Characters and conversations stay on this Mac."; alert.runModal() }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { companionWindow == nil }
}
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
