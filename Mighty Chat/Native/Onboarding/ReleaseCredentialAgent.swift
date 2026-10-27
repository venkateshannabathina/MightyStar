// Versioned v0.1 release broker. Retains a separate service from development keys.
import Foundation
import Security
import CryptoKit
import Darwin

func signingCode(_ pid: pid_t) -> SecCode? {
    var code: SecCode?
    guard SecCodeCopyGuestWithAttributes(nil, [kSecGuestAttributePid: NSNumber(value: pid)] as CFDictionary, [], &code) == errSecSuccess else { return nil }
    return code
}
func trusted(_ pid: pid_t, identifier: String, fingerprint: String) -> Bool {
    guard let code = signingCode(pid) else { return false }
    var requirement: SecRequirement?
    guard SecRequirementCreateWithString("identifier \"\(identifier)\" and certificate leaf = H\"\(fingerprint)\"" as CFString, [], &requirement) == errSecSuccess else { return false }
    return SecCodeCheckValidity(code, [], requirement) == errSecSuccess
}
func parentPID(_ pid: pid_t) -> pid_t? {
    var info = proc_bsdinfo()
    let size = Int32(MemoryLayout<proc_bsdinfo>.size)
    guard proc_pidinfo(pid, PROC_PIDTBSDINFO, 0, &info, size) == size else { return nil }
    return pid_t(info.pbi_ppid)
}
func emit(_ result: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: result) { FileHandle.standardOutput.write(data) }
}
func run() -> [String: Any] {
    SecKeychainSetUserInteractionAllowed(false)
    var own: SecCode?, ownStatic: SecStaticCode?, information: CFDictionary?
    guard SecCodeCopySelf([], &own) == errSecSuccess, let own,
          SecCodeCopyStaticCode(own, [], &ownStatic) == errSecSuccess, let ownStatic,
          SecCodeCopySigningInformation(ownStatic, SecCSFlags(rawValue: kSecCSSigningInformation), &information) == errSecSuccess,
          let certs = (information as? [String: Any])?[kSecCodeInfoCertificates as String] as? [SecCertificate], let cert = certs.first else { return ["status": errSecAuthFailed] }
    let fingerprint = Insecure.SHA1.hash(data: SecCertificateCopyData(cert) as Data).map { String(format: "%02x", $0) }.joined()
    // Bound input prevents unbounded allocation; no secrets appear in arguments or logs.
    let bytes = FileHandle.standardInput.readData(ofLength: 32769)
    guard bytes.count <= 32768, let request = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
          let operation = request["operation"] as? String else { return ["status": errSecParam] }
    let parent = getppid()
    let appCaller = trusted(parent, identifier: "org.mightystar.app", fingerprint: fingerprint)
    let backendImporter = operation == "import" && trusted(parent, identifier: "local.mightystar.runtime.node", fingerprint: fingerprint) &&
        parentPID(parent).map { trusted($0, identifier: "org.mightystar.app", fingerprint: fingerprint) } == true
    guard appCaller || backendImporter else { return ["status": errSecAuthFailed] }
    let service = "local.mightystar.connections.release.v01"
    let providers = ["groq", "openai", "anthropic", "gemini"]
    var keychain: SecKeychain?
    // Scratch keychains are accepted only from an authenticated app test caller.
    if appCaller, let path = request["testKeychain"] as? String {
        guard SecKeychainOpen(path, &keychain) == errSecSuccess else { return ["status": errSecNoSuchKeychain] }
    }
    func query(_ provider: String) -> [String: Any] {
        var result: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: provider + "-api-key"]
        if let keychain { result[kSecMatchSearchList as String] = [keychain] }
        return result
    }
    func read(_ provider: String) -> (OSStatus, String?) {
        var request = query(provider)
        request[kSecReturnData as String] = true; request[kSecMatchLimit as String] = kSecMatchLimitOne
        var value: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &value)
        return (status, (value as? Data).flatMap { String(data: $0, encoding: .utf8) })
    }
    func save(_ provider: String, _ value: String) -> OSStatus {
        guard !value.isEmpty, value.utf8.count <= 4096, !value.contains(where: { $0.isWhitespace }) else { return errSecParam }
        var request = query(provider)
        let data = Data(value.utf8)
        var status = SecItemUpdate(request as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            request.removeValue(forKey: kSecMatchSearchList as String)
            if let keychain { request[kSecUseKeychain as String] = keychain }
            var application: SecTrustedApplication?, access: SecAccess?
            guard SecTrustedApplicationCreateFromPath(nil, &application) == errSecSuccess, let application,
                  SecAccessCreate("MightyStar saved connection" as CFString, [application] as CFArray, &access) == errSecSuccess, let access else { return errSecAuthFailed }
            request[kSecAttrAccess as String] = access; request[kSecValueData as String] = data
            status = SecItemAdd(request as CFDictionary, nil)
        }
        guard status == errSecSuccess else { return status }
        let verified = read(provider)
        return verified.0 == errSecSuccess && verified.1 == value ? errSecSuccess : errSecAuthFailed
    }
    if operation == "import" {
        let keys = request["keys"] as? [String: String] ?? [:]
        var statuses: [String: OSStatus] = [:]
        for provider in providers {
            guard let value = keys[provider], !value.isEmpty else { continue }
            let existing = read(provider)
            // Migration is create-only; it cannot replace a connection saved later.
            statuses[provider] = existing.0 == errSecSuccess ? errSecSuccess : (existing.0 == errSecItemNotFound ? save(provider, value) : existing.0)
        }
        return ["status": errSecSuccess, "providers": statuses]
    }
    guard appCaller else { return ["status": errSecAuthFailed] }
    if operation == "load" {
        var keys: [String: String] = [:], statuses: [String: OSStatus] = [:]
        for provider in providers {
            let result = read(provider); statuses[provider] = result.0
            if result.0 == errSecSuccess, let value = result.1 { keys[provider] = value }
        }
        return ["status": errSecSuccess, "keys": keys, "providers": statuses]
    }
    guard let provider = request["provider"] as? String, providers.contains(provider) else { return ["status": errSecParam] }
    if operation == "save", let value = request["key"] as? String { return ["status": save(provider, value)] }
    return ["status": errSecParam]
}
emit(run())
