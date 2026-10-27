import Cocoa
import WebKit
import ImageIO
import UniformTypeIdentifiers

/// A small, app-owned image library. JavaScript receives IDs and private image
/// URLs, never paths supplied by the page or access to the user's other files.
final class HomeBackgroundStore: NSObject, WKURLSchemeHandler {
    var send: ((String, [String: Any]) -> Void)?
    var window: (() -> NSWindow?)?

    private let defaults: UserDefaults
    private let directory: URL
    private let selectedKey = "mightyHomeBackgroundID"
    private let libraryKey = "mightyHomeCustomBackgrounds"
    private let bundledIDs = Set((1...6).map { "bundled-\($0)" } + ["none"])
    private var choosingImage = false

    init(defaults: UserDefaults = .standard, directory: URL? = nil) {
        self.defaults = defaults
        self.directory = directory ?? (AppEnvironment.isRelease
            ? AppEnvironment.supportDirectory.appendingPathComponent("Backgrounds", isDirectory: true)
            : FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("MightyStar/Backgrounds", isDirectory: true))
        super.init()
    }

    private struct Entry {
        let id: String
        let name: String
        var stored: [String: String] { ["id": id, "name": name] }
        var payload: [String: String] {
            ["id": id, "name": name,
             "url": "mighty-background://image/\(id).jpg",
             "thumbnail": "mighty-background://image/\(id)-thumb.jpg"]
        }
    }

    struct PreparedImage {
        let name: String
        let image: Data
        let thumbnail: Data
    }

    private enum BackgroundError: LocalizedError {
        case unreadable, tooLarge, encode, unavailable
        var errorDescription: String? {
            switch self {
            case .unreadable: return "Choose a readable image, such as a JPEG, PNG or HEIC file."
            case .tooLarge: return "Choose an image smaller than 80 MB."
            case .encode: return "This image couldn't be prepared. Try another image."
            case .unavailable: return "This background is no longer available. Choose another one."
            }
        }
    }

    private static func isCustomID(_ id: String) -> Bool {
        guard id.hasPrefix("custom-"), id.count == 43 else { return false }
        let value = String(id.dropFirst(7))
        return UUID(uuidString: value)?.uuidString.lowercased() == value
    }

    private func imageFile(_ id: String, thumbnail: Bool = false) -> URL {
        directory.appendingPathComponent(id + (thumbnail ? "-thumb" : "") + ".jpg")
    }

    private func isStoredFile(_ url: URL) -> Bool {
        guard let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey]),
              values.isRegularFile == true, values.isSymbolicLink != true else { return false }
        return true
    }

    private var entries: [Entry] {
        var seen = Set<String>()
        return (defaults.array(forKey: libraryKey) as? [[String: String]] ?? []).compactMap { item in
            guard let id = item["id"], Self.isCustomID(id), seen.insert(id).inserted,
                  let name = item["name"], isStoredFile(imageFile(id)),
                  isStoredFile(imageFile(id, thumbnail: true)) else { return nil }
            return Entry(id: id, name: name)
        }
    }

    func state(error: String? = nil) -> [String: Any] {
        let library = entries
        var selected = defaults.string(forKey: selectedKey) ?? "bundled-1"
        if !bundledIDs.contains(selected) && !library.contains(where: { $0.id == selected }) {
            selected = "bundled-1"
            defaults.set(selected, forKey: selectedKey)
        }
        var result: [String: Any] = ["selectedId": selected, "custom": library.map(\.payload)]
        if let error { result["error"] = error }
        return result
    }

    private func report(error: String? = nil) { send?("mightyBackgroundState", state(error: error)) }

    func select(_ id: String) throws {
        guard bundledIDs.contains(id) || entries.contains(where: { $0.id == id }) else { throw BackgroundError.unavailable }
        defaults.set(id, forKey: selectedKey)
    }

    func remove(_ id: String) throws {
        let library = entries
        guard library.contains(where: { $0.id == id }) else { throw BackgroundError.unavailable }
        // Remove only names derived from a validated, app-owned library entry.
        try FileManager.default.removeItem(at: imageFile(id))
        try? FileManager.default.removeItem(at: imageFile(id, thumbnail: true))
        defaults.set(library.filter { $0.id != id }.map(\.stored), forKey: libraryKey)
        if defaults.string(forKey: selectedKey) == id { defaults.set("bundled-1", forKey: selectedKey) }
    }

    @discardableResult func handle(_ body: [String: Any]) -> Bool {
        guard let action = body["action"] as? String else { return false }
        switch action {
        case "homeBackgroundState": report()
        case "selectHomeBackground":
            guard let id = body["id"] as? String else { report(error: BackgroundError.unavailable.localizedDescription); return true }
            do { try select(id); report() } catch { report(error: error.localizedDescription) }
        case "removeHomeBackground":
            guard let id = body["id"] as? String else { report(error: BackgroundError.unavailable.localizedDescription); return true }
            do { try remove(id); report() } catch { report(error: "This background couldn't be removed. Try again.") }
        case "importHomeBackground": chooseImage()
        default: return false
        }
        return true
    }

    private func chooseImage() {
        guard !choosingImage, let parent = window?() else { report(); return }
        choosingImage = true
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.image]
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.prompt = "Add background"
        panel.message = "Choose an image for your home page."
        panel.beginSheetModal(for: parent) { [weak self] response in
            guard let self else { return }
            guard response == .OK, let url = panel.url else {
                self.choosingImage = false
                self.report()
                return
            }
            DispatchQueue.global(qos: .userInitiated).async {
                let prepared = Result { try Self.prepareImage(at: url) }
                DispatchQueue.main.async {
                    self.choosingImage = false
                    do {
                        try self.addImage(prepared.get())
                        self.report()
                    } catch { self.report(error: error.localizedDescription) }
                }
            }
        }
    }

    /// Decode only a downsampled frame, applying EXIF orientation before saving.
    /// Re-encoding also keeps source metadata and external references out of the library.
    static func prepareImage(at url: URL) throws -> PreparedImage {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard url.isFileURL,
              let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]),
              values.isRegularFile == true, let size = values.fileSize else { throw BackgroundError.unreadable }
        guard size > 0, size <= 80 * 1024 * 1024 else { throw BackgroundError.tooLarge }
        guard let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary) else {
            throw BackgroundError.unreadable
        }
        func jpeg(maximum: Int) throws -> Data {
            let options: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: maximum,
                kCGImageSourceShouldCacheImmediately: true
            ]
            guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { throw BackgroundError.unreadable }
            let data = NSMutableData()
            guard let destination = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else { throw BackgroundError.encode }
            CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.88] as CFDictionary)
            guard CGImageDestinationFinalize(destination) else { throw BackgroundError.encode }
            return data as Data
        }
        let name = String(url.deletingPathExtension().lastPathComponent.prefix(100))
        return try PreparedImage(name: name.isEmpty ? "My background" : name, image: jpeg(maximum: 3840), thumbnail: jpeg(maximum: 480))
    }

    @discardableResult func addImage(_ image: PreparedImage) throws -> String {
        let id = "custom-" + UUID().uuidString.lowercased()
        let entry = Entry(id: id, name: image.name)
        let library = entries
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        do {
            try image.image.write(to: imageFile(id), options: .atomic)
            try image.thumbnail.write(to: imageFile(id, thumbnail: true), options: .atomic)
        } catch {
            try? FileManager.default.removeItem(at: imageFile(id))
            try? FileManager.default.removeItem(at: imageFile(id, thumbnail: true))
            throw error
        }
        defaults.set((library + [entry]).map(\.stored), forKey: libraryKey)
        defaults.set(id, forKey: selectedKey)
        return id
    }

    /// Only exact JPEG URLs belonging to this library can be served by WebKit.
    func imageData(for url: URL) -> Data? {
        guard url.scheme == "mighty-background", url.host == "image", url.user == nil, url.password == nil,
              url.port == nil, url.query == nil, url.fragment == nil,
              url.path.hasPrefix("/"), url.path.hasSuffix(".jpg") else { return nil }
        var id = String(url.path.dropFirst().dropLast(4))
        let thumbnail = id.hasSuffix("-thumb")
        if thumbnail { id = String(id.dropLast(6)) }
        guard Self.isCustomID(id), entries.contains(where: { $0.id == id }) else { return nil }
        let file = imageFile(id, thumbnail: thumbnail)
        guard isStoredFile(file) else { return nil }
        return try? Data(contentsOf: file)
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, let data = imageData(for: url) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        urlSchemeTask.didReceive(URLResponse(url: url, mimeType: "image/jpeg", expectedContentLength: data.count, textEncodingName: nil))
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Requests complete synchronously, so no outstanding work needs cancellation.
    }
}
