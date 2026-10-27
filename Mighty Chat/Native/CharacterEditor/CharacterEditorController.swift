import Cocoa
import WebKit

private final class EditorCanvas: NSView {
    override var isFlipped: Bool { true }
    var onLayout: (() -> Void)?
    override func layout() { super.layout(); onLayout?() }
}
private final class BoneTuningSlider: NSSlider {
    var beginEdit: (() -> Void)?
    override func mouseDown(with event: NSEvent) { beginEdit?(); super.mouseDown(with:event) }
    override func keyDown(with event: NSEvent) { beginEdit?(); super.keyDown(with:event) }
}
private final class AnimationTuningBridge: NSObject, WKScriptMessageHandler {
    weak var editor: CharacterEditorController?
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String:Any] else { return }
        editor?.animationRigChanged(body)
    }
}
private enum EditorPalette {
    static let panel = NSColor(srgbRed:48.0/255.0,green:55.0/255.0,blue:61.0/255.0,alpha:1)
    static let field = NSColor(srgbRed:61.0/255.0,green:72.0/255.0,blue:82.0/255.0,alpha:1)
    static let secondary = NSColor(srgbRed:194.0/255.0,green:202.0/255.0,blue:215.0/255.0,alpha:1)
    static let accent = NSColor(srgbRed:252.0/255.0,green:60.0/255.0,blue:68.0/255.0,alpha:1)
    static let onAccent = NSColor(srgbRed:23.0/255.0,green:27.0/255.0,blue:31.0/255.0,alpha:1)
}
private final class EditorMaterial: NSView {
    override var isFlipped: Bool { true }
    init(radius: CGFloat, color: NSColor = EditorPalette.panel) {
        super.init(frame:.zero)
        wantsLayer = true; layer?.cornerRadius = radius; layer?.backgroundColor = color.cgColor
        layer?.borderWidth = 0.5; layer?.borderColor = NSColor.white.withAlphaComponent(0.08).cgColor
        layer?.shadowColor = NSColor.black.cgColor; layer?.shadowOpacity = 0.17
        layer?.shadowRadius = 15; layer?.shadowOffset = NSSize(width:0,height:-6)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
/// Retains AppKit selection, keyboard handling and accessibility with the reference's capsule artwork.
private final class EditorTabs: NSSegmentedControl {
    private func segmentRects() -> [NSRect] {
        let widths: [CGFloat] = [49,76,80,65,68]
        let available = max(1,bounds.width-6); let total = widths.reduce(0,+)
        var x: CGFloat = 3
        return widths.map { width in
            let rect = NSRect(x:x,y:3,width:available*width/total,height:bounds.height-6)
            x += rect.width; return rect
        }
    }
    override var selectedSegment: Int { didSet { needsDisplay = true } }
    override func draw(_ dirtyRect: NSRect) {
        EditorPalette.panel.setFill()
        NSBezierPath(roundedRect:bounds,xRadius:bounds.height/2,yRadius:bounds.height/2).fill()
        for (index,rect) in segmentRects().enumerated() {
            let selected = index == selectedSegment
            if selected {
                EditorPalette.field.setFill()
                NSBezierPath(roundedRect:rect,xRadius:rect.height/2,yRadius:rect.height/2).fill()
            }
            let title = (label(forSegment:index) ?? "") as NSString
            let style = NSMutableParagraphStyle(); style.alignment = .center
            title.draw(in:NSRect(x:rect.minX,y:rect.midY-8,width:rect.width,height:18),withAttributes:[.font:NSFont.systemFont(ofSize:12),.foregroundColor:selected ? NSColor.white : EditorPalette.secondary,.paragraphStyle:style])
        }
    }
    override func mouseDown(with event: NSEvent) {
        let point = convert(event.locationInWindow,from:nil)
        guard let index = segmentRects().firstIndex(where:{$0.contains(point)}) else { return }
        window?.makeFirstResponder(self); selectedSegment = index; sendAction(action,to:target)
    }
    override func keyDown(with event: NSEvent) {
        if [123,124].contains(Int(event.keyCode)) {
            selectedSegment = max(0,min(segmentCount-1,selectedSegment + (event.keyCode == 124 ? 1 : -1)))
            sendAction(action,to:target)
        } else { super.keyDown(with:event) }
    }
    override var focusRingMaskBounds: NSRect { bounds }
    override func drawFocusRingMask() { NSBezierPath(roundedRect:bounds,xRadius:bounds.height/2,yRadius:bounds.height/2).fill() }
}
private final class PortraitButton: NSButton {
    var portrait: NSImage? { didSet { needsDisplay = true } }
    var chosen = false { didSet { needsDisplay = true; setAccessibilityValue(chosen ? "Selected" : "") } }
    override func draw(_ dirtyRect: NSRect) {
        NSColor.controlBackgroundColor.withAlphaComponent(0.6).setFill()
        NSBezierPath(roundedRect: bounds.insetBy(dx: 2, dy: 2), xRadius: 9, yRadius: 9).fill()
        NSGraphicsContext.saveGraphicsState()
        NSBezierPath(roundedRect: bounds.insetBy(dx: 3, dy: 3), xRadius: 8, yRadius: 8).addClip()
        if let image = portrait, image.size.width > 0, image.size.height > 0 {
            let rect = bounds.insetBy(dx: 3, dy: 3)
            let side = min(image.size.width, image.size.height)
            image.draw(in: rect, from: NSRect(x: (image.size.width-side)/2, y: image.size.height-side, width: side, height: side), operation: .sourceOver, fraction: isHighlighted ? 0.7 : 1, respectFlipped: true, hints: nil)
        }
        NSGraphicsContext.restoreGraphicsState()
        if chosen {
            EditorPalette.accent.setStroke()
            let ring = NSBezierPath(roundedRect: bounds.insetBy(dx: 1, dy: 1), xRadius: 10, yRadius: 10)
            ring.lineWidth = 2; ring.stroke()
        }
    }
}

/// Native controls sit above a full-window renderer. Edits remain a draft until Save.
final class CharacterEditorController: NSViewController, WKNavigationDelegate, NSSearchFieldDelegate {
    private let credentials: CredentialStore
    private var character: [String:Any]
    private let memoryEnabled = ProcessInfo.processInfo.environment["MIGHTY_MEMORY_V1"] != "0"
    private var memoryLoaded = false
    private var memoryFacts: [[String: Any]] = []
    private var memoryEditors: [Int: NSTextView] = [:]
    private var memoryError = ""
    private var profile: [String:Any]
    private let catalog: [[String:Any]]
    private var appearance: [String:Any]
    private var origin: String
    private var token: String
    private let world: WKWebView
    private let panel = EditorMaterial(radius:22)
    private let facePanel = EditorMaterial(radius:18)
    private let faceListScroll = NSScrollView()
    private let faceListDocument = EditorCanvas()
    private let faceSearch = NSSearchField()
    private var facePresetID = "neutral"
    private var faceGroup = "All keys"
    private var faceActiveOnly = false
    private var faceComparing = false
    private var faceInventoryReady = false
    private var faceDefaults: [[String:Any]] = []
    private var faceCollapsed = Set<String>()
    private let faceGroups = ["Eyebrows","Eyes","Mouth","Mouth inside & teeth","Other model keys"]
    private var faceSliders: [String:NSSlider] = [:]
    private var faceNumbers: [String:NSTextField] = [:]
    private var faceChecks: [String:NSButton] = [:]
    private var faceCountLabel: NSTextField?
    private var faceCompareButton: NSButton?
    private var faceUndo: [[String:Any]] = [], faceRedo: [[String:Any]] = []
    private var faceUndoButton: NSButton?, faceRedoButton: NSButton?
    private var lastFacialEditing = false
    private let namePill = EditorMaterial(radius:20,color:EditorPalette.field)
    private let tabs = EditorTabs(labels:["About","Character","Editor","Memory","Agent"], trackingMode:.selectOne, target:nil, action:nil)
    private let name = NSTextField()
    private let back = NSButton(title:"Back", target:nil, action:nil)
    private let cancel = NSButton(title:"Cancel", target:nil, action:nil)
    private let save = NSButton(title:"Save", target:nil, action:nil)
    private let scroll = NSScrollView()
    private let document = EditorCanvas()
    private var aboutFields: [String:NSTextField] = [:]
    private var aboutText: [String:NSTextView] = [:]
    private let search = NSSearchField()
    private let group = NSPopUpButton()
    private var cards: [PortraitButton] = []
    private var imageCache: [String:NSImage] = [:]
    private var imagePending = Set<String>()
    private var failedPortraits = Set<String>()
    private var rosterOrder: [Int] = []
    private var imageQueue: [(String,URL)] = []
    private var imageTasks: [URLSessionDataTask] = []
    private var activeImages = 0
    private let provider = NSPopUpButton()
    private let model = NSComboBox()
    private let callReplyLimit = NSTextField(string: "220")
    private let chatReplyLimit = NSTextField(string: "300")
    private let replyFallbacks = NSTextField(string: "")
    private var latencyEnabled: Bool { ProcessInfo.processInfo.environment["MIGHTY_STREAM_CHAT"] == "1" }
    private let engine = NSPopUpButton()
    private let language = NSPopUpButton()
    private let voice = NSPopUpButton()
    private let idleStyle = NSPopUpButton()
    private let idleStyleIDs = ["male","female","dwarf2"]
    private let tuningBridge = AnimationTuningBridge()
    private let tuningBone = NSPopUpButton()
    private let tuningEnabled = NSSwitch()
    private let tuningShowBones = NSButton(checkboxWithTitle:"Skeleton",target:nil,action:nil)
    private let tuningFingers = NSButton(checkboxWithTitle:"Hand joints",target:nil,action:nil)
    private let tuningSnap = NSButton(checkboxWithTitle:"Snap 5°",target:nil,action:nil)
    private let tuningPhysics = NSSwitch()
    private let tuningJiggle = NSSwitch()
    private let tuningPhysicsNote = NSTextField(wrappingLabelWithString:"")
    private var physicsAvailable = false
    private var jiggleAvailable = false
    private var physicsState = "unavailable"
    private var physicsDetail = "Loading character…"
    private var fineBoneRotation = false
    private let tuningPlay = NSButton(title:"Pause preview",target:nil,action:nil)
    private var tuningPlaying = true
    private var availableTuningBones = Set<String>()
    private var tuningRigReady = false
    private let tuningNote = NSTextField(wrappingLabelWithString:"Loading skeleton…")
    private var tuningSliders: [BoneTuningSlider] = []
    private var tuningValues: [NSTextField] = []
    private var tuningUndo: [[String:Any]] = [], tuningRedo: [[String:Any]] = []
    private var tuningUndoButton: NSButton?, tuningRedoButton: NSButton?
    private let tuningJointIDs = ["Hips","Spine","Spine1","Spine2","Neck","Head","LeftShoulder","RightShoulder","LeftArm","RightArm","LeftForeArm","RightForeArm","LeftHand","RightHand","LeftUpLeg","RightUpLeg","LeftLeg","RightLeg","LeftFoot","RightFoot","LeftToeBase","RightToeBase"] + ["Left","Right"].flatMap { side in ["Thumb","Index","Middle","Ring","Pinky"].flatMap { finger in (1...3).map { "\(side)Hand\(finger)\($0)" } } }
    private let tuningJointNames = ["Pelvis","Lower spine","Middle spine","Chest / upper spine","Neck","Head","Left shoulder","Right shoulder","Left upper arm","Right upper arm","Left forearm","Right forearm","Left wrist","Right wrist","Left thigh","Right thigh","Left knee","Right knee","Left ankle","Right ankle","Left toes","Right toes"] + ["Left","Right"].flatMap { side in ["Thumb","Index","Middle","Ring","Pinky"].flatMap { finger in (1...3).map { "\(side) \(finger.lowercased()) \($0)" } } }
    private var editorSection = 1
    private var editorParts: [[String:String]] = []
    private var editorExpressions: [[String:String]] = []
    private var editorSettings: [String:Any] {
        let key = appearance["key"] as? String ?? ""
        if let value = (profile["appearanceSettings"] as? [String:[String:Any]])?[key] { return value }
        let value = profile["editorSettings"] as? [String:Any] ?? [:]
        return value["appearanceKey"] as? String == appearance["key"] as? String ? value : ["version":1,"appearanceKey":appearance["key"] ?? "","face":[String:Double](),"hiddenParts":[String]()]
    }
    private var facePresets: [[String:Any]] { (editorSettings["expressionLibrary"] as? [String:Any])?["presets"] as? [[String:Any]] ?? [] }
    private var faceWeights: [String:Double] { facePresets.first(where:{$0["id"] as? String == facePresetID})?["weights"] as? [String:Double] ?? [:] }
    private var isFacialEditing: Bool { currentTab == 2 && editorSection == 0 }
    private var boneTuning: [String:Any] { profile["animationTuning"] as? [String:Any] ?? [:] }
    private let speed = NSSlider(value:1,minValue:0.5,maxValue:1.5,target:nil,action:nil)
    private let speedLabel = NSTextField(labelWithString:"1×")
    private let speak = NSSwitch()
    private let pitch = NSSlider(value:0,minValue:-20,maxValue:20,target:nil,action:nil)
    private let pitchLabel = NSTextField(labelWithString:"Natural")
    private let selectionLabel = NSTextField(labelWithString:"")
    private var moreAbout = false
    private var fineVoice = false
    private var contentHeight: CGFloat = 354
    private var lastWorldSize = NSSize.zero
    private let status = NSTextField(wrappingLabelWithString:"")
    private var voices: [[String:String]] = []
    private var modelTask: URLSessionDataTask?
    private var voiceTask: URLSessionDataTask?
    private var loaded = false
    private var isClosing = false
    private var currentTab = 1
    private var modelDrafts: [String:String] = [:]
    private var currentProvider = "groq"
    private let providerIDs = ["groq","openai","gemini","anthropic"]
    private let defaults = ["groq":"openai/gpt-oss-20b","openai":"gpt-4.1-mini","gemini":"gemini-2.5-flash","anthropic":"claude-sonnet-4-20250514"]
    var onCancel: (() -> Void)?
    var onSave: (([String:Any], @escaping (String?) -> Void) -> Void)?
    var onPreview: (([String:Any]) -> Void)?
    var onCredentialsChanged: (() -> Void)?

    init(character: [String:Any], catalog: [[String:Any]], origin: String, token: String, credentials: CredentialStore) {
        self.character = character; self.profile = character["profile"] as? [String:Any] ?? [:]
        self.catalog = catalog; self.appearance = character["appearance"] as? [String:Any] ?? catalog.first ?? [:]
        self.origin = origin; self.token = token; self.credentials = credentials
        let configuration = WKWebViewConfiguration()
        world = WKWebView(frame:.zero,configuration:configuration)
        super.init(nibName:nil,bundle:nil)
        tuningShowBones.state = .on
        tuningBridge.editor = self
        configuration.userContentController.add(tuningBridge,name:"animationTuning")
        sanitiseBoneTuning()
        let savedStyle = self.profile["idleStyle"] as? String ?? "female"
        self.profile["idleStyle"] = idleStyleIDs.contains(savedStyle) ? savedStyle : "female"
        let chosen = catalog.firstIndex{($0["key"] as? String) == (self.appearance["key"] as? String)}
        self.rosterOrder = (chosen.map{[$0]} ?? []) + catalog.indices.filter{$0 != chosen}
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func loadView() {
        let root = EditorCanvas(); root.wantsLayer = true
        root.layer?.backgroundColor = NSColor(calibratedWhite:0.63,alpha:1).cgColor
        view = root; world.navigationDelegate = self; root.addSubview(world)
        root.addSubview(facePanel); facePanel.isHidden = true
        faceListScroll.drawsBackground = false; faceListScroll.hasVerticalScroller = true
        faceListScroll.autohidesScrollers = true; faceListScroll.scrollerStyle = .overlay
        faceListScroll.documentView = faceListDocument; facePanel.addSubview(faceListScroll)
        faceSearch.placeholderString = "Search face keys"; faceSearch.delegate = self
        faceSearch.setAccessibilityLabel("Search face keys")
        for control in [back,cancel,save] { control.bezelStyle = .rounded; control.font = .systemFont(ofSize:13); root.addSubview(control); control.target = self }
        back.image = NSImage(systemSymbolName:"chevron.left",accessibilityDescription:nil); back.imagePosition = .imageLeading
        back.action = #selector(cancelEdit); cancel.action = #selector(cancelEdit); save.action = #selector(saveEdit)
        cancel.keyEquivalent = "\u{1b}"; save.keyEquivalent = "s"; save.keyEquivalentModifierMask = .command
        save.bezelColor = EditorPalette.accent
        save.contentTintColor = EditorPalette.onAccent
        for button in [back,cancel,save] {
            button.wantsLayer = true; button.layer?.cornerRadius = 15; button.layer?.masksToBounds = true
        }
        cancel.isBordered = false; cancel.contentTintColor = EditorPalette.accent
        tabs.segmentStyle = .capsule; tabs.controlSize = .regular; tabs.font = .systemFont(ofSize:12)
        tabs.appearance = NSAppearance(named:.aqua)
        tabs.selectedSegmentBezelColor = EditorPalette.field
        tabs.wantsLayer = true; tabs.layer?.cornerRadius = 16; tabs.layer?.masksToBounds = true
        tabs.target = self; tabs.action = #selector(changeTab); tabs.selectedSegment = 1
        for (i,width) in [47.0,74,78,63,66].enumerated() { tabs.setWidth(width,forSegment:i) }
        tabs.setAccessibilityLabel("Character settings sections")
        root.addSubview(tabs); root.addSubview(panel); root.addSubview(namePill)
        name.stringValue = character["name"] as? String ?? ""; name.placeholderString = "Character name"
        name.isBezeled = false; name.drawsBackground = false; name.font = .systemFont(ofSize:13,weight:.medium)
        name.textColor = .white; name.setAccessibilityLabel("Character name"); namePill.addSubview(name)
        scroll.drawsBackground = false; scroll.hasVerticalScroller = true; scroll.autohidesScrollers = true; scroll.scrollerStyle = .overlay
        scroll.documentView = document; panel.addSubview(scroll)
        status.font = .systemFont(ofSize:11); status.textColor = EditorPalette.secondary
        idleStyle.addItems(withTitles:["Male","Female","Female 2"])
        idleStyle.selectItem(at:idleStyleIDs.firstIndex(of:profile["idleStyle"] as? String ?? "female") ?? 1)
        idleStyle.target = self; idleStyle.action = #selector(idleStyleChanged)
        idleStyle.setAccessibilityLabel("Idle base pose")
        idleStyle.toolTip = "Choose the base idle animation. Bone adjustments apply to each base pose."
        selectionLabel.font = .systemFont(ofSize:11,weight:.medium); selectionLabel.textColor = EditorPalette.secondary
        search.font = .systemFont(ofSize:12); search.focusRingType = .none
        search.isBezeled = false; search.drawsBackground = false; search.layer?.backgroundColor = EditorPalette.field.cgColor
        search.wantsLayer = true; search.layer?.backgroundColor = EditorPalette.field.cgColor; search.layer?.cornerRadius = 8; search.layer?.masksToBounds = true
        search.placeholderString = "Search characters"; search.delegate = self; search.setAccessibilityLabel("Search characters")
        group.addItems(withTitles:["All characters"] + Array(Set(catalog.compactMap{$0["group"] as? String})).sorted())
        group.target = self; group.action = #selector(filterCharacters); group.setAccessibilityLabel("Character collection")
        provider.addItems(withTitles:["Groq","OpenAI","Gemini","Anthropic"])
        currentProvider = profile["aiProvider"] as? String ?? UserDefaults.standard.string(forKey:"aiProvider") ?? "groq"
        if !providerIDs.contains(currentProvider) { currentProvider = "groq" }
        provider.selectItem(at:providerIDs.firstIndex(of:currentProvider) ?? 0)
        model.stringValue = profile["aiModel"] as? String ?? (currentProvider == UserDefaults.standard.string(forKey:"aiProvider") ? UserDefaults.standard.string(forKey:"aiModel") : nil) ?? defaults[currentProvider]!
        let reasoningBudget = currentProvider == "groq" && model.stringValue.hasPrefix("openai/gpt-oss-")
        callReplyLimit.integerValue = profile["callMaxTokens"] as? Int ?? (reasoningBudget ? 900 : 220)
        chatReplyLimit.integerValue = profile["chatMaxTokens"] as? Int ?? (reasoningBudget ? 900 : 300)
        replyFallbacks.stringValue = (profile["aiFallbackProviders"] as? [String] ?? (profile["aiFallbackProviders"] as? [[String:Any]])?.compactMap { $0["aiProvider"] as? String } ?? []).joined(separator: ", ")
        replyFallbacks.placeholderString = "e.g. openai, gemini"
        replyFallbacks.toolTip = "Try the next configured provider if the reply cannot start. Uses saved API keys."
        provider.target = self; provider.action = #selector(providerChanged)
        model.completes = true; model.numberOfVisibleItems = 10; model.setAccessibilityLabel("Language model")
        engine.addItems(withTitles:["Edge TTS","OpenAI","Pocket TTS · local"]); engine.selectItem(at:["edge","openai","pocket"].firstIndex(of:profile["ttsProvider"] as? String ?? "pocket") ?? 2)
        engine.target = self; engine.action = #selector(engineChanged)
        language.target = self; language.action = #selector(languageChanged)
        voice.target = self; voice.action = #selector(voiceChanged)
        speed.doubleValue = profile["voiceSpeed"] as? Double ?? 1; speed.target = self; speed.action = #selector(speedChanged)
        speed.setAccessibilityLabel("Voice speed")
        pitch.doubleValue = profile["voicePitch"] as? Double ?? 0; pitch.target = self; pitch.action = #selector(pitchChanged)
        pitch.setAccessibilityLabel("Voice pitch"); speak.setAccessibilityLabel("Speak replies"); speak.state = profile["speak"] as? Bool == false ? .off : .on
        let selectedVoice = profile["voice"] as? String ?? "en-US-AvaMultilingualNeural"
        voices = Array(Set([selectedVoice,"en-US-AvaMultilingualNeural","en-US-AndrewMultilingualNeural","en-GB-SoniaNeural","en-IN-NeerjaNeural"])).sorted().map { ["id":$0,"locale":$0.split(separator:"-").prefix(2).joined(separator:"-"),"name":$0.components(separatedBy:"-").dropFirst(2).joined(separator:"-").replacingOccurrences(of:"Neural",with:"")] }
        root.onLayout = { [weak self] in self?.layoutEditor() }
        renderTab(); updateSession(origin:origin,token:token)
    }
    private func layoutEditor() {
        let size = view.bounds.size; let width: CGFloat = 344; let x = size.width-width-20
        world.frame = view.bounds
        back.frame = NSRect(x:20,y:28,width:72,height:30)
        cancel.frame = NSRect(x:size.width-154,y:28,width:70,height:30)
        save.frame = NSRect(x:size.width-80,y:28,width:60,height:30)
        tabs.frame = NSRect(x:x,y:68,width:width,height:32)
        let desired = currentTab == 1 ? CGFloat(414) : contentHeight+32
        let height = min(desired,max(250,size.height-134))
        panel.frame = NSRect(x:x,y:110,width:width,height:height)
        if currentTab == 1 {
            search.frame = NSRect(x:16,y:16,width:312,height:30)
            scroll.frame = NSRect(x:16,y:58,width:312,height:max(100,height-100))
            selectionLabel.frame = NSRect(x:18,y:height-30,width:308,height:18)
        } else { scroll.frame = panel.bounds.insetBy(dx:16,dy:16) }
        namePill.frame = NSRect(x:24,y:size.height-60,width:220,height:40)
        name.frame = NSRect(x:14,y:10,width:192,height:22)
        document.setFrameSize(NSSize(width:312,height:max(contentHeight,scroll.contentSize.height)))
        facePanel.frame = NSRect(x:20,y:110,width:180,height:max(220,min(570,size.height-192)))
        faceListScroll.frame = NSRect(x:10,y:46,width:160,height:max(120,facePanel.bounds.height-98))
        faceListDocument.setFrameSize(NSSize(width:160,height:max(CGFloat(facePresets.count*31),faceListScroll.contentSize.height)))
        facePanel.subviews.first(where:{$0.identifier?.rawValue == "newExpression"})?.frame = NSRect(x:10,y:facePanel.bounds.height-42,width:160,height:28)
        if lastWorldSize != size {
            lastWorldSize = size; updateFraming()
            if currentTab == 1 { scroll.contentView.scroll(to:.zero); scroll.reflectScrolledClipView(scroll.contentView) }
        }
    }
    func updateSession(origin: String, token: String) {
        self.origin = origin; self.token = token
        guard isViewLoaded else { return }
        loaded = false
        world.load(URLRequest(url:URL(string:origin+"/Companion/index.html")!))
        fetchVoices()
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { loaded = true; previewAppearance() }
    private func post(_ value: [String:Any]) {
        guard loaded, let data = try? JSONSerialization.data(withJSONObject:value), let json = String(data:data,encoding:.utf8) else { return }
        world.evaluateJavaScript("window.postMessage(\(json),'*')",completionHandler:nil)
    }
    private func updateFraming() { post(["type":"mighty-companion-control","framing":isFacialEditing ? "face" : "selection","editorInset":392,"editorLeftInset":isFacialEditing ? 216 : 0]) }
    private func previewAppearance() {
        tuningRigReady = false; availableTuningBones.removeAll(); editorParts=[]; editorExpressions=[]
        faceInventoryReady = false; facePresetID = "neutral"; faceComparing = false
        faceUndo=[]; faceRedo=[]; faceSearch.stringValue = ""
        updateFraming(); post(["type":"mighty-companion-control","reset":true])
        syncPoseEditing()
        post(["type":"mighty-companion-load","appearance":appearance,"idleStyle":profile["idleStyle"] as? String ?? "female","animationTuning":boneTuning,"editorSettings":editorSettings,"token":token])
    }
    @objc private func idleStyleChanged() {
        guard idleStyleIDs.indices.contains(idleStyle.indexOfSelectedItem) else { return }
        let style = idleStyleIDs[idleStyle.indexOfSelectedItem]
        profile["idleStyle"] = style
        post(["type":"mighty-companion-control","idleStyle":style])
    }
    private func sanitiseBoneTuning() {
        let value = boneTuning
        func bounded(_ value: Any?, _ fallback: Double, _ low: Double, _ high: Double) -> Double {
            guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(), number.doubleValue.isFinite else { return fallback }
            return max(low,min(high,number.doubleValue))
        }
        var rotations: [String:[Double]] = [:]
        if let saved = value["bones"] as? [String:Any] {
            for key in tuningJointIDs {
                if let axes = saved[key] as? [Any], axes.count == 3 {
                    rotations[key] = axes.map { bounded($0,0,-180,180) }
                }
            }
        }
        profile["animationTuning"] = ["version":1,"physicsEnabled":value["physicsEnabled"] as? Bool ?? false,"jiggleEnabled":value["jiggleEnabled"] as? Bool ?? true,"enabled":value["enabled"] as? Bool ?? true,
            "speed":bounded(value["speed"],1,0.25,2),"strength":bounded(value["strength"],1,0,1),"bones":rotations]
    }
    fileprivate func animationRigChanged(_ body: [String:Any]) {
        guard !isClosing, body["key"] as? String == appearance["key"] as? String else { return }
        if body["event"] as? String == "editorParts" {
            editorParts = body["parts"] as? [[String:String]] ?? []
            editorExpressions = body["expressions"] as? [[String:String]] ?? []
            faceInventoryReady = true
            faceDefaults = (body["defaultExpressions"] as? [String:Any])?["presets"] as? [[String:Any]] ?? []
            if let library = body["expressionLibrary"] as? [String:Any] {
                var settings = editorSettings; settings["expressionLibrary"] = library; sendEditorSettings(settings)
            }
            if currentTab == 2 { renderTab() }
            return
        }
        if let info = body["physics"] as? [String:Any] {
            physicsAvailable = info["available"] as? Bool ?? false
            jiggleAvailable = info["jiggleAvailable"] as? Bool ?? false
            physicsState = info["status"] as? String ?? "unavailable"
            physicsDetail = info["detail"] as? String ?? ""
        }
        if let event = body["event"] as? String {
            if event == "physics" {
                if physicsState == "error", let value = body["animationTuning"] as? [String:Any] { profile["animationTuning"] = value; sanitiseBoneTuning() }
                if currentTab == 2 { refreshTuningControls() }; return
            }
            if event == "begin" { rememberTuning() }
            if let source = body["source"] as? String, let index = tuningJointIDs.firstIndex(of:source) { tuningBone.selectItem(at:index) }
            if event == "change", let value = body["animationTuning"] as? [String:Any] {
                profile["animationTuning"] = value; sanitiseBoneTuning()
            }
            if let playing = body["playing"] as? Bool {
                tuningPlaying = playing; tuningPlay.title = playing ? "Pause preview" : "Play preview"
            }
            if currentTab == 2 { refreshTuningControls() }
            return
        }
        tuningRigReady = body["state"] as? String == "ready"
        let bones = body["bones"] as? [[String:String]] ?? []
        availableTuningBones = Set(bones.compactMap { $0["source"] })
        if currentTab == 2 { if editorSection == 1 { refreshTuningControls() } else { renderTab() } }
    }
    private func syncPoseEditing() {
        let selected = tuningJointIDs.indices.contains(tuningBone.indexOfSelectedItem) ? tuningJointIDs[tuningBone.indexOfSelectedItem] : "Spine2"
        post(["type":"mighty-companion-control","poseEditor":["enabled":currentTab == 2 && editorSection == 1,"showBones":tuningShowBones.state == .on,"selected":selected,"snap":tuningSnap.state == .on,"showFingers":tuningFingers.state == .on]])
    }
    @objc private func showPoseBones() { syncPoseEditing() }
    @objc private func focusTuningJoint() { post(["type":"mighty-companion-control","focusJoint":true]) }
    @objc private func reframeTuning() { post(["type":"mighty-companion-control","reset":true]) }
    @objc private func physicsChanged(_ sender: NSControl) {
        rememberTuning(); var value = boneTuning
        if sender === tuningPhysics { value["physicsEnabled"] = tuningPhysics.state == .on }
        else { value["jiggleEnabled"] = tuningJiggle.state == .on }
        profile["animationTuning"] = value; refreshTuningControls(); sendTuning()
    }
    @objc private func toggleBonePrecision() { fineBoneRotation.toggle(); renderTab() }
    private func rememberTuning() {
        tuningUndo.append(boneTuning); if tuningUndo.count > 60 { tuningUndo.removeFirst() }
        tuningRedo.removeAll(); updateTuningHistory()
    }
    private func updateTuningHistory() {
        tuningUndoButton?.isEnabled = !tuningUndo.isEmpty
        tuningRedoButton?.isEnabled = !tuningRedo.isEmpty
    }
    private func sendTuning() {
        post(["type":"mighty-companion-control","animationTuning":boneTuning])
    }
    @objc private func tuningBoneChanged() { refreshTuningControls(); syncPoseEditing() }
    @objc private func tuningChanged(_ sender: NSControl) {
        var value = boneTuning
        if sender === tuningEnabled { rememberTuning(); value["enabled"] = tuningEnabled.state == .on }
        else if sender.tag < 3, tuningJointIDs.indices.contains(tuningBone.indexOfSelectedItem) {
            var rotations = value["bones"] as? [String:[Double]] ?? [:]
            rotations[tuningJointIDs[tuningBone.indexOfSelectedItem]] = Array(tuningSliders.prefix(3)).map { ($0.doubleValue * 10).rounded() / 10 }
            value["bones"] = rotations
        } else if sender.tag == 3 { value["strength"] = tuningSliders[3].doubleValue }
        else if sender.tag == 4 { value["speed"] = tuningSliders[4].doubleValue }
        profile["animationTuning"] = value; refreshTuningControls(); sendTuning()
    }
    @objc private func toggleTuningPlayback() {
        tuningPlaying.toggle(); tuningPlay.title = tuningPlaying ? "Pause preview" : "Play preview"
        post(["type":"mighty-companion-control","playing":tuningPlaying])
    }
    @objc private func undoTuning() {
        guard let previous = tuningUndo.popLast() else { return }
        tuningRedo.append(boneTuning); profile["animationTuning"] = previous
        refreshTuningControls(); sendTuning()
    }
    @objc private func redoTuning() {
        guard let next = tuningRedo.popLast() else { return }
        tuningUndo.append(boneTuning); profile["animationTuning"] = next
        refreshTuningControls(); sendTuning()
    }
    @objc private func resetTuningBone() {
        guard tuningJointIDs.indices.contains(tuningBone.indexOfSelectedItem) else { return }
        rememberTuning(); var value = boneTuning
        var rotations = value["bones"] as? [String:[Double]] ?? [:]
        rotations.removeValue(forKey:tuningJointIDs[tuningBone.indexOfSelectedItem]); value["bones"] = rotations
        profile["animationTuning"] = value; refreshTuningControls(); sendTuning()
    }
    @objc private func resetAllTuning() {
        rememberTuning(); var value = boneTuning
        value["bones"] = [String:[Double]](); value["strength"] = 1.0; value["enabled"] = true
        profile["animationTuning"] = value; refreshTuningControls(); sendTuning()
    }
    private func refreshTuningControls() {
        guard tuningSliders.count == 5, tuningJointIDs.indices.contains(tuningBone.indexOfSelectedItem) else { return }
        let source = tuningJointIDs[tuningBone.indexOfSelectedItem]
        let value = boneTuning, enabled = value["enabled"] as? Bool ?? true
        let rotation = (value["bones"] as? [String:[Double]])?[source] ?? [0,0,0]
        tuningEnabled.state = enabled ? .on : .off
        let wantsPhysics = value["physicsEnabled"] as? Bool ?? false
        tuningPhysics.state = wantsPhysics && physicsAvailable && physicsState != "error" ? .on : .off
        tuningPhysics.isEnabled = tuningRigReady && physicsAvailable
        tuningJiggle.state = wantsPhysics && jiggleAvailable && physicsState != "error" && (value["jiggleEnabled"] as? Bool ?? true) ? .on : .off
        tuningJiggle.isEnabled = tuningRigReady && physicsAvailable && jiggleAvailable && wantsPhysics && physicsState == "on"
        tuningPhysicsNote.stringValue = !tuningRigReady ? "Loading physics rig…" : physicsDetail
        tuningJiggle.toolTip = jiggleAvailable ? "Uses the model's authored spring joints. Requires Physics." : "This model has no authored jiggle joints."
        for axis in 0..<3 {
            tuningSliders[axis].doubleValue = rotation[axis]
            tuningSliders[axis].isEnabled = tuningRigReady && availableTuningBones.contains(source)
            tuningValues[axis].stringValue = String(format:"%+.1f°",rotation[axis])
        }
        tuningSliders[3].doubleValue = value["strength"] as? Double ?? 1
        tuningSliders[4].doubleValue = value["speed"] as? Double ?? 1
        tuningValues[3].stringValue = String(format:"%.0f%%",tuningSliders[3].doubleValue*100)
        tuningValues[4].stringValue = String(format:"%.2f×",tuningSliders[4].doubleValue)
        tuningNote.stringValue = !tuningRigReady ? "Waiting for the character skeleton." : !availableTuningBones.contains(source) ? "This character has no mapped bone here. Choose another joint." : enabled ? "Click a green joint and drag its coloured rings. Edits follow the animation. Save keeps them for this character." : "Adjustments bypassed. Enable to compare with your tuned pose."
        updateTuningHistory()
    }
    @objc private func changeEditorSection(_ sender: NSSegmentedControl) { editorSection = sender.selectedSegment; renderTab() }
    private func sendEditorSettings(_ value: [String:Any]) {
        profile["editorSettings"] = value
        var saved = profile["appearanceSettings"] as? [String:[String:Any]] ?? [:]
        saved[appearance["key"] as? String ?? ""] = value; profile["appearanceSettings"] = saved
        post(["type":"mighty-companion-control","editorSettings":value])
    }
    private func sendFacePreview() {
        let weights = faceComparing ? facePresets.first(where:{$0["id"] as? String == "neutral"})?["weights"] as? [String:Double] ?? [:] : faceWeights
        post(["type":"mighty-companion-control","facePreview":isFacialEditing ? weights as Any : NSNull()])
    }
    private func setFacePresets(_ presets: [[String:Any]]) {
        var settings = editorSettings; settings["expressionLibrary"] = ["version":1,"presets":presets]
        sendEditorSettings(settings); sendFacePreview()
    }
    private func rememberFace() {
        faceUndo.append(editorSettings["expressionLibrary"] as? [String:Any] ?? [:])
        if faceUndo.count > 60 { faceUndo.removeFirst() }; faceRedo.removeAll(); refreshFaceHistory()
    }
    private func refreshFaceHistory() { faceUndoButton?.isEnabled = !faceUndo.isEmpty; faceRedoButton?.isEnabled = !faceRedo.isEmpty }
    @objc private func undoFace() { restoreFaceHistory(undo:true) }
    @objc private func redoFace() { restoreFaceHistory(undo:false) }
    private func restoreFaceHistory(undo: Bool) {
        guard let library = undo ? faceUndo.popLast() : faceRedo.popLast() else { return }
        let current = editorSettings["expressionLibrary"] as? [String:Any] ?? [:]
        if undo { faceRedo.append(current) } else { faceUndo.append(current) }
        var settings = editorSettings; settings["expressionLibrary"] = library; sendEditorSettings(settings)
        if !facePresets.contains(where:{$0["id"] as? String == facePresetID}) { facePresetID = "neutral" }
        renderTab()
    }
    @objc private func selectFacePreset(_ sender: NSButton) {
        guard facePresets.indices.contains(sender.tag), let id = facePresets[sender.tag]["id"] as? String else { return }
        facePresetID = id; faceComparing = false; renderTab()
    }
    @objc private func compareFace() { faceComparing.toggle(); renderTab() }
    @objc private func focusFace() { updateFraming(); post(["type":"mighty-companion-control","reset":true]) }
    @objc private func faceChanged(_ sender: NSSlider) { setFaceWeight(index:sender.tag,value:sender.doubleValue) }
    @objc private func faceNumberChanged(_ sender: NSTextField) {
        rememberFace(); setFaceWeight(index:sender.tag,value:sender.doubleValue/100)
    }
    @objc private func faceKeyToggled(_ sender: NSButton) {
        rememberFace(); setFaceWeight(index:sender.tag,value:sender.state == .on ? 0.5 : 0)
        if faceActiveOnly { renderTab() }
    }
    private func setFaceWeight(index: Int,value: Double) {
        guard editorExpressions.indices.contains(index), value.isFinite,
              let key = editorExpressions[index]["stableId"], let selected = facePresets.firstIndex(where:{$0["id"] as? String == facePresetID}) else { return }
        faceComparing = false
        faceCompareButton?.title = "Compare neutral"
        let weight = max(0,min(1,value)); var weights = faceWeights
        if weight > 0 { weights[key] = weight } else { weights.removeValue(forKey:key) }
        var presets = facePresets; presets[selected]["weights"] = weights; setFacePresets(presets)
        faceSliders[key]?.doubleValue = weight; faceNumbers[key]?.doubleValue = weight*100
        faceChecks[key]?.state = weight > 0 ? .on : .off
        faceCountLabel?.stringValue = "\(weights.count) active · \(editorExpressions.count) available keys"
        refreshFaceHistory()
    }
    @objc private func changeFaceGroup(_ sender: NSPopUpButton) { faceGroup = sender.titleOfSelectedItem ?? "All keys"; renderTab() }
    @objc private func filterActiveFace(_ sender: NSButton) { faceActiveOnly = sender.state == .on; renderTab() }
    @objc private func collapseFaceGroup(_ sender: NSButton) {
        guard faceGroups.indices.contains(sender.tag) else { return }; let group = faceGroups[sender.tag]
        if faceCollapsed.contains(group) { faceCollapsed.remove(group) } else { faceCollapsed.insert(group) }; renderTab()
    }
    @objc private func clearFaceExpression() {
        rememberFace(); var presets = facePresets
        guard let index = presets.firstIndex(where:{$0["id"] as? String == facePresetID}) else { return }
        presets[index]["weights"] = [String:Double](); setFacePresets(presets); faceComparing = false; renderTab()
    }
    @objc private func defaultFaceExpression() {
        rememberFace(); var presets = facePresets
        guard let index = presets.firstIndex(where:{$0["id"] as? String == facePresetID}) else { return }
        presets[index]["weights"] = faceDefaults.first(where:{$0["id"] as? String == facePresetID})?["weights"] as? [String:Double] ?? [:]
        setFacePresets(presets); faceComparing = false; renderTab()
    }
    @objc private func newFaceExpression() { nameFaceExpression(duplicate:false,rename:false) }
    private func nameFaceExpression(duplicate: Bool,rename: Bool) {
        guard let window = view.window, facePresets.count < 128 || rename else { return }
        let current = facePresets.first(where:{$0["id"] as? String == facePresetID})
        let alert = NSAlert(); alert.messageText = rename ? "Rename expression" : duplicate ? "Duplicate expression" : "New expression"
        alert.informativeText = "This expression belongs to \(appearance["name"] as? String ?? "this model"). Save the character to keep it."
        alert.addButton(withTitle:rename ? "Rename" : "Create"); alert.addButton(withTitle:"Cancel")
        let field = NSTextField(string:rename ? current?["name"] as? String ?? "" : duplicate ? "\(current?["name"] as? String ?? "Expression") copy" : "Expression \(max(1,facePresets.count-13))")
        field.frame = NSRect(x:0,y:0,width:300,height:26); field.setAccessibilityLabel("Expression name"); alert.accessoryView = field
        alert.beginSheetModal(for:window) { [weak self] response in
            guard let self, response == .alertFirstButtonReturn else { return }
            let name = String(field.stringValue.trimmingCharacters(in:.whitespacesAndNewlines).prefix(60)); guard !name.isEmpty else { return }
            self.rememberFace(); var presets = self.facePresets
            if rename, let index = presets.firstIndex(where:{$0["id"] as? String == self.facePresetID}) { presets[index]["name"] = name }
            else {
                let id = "custom-"+UUID().uuidString.lowercased()
                presets.append(["id":id,"name":name,"kind":"custom","weights":duplicate ? self.faceWeights : [String:Double]()]); self.facePresetID = id
            }
            self.faceComparing = false; self.setFacePresets(presets); self.renderTab()
        }
        alert.window.makeFirstResponder(field)
    }
    @objc private func faceOptionsChanged(_ sender: NSPopUpButton) {
        let option = sender.indexOfSelectedItem; sender.selectItem(at:0)
        switch option {
        case 1: newFaceExpression()
        case 2: nameFaceExpression(duplicate:true,rename:false)
        case 3: nameFaceExpression(duplicate:false,rename:true)
        case 4:
            guard facePresets.first(where:{$0["id"] as? String == facePresetID})?["kind"] as? String == "custom" else { return }
            rememberFace(); let presets = facePresets.filter{$0["id"] as? String != facePresetID}
            facePresetID = "neutral"; setFacePresets(presets); renderTab()
        case 5: defaultFaceExpression()
        case 6: clearFaceExpression()
        default: break
        }
    }
    private func renderFaceList() {
        faceListDocument.subviews.forEach{$0.removeFromSuperview()}
        facePanel.subviews.filter{$0 !== faceListScroll}.forEach{$0.removeFromSuperview()}
        let heading = NSTextField(labelWithString:"Expressions"); heading.font = .systemFont(ofSize:13,weight:.semibold); heading.textColor = .white
        heading.frame = NSRect(x:14,y:15,width:150,height:20); facePanel.addSubview(heading)
        for (index,preset) in facePresets.enumerated() {
            let selected = preset["id"] as? String == facePresetID
            let item = NSButton(title:preset["name"] as? String ?? "Expression",target:self,action:#selector(selectFacePreset(_:)))
            item.tag = index; item.frame = NSRect(x:0,y:CGFloat(index*31),width:154,height:29)
            item.bezelStyle = .rounded; item.isBordered = false; item.alignment = .left
            item.font = .systemFont(ofSize:12,weight:selected ? .semibold : .regular); item.contentTintColor = selected ? .white : EditorPalette.secondary
            item.wantsLayer = true; item.layer?.cornerRadius = 8; item.layer?.backgroundColor = selected ? EditorPalette.field.cgColor : NSColor.clear.cgColor
            item.setAccessibilityLabel("Expression: \(item.title)"); item.setAccessibilityValue(selected ? "Selected" : "")
            item.toolTip = "\((preset["weights"] as? [String:Double] ?? [:]).count) active keys"; faceListDocument.addSubview(item)
        }
        let add = NSButton(title:"＋ New expression",target:self,action:#selector(newFaceExpression)); add.bezelStyle = .rounded
        add.font = .systemFont(ofSize:12); add.identifier = NSUserInterfaceItemIdentifier("newExpression"); add.isEnabled = faceInventoryReady && !editorExpressions.isEmpty
        facePanel.addSubview(add)
        if let index = facePresets.firstIndex(where:{$0["id"] as? String == facePresetID}) {
            faceListDocument.setFrameSize(NSSize(width:160,height:max(CGFloat(facePresets.count*31),faceListScroll.contentSize.height)))
            faceListDocument.scrollToVisible(NSRect(x:0,y:CGFloat(index*31),width:154,height:29))
        }
    }
    private func renderFacialEditor() {
        renderFaceList(); faceSliders.removeAll(); faceNumbers.removeAll(); faceChecks.removeAll()
        let title = facePresets.first(where:{$0["id"] as? String == facePresetID})?["name"] as? String ?? "Facial expressions"
        label(title+" · Expression settings",y:0)
        let help = NSTextField(wrappingLabelWithString:"Combine this model's keys to shape the expression. Edits stay with each expression; Save above keeps them all.")
        help.font = .systemFont(ofSize:12); help.textColor = EditorPalette.secondary
        help.frame = NSRect(x:0,y:26,width:292,height:48); document.addSubview(help)
        let count = NSTextField(labelWithString:"\(faceWeights.count) active · \(editorExpressions.count) available keys")
        count.font = .systemFont(ofSize:11); count.textColor = EditorPalette.secondary; count.frame = NSRect(x:0,y:80,width:292,height:18)
        document.addSubview(count); faceCountLabel = count
        let compare = button(faceComparing ? "Return to expression" : "Compare neutral",y:105,action:#selector(compareFace),width:176)
        faceCompareButton = compare
        compare.isEnabled = faceInventoryReady && facePresetID != "neutral"
        _ = button("Reframe",y:105,action:#selector(focusFace),x:184,width:108)
        let options = NSPopUpButton(frame:NSRect(x:0,y:144,width:292,height:28))
        options.addItems(withTitles:["Expression options…","New expression…","Duplicate expression…","Rename expression…","Delete expression","Restore suggested defaults","Clear expression"])
        let custom = facePresets.first(where:{$0["id"] as? String == facePresetID})?["kind"] as? String == "custom"
        options.autoenablesItems = false; options.item(at:3)?.isEnabled = custom; options.item(at:4)?.isEnabled = custom
        options.target = self; options.action = #selector(faceOptionsChanged(_:)); options.setAccessibilityLabel("Expression options"); document.addSubview(options)
        options.isEnabled = faceInventoryReady && !editorExpressions.isEmpty
        faceUndoButton = button("Undo",y:182,action:#selector(undoFace),width:140)
        faceRedoButton = button("Redo",y:182,action:#selector(redoFace),x:152,width:140); refreshFaceHistory()
        faceSearch.frame = NSRect(x:0,y:224,width:292,height:28); document.addSubview(faceSearch)
        let groups = NSPopUpButton(frame:NSRect(x:0,y:262,width:170,height:28))
        groups.addItems(withTitles:["All keys"]+faceGroups); groups.selectItem(withTitle:faceGroup)
        groups.target = self; groups.action = #selector(changeFaceGroup(_:)); groups.setAccessibilityLabel("Face key group"); document.addSubview(groups)
        let active = NSButton(checkboxWithTitle:"Active only",target:self,action:#selector(filterActiveFace(_:)))
        active.state = faceActiveOnly ? .on : .off; active.frame = NSRect(x:182,y:264,width:110,height:24); active.contentTintColor = .white
        active.font = .systemFont(ofSize:12); document.addSubview(active)
        guard faceInventoryReady else { label("Loading character keys…",y:312); contentHeight = 354; return }
        guard !editorExpressions.isEmpty else { label("This model has no expression keys.",y:312); contentHeight = 354; return }
        let query = faceSearch.stringValue.trimmingCharacters(in:.whitespacesAndNewlines)
        let weights = faceWeights
        let matches = editorExpressions.enumerated().filter { _,entry in
            let key = entry["stableId"] ?? ""
            return (!faceActiveOnly || (weights[key] ?? 0)>0) && (faceGroup == "All keys" || entry["group"] == faceGroup) && (query.isEmpty || ((entry["name"] ?? "")+" "+(entry["englishName"] ?? "")).localizedCaseInsensitiveContains(query))
        }
        var y: CGFloat = 306
        if matches.isEmpty { label("No matching keys. Try another filter.",y:y); y += 34 }
        for (groupIndex,group) in faceGroups.enumerated() {
            let keys = matches.filter{$0.element["group"] == group}; guard !keys.isEmpty else { continue }
            let expanded = !faceCollapsed.contains(group) || !query.isEmpty || faceGroup != "All keys"
            let heading = button("\(expanded ? "▾" : "▸") \(group) · \(keys.count)",y:y,action:#selector(collapseFaceGroup(_:)),width:292)
            heading.tag = groupIndex; heading.isBordered = false; heading.alignment = .left; heading.contentTintColor = .white
            y += 35; if !expanded { continue }
            for (index,entry) in keys {
                let key = entry["stableId"] ?? "", name = entry["name"] ?? "Key", value = weights[key] ?? 0
                let check = NSButton(checkboxWithTitle:name,target:self,action:#selector(faceKeyToggled(_:)))
                check.frame = NSRect(x:0,y:y,width:222,height:22); check.tag = index; check.state = value>0 ? .on : .off
                check.font = .systemFont(ofSize:12); check.contentTintColor = .white; check.toolTip = "\(name) · \(entry["englishName"] ?? "")"
                check.setAccessibilityLabel("Use key \(name)"); document.addSubview(check); faceChecks[key] = check
                let number = NSTextField(string:String(format:"%.1f",value*100)); number.tag = index
                let format = NumberFormatter(); format.minimum = 0; format.maximum = 100; format.maximumFractionDigits = 1; format.minimumFractionDigits = 1
                number.formatter = format; number.alignment = .right; number.font = .monospacedDigitSystemFont(ofSize:11,weight:.regular)
                number.frame = NSRect(x:232,y:y,width:60,height:22); number.target = self; number.action = #selector(faceNumberChanged(_:))
                number.delegate = self
                number.setAccessibilityLabel("\(name) strength percent"); document.addSubview(number); faceNumbers[key] = number
                let alias = NSTextField(labelWithString:entry["englishName"].flatMap{$0.isEmpty ? nil : $0} ?? group)
                alias.font = .systemFont(ofSize:10); alias.textColor = EditorPalette.secondary; alias.lineBreakMode = .byTruncatingTail
                alias.frame = NSRect(x:20,y:y+23,width:270,height:15); document.addSubview(alias)
                let slider = BoneTuningSlider(value:value,minValue:0,maxValue:1,target:self,action:#selector(faceChanged(_:)))
                slider.tag = index; slider.isContinuous = true; slider.frame = NSRect(x:0,y:y+43,width:292,height:22)
                slider.beginEdit = { [weak self] in self?.rememberFace() }; slider.setAccessibilityLabel("\(name) strength")
                document.addSubview(slider); faceSliders[key] = slider; y += 80
            }
        }
        if faceWeights.isEmpty && facePresetID != "neutral" {
            let empty = NSTextField(wrappingLabelWithString:"No keys assigned yet. Select keys and adjust their strength to create this expression.")
            empty.font = .systemFont(ofSize:11); empty.textColor = EditorPalette.secondary; empty.frame = NSRect(x:0,y:y,width:292,height:38)
            document.addSubview(empty); y += 48
        }
        contentHeight = y+12
    }
    @objc private func partChanged(_ sender: NSButton) {
        guard editorParts.indices.contains(sender.tag), let id = editorParts[sender.tag]["id"] else { return }
        var value = editorSettings; var hidden = Set(value["hiddenParts"] as? [String] ?? [])
        if sender.state == .on { hidden.remove(id) } else { hidden.insert(id) }
        value["hiddenParts"] = hidden.sorted(); sendEditorSettings(value)
    }
    @objc private func resetFace() { var value = editorSettings; value["face"] = [String:Double](); sendEditorSettings(value); renderTab() }
    @objc private func showAllParts() { var value = editorSettings; value["hiddenParts"] = [String](); sendEditorSettings(value); renderTab() }
    private func renderEditorSection() {
        if editorSection == 1 { renderAnimationTuning(); return }
        if editorSection == 0 { renderFacialEditor(); return }
        let faceMode = editorSection == 0
        label(faceMode ? "Face expressions" : "Clothes · mesh visibility",y:0)
        let help = NSTextField(wrappingLabelWithString:faceMode ? "Tune the character's available facial expressions. Save keeps your settings." : "Use the visibility buttons to hide or show parts. Names come from the model; some parts combine clothes and body.")
        help.font = .systemFont(ofSize:12); help.textColor = .white; help.frame = NSRect(x:0,y:26,width:292,height:56); document.addSubview(help)
        let entries = faceMode ? editorExpressions : editorParts
        if entries.isEmpty {
            label(tuningRigReady ? (faceMode ? "No facial morphs on this model." : "No mesh parts available.") : "Loading character tools…",y:96)
            contentHeight = 170; return
        }
        let settings = editorSettings, values = settings["face"] as? [String:Double] ?? [:]
        let hidden = Set(settings["hiddenParts"] as? [String] ?? [])
        for (index,entry) in entries.enumerated() {
            let y = CGFloat(96+index*(faceMode ? 62 : 38)), id = entry["id"] ?? ""
            if faceMode {
                label(entry["name"] ?? id,y:y)
                let slider = NSSlider(value:values[id] ?? 0,minValue:0,maxValue:1,target:self,action:#selector(faceChanged(_:)))
                slider.tag = index; slider.isContinuous = true; slider.frame = NSRect(x:0,y:y+22,width:292,height:22)
                slider.setAccessibilityLabel(entry["name"] ?? "Expression"); document.addSubview(slider)
            } else {
                let button = NSButton(checkboxWithTitle:entry["name"] ?? id,target:self,action:#selector(partChanged(_:)))
                button.tag = index; button.state = hidden.contains(id) ? .off : .on
                button.frame = NSRect(x:0,y:y,width:292,height:28); button.contentTintColor = .white
                button.toolTip = "Show or hide this mesh part"; document.addSubview(button)
            }
        }
        let bottom = CGFloat(96+entries.count*(faceMode ? 62 : 38))
        _ = button(faceMode ? "Reset face" : "Show all parts",y:bottom+12,action:faceMode ? #selector(resetFace) : #selector(showAllParts),width:292)
        contentHeight = bottom+60
    }
    private func renderAnimationTuning() {
        let w: CGFloat = 292
        label("Animation & physics",y:0)
        let help = NSTextField(wrappingLabelWithString:"Left-drag orbits. Right/middle-drag pans. Scroll zooms. Select a joint to rotate.")
        help.font = .systemFont(ofSize:12); help.textColor = .white
        help.frame = NSRect(x:0,y:26,width:w,height:36); document.addSubview(help)
        let base = surface(y:70,height:38); base.frame.size.width = w
        inlineRow("Idle pose",control:idleStyle,in:base,y:0)
        idleStyle.frame = NSRect(x:84,y:5,width:198,height:28)
        for (index,pair) in [("Physics",tuningPhysics),("Jiggle physics",tuningJiggle)].enumerated() {
            let row = surface(y:CGFloat(118+index*44),height:38); row.frame.size.width = w
            let title = NSTextField(labelWithString:pair.0); title.font = .systemFont(ofSize:12); title.textColor = .white
            title.frame = NSRect(x:11,y:11,width:220,height:18); row.addSubview(title)
            pair.1.frame = NSRect(x:245,y:7,width:38,height:24); row.addSubview(pair.1)
            pair.1.setAccessibilityLabel(pair.0); pair.1.target = self; pair.1.action = #selector(physicsChanged(_:))
        }
        tuningPhysicsNote.font = .systemFont(ofSize:11); tuningPhysicsNote.textColor = EditorPalette.secondary
        tuningPhysicsNote.frame = NSRect(x:0,y:208,width:w,height:32); document.addSubview(tuningPhysicsNote)
        for (index,option) in [tuningShowBones,tuningFingers].enumerated() {
            option.frame = NSRect(x:CGFloat(index*150),y:250,width:142,height:24)
            option.font = .systemFont(ofSize:12); option.contentTintColor = .white
            option.target = self; option.action = #selector(showPoseBones); document.addSubview(option)
        }
        tuningSnap.frame = NSRect(x:0,y:288,width:142,height:24); tuningSnap.font = .systemFont(ofSize:12); tuningSnap.contentTintColor = .white
        tuningSnap.target = self; tuningSnap.action = #selector(showPoseBones); document.addSubview(tuningSnap)
        _ = button("Focus joint",y:286,action:#selector(focusTuningJoint),x:150,width:142)
        tuningPlay.target = self; tuningPlay.action = #selector(toggleTuningPlayback)
        tuningPlay.bezelStyle = .rounded; tuningPlay.font = .systemFont(ofSize:12)
        tuningPlay.frame = NSRect(x:0,y:328,width:140,height:28); document.addSubview(tuningPlay)
        tuningUndoButton = button("Undo",y:328,action:#selector(undoTuning),x:150,width:66)
        tuningRedoButton = button("Redo",y:328,action:#selector(redoTuning),x:226,width:66)
        label("Selected joint",y:376)
        if tuningBone.numberOfItems == 0 {
            tuningBone.addItems(withTitles:tuningJointNames); tuningBone.selectItem(at:3)
            tuningBone.target = self; tuningBone.action = #selector(tuningBoneChanged)
            tuningBone.setAccessibilityLabel("Selected animation joint")
        }
        tuningBone.frame = NSRect(x:0,y:400,width:w,height:30); document.addSubview(tuningBone)
        _ = button(fineBoneRotation ? "Hide rotation values" : "Precision rotation…",y:444,action:#selector(toggleBonePrecision),width:190)
        _ = button("Reframe",y:444,action:#selector(reframeTuning),x:202,width:90)
        tuningSliders.removeAll(); tuningValues.removeAll()
        var rowY: CGFloat = 490
        for (index,title) in ["X rotation","Y rotation","Z rotation","Adjustment strength","Playback speed"].enumerated() {
            let visible = index >= 3 || fineBoneRotation
            let y = rowY
            let readout = NSTextField(labelWithString:""); readout.alignment = .right
            readout.textColor = .white; readout.font = .monospacedDigitSystemFont(ofSize:11,weight:.medium)
            readout.frame = NSRect(x:w-70,y:y,width:70,height:18); tuningValues.append(readout)
            let slider = BoneTuningSlider(value:0,minValue:index < 3 ? -180 : index == 3 ? 0 : 0.25,maxValue:index < 3 ? 180 : index == 3 ? 1 : 2,target:self,action:#selector(tuningChanged(_:)))
            slider.tag = index; slider.isContinuous = true
            slider.beginEdit = { [weak self] in self?.rememberTuning() }
            slider.setAccessibilityLabel(title); slider.frame = NSRect(x:0,y:y+22,width:w,height:22)
            tuningSliders.append(slider)
            if visible { label(title,y:y); document.addSubview(readout); document.addSubview(slider); rowY += 58 }
        }
        let bypass = surface(y:rowY+4,height:38); bypass.frame.size.width = w
        let bypassLabel = NSTextField(labelWithString:"Apply adjustments"); bypassLabel.font = .systemFont(ofSize:12); bypassLabel.textColor = .white
        bypassLabel.frame = NSRect(x:11,y:11,width:220,height:18); bypass.addSubview(bypassLabel)
        tuningEnabled.frame = NSRect(x:245,y:7,width:38,height:24); bypass.addSubview(tuningEnabled)
        tuningEnabled.setAccessibilityLabel("Apply bone adjustments")
        tuningEnabled.target = self; tuningEnabled.action = #selector(tuningChanged(_:))
        _ = button("Reset joint",y:rowY+56,action:#selector(resetTuningBone),width:140)
        _ = button("Reset pose",y:rowY+56,action:#selector(resetAllTuning),x:152,width:140)
        tuningNote.font = .systemFont(ofSize:11); tuningNote.textColor = EditorPalette.secondary
        tuningNote.frame = NSRect(x:0,y:rowY+100,width:w,height:44); document.addSubview(tuningNote)
        contentHeight = rowY+152; refreshTuningControls()
        world.evaluateJavaScript("window.mightyAnimationTuning?.()") { [weak self] result,_ in
            guard let self, let info = result as? [String:Any], let bones = info["bones"] as? [[String:String]], !bones.isEmpty else { return }
            self.animationRigChanged(["state":"ready","key":self.appearance["key"] ?? "","bones":bones,"physics":info["physics"] ?? [:]])
        }
    }
    func stop() {
        isClosing = true; modelTask?.cancel(); voiceTask?.cancel(); imageTasks.forEach{$0.cancel()}; imageQueue.removeAll()
        world.configuration.userContentController.removeScriptMessageHandler(forName:"animationTuning")
        world.stopLoading(); world.loadHTMLString("",baseURL:nil); view.removeFromSuperview()
    }
    private func captureFields() {
        for (key,field) in aboutFields { if key == "description" { character[key] = field.stringValue } else { profile[key] = field.stringValue } }
        for (key,text) in aboutText { if key == "description" { character[key] = text.string } else { profile[key] = text.string } }
        profile["aiProvider"] = currentProvider; profile["aiModel"] = model.stringValue.trimmingCharacters(in:.whitespacesAndNewlines)
        if latencyEnabled {
            profile["callMaxTokens"] = max(64,min(1200,callReplyLimit.integerValue))
            profile["chatMaxTokens"] = max(64,min(1200,chatReplyLimit.integerValue))
            let ids = replyFallbacks.stringValue.split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }.filter { providerIDs.contains($0) }
            let previous = profile["aiFallbackProviders"] as? [[String:Any]] ?? []
            profile["aiFallbackProviders"] = Array(ids.prefix(4)).map { id in previous.first { $0["aiProvider"] as? String == id } ?? ["aiProvider":id] }
        }
        profile["ttsProvider"] = ["edge","openai","pocket"][engine.indexOfSelectedItem]
        profile["voiceSpeed"] = speed.doubleValue; profile["voicePitch"] = Int(pitch.doubleValue.rounded()); profile["speak"] = speak.state == .on
    }
    @objc private func changeTab() { captureFields(); currentTab = tabs.selectedSegment; renderTab() }
    private func label(_ text: String, y: CGFloat) {
        let label = NSTextField(labelWithString:text); label.font = .systemFont(ofSize:12,weight:.regular)
        label.textColor = EditorPalette.secondary; label.frame = NSRect(x:0,y:y,width:312,height:18); document.addSubview(label)
    }
    @discardableResult private func surface(y: CGFloat,height: CGFloat) -> EditorMaterial {
        let surface = EditorMaterial(radius:10,color:EditorPalette.field); surface.layer?.shadowOpacity = 0
        surface.layer?.borderWidth = 0; surface.frame = NSRect(x:0,y:y,width:312,height:height)
        document.addSubview(surface); return surface
    }
    private func textArea(_ title: String,key: String,y: CGFloat,height: CGFloat) {
        label(title,y:y)
        let container = surface(y:y+24,height:height); container.layer?.masksToBounds = true
        let box = NSScrollView(frame:container.bounds); box.borderType = .noBorder
        box.drawsBackground = false; box.hasVerticalScroller = true; box.autohidesScrollers = true; box.scrollerStyle = .overlay
        let editor = NSTextView(frame:box.bounds); editor.isRichText = false; editor.font = .systemFont(ofSize:13)
        editor.textContainerInset = NSSize(width:10,height:9); editor.backgroundColor = EditorPalette.field
        editor.textColor = .labelColor; editor.insertionPointColor = .white
        editor.string = key == "description" ? character[key] as? String ?? "" : profile[key] as? String ?? ""
        editor.isAutomaticQuoteSubstitutionEnabled = false; editor.isHorizontallyResizable = false; editor.isVerticallyResizable = true
        editor.autoresizingMask = [.width]; editor.textContainer?.widthTracksTextView = true
        editor.setAccessibilityLabel(title); box.documentView = editor; container.addSubview(box); aboutText[key] = editor
    }
    private func inlineRow(_ title: String,control: NSControl,in surface: NSView,y: CGFloat) {
        let titleLabel = NSTextField(labelWithString:title); titleLabel.font = .systemFont(ofSize:12)
        titleLabel.frame = NSRect(x:11,y:y+11,width:80,height:18); surface.addSubview(titleLabel)
        control.font = .systemFont(ofSize:12); control.frame = NSRect(x:94,y:y+5,width:208,height:28)
        control.setAccessibilityLabel(title)
        if let popup = control as? NSPopUpButton { popup.isBordered = false; popup.alignment = .right }
        if let input = control as? NSTextField { input.isBezeled = false; input.drawsBackground = false; input.alignment = .right; input.focusRingType = .none }
        surface.addSubview(control)
        if y > 0 {
            let line = NSBox(frame:NSRect(x:11,y:y,width:290,height:1)); line.boxType = .separator; surface.addSubview(line)
        }
    }
    private func button(_ title: String,y: CGFloat,action: Selector,x: CGFloat = 0,width: CGFloat = 312) -> NSButton {
        let button = NSButton(title:title,target:self,action:action); button.bezelStyle = .rounded; button.font = .systemFont(ofSize:12)
        button.frame = NSRect(x:x,y:y,width:width,height:28); document.addSubview(button); return button
    }
    private func disclosure(_ title: String,y: CGFloat,expanded: Bool,action: Selector) {
        let line = NSBox(frame:NSRect(x:0,y:y,width:312,height:1)); line.boxType = .separator; document.addSubview(line)
        let button = button(title,y:y+9,action:action)
        button.isBordered = false; button.alignment = .left
        let icon = NSImageView(frame:NSRect(x:299,y:y+18,width:10,height:10))
        icon.image = NSImage(systemSymbolName:expanded ? "chevron.up" : "chevron.down",accessibilityDescription:nil)
        icon.contentTintColor = EditorPalette.secondary; document.addSubview(icon)
    }
    @objc private func toggleAbout() { captureFields(); moreAbout.toggle(); renderTab() }
    @objc private func toggleVoice() { captureFields(); fineVoice.toggle(); renderTab() }
    private func renderTab() {
        document.subviews.forEach{$0.removeFromSuperview()}; search.removeFromSuperview(); selectionLabel.removeFromSuperview()
        aboutFields.removeAll(); aboutText.removeAll(); cards.removeAll()
        switch currentTab {
        case 0:
            let roleRow = surface(y:0,height:38)
            let role = NSTextField(string:profile["job"] as? String ?? ""); aboutFields["job"] = role
            inlineRow("Role",control:role,in:roleRow,y:0)
            textArea("Personality",key:"description",y:58,height:98)
            textArea("Response style",key:"preferences",y:200,height:78)
            let motion = surface(y:318,height:38)
            inlineRow("Idle base pose",control:idleStyle,in:motion,y:0)
            disclosure("More options",y:378,expanded:moreAbout,action:#selector(toggleAbout))
            contentHeight = 414
            if moreAbout {
                textArea("Greeting",key:"greeting",y:430,height:70)
                textArea("Purpose",key:"purpose",y:546,height:70)
                textArea("Example dialogue",key:"examples",y:662,height:88)
                contentHeight = 782
            }
        case 1:
            panel.addSubview(search); panel.addSubview(selectionLabel)
            selectionLabel.stringValue = appearance["name"] as? String ?? ""
            renderCharacters()
        case 2:
            renderEditorSection()
            for item in document.subviews { item.frame.origin.y += 48 }
            let sections = NSSegmentedControl(labels:["Facial","Bone Animation","Clothes"],trackingMode:.selectOne,target:self,action:#selector(changeEditorSection(_:)))
            sections.selectedSegment = editorSection; sections.frame = NSRect(x:0,y:0,width:292,height:32)
            sections.setAccessibilityLabel("Editor tools"); document.addSubview(sections)
            contentHeight += 48
        case 3:
            if memoryEnabled { renderMemory() }
            else {
            let icon = NSImageView(frame:NSRect(x:141,y:67,width:30,height:30))
            icon.image = NSImage(systemSymbolName:"point.3.connected.trianglepath.dotted",accessibilityDescription:nil)
            icon.contentTintColor = EditorPalette.secondary; document.addSubview(icon)
            let note = NSTextField(labelWithString:"Under development"); note.alignment = .center
            note.font = .systemFont(ofSize:13); note.textColor = EditorPalette.secondary
            note.frame = NSRect(x:0,y:114,width:312,height:22); document.addSubview(note)
            contentHeight = 245
            }
        default:
            label("Model",y:0)
            let keys = button("API keys…",y:-5,action:#selector(connection),x:222,width:90); keys.isBordered = false; keys.alignment = .right
            let models = surface(y:26,height:76)
            inlineRow("Provider",control:provider,in:models,y:0); inlineRow("Model",control:model,in:models,y:38)
            label("Voice",y:124)
            engine.isBordered = false; engine.font = .systemFont(ofSize:11); engine.alignment = .right
            engine.frame = NSRect(x:192,y:119,width:120,height:27); document.addSubview(engine)
            let audio = surface(y:150,height:114)
            let speechLabel = NSTextField(labelWithString:"Speak replies"); speechLabel.font = .systemFont(ofSize:12)
            speechLabel.frame = NSRect(x:11,y:11,width:200,height:18); audio.addSubview(speechLabel)
            speak.frame = NSRect(x:265,y:7,width:38,height:24); audio.addSubview(speak)
            inlineRow("Language",control:language,in:audio,y:38); inlineRow("Voice",control:voice,in:audio,y:76)
            _ = button("Preview",y:274,action:#selector(previewVoice),x:224,width:88)
            disclosure("Fine-tune voice",y:318,expanded:fineVoice,action:#selector(toggleVoice))
            contentHeight = 354
            if fineVoice {
                label("Speed",y:370); speed.frame = NSRect(x:0,y:398,width:258,height:22); document.addSubview(speed)
                speedLabel.frame = NSRect(x:269,y:400,width:43,height:18); speedLabel.font = .systemFont(ofSize:11); speedLabel.alignment = .right; document.addSubview(speedLabel); speedChanged()
                label("Pitch",y:442); pitch.frame = NSRect(x:0,y:470,width:244,height:22); document.addSubview(pitch)
                pitchLabel.frame = NSRect(x:250,y:472,width:62,height:18); pitchLabel.font = .systemFont(ofSize:11); pitchLabel.alignment = .right; document.addSubview(pitchLabel); pitchChanged()
                contentHeight = 506
            }
            if latencyEnabled {
                label("Reply limits (tokens)", y: contentHeight+8)
                let limits = surface(y:contentHeight+34,height:114)
                inlineRow("Call",control:callReplyLimit,in:limits,y:0)
                inlineRow("Chat",control:chatReplyLimit,in:limits,y:38)
                inlineRow("Fallbacks",control:replyFallbacks,in:limits,y:76)
                contentHeight += 160
            }
            status.frame = NSRect(x:0,y:contentHeight+8,width:312,height:32); document.addSubview(status)
            contentHeight += 40
            populateLanguages(); fetchModels()
        }
        facePanel.isHidden = !isFacialEditing
        syncPoseEditing()
        if lastFacialEditing != isFacialEditing { lastFacialEditing = isFacialEditing; updateFraming() }
        sendFacePreview()
        layoutEditor()
        scroll.contentView.scroll(to:.zero); scroll.reflectScrolledClipView(scroll.contentView)
    }
    func controlTextDidChange(_ obj: Notification) {
        if obj.object as? NSSearchField === search { renderCharacters(); scroll.contentView.scroll(to:.zero); scroll.reflectScrolledClipView(scroll.contentView) }
        if obj.object as? NSSearchField === faceSearch {
            let range = faceSearch.currentEditor()?.selectedRange
            renderTab(); view.window?.makeFirstResponder(faceSearch)
            if let range { faceSearch.currentEditor()?.selectedRange = range }
        }
    }
    func controlTextDidEndEditing(_ obj: Notification) {
        if let field = obj.object as? NSTextField, faceNumbers.values.contains(where:{$0 === field}) {
            if editorExpressions.indices.contains(field.tag), let key = editorExpressions[field.tag]["stableId"], abs((faceWeights[key] ?? 0)-field.doubleValue/100)>0.00001 { faceNumberChanged(field) }
        }
    }
    @objc private func filterCharacters() { renderCharacters(); scroll.contentView.scroll(to:.zero); scroll.reflectScrolledClipView(scroll.contentView) }
    private func renderCharacters() {
        cards.forEach{$0.removeFromSuperview()}; cards.removeAll()
        document.subviews.filter{$0.identifier?.rawValue == "empty"}.forEach{$0.removeFromSuperview()}
        let query = search.stringValue.trimmingCharacters(in:.whitespacesAndNewlines)
        let selectedGroup = group.indexOfSelectedItem == 0 ? nil : group.titleOfSelectedItem
        let items = rosterOrder.map{($0,catalog[$0])}.filter { _,item in
            if let portrait = item["portrait"] as? String, failedPortraits.contains(portrait) { return false }
            return (selectedGroup == nil || item["group"] as? String == selectedGroup) && (query.isEmpty || (item["name"] as? String ?? "").localizedCaseInsensitiveContains(query))
        }
        for (position,pair) in items.enumerated() {
            let (index,item) = pair; let button = PortraitButton(frame:NSRect(x:CGFloat(position%5)*63,y:CGFloat(position/5)*62,width:60,height:60))
            button.title = item["name"] as? String ?? "Character"; button.toolTip = button.title + ((item["variant"] as? Bool == true) ? " · Alternate" : "")
            button.setAccessibilityLabel(button.toolTip); button.isBordered = false; button.tag = index; button.target = self; button.action = #selector(selectAppearance(_:))
            button.chosen = item["key"] as? String == appearance["key"] as? String
            if let portrait = item["portrait"] as? String {
                button.identifier = NSUserInterfaceItemIdentifier(portrait); button.portrait = imageCache[portrait]
                queuePortrait(portrait)
            }
            document.addSubview(button); cards.append(button)
        }
        if items.isEmpty {
            let empty = NSTextField(labelWithString:"No characters found"); empty.identifier = NSUserInterfaceItemIdentifier("empty")
            empty.textColor = .secondaryLabelColor; empty.alignment = .center; empty.frame = NSRect(x:0,y:112,width:312,height:24); document.addSubview(empty)
        }
        contentHeight = max(190,CGFloat((items.count+4)/5)*62)
        document.frame.size.height = contentHeight
        pumpImages()
    }
    private func queuePortrait(_ portrait: String) {
        guard imageCache[portrait] == nil, !imagePending.contains(portrait) else { return }
        var path = portrait
        if portrait == "local/chars/hailey/portrait.jpeg" { path = origin+"/assets/"+token+"/"+portrait }
        else if let url = URL(string:portrait), url.host == "phoshco.github.io" { path = origin+"/assets/"+token+url.path }
        guard let url = URL(string:path.addingPercentEncoding(withAllowedCharacters:.urlQueryAllowed) ?? path), ["http","https"].contains(url.scheme ?? "") else { return }
        imagePending.insert(portrait); imageQueue.append((portrait,url))
    }
    private func pumpImages() {
        guard !isClosing else { return }
        while activeImages < 3 && !imageQueue.isEmpty {
            let (key,url) = imageQueue.removeFirst(); activeImages += 1
            let task = URLSession.shared.dataTask(with:url) { [weak self] data,_,_ in
                let image = data.flatMap{NSImage(data:$0)}
                DispatchQueue.main.async {
                    guard let self, !self.isClosing else { return }; self.activeImages -= 1
                    if let image { self.imageCache[key] = image; self.cards.filter{$0.identifier?.rawValue == key}.forEach{$0.portrait = image} }
                    else {
                        self.failedPortraits.insert(key)
                        if self.currentTab == 1 {
                            let offset = self.scroll.contentView.bounds.origin
                            self.renderCharacters(); self.scroll.contentView.scroll(to:offset)
                            self.scroll.reflectScrolledClipView(self.scroll.contentView)
                        }
                    }
                    self.pumpImages()
                }
            }
            imageTasks.append(task); task.resume()
        }
    }
    @objc private func selectAppearance(_ sender: NSButton) {
        guard catalog.indices.contains(sender.tag) else { return }
        appearance = catalog[sender.tag]; selectionLabel.stringValue = appearance["name"] as? String ?? ""
        cards.forEach{$0.chosen = catalog[$0.tag]["key"] as? String == appearance["key"] as? String}
        previewAppearance()
    }
    @objc private func providerChanged() {
        modelDrafts[currentProvider] = model.stringValue
        currentProvider = providerIDs[provider.indexOfSelectedItem]
        model.stringValue = modelDrafts[currentProvider] ?? defaults[currentProvider]!
        fetchModels()
    }
    private func fetchModels() {
        modelTask?.cancel(); let selectedModel = model.stringValue; model.removeAllItems(); model.stringValue = selectedModel
        let id = currentProvider
        guard let key = credentials.read(id) else { status.stringValue = "Add or unlock an API key to load models."; return }
        let base = ["groq":"https://api.groq.com/openai/v1","openai":"https://api.openai.com/v1","gemini":"https://generativelanguage.googleapis.com/v1beta/openai","anthropic":"https://api.anthropic.com/v1"][id]!
        var request = URLRequest(url:URL(string:base+"/models")!); request.timeoutInterval = 20
        request.setValue(key,forHTTPHeaderField:id == "anthropic" ? "x-api-key" : "Authorization")
        if id == "anthropic" { request.setValue("2023-06-01",forHTTPHeaderField:"anthropic-version") }
        else { request.setValue("Bearer "+key,forHTTPHeaderField:"Authorization") }
        status.stringValue = "Loading available models…"
        modelTask = URLSession.shared.dataTask(with:request) { [weak self] data,response,_ in
            let json = data.flatMap{try? JSONSerialization.jsonObject(with:$0)} as? [String:Any]
            let ids = (json?["data"] as? [[String:Any]] ?? []).compactMap{$0["id"] as? String}.sorted()
            DispatchQueue.main.async {
                guard let self, !self.isClosing, self.currentProvider == id else { return }
                if (response as? HTTPURLResponse)?.statusCode == 200 && !ids.isEmpty {
                    let current = self.model.stringValue; self.model.addItems(withObjectValues:ids); self.model.stringValue = current; self.status.stringValue = ""
                } else { self.status.stringValue = "Couldn’t load models. Check the connection or enter a model ID." }
            }
        }; modelTask?.resume()
    }
    private func fetchVoices() {
        voiceTask?.cancel()
        var request = URLRequest(url:URL(string:origin+"/api/voices")!); request.setValue(token,forHTTPHeaderField:"X-Mighty-Token"); request.timeoutInterval = 30
        voiceTask = URLSession.shared.dataTask(with:request) { [weak self] data,response,_ in
            let json = data.flatMap{try? JSONSerialization.jsonObject(with:$0)} as? [String:Any]
            let voices = json?["voices"] as? [[String:String]] ?? []
            DispatchQueue.main.async {
                guard let self, !self.isClosing, !voices.isEmpty else { return }
                self.voices = voices; if self.currentTab == 4 { self.populateLanguages() }
            }
        }; voiceTask?.resume()
    }
    @objc private func engineChanged() { populateLanguages() }
    private func populateLanguages() {
        language.removeAllItems()
        let edge = engine.indexOfSelectedItem == 0; language.isEnabled = engine.indexOfSelectedItem != 1
        speed.isEnabled = engine.indexOfSelectedItem != 2; pitch.isEnabled = edge
        if edge {
            let current = profile["voice"] as? String ?? "en-US-AvaMultilingualNeural"
            let locales = Set(voices.compactMap{$0["locale"]}).sorted { (Locale.current.localizedString(forIdentifier:$0) ?? $0) < (Locale.current.localizedString(forIdentifier:$1) ?? $1) }
            for locale in locales { language.addItem(withTitle:Locale.current.localizedString(forIdentifier:locale) ?? locale); language.lastItem?.representedObject = locale }
            let locale = voices.first{$0["id"] == current}?["locale"] ?? "en-US"
            if let item = language.itemArray.first(where:{$0.representedObject as? String == locale}) { language.select(item) }
        } else if engine.indexOfSelectedItem == 2 {
            for item in PocketVoiceCatalog.languages {language.addItem(withTitle:item["name"]!);language.lastItem?.representedObject=item["id"]}
            if let item=language.itemArray.first(where:{$0.representedObject as? String == (profile["pocketLanguage"] as? String ?? "english")}){language.select(item)}
        } else {language.addItem(withTitle:"Automatic")}
        populateVoices()
    }
    @objc private func languageChanged() {if engine.indexOfSelectedItem == 2 {profile["pocketLanguage"]=language.selectedItem?.representedObject as? String ?? "english";profile["pocketVoice"]=PocketVoiceCatalog.languages.first{$0["id"] == profile["pocketLanguage"] as? String}?["defaultVoice"]};populateVoices(); voiceChanged() }
    private func populateVoices() {
        voice.removeAllItems()
        if engine.indexOfSelectedItem == 0 {
            let locale = language.selectedItem?.representedObject as? String ?? "en-US"
            for item in voices.filter({$0["locale"] == locale}).sorted(by:{($0["name"] ?? "") < ($1["name"] ?? "")}) {
                voice.addItem(withTitle:item["name"] ?? item["id"] ?? ""); voice.lastItem?.representedObject = item["id"]
            }
            if let item = voice.itemArray.first(where:{$0.representedObject as? String == (profile["voice"] as? String ?? "en-US-AvaMultilingualNeural")}) { voice.select(item) }
        } else if engine.indexOfSelectedItem == 2 {
            for id in PocketVoiceCatalog.voices {voice.addItem(withTitle:id.capitalized); voice.lastItem?.representedObject = id}
            if let item = voice.itemArray.first(where:{$0.representedObject as? String == (profile["pocketVoice"] as? String ?? "alba")}) {voice.select(item)}
        } else {
            for value in ["marin","cedar","alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse"] { voice.addItem(withTitle:value.capitalized); voice.lastItem?.representedObject = value }
            if let item = voice.itemArray.first(where:{$0.representedObject as? String == (profile["openaiVoice"] as? String ?? "marin")}) { voice.select(item) }
        }
    }
    @objc private func voiceChanged() {
        if let id = voice.selectedItem?.representedObject as? String { profile[engine.indexOfSelectedItem == 2 ? "pocketVoice" : engine.indexOfSelectedItem == 0 ? "voice" : "openaiVoice"] = id }
    }
    @objc private func pitchChanged() { pitchLabel.stringValue = abs(pitch.doubleValue) < 0.5 ? "Natural" : String(format:"%+.0f Hz",pitch.doubleValue) }
    @objc private func speedChanged() { speedLabel.stringValue = String(format:"%.2g×",speed.doubleValue) }
    @objc private func previewVoice() { voiceChanged(); captureFields(); status.stringValue = "Preparing preview…"; onPreview?(profile) }
    func reportPreview(_ text: String) {
        let technical = text.contains("Traceback") || text.contains(".py\"") || text.contains("File \"") || text.count > 220
        status.stringValue = technical ? "Voice preview couldn’t play. Try another voice or check your connection." : text
    }
    @objc private func connection() {
        guard let window = view.window else { return }
        let id = currentProvider; let alert = NSAlert(); alert.messageText = provider.titleOfSelectedItem! + " API connection"
        alert.informativeText = "Saved in Keychain. Available to all characters."
        alert.addButton(withTitle:"Save key"); alert.addButton(withTitle:"Cancel"); alert.addButton(withTitle:"Reload saved key")
        let field = NSSecureTextField(frame:NSRect(x:0,y:0,width:320,height:28)); field.placeholderString = credentials.read(id) == nil ? "API key" : "Replace saved key"; field.setAccessibilityLabel("API key")
        alert.accessoryView = field
        alert.beginSheetModal(for:window) { [weak self] result in
            guard let self else { return }
            if result == .alertThirdButtonReturn {
                self.status.stringValue = self.credentials.read(id,reload:true) == nil ? "Paste and save your API key once." : "Saved connection loaded."
                self.onCredentialsChanged?(); self.fetchModels(); return
            }
            guard result == .alertFirstButtonReturn else { return }
            let key = field.stringValue.trimmingCharacters(in:.whitespacesAndNewlines)
            guard !key.isEmpty, key.count <= 1024, !key.contains(where:{$0.isWhitespace}) else { self.status.stringValue = "Enter a valid API key."; return }
            guard self.credentials.save(key,provider:id) else { self.status.stringValue = self.credentials.saveError; return }
            field.stringValue = ""; self.onCredentialsChanged?(); self.fetchModels()
        }
    }
    private func memoryRequest(_ path: String, body: [String: Any]? = nil) async throws -> [String: Any] {
        guard var components = URLComponents(string: origin + path), components.host == "127.0.0.1" else { throw URLError(.badURL) }
        if body == nil { components.queryItems = [URLQueryItem(name: "characterId", value: character["id"] as? String ?? "")] }
        guard let url = components.url else { throw URLError(.badURL) }
        var request = URLRequest(url: url); request.timeoutInterval = 30
        request.setValue(token, forHTTPHeaderField: "X-Mighty-Token")
        if let body { request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        let result = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw NSError(domain: "Memory", code: 1, userInfo: [NSLocalizedDescriptionKey: result["error"] as? String ?? "Memory is unavailable. Try again."])
        }
        return result
    }
    private func renderMemory() {
        memoryEditors.removeAll()
        _ = button("Refresh", y: 0, action: #selector(refreshMemory))
        _ = button("Export memories…", y: 36, action: #selector(exportMemory))
        _ = button("Show compiled character card", y: 72, action: #selector(showPersonaCard))
        _ = button("Forget conversation and memories…", y: 108, action: #selector(forgetMemory))
        var y: CGFloat = 156
        if !memoryError.isEmpty {
            let note = NSTextField(wrappingLabelWithString: memoryError); note.textColor = EditorPalette.secondary
            note.frame = NSRect(x:0,y:y,width:312,height:48); document.addSubview(note); y += 56
        }
        if memoryFacts.isEmpty {
            let note = NSTextField(wrappingLabelWithString: memoryLoaded ? "No saved memories yet." : "Loading memories…")
            note.textColor = EditorPalette.secondary; note.frame = NSRect(x:0,y:y,width:312,height:38); document.addSubview(note); y += 44
        }
        for fact in memoryFacts {
            guard let id = fact["id"] as? Int else { continue }
            let editor = NSTextView(frame:NSRect(x:0,y:0,width:296,height:76)); editor.isRichText = false
            editor.font = .systemFont(ofSize:12); editor.backgroundColor = EditorPalette.field
            editor.textColor = .white; editor.string = fact["text"] as? String ?? ""; editor.setAccessibilityLabel("Memory text")
            let holder = NSScrollView(frame:NSRect(x:0,y:y,width:312,height:76)); holder.hasVerticalScroller = true; holder.documentView = editor
            document.addSubview(holder); memoryEditors[id] = editor
            let save = button("Save memory",y:y+82,action:#selector(saveMemory(_:)),width:151); save.tag = id
            let remove = button("Delete",y:y+82,action:#selector(deleteMemory(_:)),x:161,width:151); remove.tag = id
            y += 124
        }
        contentHeight = max(230,y)
        if !memoryLoaded { memoryLoaded = true; loadMemory() }
    }
    private func loadMemory() {
        Task { @MainActor [weak self] in
            guard let self else { return }
            do { let result = try await memoryRequest("/api/memory/facts"); memoryFacts = result["facts"] as? [[String: Any]] ?? []; memoryError = "" }
            catch { memoryError = error.localizedDescription }
            if !isClosing && currentTab == 3 { renderTab() }
        }
    }
    @objc private func refreshMemory() { loadMemory() }
    @objc private func saveMemory(_ sender: NSButton) {
        guard let text = memoryEditors[sender.tag]?.string else { return }; sender.isEnabled = false
        Task { @MainActor [weak self] in
            guard let self else { return }
            do { _ = try await memoryRequest("/api/memory/edit",body:["characterId":character["id"] ?? "", "factId":sender.tag,"text":text]); loadMemory() }
            catch { memoryError = error.localizedDescription; if currentTab == 3 { renderTab() } }
        }
    }
    @objc private func deleteMemory(_ sender: NSButton) {
        sender.isEnabled = false
        Task { @MainActor [weak self] in
            guard let self else { return }
            do { _ = try await memoryRequest("/api/memory/delete",body:["characterId":character["id"] ?? "", "factId":sender.tag]); loadMemory() }
            catch { memoryError = error.localizedDescription; if currentTab == 3 { renderTab() } }
        }
    }
    @objc private func exportMemory() {
        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let result = try await memoryRequest("/api/memory/export")
                let panel = NSSavePanel(); panel.nameFieldStringValue = "memories.json"
                guard panel.runModal() == .OK, let url = panel.url else { return }
                try JSONSerialization.data(withJSONObject:result,options:[.prettyPrinted,.sortedKeys]).write(to:url,options:.atomic)
            } catch { memoryError = error.localizedDescription; if currentTab == 3 { renderTab() } }
        }
    }
    @objc private func showPersonaCard() {
        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let result = try await memoryRequest("/api/memory/card")
                let alert = NSAlert(); alert.messageText = "Compiled character card"
                let view = NSTextView(frame:NSRect(x:0,y:0,width:430,height:280)); view.isEditable = false; view.isRichText = false
                view.string = result["card"] as? String ?? ""; view.font = .systemFont(ofSize:12)
                let scroll = NSScrollView(frame:view.frame); scroll.hasVerticalScroller = true; scroll.documentView = view; alert.accessoryView = scroll
                alert.addButton(withTitle:"Done"); alert.runModal()
            } catch { memoryError = error.localizedDescription; if currentTab == 3 { renderTab() } }
        }
    }
    @objc private func forgetMemory() {
        let alert = NSAlert(); alert.messageText = "Forget this conversation and its memories?"
        alert.informativeText = "This removes learned memories, the conversation summary and stored conversation context for this character. Your visible chat history remains in the app."
        alert.addButton(withTitle:"Forget everything"); alert.addButton(withTitle:"Cancel")
        guard alert.runModal() == .alertFirstButtonReturn else { return }
        Task { @MainActor [weak self] in
            guard let self else { return }
            do { _ = try await memoryRequest("/api/memory/forget",body:["characterId":character["id"] ?? ""]); loadMemory() }
            catch { memoryError = error.localizedDescription; if currentTab == 3 { renderTab() } }
        }
    }
    @objc private func cancelEdit() { onCancel?() }
    @objc private func saveEdit() {
        view.window?.makeFirstResponder(nil); voiceChanged(); captureFields()
        let value = name.stringValue.trimmingCharacters(in:.whitespacesAndNewlines)
        guard !value.isEmpty else { view.window?.makeFirstResponder(name); return }
        guard !appearance.isEmpty else { return }
        guard !(profile["aiModel"] as? String ?? "").isEmpty else { tabs.selectedSegment = 4; currentTab = 4; renderTab(); view.window?.makeFirstResponder(model); return }
        character["name"] = String(value.prefix(80)); character["appearance"] = appearance; character["profile"] = profile
        save.isEnabled = false
        Task { @MainActor [weak self] in
            guard let self else { return }
            if memoryEnabled {
                do {
                    let result = try await memoryRequest("/api/memory/characters",body:["character":character])
                    profile["compiledPersonaCard"] = result["card"]; profile["personaSourceHash"] = result["sourceHash"]
                    character["profile"] = profile
                } catch {
                    save.isEnabled = true
                    let alert = NSAlert(); alert.messageText = "Couldn’t save character"; alert.informativeText = error.localizedDescription
                    if let window = view.window { _ = await alert.beginSheetModal(for:window) }; return
                }
            }
            onSave?(character) { [weak self] error in
                guard let self else { return }; self.save.isEnabled = true
                if let error, let window = self.view.window { let alert = NSAlert(); alert.messageText = "Couldn’t save character"; alert.informativeText = error; alert.beginSheetModal(for:window) }
            }
        }
    }
}
