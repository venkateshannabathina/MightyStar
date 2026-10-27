import Cocoa
import WebKit

// Runs the real native editor and renderer against the cached current model.
// Profile saves are captured in memory; the user's characters are never edited.
@main @MainActor final class FacialEditorCheck: NSObject {
    private var server: Process!, input: Pipe!, window: NSWindow!, editor: CharacterEditorController!, web: WKWebView!
    private var origin = "", token = "", output = ""
    private var saved: [String:Any]?, cancelled = false
    private let appearance: [String:String] = ["key":"zzz/chars/Evelyn Chevalier/Evelyn.pmx","name":"Evelyn","directory":"zzz/chars/Evelyn Chevalier","file":"Evelyn.pmx"]
    static func main() {
        let app = NSApplication.shared; app.setActivationPolicy(.accessory)
        let test = FacialEditorCheck()
        Task { do { try await test.run(); test.finish(nil) } catch { test.finish(error.localizedDescription) } }
        withExtendedLifetime(test) { app.run() }
    }
    private func require(_ condition: Bool,_ message: String) throws { if !condition { throw NSError(domain:"FacialEditorCheck",code:1,userInfo:[NSLocalizedDescriptionKey:message]) } }
    private func descendants(_ view: NSView) -> [NSView] { [view]+view.subviews.flatMap{descendants($0)} }
    private func pause() async { try? await Task.sleep(nanoseconds:180_000_000) }
    private func evaluate(_ script: String) async throws -> Any? {
        try await withCheckedThrowingContinuation { continuation in
            web.evaluateJavaScript(script) { value,error in if let error { continuation.resume(throwing:error) } else { continuation.resume(returning:value) } }
        }
    }
    private func inventory() async throws -> [String:Any] { try await evaluate("window.mightyAppearanceEditor?.()") as? [String:Any] ?? [:] }
    private func waitForKeys() async throws {
        for _ in 0..<240 {
            if let expressions = try? await inventory()["expressions"] as? [[String:Any]], expressions.count == 49,
               descendants(editor.view).compactMap({$0 as? NSButton}).contains(where:{$0.accessibilityLabel() == "Expression: Smiling"}) { return }
            await pause()
        }
        try require(false,"Timed out waiting for Evelyn's 49 keys")
    }
    private func click(_ label: String) throws {
        guard let control = descendants(editor.view).compactMap({$0 as? NSButton}).first(where:{$0.title == label || $0.accessibilityLabel() == label}) else { try require(false,"Missing button: \(label)"); return }
        control.performClick(nil)
    }
    private func section(_ index: Int) throws {
        guard let tools = descendants(editor.view).compactMap({$0 as? NSSegmentedControl}).first(where:{$0.label(forSegment:0) == "Facial"}) else { try require(false,"Missing Facial section"); return }
        tools.selectedSegment = index; editor.perform(NSSelectorFromString("changeEditorSection:"),with:tools)
    }
    private func open(_ character: [String:Any]) throws {
        editor?.stop()
        editor = CharacterEditorController(character:character,catalog:[appearance],origin:origin,token:token,credentials:CredentialStore(service:"facial-editor-fixture"))
        editor.onSave = { [weak self] value,done in self?.saved = value; done(nil) }
        editor.onCancel = { [weak self] in self?.cancelled = true }
        window.contentView = editor.view; editor.view.frame = window.contentView!.bounds
        web = descendants(editor.view).compactMap{$0 as? WKWebView}.first!
        web.load(URLRequest(url:URL(string:origin+"/Companion/index.html?inspect=1")!))
        let tabs = descendants(editor.view).compactMap{$0 as? NSSegmentedControl}.first!
        tabs.selectedSegment = 2; editor.perform(NSSelectorFromString("changeTab")); try section(0)
    }
    private func snapshot(_ name: String) async throws {
        editor.view.layoutSubtreeIfNeeded()
        let image: NSImage = try await withCheckedThrowingContinuation { continuation in
            web.takeSnapshot(with:nil) { image,error in
                if let error { continuation.resume(throwing:error) } else { continuation.resume(returning:image!) }
            }
        }
        let rep = editor.view.bitmapImageRepForCachingDisplay(in:editor.view.bounds)!
        editor.view.cacheDisplay(in:editor.view.bounds,to:rep)
        // WKWebView's GPU layer isn't guaranteed in cacheDisplay. Composite its
        // own snapshot under the native controls at the same full-window size.
        let result = NSImage(size:editor.view.bounds.size)
        result.lockFocus(); image.draw(in:editor.view.bounds)
        // Controls are drawn individually so the WebKit layer stays intact.
        for view in editor.view.subviews where !(view is WKWebView) && !view.isHidden {
            guard let bitmap = view.bitmapImageRepForCachingDisplay(in:view.bounds) else { continue }
            view.cacheDisplay(in:view.bounds,to:bitmap)
            let frame = NSRect(x:view.frame.minX,y:editor.view.bounds.height-view.frame.maxY,width:view.frame.width,height:view.frame.height)
            NSImage(cgImage:bitmap.cgImage!,size:view.bounds.size).draw(in:frame)
        }
        result.unlockFocus()
        let png = NSBitmapImageRep(data:result.tiffRepresentation!)!.representation(using:.png,properties:[:])!
        try png.write(to:URL(fileURLWithPath:output+"/"+name+".png"))
    }
    private func run() async throws {
        output = CommandLine.arguments[3]; try FileManager.default.createDirectory(atPath:output,withIntermediateDirectories:true)
        server = Process(); input = Pipe(); let pipe = Pipe()
        server.executableURL = URL(fileURLWithPath:CommandLine.arguments[1]); server.arguments = [CommandLine.arguments[2]]
        server.standardInput = input; server.standardOutput = pipe; server.standardError = FileHandle.nullDevice; try server.run()
        var line = Data()
        while true { let byte = pipe.fileHandleForReading.readData(ofLength:1); if byte == Data([10]) { break }; try require(!byte.isEmpty,"Backend exited before startup"); line.append(byte) }
        let ready = try JSONSerialization.jsonObject(with:line) as! [String:Any]
        origin = "http://127.0.0.1:\(ready["port"] as! Int)"; token = ready["token"] as! String
        window = NSWindow(contentRect:NSRect(x:0,y:0,width:1280,height:840),styleMask:[.titled,.closable],backing:.buffered,defer:false)
        window.title = "Facial expression editor · isolated verification"; window.setFrameOrigin(NSPoint(x:40,y:40))
        let original: [String:Any] = ["id":"facial-fixture","name":"KON","description":"Keep personality","appearance":appearance,"profile":["aiProvider":"groq","aiModel":"fixture","memories":"Keep memory","editorSettings":["version":1,"appearanceKey":appearance["key"]!,"face":["morph:40":0.12],"hiddenParts":[String]()]]]
        try open(original); window.orderFront(nil); try await waitForKeys(); await pause()
        let first = try await inventory(), keys = first["expressions"] as! [[String:String]]
        try require(keys.count == 49,"Not all current-character keys are exposed")
        let key = keys.first(where:{$0["name"] == "にやり"})!["stableId"]!
        let neutral = (first["preview"] as? [String:Double])?[key]
        try require(neutral == 0.12,"Legacy face settings didn't migrate into Neutral")
        let search = descendants(editor.view).compactMap{$0 as? NSSearchField}.first(where:{$0.accessibilityLabel() == "Search face keys"})!
        search.stringValue = "Fac_Mth"
        editor.controlTextDidChange(Notification(name:NSTextField.textDidChangeNotification,object:search))
        let filtered = descendants(editor.view).compactMap{$0 as? NSSlider}
        try require(!filtered.isEmpty && filtered.allSatisfy{!($0.accessibilityLabel() ?? "").contains("まばたき")},"Author-alias search did not filter the keys")
        search.stringValue = ""; editor.controlTextDidChange(Notification(name:NSTextField.textDidChangeNotification,object:search))
        for title in ["Neutral","Smiling","Sad","Angry","Happy","Surprised","Closed","Closed (Right)","Closed (Left)","A","I","U","E","O"] {
            try click("Expression: "+title); await pause()
            let state = try await inventory()
            if title != "Neutral" { try require(!(state["preview"] as? [String:Double] ?? [:]).isEmpty,"Empty default: "+title) }
            try await snapshot("expression-"+title.replacingOccurrences(of:" ",with:"-").replacingOccurrences(of:"(",with:"").replacingOccurrences(of:")",with:""))
        }
        try click("Expression: Smiling"); await pause()
        let field = descendants(editor.view).compactMap{$0 as? NSTextField}.first(where:{$0.accessibilityLabel() == "にやり strength percent"})!
        field.doubleValue = 73; field.sendAction(field.action,to:field.target); await pause()
        try require((try await inventory()["preview"] as? [String:Double])?[key] == 0.73,"Numeric edit didn't reach actual preview")
        try click("Undo"); await pause(); try require((try await inventory()["preview"] as? [String:Double])?[key] == 0.55,"Undo didn't restore the expression")
        try click("Redo"); try click("Expression: Angry"); try click("Expression: Smiling"); await pause()
        try require((try await inventory()["preview"] as? [String:Double])?[key] == 0.73,"Switching expressions lost edits")
        try click("Compare neutral"); await pause(); try require((try await inventory()["preview"] as? [String:Double])?[key] == 0.12,"Neutral comparison wrong")
        try click("Return to expression"); await pause()
        try section(2); await pause(); try require(try await inventory()["preview"] is NSNull,"Leaving Facial leaked a temporary expression")
        let raw = try await evaluate("window.mightyCompanionInspect().morphWeights['にやり']") as? Double
        try require(abs((raw ?? -1)-0.12)<0.00001,"Leaving Facial did not restore the actual resting face: \(String(describing:raw))")
        try section(0)
        // Use the native creation sheet, then save/reopen the resulting custom mapping.
        try click("＋ New expression"); await pause()
        let sheet = window.sheets.first!
        let name = descendants(sheet.contentView!).compactMap{$0 as? NSTextField}.first(where:{$0.accessibilityLabel() == "Expression name"})!
        name.stringValue = "My expression"
        let create = descendants(sheet.contentView!).compactMap{$0 as? NSButton}.first(where:{$0.title == "Create"})!; create.performClick(nil); await pause()
        try click("Use key にやり"); await pause()
        editor.perform(NSSelectorFromString("saveEdit")); await pause()
        guard let persisted = saved, let profile = persisted["profile"] as? [String:Any] else { try require(false,"Save callback missing"); return }
        try require(profile["memories"] as? String == "Keep memory","Saving lost unrelated profile data")
        try require((original["profile"] as? [String:Any])?["appearanceSettings"] == nil,"Draft mutated the original character")
        try open(persisted); try await waitForKeys(); await pause()
        try click("Expression: Smiling"); await pause()
        try require((try await inventory()["preview"] as? [String:Double])?[key] == 0.73,"Saved standard expression didn't survive reopening")
        try click("Expression: My expression"); await pause()
        try require((try await inventory()["preview"] as? [String:Double])?[key] == 0.5,"Custom expression didn't survive reopening")
        try click("Use key にやり"); try click("Cancel"); try require(cancelled,"Cancel callback missing")
        try open(persisted); try await waitForKeys(); try click("Expression: My expression"); await pause()
        try require((try await inventory()["preview"] as? [String:Double])?[key] == 0.5,"Cancel changed the saved custom expression")
        try await snapshot("native-editor-final")
        let data = try JSONSerialization.data(withJSONObject:["keyCount":49,"standardPresets":14,"standardEdit":0.73,"customExpression":0.5,"legacyNeutral":0.12,"saveReopen":true,"cancel":true,"previewIsolation":true],options:[.prettyPrinted,.sortedKeys])
        try data.write(to:URL(fileURLWithPath:output+"/native-report.json"))
    }
    private func finish(_ message: String?) {
        editor?.stop(); try? input?.fileHandleForWriting.close(); server?.terminate(); window?.orderOut(nil)
        print(message.map{"FAIL: "+$0} ?? "PASS: native Facial editor, 49 real Evelyn keys, 14 defaults, exact edits, undo/redo, comparison, preview isolation, custom creation, save/reopen, Cancel and visual captures")
        exit(message == nil ? 0 : 1)
    }
}
