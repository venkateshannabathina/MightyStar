import Foundation

/// Public installs and development builds never read each other's personal state.
/// Keep this identity stable across public updates; reinstalling preserves release data.
enum AppEnvironment {
    static let releaseIdentifier = "org.mightystar.app"
    static var isRelease: Bool { Bundle.main.bundleIdentifier == releaseIdentifier }
    static func supportDirectory(isRelease: Bool, home: URL = FileManager.default.homeDirectoryForCurrentUser) -> URL {
        home.appendingPathComponent("Library/Application Support", isDirectory: true)
            .appendingPathComponent(isRelease ? "MightyStar/Release" : "Mighty Chat", isDirectory: true)
    }
    static var supportDirectory: URL { supportDirectory(isRelease: isRelease) }
    static func backendEnvironment(_ inherited: [String: String]) -> [String: String] {
        guard isRelease else { return inherited }
        var result = inherited
        // Release state must never follow development overrides inherited from a shell.
        result["MIGHTY_MEMORY_ROOT"] = supportDirectory.appendingPathComponent("Memory").path
        result["MIGHTY_MIND_ROOT"] = supportDirectory.appendingPathComponent("Mind").path
        result["MIGHTY_CHARACTER_ROOT"] = supportDirectory.appendingPathComponent("Character Assets").path
        return result
    }
}
