import Foundation
import Security
import CryptoKit

/// Saved keys never return to WebKit. Background reads and writes never prompt.
final class CredentialStore {
    private var cache: [String: String] = [:]
    private var attempted = Set<String>()
    private var lastReadStatuses: [String: OSStatus] = [:]
    func readStatus(_ provider: String) -> OSStatus? { lock.lock(); defer { lock.unlock() }; return lastReadStatuses[provider] }
    private var failureMessage = "Could not save the connection. Your entered key has been kept so you can retry."
    var saveError: String { lock.lock(); defer { lock.unlock() }; return failureMessage }
    private func reportSaveFailure(_ status: OSStatus) -> Bool {
        let message: String
        switch status {
        case errSecInteractionNotAllowed: message = "Keychain is locked or this connection is unavailable. Unlock your Mac and retry. Your entered key is still here."
        case errSecDiskFull: message = "Your Mac has no room to save this key. Free some space and retry."
        default: message = "Could not verify the saved connection (macOS \(status)). Your entered key is still here."
        }
        lock.lock(); failureMessage = message; lock.unlock(); return false
    }
    private let lock = NSLock()
    private let lookupQueue = DispatchQueue(label:"MightyStar.KeychainLookup",qos:.userInitiated)
    private let service: String
    private let keychain: SecKeychain?
    private let legacyService: String?
    private let agentURL: URL?
    var onLoaded: (() -> Void)?

    init(service: String = "local.mightystar.chat.credentials.v2", keychain: SecKeychain? = nil, legacyService: String? = nil, agentURL: URL? = nil) {
        self.service = service
        self.keychain = keychain
        let releaseAgent = Bundle.main.resourceURL?.appendingPathComponent("credential-agent-v01")
        let bundledAgent = releaseAgent.flatMap { FileManager.default.isExecutableFile(atPath: $0.path) ? $0 : nil } ?? Bundle.main.resourceURL?.appendingPathComponent("credential-agent")
        self.agentURL = agentURL ?? (keychain == nil && service == "local.mightystar.chat.credentials.v2" ? bundledAgent : nil)
        self.legacyService = legacyService ?? (service == "local.mightystar.chat.credentials.v2" ? "local.mightystar.chat" : nil)
        // All access is serialized and silent, including explicit reloads. Old
        // login-keychain ACLs must never open password dialogs while talking.
        SecKeychainSetUserInteractionAllowed(false)
    }

    func read(_ provider: String, reload: Bool = false) -> String? {
        if reload {
            guard let key = lookupQueue.sync(execute: { lookup(provider) }) else { return nil }
            lock.lock(); cache[provider]=key; attempted.insert(provider); lock.unlock()
            DispatchQueue.main.async { [weak self] in self?.onLoaded?() }
            return key
        }
        lock.lock()
        let value=cache[provider]
        let needsLookup = !attempted.contains(provider)
        attempted.insert(provider)
        lock.unlock()
        if needsLookup {
            lookupQueue.async { [weak self] in
                guard let self, let key=self.lookup(provider) else { return }
                self.lock.lock()
                let isUncached = self.cache[provider] == nil
                if isUncached { self.cache[provider]=key }
                self.lock.unlock()
                DispatchQueue.main.async { [weak self] in self?.onLoaded?() }
            }
        }
        return value
    }
    /// Complete one startup snapshot before the backend is launched. No partial-key restarts.
    func loadSavedKeys(_ completion: @escaping () -> Void) {
        lookupQueue.async { [weak self] in
            guard let self else { return }
            let snapshot = self.agentURL == nil ? nil : self.agentRequest(["operation": "load"])
            for provider in ["groq", "openai", "anthropic", "gemini"] {
                let value: String?
                if self.agentURL != nil {
                    value = (snapshot?["keys"] as? [String: String])?[provider]
                    self.lock.lock(); self.lastReadStatuses[provider] = (snapshot?["providers"] as? [String: Int])?[provider].map { OSStatus($0) } ?? errSecNotAvailable; self.lock.unlock()
                } else { value = self.lookup(provider) }
                self.lock.lock()
                if let value { self.cache[provider] = value }
                self.attempted.insert(provider)
                self.lock.unlock()
            }
            DispatchQueue.main.async(execute: completion)
        }
    }
    private func agentRequest(_ fields: [String: Any]) -> [String: Any]? {
        guard let agentURL else { return nil }
        // Verify the broker before sending any secret to its standard input.
        var own: SecCode?, ownStatic: SecStaticCode?, info: CFDictionary?, target: SecStaticCode?, requirement: SecRequirement?
        guard SecCodeCopySelf([], &own) == errSecSuccess, let own,
              SecCodeCopyStaticCode(own, [], &ownStatic) == errSecSuccess, let ownStatic,
              SecCodeCopySigningInformation(ownStatic, SecCSFlags(rawValue: kSecCSSigningInformation), &info) == errSecSuccess,
              let certificates = (info as? [String: Any])?[kSecCodeInfoCertificates as String] as? [SecCertificate], let certificate = certificates.first else { return nil }
        let fingerprint = Insecure.SHA1.hash(data: SecCertificateCopyData(certificate) as Data).map { String(format: "%02x", $0) }.joined()
        let identifier = agentURL.lastPathComponent == "credential-agent-v01" ? "local.mightystar.credentials.v01" : "local.mightystar.credentials"
        guard SecRequirementCreateWithString("identifier \"\(identifier)\" and certificate leaf = H\"\(fingerprint)\"" as CFString, [], &requirement) == errSecSuccess,
              SecStaticCodeCreateWithPath(agentURL as CFURL, [], &target) == errSecSuccess, let target,
              SecStaticCodeCheckValidity(target, [], requirement) == errSecSuccess else { return nil }
        var request = fields
        if let keychain {
            var count: UInt32 = 4096
            var path = [CChar](repeating: 0, count: Int(count))
            if SecKeychainGetPath(keychain, &count, &path) == errSecSuccess { request["testKeychain"] = String(cString: path) }
        }
        guard let data = try? JSONSerialization.data(withJSONObject: request), data.count <= 32768 else { return nil }
        let process = Process(), input = Pipe(), output = Pipe()
        process.executableURL = agentURL; process.standardInput = input; process.standardOutput = output; process.standardError = FileHandle.nullDevice
        do {
            try process.run()
            let timeout = DispatchWorkItem { if process.isRunning { process.terminate() } }
            DispatchQueue.global().asyncAfter(deadline: .now() + 5, execute: timeout)
            defer { timeout.cancel() }
            try input.fileHandleForWriting.write(contentsOf: data)
            try input.fileHandleForWriting.close()
            let response = output.fileHandleForReading.readDataToEndOfFile()
            process.waitUntilExit()
            guard process.terminationStatus == 0, response.count <= 32768 else { return nil }
            return try JSONSerialization.jsonObject(with: response) as? [String: Any]
        } catch { if process.isRunning { process.terminate() }; return nil }
    }
    private func lookup(_ provider: String) -> String? {
        if agentURL != nil {
            let result = agentRequest(["operation": "load"])
            lock.lock(); lastReadStatuses[provider] = (result?["providers"] as? [String: Int])?[provider].map { OSStatus($0) } ?? errSecNotAvailable; lock.unlock()
            return (result?["keys"] as? [String: String])?[provider]
        }
        guard SecKeychainSetUserInteractionAllowed(false) == errSecSuccess else { return nil }
        if let value = lookupItem(provider, service: service) { return value }
        // Migrate only legacy entries already accessible without authentication.
        // A denied entry stays untouched; a pasted key creates a clean entry.
        if let legacyService, let value = lookupItem(provider, service: legacyService),
           saveOnQueue(value, provider: provider) { return value }
        return nil
    }
    private func lookupItem(_ provider: String, service: String) -> String? {
        var query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: "\(provider)-api-key",
            kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        if let keychain { query[kSecMatchSearchList as String] = [keychain] }
        var value: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &value)
        lock.lock(); lastReadStatuses[provider] = status; lock.unlock()
        guard status == errSecSuccess,
              let data = value as? Data, let key = String(data: data, encoding: .utf8), !key.isEmpty else { return nil }
        return key
    }
    func save(_ key: String, provider: String) -> Bool {
        lookupQueue.sync { saveOnQueue(key, provider: provider) }
    }
    private func saveOnQueue(_ key: String, provider: String) -> Bool {
        if agentURL != nil {
            let result = agentRequest(["operation": "save", "provider": provider, "key": key])
            let status = (result?["status"] as? Int).map { OSStatus($0) } ?? errSecNotAvailable
            guard status == errSecSuccess else { return reportSaveFailure(status) }
            lock.lock(); cache[provider] = key; attempted.insert(provider); lock.unlock()
            return true
        }
        guard SecKeychainSetUserInteractionAllowed(false) == errSecSuccess else { return false }
        var query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: "\(provider)-api-key"]
        if let keychain { query[kSecMatchSearchList as String] = [keychain] }
        let data = Data(key.utf8)
        var status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            query.removeValue(forKey: kSecMatchSearchList as String)
            if let keychain { query[kSecUseKeychain as String] = keychain }
            query[kSecValueData as String] = data
            // Bind new credentials to this signed app's designated requirement.
            // Updating the secret later preserves this app-only access list.
            var trusted: SecTrustedApplication?
            guard SecTrustedApplicationCreateFromPath(nil, &trusted) == errSecSuccess,
                  let trusted else { return false }
            var access: SecAccess?
            guard SecAccessCreate("MightyStar API connection" as CFString, [trusted] as CFArray, &access) == errSecSuccess,
                  let access else { return false }
            query[kSecAttrAccess as String] = access
            status = SecItemAdd(query as CFDictionary, nil)
        }
        guard status == errSecSuccess else { return reportSaveFailure(status) }
        guard lookupItem(provider, service: service) == key else { return reportSaveFailure(errSecAuthFailed) }
        lock.lock(); cache[provider] = key; attempted.insert(provider); lock.unlock(); return true
    }
}
