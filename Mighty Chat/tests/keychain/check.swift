import Foundation
import Security

// Runs exclusively against a scratch keychain and a synthetic key.
@main struct KeychainCheck {
    static func main() {
        #if SECOND_BUILD
        print("Testing rebuilt executable")
        #endif
        let args = CommandLine.arguments
        guard args.count == 3 else { fatalError("mode and scratch keychain required") }
        var keychain: SecKeychain?
        precondition(SecKeychainOpen(args[2], &keychain) == errSecSuccess)
        let store = CredentialStore(service: "local.mightystar.keychain-regression", keychain: keychain)
        let start = Date()
        switch args[1] {
        case "create":
            precondition(store.save("synthetic-test-key", provider: "regression"))
            precondition(store.read("regression") == "synthetic-test-key")
            precondition(store.save("synthetic-updated-key", provider: "regression"))
        case "trusted":
            _ = store.read("regression")
            _ = store.save("synthetic-other-key", provider: "other")
            precondition(store.read("regression") == "synthetic-updated-key", "Trusted background read must succeed")
            precondition(store.read("regression", reload: true) == "synthetic-updated-key")
            precondition(store.save("synthetic-updated-key", provider: "regression"))
            let migrated = CredentialStore(service: "local.mightystar.keychain-regression.v2", keychain: keychain,
                                           legacyService: "local.mightystar.keychain-regression")
            precondition(migrated.read("regression", reload: true) == "synthetic-updated-key", "Accessible legacy keys migrate silently")
            let restarted = CredentialStore(service: "local.mightystar.keychain-regression.v2", keychain: keychain)
            precondition(restarted.read("regression", reload: true) == "synthetic-updated-key", "Migrated key is independent of legacy lookup")
        case "denied", "locked":
            precondition(store.read("regression") == nil)
            // An unrelated write queues behind the background read, proving
            // that the denied read completed without a hidden dialog. Keychain
            // may permit writes without granting access to the original value.
            let saved = store.save("synthetic-other-key", provider: "other")
            if args[1] == "locked" { precondition(!saved) }
            precondition(store.read("regression", reload: true) == nil, "Explicit reload must remain silent")
            if args[1] == "denied" {
                let fresh = CredentialStore(service: "local.mightystar.keychain-regression.replacement", keychain: keychain,
                                            legacyService: "local.mightystar.keychain-regression")
                precondition(fresh.read("regression", reload: true) == nil)
                precondition(fresh.save("synthetic-repasted-key", provider: "regression"), "Re-paste bypasses only the old entry, preserving its ACL")
                precondition(fresh.read("regression", reload: true) == "synthetic-repasted-key")
            }
            precondition(Date().timeIntervalSince(start) < 5)
        default: fatalError("Unknown mode")
        }
        var allowed: DarwinBoolean = true
        precondition(SecKeychainGetUserInteractionAllowed(&allowed) == errSecSuccess)
        precondition(!allowed.boolValue)
        print("PASS: \(args[1]) keychain access")
    }
}
