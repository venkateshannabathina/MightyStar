import Cocoa
import WebKit

@main final class StreamWebKitCheck: NSObject, WKScriptMessageHandler {
    private var window: NSWindow!, web: WKWebView!
    private var htmlFile: URL!
    static func main() {
        let app = NSApplication.shared; app.setActivationPolicy(.accessory)
        let check = StreamWebKitCheck()
        do { try check.start() } catch { print("FAIL: WebKit stream setup"); exit(1) }
        withExtendedLifetime(check) { app.run() }
    }
    func start() throws {
        let config = WKWebViewConfiguration(); config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self,name:"result")
        window = NSWindow(contentRect:NSRect(x:-2200,y:-2200,width:500,height:300),styleMask:[.titled],backing:.buffered,defer:false)
        web = WKWebView(frame:window.contentView!.bounds,configuration:config); window.contentView = web; window.orderBack(nil)
        let source = try String(contentsOfFile:CommandLine.arguments[1],encoding:.utf8)
        let start = source.range(of:"async function streamCharacterReply")!.lowerBound
        let end = source.range(of:"async function requestCharacterReply")!.lowerBound
        let html = """
        <!doctype html><script>
        const config=\(CommandLine.arguments[2]);
        window.mightyBackendToken=config.token;
        function companionOrigin(){return config.origin;}
        \(source[start..<end])
        (async()=>{try{
          let deltas=0,sentences=0;
          const result=await streamCharacterReply({method:'POST',body:JSON.stringify(config.body)},e=>{if(e.type==='assistant.delta')deltas++;if(e.type==='sentence.start')sentences++;});
          window.webkit.messageHandlers.result.postMessage({ok:result.reply===' Rude.  You love me.'&&deltas>0&&sentences===2});
        }catch(e){window.webkit.messageHandlers.result.postMessage({ok:false});}})();
        </script>
        """
        htmlFile=FileManager.default.temporaryDirectory.appendingPathComponent("mighty-stream-cors-\(UUID().uuidString).html")
        try html.write(to:htmlFile,atomically:true,encoding:.utf8)
        web.loadFileURL(htmlFile,allowingReadAccessTo:htmlFile.deletingLastPathComponent())
        DispatchQueue.main.asyncAfter(deadline:.now()+20){self.finish(false)}
    }
    func userContentController(_ controller:WKUserContentController,didReceive message:WKScriptMessage){
        finish((message.body as? [String:Any])?["ok"] as? Bool == true)
    }
    private func finish(_ ok:Bool){
        try? FileManager.default.removeItem(at:htmlFile)
        print(ok ? "PASS: Actual file-origin WebKit preflight, authenticated streamed fetch, product reader, clean deltas and sentence events." : "FAIL: File-origin WebKit could not consume the streamed reply.")
        exit(ok ? 0 : 1)
    }
}
