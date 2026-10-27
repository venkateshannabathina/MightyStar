import Cocoa
import WebKit
@main final class MemoryEditorCheck:NSObject {
    private var process:Process!,input:Pipe!,window:NSWindow!,editor:CharacterEditorController!
    static func main(){let app=NSApplication.shared;app.setActivationPolicy(.accessory);let check=MemoryEditorCheck();do{try check.start()}catch{print("FAIL: Memory editor setup");exit(1)};withExtendedLifetime(check){app.run()}}
    func descendants(_ view:NSView)->[NSView]{[view]+view.subviews.flatMap{descendants($0)}}
    func start() throws {
        process=Process();input=Pipe();let output=Pipe();process.executableURL=URL(fileURLWithPath:CommandLine.arguments[1]);process.arguments=[CommandLine.arguments[2]];process.standardInput=input;process.standardOutput=output;process.standardError=FileHandle.nullDevice;try process.run()
        var line=Data();while true{let byte=output.fileHandleForReading.readData(ofLength:1);if byte==Data([10]){break};guard !byte.isEmpty else{throw URLError(.cannotConnectToHost)};line.append(byte)}
        let ready=try JSONSerialization.jsonObject(with:line) as! [String:Any]
        let origin="http://127.0.0.1:\(ready["port"] as! Int)"
        let character:[String:Any] = ["id":"fixture","name":"Mira","description":"A thoughtful friend.","profile":["aiProvider":"groq","aiModel":"openai/gpt-oss-20b"]]
        editor=CharacterEditorController(character:character,catalog:[],origin:origin,token:ready["token"] as! String,credentials:CredentialStore(service:"wp1-editor-fixture"))
        window=NSWindow(contentRect:NSRect(x:0,y:0,width:960,height:720),styleMask:[.titled],backing:.buffered,defer:false);window.contentView=editor.view;window.setFrameOrigin(NSPoint(x:-2200,y:-2200));window.orderBack(nil)
        guard let tabs=descendants(editor.view).compactMap({$0 as? NSSegmentedControl}).first else{exit(1)};tabs.selectedSegment=3;editor.perform(NSSelectorFromString("changeTab"))
        DispatchQueue.main.asyncAfter(deadline:.now()+1){self.check()}
        DispatchQueue.main.asyncAfter(deadline:.now()+20){self.finish(false)}
    }
    func check(){
        let views=descendants(editor.view),buttons=views.compactMap{$0 as? NSButton}
        guard ["Refresh","Export memories…","Show compiled character card","Forget conversation and memories…","Save memory","Delete"].allSatisfy({title in buttons.contains{$0.title==title}}),views.compactMap({$0 as? NSTextView}).contains(where:{$0.string=="The user enjoys green tea."}) else{finish(false);return}
        editor.view.layoutSubtreeIfNeeded();editor.view.displayIfNeeded()
        guard let image=editor.view.bitmapImageRepForCachingDisplay(in:editor.view.bounds) else{finish(false);return};editor.view.cacheDisplay(in:editor.view.bounds,to:image)
        do{try image.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[3]))}catch{finish(false);return}
        let input=views.compactMap{$0 as? NSTextView}.first{$0.string=="The user enjoys green tea."}!
        input.string="The user prefers coffee."
        buttons.first{$0.title=="Save memory"}!.performClick(nil)
        DispatchQueue.main.asyncAfter(deadline:.now()+0.5){
            let updated=self.descendants(self.editor.view)
            guard updated.compactMap({$0 as? NSTextView}).contains(where:{$0.string=="The user prefers coffee."}) else{self.finish(false);return}
            updated.compactMap{$0 as? NSButton}.first{$0.title=="Delete"}!.performClick(nil)
            DispatchQueue.main.asyncAfter(deadline:.now()+0.5){
                let labels=self.descendants(self.editor.view).compactMap{$0 as? NSTextField}.map{$0.stringValue}
                self.finish(labels.contains("No saved memories yet."))
            }
        }
    }
    func finish(_ ok:Bool){editor?.stop();try? input?.fileHandleForWriting.close();process?.terminate();print(ok ? "PASS: Native Memory tab loads facts, saves edits and deletes via its controls; screenshot saved." : "FAIL: Native Memory tab");exit(ok ? 0 : 1)}
}
