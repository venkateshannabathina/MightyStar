import Cocoa

enum PocketVoiceCatalog {
 static let data: [String:Any] = {
  guard let url=Bundle.main.resourceURL?.appendingPathComponent("PocketTTS/catalog.json"),let bytes=try? Data(contentsOf:url),let value=try? JSONSerialization.jsonObject(with:bytes) as? [String:Any] else{return [:]};return value
 }()
 static var voices:[String]{(data["voices"] as? [[String:Any]])?.compactMap{$0["id"] as? String} ?? ["alba"]}
 static var languages:[[String:String]]{(data["languages"] as? [[String:Any]])?.compactMap {item in guard let id=item["id"] as? String,let name=item["name"] as? String,let voice=item["defaultVoice"] as? String else{return nil};return ["id":id,"name":name,"defaultVoice":voice]} ?? [["id":"english","name":"English","defaultVoice":"alba"]]}
}
final class AISettingsController: NSWindowController {
    private let credentials: CredentialStore
    private let holdKey = NSPopUpButton()
    private let holdEnabled = NSButton(checkboxWithTitle: "Enable hold-to-talk in all view modes", target: nil, action: nil)
    private let provider = NSPopUpButton()
    private let model = NSTextField()
    private let engine = NSPopUpButton()
    private let voice = NSPopUpButton()
    private let pocketLanguage = NSPopUpButton()
    private let speed = NSPopUpButton()
    private let pitch = NSPopUpButton()
    private let instructions = NSTextField()
    private let speak = NSButton(checkboxWithTitle: "Speak chat replies automatically", target: nil, action: nil)
    private let status = NSTextField(wrappingLabelWithString: "")
    private var keyFields: [String: NSSecureTextField] = [:]
    private var keyLabels: [String: NSTextField] = [:]
    private var profile: [String: Any]
    var onSave: ((String, String, [String: Any]) -> Void)?
    var onPreview: (([String: Any]) -> Void)?
    private let edgeVoices = ["en-US-AvaMultilingualNeural", "en-US-AndrewMultilingualNeural", "en-US-EmmaMultilingualNeural", "en-US-BrianMultilingualNeural", "en-GB-SoniaNeural", "en-GB-RyanNeural", "en-IN-NeerjaNeural", "en-IN-PrabhatNeural", "en-AU-NatashaNeural", "en-AU-WilliamNeural"]
    private let openAIVoices = ["marin", "cedar", "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"]

    init(credentials: CredentialStore, profile: [String: Any], characterName: String) {
        self.credentials = credentials; self.profile = profile
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 640, height: 740), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.title = "AI & Voice Settings"; window.isReleasedWhenClosed = false
        super.init(window: window)
        let root = NSStackView(); root.orientation = .vertical; root.alignment = .leading; root.spacing = 16
        root.translatesAutoresizingMaskIntoConstraints = false
        window.contentView!.addSubview(root)
        NSLayoutConstraint.activate([root.leadingAnchor.constraint(equalTo: window.contentView!.leadingAnchor, constant: 24), root.trailingAnchor.constraint(equalTo: window.contentView!.trailingAnchor, constant: -24), root.topAnchor.constraint(equalTo: window.contentView!.topAnchor, constant: 22), root.bottomAnchor.constraint(equalTo: window.contentView!.bottomAnchor, constant: -22)])
        let title = NSTextField(labelWithString: "AI & Voice")
        title.font = .systemFont(ofSize: 22, weight: .semibold); root.addArrangedSubview(title)
        root.addArrangedSubview(NSTextField(wrappingLabelWithString: "API connections apply to the app. Voice settings apply to \(characterName)."))
        let tabs = NSTabView(); tabs.translatesAutoresizingMaskIntoConstraints = false
        root.addArrangedSubview(tabs); tabs.widthAnchor.constraint(equalTo: root.widthAnchor).isActive = true
        tabs.heightAnchor.constraint(equalToConstant: 510).isActive = true
        let api = column(); let audio = column(); let keyboard = column()
        for (name, content) in [("API connections", api), ("Character voice", audio), ("Hold to talk", keyboard)] {
            let tab = NSTabViewItem(identifier: name); tab.label = name
            let wrapper = NSView(); wrapper.addSubview(content); content.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([content.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor, constant: 18), content.trailingAnchor.constraint(equalTo: wrapper.trailingAnchor, constant: -18), content.topAnchor.constraint(equalTo: wrapper.topAnchor, constant: 18)])
            tab.view = wrapper; tabs.addTabViewItem(tab)
        }
        holdKey.addItems(withTitles: HoldToTalkKey.choices)
        if let shortcut=UserDefaults.standard.string(forKey:"holdToTalkKey"), !HoldToTalkKey.choices.contains(shortcut) { holdKey.addItem(withTitle:shortcut) }
        holdKey.selectItem(withTitle: UserDefaults.standard.string(forKey: "holdToTalkKey") ?? "Fn")
        holdEnabled.state = UserDefaults.standard.object(forKey: "holdToTalkEnabled") as? Bool == false ? .off : .on
        keyboard.addArrangedSubview(holdEnabled)
        keyboard.addArrangedSubview(row("Hold this key to speak", holdKey))
        keyboard.addArrangedSubview(NSTextField(wrappingLabelWithString: "Hold to listen. Release to send. Press again while the character speaks to interrupt. Works in chat, overlay, portrait, screensaver, and holographic views, even when another app is focused."))
        keyboard.addArrangedSubview(NSTextField(wrappingLabelWithString: "The first press connects the microphone. Wait for Listening in the menu bar before speaking. The conversation stays ready until you end it from the menu bar. The shortcut pauses while settings are open."))
        for id in ["openai", "groq", "anthropic"] {
            let field = NSSecureTextField(); field.placeholderString = "Paste a \(id) API key"
            keyFields[id] = field
            let label = NSTextField(labelWithString: ""); keyLabels[id] = label; label.font = .systemFont(ofSize: 11)
            api.addArrangedSubview(row("\(id.capitalized) API key", field))
            let unlock = NSButton(title: "Reload saved key", target: self, action: #selector(unlockKey(_:))); unlock.identifier = NSUserInterfaceItemIdentifier(id)
            let check = NSButton(title: "Test connection", target: self, action: #selector(testKey(_:))); check.identifier = NSUserInterfaceItemIdentifier(id)
            let controls = NSStackView(views: [label, unlock, check]); controls.spacing = 8; api.addArrangedSubview(controls)
        }
        provider.addItems(withTitles: ["Groq", "OpenAI", "Claude"])
        provider.selectItem(at: ["groq","openai","anthropic"].firstIndex(of: UserDefaults.standard.string(forKey: "aiProvider") ?? "groq") ?? 0)
        provider.target = self; provider.action = #selector(providerChanged)
        model.stringValue = UserDefaults.standard.string(forKey: "aiModel") ?? "openai/gpt-oss-20b"
        api.addArrangedSubview(row("Reply provider", provider)); api.addArrangedSubview(row("Reply model", model))
        api.addArrangedSubview(NSTextField(wrappingLabelWithString: "Keys are stored in macOS Keychain and are never shown here. Leave a key field empty to keep its saved value. Saving and loading keys never opens a password prompt."))
        engine.addItems(withTitles: ["Edge TTS", "OpenAI TTS", "Pocket TTS · local"]); engine.selectItem(at: ["edge","openai","pocket"].firstIndex(of: profile["ttsProvider"] as? String ?? "pocket") ?? 2)
        engine.target = self; engine.action = #selector(engineChanged)
        speed.addItems(withTitles: ["0.75×", "0.9×", "1×", "1.1×", "1.25×", "1.5×"])
        let speeds = [0.75, 0.9, 1.0, 1.1, 1.25, 1.5]; speed.selectItem(at: speeds.firstIndex(of: profile["voiceSpeed"] as? Double ?? 1) ?? 2)
        pitch.addItems(withTitles: ["−20 Hz", "−10 Hz", "Natural", "+10 Hz", "+20 Hz"])
        pitch.selectItem(at: ([-20, -10, 0, 10, 20].firstIndex(of: profile["voicePitch"] as? Int ?? 0)) ?? 2)
        instructions.placeholderString = "Warm, relaxed, conversational…"; instructions.stringValue = profile["voiceInstructions"] as? String ?? ""
        speak.state = profile["speak"] as? Bool == false ? .off : .on
        for language in PocketVoiceCatalog.languages {pocketLanguage.addItem(withTitle:language["name"]!);pocketLanguage.lastItem?.representedObject=language["id"]}
        if let item=pocketLanguage.itemArray.first(where:{$0.representedObject as? String == (profile["pocketLanguage"] as? String ?? "english")}){pocketLanguage.select(item)}
        pocketLanguage.target=self;pocketLanguage.action=#selector(pocketLanguageChanged)
        audio.addArrangedSubview(row("Language · Pocket", pocketLanguage))
        audio.addArrangedSubview(row("Voice provider", engine)); audio.addArrangedSubview(row("Voice", voice))
        audio.addArrangedSubview(row("Speaking speed · Edge / OpenAI", speed)); audio.addArrangedSubview(row("Pitch · Edge only", pitch))
        audio.addArrangedSubview(row("Delivery · OpenAI only", instructions)); audio.addArrangedSubview(speak)
        let preview = NSButton(title: "▶ Preview voice", target: self, action: #selector(previewVoice)); audio.addArrangedSubview(preview)
        audio.addArrangedSubview(NSTextField(wrappingLabelWithString: "Pocket language packs download on first use. Additional voice tuning is available in Settings > Voice. Voices are AI-generated. OpenAI voice previews use your saved OpenAI key and API credits. Save a new key before previewing."))
        status.font = .systemFont(ofSize: 12); root.addArrangedSubview(status)
        let save = NSButton(title: "Save settings", target: self, action: #selector(saveSettings)); save.keyEquivalent = "\r"; save.bezelStyle = .rounded
        let close = NSButton(title: "Close", target: self, action: #selector(closeSettings)); close.bezelStyle = .rounded
        root.addArrangedSubview(NSStackView(views: [save, close]))
        refreshKeys(); engineChanged(); window.center()
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) unavailable") }
    private func column() -> NSStackView { let v = NSStackView(); v.orientation = .vertical; v.alignment = .leading; v.spacing = 12; return v }
    private func row(_ title: String, _ control: NSView) -> NSStackView {
        let label = NSTextField(labelWithString: title); label.font = .systemFont(ofSize: 12, weight: .medium)
        let stack = NSStackView(views: [label, control]); stack.orientation = .vertical; stack.alignment = .leading; stack.spacing = 4
        control.widthAnchor.constraint(equalToConstant: 510).isActive = true
        return stack
    }
    private func refreshKeys() { for id in ["openai", "groq", "anthropic"] { keyLabels[id]?.stringValue = credentials.read(id) == nil ? "Paste key to connect" : "Saved · available" } }
    @objc private func providerChanged() { model.stringValue = ["openai/gpt-oss-20b","gpt-4.1-mini","claude-sonnet-4-20250514"][provider.indexOfSelectedItem] }
    @objc private func engineChanged() {
        let openAI = engine.indexOfSelectedItem == 1, pocket = engine.indexOfSelectedItem == 2
        voice.removeAllItems(); voice.addItems(withTitles: pocket ? PocketVoiceCatalog.voices : openAI ? openAIVoices : edgeVoices)
        voice.selectItem(withTitle: pocket ? (profile["pocketVoice"] as? String ?? "alba") : profile[openAI ? "openaiVoice" : "voice"] as? String ?? (openAI ? "marin" : edgeVoices[0]))
        pocketLanguage.isEnabled=pocket; pitch.isEnabled = !openAI && !pocket; speed.isEnabled = !pocket; instructions.isEnabled = openAI
    }
    @objc private func pocketLanguageChanged(){if let language=PocketVoiceCatalog.languages.first(where:{$0["id"] == pocketLanguage.selectedItem?.representedObject as? String}) {profile["pocketLanguage"]=language["id"];profile["pocketVoice"]=language["defaultVoice"];engineChanged()}}
    private func editedProfile() -> [String: Any] {
        var result = profile; let openAI = engine.indexOfSelectedItem == 1
        result["ttsProvider"] = ["edge","openai","pocket"][engine.indexOfSelectedItem]
        if engine.indexOfSelectedItem == 2 {result["pocketLanguage"]=pocketLanguage.selectedItem?.representedObject as? String ?? "english"}
        result[engine.indexOfSelectedItem == 2 ? "pocketVoice" : openAI ? "openaiVoice" : "voice"] = voice.titleOfSelectedItem
        result["voiceSpeed"] = [0.75, 0.9, 1.0, 1.1, 1.25, 1.5][speed.indexOfSelectedItem]
        result["voicePitch"] = [-20, -10, 0, 10, 20][pitch.indexOfSelectedItem]
        result["voiceInstructions"] = String(instructions.stringValue.prefix(500))
        result["speak"] = speak.state == .on
        return result
    }
    @objc private func unlockKey(_ sender: NSButton) {
        guard let id = sender.identifier?.rawValue else { return }
        status.stringValue = credentials.read(id, reload: true) == nil ? "Paste your API key and save it once. Older entries may need to be saved again." : "Saved key loaded."
        refreshKeys()
    }
    @objc private func testKey(_ sender: NSButton) {
        guard let id = sender.identifier?.rawValue else { return }
        let entered = keyFields[id]?.stringValue.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard let key = entered.isEmpty ? credentials.read(id) : entered, !key.isEmpty else { status.stringValue = "Paste and save this provider’s key first."; return }
        let base = id == "anthropic" ? "https://api.anthropic.com/v1/models" : id == "openai" ? "https://api.openai.com/v1/models" : "https://api.groq.com/openai/v1/models"
        var request = URLRequest(url: URL(string: base)!); request.timeoutInterval = 15; request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        if id == "anthropic" { request.setValue(nil, forHTTPHeaderField:"Authorization"); request.setValue(key, forHTTPHeaderField:"x-api-key"); request.setValue("2023-06-01", forHTTPHeaderField:"anthropic-version") }
        sender.isEnabled = false; status.stringValue = "Checking \(id)…"
        URLSession.shared.dataTask(with: request) { [weak self, weak sender] _, response, error in
            DispatchQueue.main.async {
                sender?.isEnabled = true
                let code = (response as? HTTPURLResponse)?.statusCode ?? 0
                self?.status.stringValue = code == 200 ? "\(id.capitalized) connection verified. Model access and billing can vary." : (error != nil ? "Connection failed. Check your network." : "Connection failed (HTTP \(code)). Check the key and provider access.")
            }
        }.resume()
    }
    @objc private func saveSettings() {
        let chosen = ["groq","openai","anthropic"][provider.indexOfSelectedItem]
        let chosenModel = model.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !chosenModel.isEmpty, chosenModel.count <= 100 else { status.stringValue = "Enter a reply model."; return }
        for id in ["openai", "groq", "anthropic"] {
            let key = keyFields[id]!.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            guard key.isEmpty || (key.count <= 4096 && !key.contains(where: { $0.isWhitespace })) else { status.stringValue = "The \(id) key has an unexpected format."; return }
        }
        for id in ["openai", "groq", "anthropic"] {
            let field = keyFields[id]!, key = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !key.isEmpty {
                guard credentials.save(key, provider: id) else { status.stringValue = credentials.saveError; return }
                field.stringValue = ""
            }
        }
        UserDefaults.standard.set(holdKey.titleOfSelectedItem ?? "Fn", forKey: "holdToTalkKey")
        UserDefaults.standard.set(holdEnabled.state == .on, forKey: "holdToTalkEnabled")
        profile = editedProfile(); onSave?(chosen, chosenModel, profile); refreshKeys()
        status.stringValue = "Saved."
    }
    func reportPreview(_ message: String) { status.stringValue = message }
    @objc private func previewVoice() {
        if engine.indexOfSelectedItem == 1 && credentials.read("openai") == nil { status.stringValue = "Save your OpenAI key before previewing."; return }
        onPreview?(editedProfile()); status.stringValue = "Preparing voice preview…"
    }
    @objc private func closeSettings() { keyFields.values.forEach { $0.stringValue = "" }; close() }
}
