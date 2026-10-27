import Foundation
import Security
@main struct AgentCheck {
    static func main() {
        let args = CommandLine.arguments
        var keychain: SecKeychain?
        precondition(SecKeychainOpen(args[2], &keychain) == errSecSuccess)
        let store = CredentialStore(keychain: keychain, agentURL: URL(fileURLWithPath: args[3]))
        switch args[1] {
        case "create":
            precondition(store.save("synthetic-broker-key", provider: "groq"), store.saveError)
            precondition(store.read("groq", reload: true) == "synthetic-broker-key")
            precondition(store.save("synthetic-broker-updated", provider: "groq"), store.saveError)
        case "trusted":
            precondition(store.read("groq", reload: true) == "synthetic-broker-updated", "Rebuilt native app must read through unchanged broker")
        case "denied", "locked":
            precondition(store.read("groq", reload: true) == nil)
            precondition(!store.save("synthetic-blocked", provider: "groq"))
        default: fatalError("Unknown test")
        }
        print("PASS: broker \(args[1])")
    }
}
