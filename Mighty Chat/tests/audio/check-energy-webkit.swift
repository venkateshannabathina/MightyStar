import Cocoa
import WebKit
@main final class EnergyWebKit: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
 private var web:WKWebView!
 private var panel:NSPanel!
 private var deadline:Timer?
 static func main(){let app=NSApplication.shared;app.setActivationPolicy(.accessory);let check=EnergyWebKit();do{try check.start()}catch{print("FAIL: WebKit energy setup");exit(1)};withExtendedLifetime(check){app.run()}}
 private func start() throws {
  let source=try String(contentsOfFile:CommandLine.arguments[1],encoding:.utf8)
  let a=source.range(of:"async function createSpeechEnergy(")!.lowerBound,b=source.range(of:"function playbackSnapshot(")!.lowerBound
  let audio=try Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[2])).base64EncodedString()
  let config=WKWebViewConfiguration();config.mediaTypesRequiringUserActionForPlayback=[];config.userContentController.add(self,name:"done")
  web=WKWebView(frame:NSRect(x:0,y:0,width:400,height:160),configuration:config);web.navigationDelegate=self
  panel=NSPanel(contentRect:web.frame,styleMask:[.titled],backing:.buffered,defer:false);panel.title="WP5 audio check";panel.contentView=web;panel.orderFrontRegardless()
  let html="""
  <body style="font:18px system-ui;padding:20px">Checking speech audio…<script>
  window.mightyEnergyJaw=true;
  \(source[a..<b])
  (async()=>{let graph;try{const audio=new Audio('data:audio/mpeg;base64,\(audio)');graph=await createSpeechEnergy(audio);if(!graph?.read)throw Error('No analyser');await audio.play();const values=[];await new Promise(resolve=>{const timer=setInterval(()=>{values.push(graph.read());if(audio.ended){clearInterval(timer);resolve();}},20);});graph.close();graph=null;webkit.messageHandlers.done.postMessage({peak:Math.max(...values),samples:values.length,finite:values.every(v=>Number.isFinite(v)&&v>=0&&v<=1),scope:'Actual WKWebView MediaElementSource/AnalyserNode and recorded MP3 playback; no provider call.'});}catch(e){graph?.close();webkit.messageHandlers.done.postMessage({error:true});}})();
  </script>
  """
  web.loadHTMLString(html,baseURL:nil)
  deadline=Timer.scheduledTimer(withTimeInterval:12,repeats:false){[weak self] _ in self?.finish(false)}
 }
 func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage){
  guard let value=message.body as? [String:Any],let peak=value["peak"] as? Double,peak>0.1,value["finite"] as? Bool==true else{finish(false);return}
  do{try JSONSerialization.data(withJSONObject:value,options:[.prettyPrinted,.sortedKeys]).write(to:URL(fileURLWithPath:CommandLine.arguments[3]));finish(true)}catch{finish(false)}
 }
 private func finish(_ success:Bool){deadline?.invalidate();web?.configuration.userContentController.removeScriptMessageHandler(forName:"done");panel?.orderOut(nil);print(success ? "PASS: Actual WebKit speech analyser, bounded RMS and graph cleanup." : "FAIL: WebKit speech analyser.");exit(success ? 0:1)}
}
