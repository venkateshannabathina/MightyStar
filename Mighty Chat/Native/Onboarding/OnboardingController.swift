import Cocoa
import WebKit

/// The web surface chooses a character; API secrets stay in native controls and Keychain.
final class OnboardingController: NSWindowController, WKScriptMessageHandler, WKNavigationDelegate, NSWindowDelegate {
    private let credentials: CredentialStore
    private let preferences: UserDefaults
    private let sessionConfiguration: URLSessionConfiguration
    private var browser: WKWebView!
    private var character = ""
    private var keySheet: NSWindow?
    private let provider = NSPopUpButton()
    private let keyField = NSSecureTextField()
    private let status = NSTextField(wrappingLabelWithString: "")
    private var connect: NSButton!
    private var validation: URLSessionDataTask?
    private var validationID = UUID()
    private var connecting = false
    var onComplete: ((String, String, String) -> Void)?
    var isFinishing = false
    private let choices = ["groq", "openai"]
    static let characters = Set(["evelyn", "lynae", "lucy", "rover"])

    init(credentials: CredentialStore, sessionConfiguration: URLSessionConfiguration = .ephemeral, preferences: UserDefaults = .standard) {
        self.preferences = preferences
        self.credentials = credentials
        self.sessionConfiguration = sessionConfiguration
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1120, height: 760), styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
        window.title = "Welcome to MightyStar"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor(white: 0.98, alpha: 1)
        window.appearance = NSAppearance(named: .aqua)
        window.minSize = NSSize(width: 880, height: 640)
        window.isReleasedWhenClosed = false
        super.init(window: window)
        window.delegate = self
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self, name: "onboarding")
        browser = WKWebView(frame: window.contentView!.bounds, configuration: config)
        browser.autoresizingMask = [.width, .height]
        browser.navigationDelegate = self
        window.contentView!.addSubview(browser)
        if let url = Bundle.main.url(forResource: "onboarding", withExtension: "html") {
            browser.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        window.center()
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) unavailable") }
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if !isFinishing { validation?.cancel(); NSApp.terminate(nil) }
        return true
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.webView === browser, message.frameInfo.isMainFrame,
              let url = message.frameInfo.request.url, url.isFileURL, url.lastPathComponent == "onboarding.html",
              let body = message.body as? [String: Any], body["action"] as? String == "select",
              let key = body["character"] as? String, Self.characters.contains(key), keySheet == nil, !connecting else { return }
        selectCharacter(key)
    }
    func selectCharacter(_ key: String) {
        guard Self.characters.contains(key), keySheet == nil, !connecting else { return }
        character = key
        let savedProvider = preferences.string(forKey: "aiProvider") ?? "groq"
        if choices.contains(savedProvider), credentials.read(savedProvider) != nil {
            complete(savedProvider)
        } else { showKeySheet() }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, url.isFileURL,
              url.lastPathComponent == "onboarding.html", navigationAction.targetFrame?.isMainFrame != false else { decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
    private func complete(_ provider: String) {
        connecting = true
        let model = provider == "groq" ? "openai/gpt-oss-20b" : "gpt-4.1-mini"
        preferences.set(provider, forKey: "aiProvider")
        preferences.set(model, forKey: "aiModel")
        onComplete?(character, provider, model)
    }
    private func showKeySheet() {
        let sheet = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 430, height: 300), styleMask: [.titled], backing: .buffered, defer: false)
        sheet.title = "Connect your companion"
        sheet.appearance = NSAppearance(named: .aqua)
        let root = NSStackView(); root.orientation = .vertical; root.alignment = .leading; root.spacing = 16
        root.translatesAutoresizingMaskIntoConstraints = false
        sheet.contentView!.addSubview(root)
        NSLayoutConstraint.activate([root.leadingAnchor.constraint(equalTo: sheet.contentView!.leadingAnchor, constant: 28), root.trailingAnchor.constraint(equalTo: sheet.contentView!.trailingAnchor, constant: -28), root.topAnchor.constraint(equalTo: sheet.contentView!.topAnchor, constant: 26)])
        let title = NSTextField(labelWithString: "One key. You're in.")
        title.font = .systemFont(ofSize: 26, weight: .semibold); root.addArrangedSubview(title)
        let note = NSTextField(wrappingLabelWithString: "Saved in your Mac’s Keychain. Sent only to your chosen AI provider.")
        note.font = .systemFont(ofSize: 12); note.textColor = .secondaryLabelColor; root.addArrangedSubview(note)
        provider.removeAllItems(); provider.addItems(withTitles: ["Groq", "OpenAI"])
        provider.isEnabled = true; keyField.isEnabled = true
        provider.target = self; provider.action = #selector(providerChanged); root.addArrangedSubview(provider)
        keyField.placeholderString = "Paste your API key"
        keyField.font = .systemFont(ofSize: 15)
        root.addArrangedSubview(keyField); keyField.widthAnchor.constraint(equalTo: root.widthAnchor).isActive = true
        keyField.heightAnchor.constraint(equalToConstant: 34).isActive = true
        status.stringValue = ""; status.font = .systemFont(ofSize: 12); root.addArrangedSubview(status)
        connect = NSButton(title: "Continue", target: self, action: #selector(saveKey)); connect.bezelStyle = .rounded; connect.keyEquivalent = "\r"
        let back = NSButton(title: "Back", target: self, action: #selector(closeKeySheet)); back.bezelStyle = .rounded
        let getKey = NSButton(title: "Get an API key ↗", target: self, action: #selector(openKeyPage)); getKey.bezelStyle = .rounded
        root.addArrangedSubview(NSStackView(views: [back, getKey, connect]))
        keySheet = sheet
        window?.beginSheet(sheet)
        sheet.makeFirstResponder(keyField)
    }
    @objc private func providerChanged() { status.stringValue = "" }
    @objc private func openKeyPage() {
        NSWorkspace.shared.open(URL(string: provider.indexOfSelectedItem == 0 ? "https://console.groq.com/keys" : "https://platform.openai.com/api-keys")!)
    }
    @objc private func closeKeySheet() {
        validationID = UUID()
        validation?.cancel(); validation = nil
        keyField.stringValue = ""
        if let sheet = keySheet { window?.endSheet(sheet) }
        keySheet = nil
        browser.evaluateJavaScript("window.mightyOnboardingRetry?.()", completionHandler: nil)
    }
    @objc private func saveKey() {
        let key = keyField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard key.count >= 16, key.count <= 4096, !key.contains(where: { $0.isWhitespace }) else { status.stringValue = "Paste a valid API key."; return }
        let chosen = choices[provider.indexOfSelectedItem]
        let requestID = UUID(); validationID = requestID
        let base = chosen == "groq" ? "https://api.groq.com/openai/v1/models" : "https://api.openai.com/v1/models"
        var request = URLRequest(url: URL(string: base)!); request.timeoutInterval = 20
        request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        connect.isEnabled = false; provider.isEnabled = false; keyField.isEnabled = false; status.stringValue = "Checking connection…"
        let session = URLSession(configuration: sessionConfiguration)
        validation = session.dataTask(with: request) { [weak self] _, response, error in
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard let self else { session.invalidateAndCancel(); return }
            let verified = error == nil && code == 200
            let saved = verified && self.credentials.save(key, provider: chosen)
            DispatchQueue.main.async {
                guard self.keySheet != nil, self.validationID == requestID else { return }
                self.connect.isEnabled = true; self.provider.isEnabled = true; self.keyField.isEnabled = true
                if saved {
                    self.keyField.stringValue = ""
                    if let sheet = self.keySheet { self.window?.endSheet(sheet) }
                    self.keySheet = nil
                    self.complete(chosen)
                } else {
                    self.status.stringValue = verified ? self.credentials.saveError : code == 401 || code == 403 ? "That key wasn’t accepted. Check it and retry." : "Couldn’t connect. Check your network and retry."
                }
            }
            session.finishTasksAndInvalidate()
        }
        validation?.resume()
    }
    func finish() { isFinishing = true; close() }
}
