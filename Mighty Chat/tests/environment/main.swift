import Foundation
let home = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(UUID().uuidString)
let development = AppEnvironment.supportDirectory(isRelease: false, home: home)
let release = AppEnvironment.supportDirectory(isRelease: true, home: home)
precondition(development != release)
precondition(development.lastPathComponent == "Mighty Chat")
precondition(release.path.hasSuffix("MightyStar/Release"))
try FileManager.default.createDirectory(at: development, withIntermediateDirectories: true)
try Data("private development history".utf8).write(to: development.appendingPathComponent("sentinel"))
precondition(!FileManager.default.fileExists(atPath: release.appendingPathComponent("sentinel").path))
try FileManager.default.removeItem(at: home)
print("Development and public support directories are isolated")

if ProcessInfo.processInfo.environment["MIGHTY_TEST_RELEASE"] == "1" {
    precondition(AppEnvironment.isRelease)
    let env = AppEnvironment.backendEnvironment(["MIGHTY_MEMORY_ROOT":"/development/Memory", "MIGHTY_MIND_ROOT":"/development/Mind", "MIGHTY_CHARACTER_ROOT":"/development/Assets"])
    for key in ["MIGHTY_MEMORY_ROOT","MIGHTY_MIND_ROOT","MIGHTY_CHARACTER_ROOT"] {
        precondition(env[key]!.hasPrefix(AppEnvironment.supportDirectory.path + "/"))
    }
    print("Public bundle rejects inherited development data paths")
}
