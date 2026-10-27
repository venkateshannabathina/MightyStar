import Cocoa
import WebKit

private final class DesktopQAPanel: NSPanel { override var canBecomeKey: Bool { true } }

@main final class CheckDesktopRendering: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    private let server=Process(),input=Pipe()
    private var startup=Data(),token="",origin="",finished=false
    private var panel:NSPanel!,web:WKWebView!,deadline:Timer?
    private var phase="nested-overlay",phaseReady=false,capturing=false,captureScheduled=false
    private var messages:[[String:Any]]=[],results:[[String:Any]]=[]
    private var masks=0,maximumBits=0,maximumAlpha=0,restoredAlpha=0,recoveredAlpha=0,readyCount=0,blankInjected=false,childReady=false
    private var appRoot:URL!,resources:URL!,output:URL!
    private var phases=["nested-overlay","nested-portrait"]
    private var phaseIndex=0

    static func main() {
        NSApplication.shared.setActivationPolicy(.accessory)
        let test=CheckDesktopRendering()
        do { try test.start() } catch { test.finish("FAIL: "+error.localizedDescription,code:1) }
        withExtendedLifetime(test) { NSApp.run() }
    }
    private func start() throws {
        appRoot=URL(fileURLWithPath:FileManager.default.currentDirectoryPath).appendingPathComponent("Mighty Chat")
        resources=ProcessInfo.processInfo.environment["MIGHTY_RENDER_RESOURCES"].map{URL(fileURLWithPath:$0)} ?? appRoot.appendingPathComponent("Sources")
        output=ProcessInfo.processInfo.environment["MIGHTY_RENDER_OUTPUT"].map{URL(fileURLWithPath:$0)} ?? appRoot.appendingPathComponent("build/desktop-render-review")
        try FileManager.default.createDirectory(at:output,withIntermediateDirectories:true)
        let arguments=Array(CommandLine.arguments.dropFirst())
        if arguments.contains("--direct") { phases.append("direct") }
        server.executableURL=URL(fileURLWithPath:arguments.first(where:{ !$0.hasPrefix("--") }) ?? "<home>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node")
        server.arguments=[resources.appendingPathComponent("companion-server.cjs").path]
        server.standardInput=input;server.standardError=Pipe()
        let pipe=Pipe();server.standardOutput=pipe
        pipe.fileHandleForReading.readabilityHandler={ [weak self] handle in
            guard let self else { return };let chunk=handle.availableData;guard !chunk.isEmpty else { return };self.startup.append(chunk)
            guard self.startup.count<16384,let newline=self.startup.firstIndex(of:10) else { return }
            pipe.fileHandleForReading.readabilityHandler=nil
            guard let data=try? JSONSerialization.jsonObject(with:Data(self.startup[..<newline])) as? [String:Any],let port=data["port"] as? Int,let token=data["token"] as? String else { DispatchQueue.main.async { self.finish("FAIL: Invalid temporary backend startup",code:1) };return }
            DispatchQueue.main.async { self.token=token;self.origin="http://127.0.0.1:\(port)";self.openPhase() }
        }
        deadline=Timer.scheduledTimer(withTimeInterval:15,repeats:false){ [weak self] _ in self?.finish("FAIL: Temporary backend startup timed out",code:1) }
        try server.run()
    }
    private func openPhase() {
        phase=phases[phaseIndex];phaseReady=false;capturing=false;captureScheduled=false;masks=0;maximumBits=0;maximumAlpha=0;restoredAlpha=0;recoveredAlpha=0;readyCount=0;blankInjected=false;childReady=false;messages=[]
        let controller=WKUserContentController();controller.add(self,name:"companion");controller.add(self,name:"qa")
        let observer=#"""
        (()=>{
          let cycled=false,restored=false;
          const cyclePageCache=__PAGECACHE__,blankOnce=__BLANKONCE__;
          const send=value=>{try{window.webkit.messageHandlers.qa.postMessage({path:location.pathname,main:window===window.top,...value})}catch{}};
          for(const kind of ['error','warn']){const original=console[kind];console[kind]=function(...args){send({kind:'console-'+kind,text:args.map(value=>String(value)).join(' ').slice(0,1400)});return original.apply(this,args)}}
          addEventListener('error',event=>send({kind:'error',text:event.message||'resource error'}));
          addEventListener('unhandledrejection',event=>send({kind:'rejection',text:String(event.reason)}));
          addEventListener('message',event=>{const value=event.data;if(value?.type?.startsWith('mighty-companion')&&value.type!=='mighty-companion-hit-mask')send({kind:'message',type:value.type,state:value.state||'',detail:value.detail||''})});
          setInterval(()=>{const canvas=document.querySelector('canvas');if(!canvas)return;requestAnimationFrame(()=>{
            const surface=document.createElement('canvas');surface.width=128;surface.height=208;const context=surface.getContext('2d');let visiblePixels=0,error='';
            try{context.drawImage(canvas,0,0,128,208);const pixels=context.getImageData(0,0,128,208).data;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>16)visiblePixels++}catch(value){error=String(value)}
            const status=document.getElementById('status');send({kind:'canvas',visiblePixels,error,width:canvas.width,height:canvas.height,clientWidth:canvas.clientWidth,clientHeight:canvas.clientHeight,afterRestore:restored,visibility:document.visibilityState,status:status?.textContent||'',hidden:status?.hidden??false});
            if(blankOnce&&visiblePixels>500&&status?.hidden&&!sessionStorage.getItem('qaBlankInjected')){sessionStorage.setItem('qaBlankInjected','1');send({kind:'blank-injected'});dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false}));}
            if(cyclePageCache&&!cycled&&visiblePixels>500&&status?.hidden){cycled=true;dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));setTimeout(()=>{dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));restored=true},200)}
          })},500);
        })();
        """#.replacingOccurrences(of:"__PAGECACHE__",with:ProcessInfo.processInfo.environment["MIGHTY_RENDER_PAGECACHE"] == "1" ? "true":"false").replacingOccurrences(of:"__BLANKONCE__",with:ProcessInfo.processInfo.environment["MIGHTY_RENDER_BLANK_ONCE"] == "1" ? "true":"false")
        controller.addUserScript(WKUserScript(source:observer,injectionTime:.atDocumentStart,forMainFrameOnly:false))
        let config=WKWebViewConfiguration();config.userContentController=controller;config.websiteDataStore = .nonPersistent()
        panel=DesktopQAPanel(contentRect:NSRect(x:0,y:0,width:phase=="nested-portrait" ? 300:360,height:phase=="nested-portrait" ? 440:650),styleMask:[.borderless,.resizable],backing:.buffered,defer:false)
        panel.isFloatingPanel=true;panel.level = .floating;panel.isOpaque=false;panel.backgroundColor = .clear;panel.hidesOnDeactivate=false;panel.hasShadow=false
        web=WKWebView(frame:panel.contentView!.bounds,configuration:config);web.autoresizingMask=[.width,.height];web.setValue(false,forKey:"drawsBackground");web.navigationDelegate=self;panel.contentView=web
        if ProcessInfo.processInfo.environment["MIGHTY_RENDER_NATIVE_CONTAINER"] == "1" {
            let host=NSView(frame:panel.contentView!.bounds);web.frame=host.bounds;host.addSubview(web)
            let chrome=PlayerChromeView(frame:host.bounds);host.addSubview(chrome);panel.contentView=host;chrome.setPlayerVisible(false);chrome.positionInHost()
        }
        panel.center();panel.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)
        deadline?.invalidate();deadline=Timer.scheduledTimer(withTimeInterval:ProcessInfo.processInfo.environment["MIGHTY_RENDER_HOLD"] == "1" ? 50:22,repeats:false){ [weak self] _ in self?.capturePhase() }
        if phase=="direct" { web.load(URLRequest(url:URL(string:origin+"/Companion/index.html")!)) }
        else { let url=resources.appendingPathComponent("desktop.html");web.loadFileURL(url,allowingReadAccessTo:url.deletingLastPathComponent()) }
    }
    func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!) {
        guard webView===web,webView.url?.absoluteString != "about:blank",!phaseReady else { return };phaseReady=true
        let appearance:[String:Any]=ProcessInfo.processInfo.environment["MIGHTY_RENDER_MMD"] == "1" ? ["key":"ww/chars/Lynae/Lynae/Lynae.pmx","name":"Lynae","directory":"ww/chars/Lynae/Lynae","file":"Lynae.pmx"] : ["key":"local/chars/hailey/hailey.glb","name":"Hailey","directory":"local/chars/hailey","file":"hailey.glb","portrait":"local/chars/hailey/portrait.jpeg"]
        let value:[String:Any]=phase=="direct" ? ["type":"mighty-companion-load","appearance":appearance,"token":token] : ["origin":origin,"token":token,"mode":phase=="nested-portrait" ? "portrait":"overlay","playing":true,"shortcut":"Fn","character":["id":"test-hailey","name":"Hailey","appearance":appearance,"profile":["speak":false]]]
        let data=try! JSONSerialization.data(withJSONObject:value),json=String(data:data,encoding:.utf8)!
        let script=phase=="direct" ? "window.postMessage(\(json),location.origin);window.postMessage({type:'mighty-companion-control',playing:true,desktopInteraction:true,framing:'full'},location.origin)" : "window.configureDesktop(\(json))"
        web.evaluateJavaScript(script){ [weak self] _,error in if let error { self?.messages.append(["kind":"configure-error","text":error.localizedDescription]) } }
    }
    func webView(_ webView:WKWebView,didFail navigation:WKNavigation!,withError error:Error) { messages.append(["kind":"navigation-error","text":error.localizedDescription]) }
    func webView(_ webView:WKWebView,didFailProvisionalNavigation navigation:WKNavigation!,withError error:Error) { messages.append(["kind":"navigation-error","text":error.localizedDescription]) }
    func webViewWebContentProcessDidTerminate(_ webView:WKWebView) { messages.append(["kind":"web-process-terminated"]) }
    func userContentController(_ controller:WKUserContentController,didReceive message:WKScriptMessage) {
        guard message.webView===web,!finished,!capturing,let value=message.body as? [String:Any] else { return }
        if message.name=="companion",value["action"] as? String=="hitMask",let encoded=value["data"] as? String,let data=Data(base64Encoded:encoded) { masks+=1;maximumBits=max(maximumBits,data.reduce(0){$0+$1.nonzeroBitCount}) }
        if message.name=="qa" {
            messages.append(value)
            if value["state"] as? String=="ready" { childReady=true;readyCount+=1 }
            if value["kind"] as? String=="blank-injected" { blankInjected=true }
            if value["kind"] as? String=="canvas",let pixels=value["visiblePixels"] as? Int {
                maximumAlpha=max(maximumAlpha,pixels)
                if readyCount>=2 { recoveredAlpha=max(recoveredAlpha,pixels) }
                if value["afterRestore"] as? Bool == true { restoredAlpha=max(restoredAlpha,pixels) }
                if pixels>500,childReady,(ProcessInfo.processInfo.environment["MIGHTY_RENDER_BLANK_ONCE"] != "1" || readyCount>=2),!captureScheduled { captureScheduled=true;let targetPhase=phaseIndex;DispatchQueue.main.asyncAfter(deadline:.now()+(ProcessInfo.processInfo.environment["MIGHTY_RENDER_HOLD"] == "1" ? 40:1.5)){ [weak self] in guard let self,self.phaseIndex==targetPhase else {return};self.capturePhase() } }
            }
        }
    }
    private func capturePhase() {
        guard !capturing,!finished else { return };capturing=true;deadline?.invalidate()
        web.evaluateJavaScript("JSON.stringify({href:location.href,viewer:document.getElementById('viewer')?.src||'',body:document.body.className,width:innerWidth,height:innerHeight})"){ [weak self] parent,_ in
            guard let self else { return }
            let config=WKSnapshotConfiguration();config.rect=self.web.bounds;config.snapshotWidth=720;config.afterScreenUpdates=true
            self.web.takeSnapshot(with:config){ [weak self] image,error in
                guard let self else { return };var snapshotOpaque=0
                if let tiff=image?.tiffRepresentation,let bitmap=NSBitmapImageRep(data:tiff),let png=bitmap.representation(using:.png,properties:[:]) {
                    try? png.write(to:self.output.appendingPathComponent(self.phase+".png"))
                    for y in stride(from:0,to:bitmap.pixelsHigh,by:4){for x in stride(from:0,to:bitmap.pixelsWide,by:4){if (bitmap.colorAt(x:x,y:y)?.alphaComponent ?? 0) > 0.1{snapshotOpaque+=1}}}
                }
                let result:[String:Any]=["phase":self.phase,"rendererReady":self.childReady,"nativeHitMaskMessages":self.masks,"maximumHitMaskSetBits":self.maximumBits,"maximumCanvasVisiblePixelsOf26624":self.maximumAlpha,"postRecoveryVisiblePixels":self.recoveredAlpha,"readyCount":self.readyCount,"blankInjected":self.blankInjected,"postPageCacheVisiblePixels":self.restoredAlpha,"snapshotSampleOpaque":snapshotOpaque,"snapshotError":error?.localizedDescription ?? "","parent":parent as? String ?? "","messages":self.messages]
                self.results.append(result)
                print("\(self.phase): ready=\(self.childReady), native mask messages=\(self.masks), mask bits=\(self.maximumBits), GPU visible samples=\(self.maximumAlpha)/26624, WK snapshot opaque samples=\(snapshotOpaque)")
                self.web.stopLoading();self.web.loadHTMLString("",baseURL:nil);self.panel.orderOut(nil)
                self.phaseIndex+=1
                if self.phaseIndex<self.phases.count { DispatchQueue.main.asyncAfter(deadline:.now()+0.3){self.openPhase()} }
                else { self.saveReport() }
            }
        }
    }
    private func saveReport() {
        let failures=results.filter { value in
            guard value["rendererReady"] as? Bool == true,(value["maximumCanvasVisiblePixelsOf26624"] as? Int ?? 0)>500 else { return true }
            if value["phase"] as? String != "direct",(value["maximumHitMaskSetBits"] as? Int ?? 0)<500 { return true }
            if ProcessInfo.processInfo.environment["MIGHTY_RENDER_PAGECACHE"] == "1",(value["postPageCacheVisiblePixels"] as? Int ?? 0)<500 { return true }
            if ProcessInfo.processInfo.environment["MIGHTY_RENDER_BLANK_ONCE"] == "1",((value["postRecoveryVisiblePixels"] as? Int ?? 0)<500 || value["blankInjected"] as? Bool != true) { return true }
            let errors=(value["messages"] as? [[String:Any]] ?? []).filter { ["error","rejection","console-error","configure-error","navigation-error","web-process-terminated"].contains($0["kind"] as? String ?? "") }
            return !errors.isEmpty
        }
        do { let data=try JSONSerialization.data(withJSONObject:results,options:[.prettyPrinted,.sortedKeys]);let safe=String(data:data,encoding:.utf8)!.replacingOccurrences(of:token,with:"[redacted]");try safe.write(to:output.appendingPathComponent("desktop-rendering.json"),atomically:true,encoding:.utf8);finish((failures.isEmpty ? "PASS: ":"FAIL: ")+"isolated native file-parent/HTTP-iframe rendering; "+output.path,code:failures.isEmpty ? 0:1) }
        catch { finish("FAIL: "+error.localizedDescription,code:1) }
    }
    private func finish(_ message:String,code:Int32) {
        guard !finished else {return};finished=true;deadline?.invalidate();panel?.orderOut(nil);web?.stopLoading();try? input.fileHandleForWriting.close();if server.isRunning{server.terminate()};print(token.isEmpty ? message:message.replacingOccurrences(of:token,with:"[redacted]"));exit(code)
    }
}
