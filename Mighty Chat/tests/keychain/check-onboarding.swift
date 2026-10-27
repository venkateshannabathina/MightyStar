import Cocoa
import WebKit
import Security

final class FixtureProtocol: URLProtocol {
    static var code = 401
    static var count = 0
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.count += 1
        precondition(request.url?.host == "api.groq.com")
        precondition(request.value(forHTTPHeaderField: "Authorization") == "Bearer synthetic-v01-test-key")
        let response = HTTPURLResponse(url: request.url!, statusCode: Self.code, httpVersion: nil, headerFields: ["Content-Type":"application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data("{\"data\":[]}".utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}
@main struct OnboardingCheck {
    static func descendants(_ view: NSView) -> [NSView] { [view] + view.subviews.flatMap(descendants) }
    static func wait(_ condition: () -> Bool) {
        let deadline = Date().addingTimeInterval(12)
        while !condition() && Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.02)) }
        precondition(condition(), "Native onboarding check timed out")
    }
    static func main() {
        let args = CommandLine.arguments
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        var keychain: SecKeychain?
        precondition(SecKeychainOpen(args[1], &keychain) == errSecSuccess)
        let agent = URL(fileURLWithPath: args[2])
        let store = CredentialStore(keychain: keychain, agentURL: agent)
        let suite = "mighty-onboarding-test-" + UUID().uuidString
        let preferences = UserDefaults(suiteName: suite)!
        defer { preferences.removePersistentDomain(forName: suite) }
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [FixtureProtocol.self]
        let controller = OnboardingController(credentials: store, sessionConfiguration: config, preferences: preferences)
        var completed: (String, String, String)?
        controller.onComplete = { completed = ($0, $1, $2) }
        controller.selectCharacter("hailey")
        precondition(controller.window?.attachedSheet == nil)
        controller.selectCharacter("lucy")
        guard let sheet = controller.window?.attachedSheet else { fatalError("Secure setup sheet missing") }
        let views = descendants(sheet.contentView!)
        let field = views.compactMap { $0 as? NSSecureTextField }.first!
        let button = views.compactMap { $0 as? NSButton }.first { $0.title == "Continue" }!
        field.stringValue = "bad"
        app.sendAction(button.action!, to: button.target, from: button)
        precondition(FixtureProtocol.count == 0)
        field.stringValue = "synthetic-v01-test-key"
        app.sendAction(button.action!, to: button.target, from: button)
        wait { button.isEnabled && FixtureProtocol.count == 1 }
        precondition(completed == nil && field.stringValue == "synthetic-v01-test-key")
        precondition(store.read("groq", reload: true) == nil)
        FixtureProtocol.code = 200
        app.sendAction(button.action!, to: button.target, from: button)
        wait { completed != nil }
        precondition(completed!.0 == "lucy" && completed!.1 == "groq")
        precondition(field.stringValue.isEmpty)
        let restarted = CredentialStore(keychain: keychain, agentURL: agent)
        precondition(restarted.read("groq", reload: true) == "synthetic-v01-test-key")
        controller.finish()
        let returning = OnboardingController(credentials: restarted, sessionConfiguration: config, preferences: preferences)
        var reused = false
        returning.onComplete = { character, provider, _ in reused = character == "rover" && provider == "groq" }
        returning.selectCharacter("rover")
        precondition(reused && returning.window?.attachedSheet == nil)
        returning.finish()
        print("PASS: native secure field, rejected key/retry, provider-only request, verified save, secret clearing, persistent release broker and returning-user skip.")
    }
}
