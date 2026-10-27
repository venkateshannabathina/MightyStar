import Cocoa
import WebKit

@main final class PerfWebKitCheck: NSObject, WKScriptMessageHandler {
    private var window: NSWindow!, web: WKWebView!
    static func main() {
        let app = NSApplication.shared; app.setActivationPolicy(.accessory)
        let check = PerfWebKitCheck()
        do { try check.start() } catch { print("FAIL: Overlay setup"); exit(1) }
        withExtendedLifetime(check) { app.run() }
    }
    func start() throws {
        let config = WKWebViewConfiguration(); config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self, name: "result")
        window = NSWindow(contentRect: NSRect(x:0,y:0,width:640,height:440),styleMask:[.titled],backing:.buffered,defer:false)
        web = WKWebView(frame: window.contentView!.bounds,configuration:config); window.contentView = web
        // Render offscreen; this check does not take focus from the user's app.
        window.setFrameOrigin(NSPoint(x:-2000,y:-2000)); window.orderBack(nil)
        let script = try String(contentsOfFile:CommandLine.arguments[1],encoding:.utf8)
        let html = """
        <!doctype html><html><body style="margin:0;background:#253247"><script>
        window.exports={};
        \(script)
        window.fetch=async function(url){return {ok:true,json:async()=>({receivedMs:performance.now()+1000,sentMs:performance.now()+1000}),text:async()=>JSON.stringify({sessionId:'s',generation:1,turnId:'t',timestamps:{input_commit:1000,stt_done:1200,llm_request_sent:1210,llm_first_token:1500,first_sentence_end:1550,first_phrase_emitted:1551,tts_first_byte:2000,tts_audio_ready:2200,playback_start:2250,response_complete:1600,audio_complete:4250}})}};
        const perf=new exports.PerformanceTiming(()=> 'fixture');
        perf.context({identity:{sessionId:'s',characterId:'c',generation:1,turnId:'t'},phase:'speaking'});
        setTimeout(()=>{perf.refresh();setTimeout(()=>window.webkit.messageHandlers.result.postMessage(document.getElementById('mighty-debug-perf')?.textContent||''),200)},350);
        </script></body></html>
        """
        web.loadHTMLString(html,baseURL:nil)
        DispatchQueue.main.asyncAfter(deadline:.now()+20){print("FAIL: WebKit overlay timed out");exit(1)}
    }
    func userContentController(_ userContentController: WKUserContentController,didReceive message: WKScriptMessage) {
        guard let text = message.body as? String, text.contains("playback_start: 1250.0"), text.contains("face_listen_onset: unavailable"), text.contains("audio_complete: 3250.0") else { print("FAIL: Overlay values");exit(1) }
        web.takeSnapshot(with:nil){ image,error in
            guard error == nil,let image,let tiff=image.tiffRepresentation,let bitmap=NSBitmapImageRep(data:tiff),let png=bitmap.representation(using:.png,properties:[:]) else {print("FAIL: Snapshot");exit(1)}
            do {try png.write(to:URL(fileURLWithPath:CommandLine.arguments[2]));print("PASS: Native WKWebView overlay deltas, missing marks and snapshot");exit(0)}catch{print("FAIL: Snapshot write");exit(1)}
        }
    }
}
