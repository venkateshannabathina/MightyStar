import Cocoa
import WebKit

private final class QAPanel: NSPanel {
    override var canBecomeKey: Bool { true }
}

@main final class CheckWebKit: NSObject, WKNavigationDelegate {
    private let server = Process()
    private let serverInput = Pipe()
    private var startup = Data()
    private var token = ""
    private var panel: NSPanel!
    private var web: WKWebView!
    private var poll: Timer?
    private var deadline: Timer?
    private var first: [String:Any]?
    private var rangeBaseline: [String:Any]?
    private var readyTime: Date?
    private var timelineStart: Date?
    private let clipOrder = ["Dwarf Idle","Dwarf Idle 2"]
    private var clipDurations: [String:Double] = [:]
    private var sourceMinimum: [String:Double] = [:]
    private var sourceMaximum: [String:Double] = [:]
    private var animationClockAdvance = 0.0
    private var previousClock: Double?
    private var lastState: [String:Any]?
    private var heldClips = Set<String>()
    private var maximumJointRotation = 0.0
    private var lastPixels: [UInt8]?
    private var lastBones: Any?
    private var clips = Set<String>()
    private var stages = Set<String>()
    private var maximumPixelChanges = 0
    private var changingFrames = 0
    private var timeline: [[String:Any]] = []
    private var finished = false
    private var modelReady = false
    private var outputURL: URL!

    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        let test = CheckWebKit()
        do { try test.start() } catch { test.finish("FAIL: \(error.localizedDescription)",code:1) }
        withExtendedLifetime(test) { app.run() }
    }

    private func start() throws {
        let workspace = URL(fileURLWithPath:FileManager.default.currentDirectoryPath)
        let appRoot = workspace.appendingPathComponent("Mighty Chat")
        outputURL = appRoot.appendingPathComponent("build/idle-review/hailey-webkit.png")
        for file in ["dwarf-idle.json","dwarf-idle-2.json"] {
            let url=workspace.appendingPathComponent("model-viewer-clean/res/animations/"+file)
            let data=try Data(contentsOf:url)
            guard let clip=try JSONSerialization.jsonObject(with:data) as? [String:Any],let name=clip["name"] as? String,let frames=clip["frameCount"] as? Double,let fps=clip["fps"] as? Double,fps>0 else { throw NSError(domain:"NativeIdleQA",code:1,userInfo:[NSLocalizedDescriptionKey:"Invalid authored clip timing"] ) }
            clipDurations[name]=(frames-1)/fps
        }
        let node = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "<home>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
        server.executableURL = URL(fileURLWithPath:node)
        server.arguments = [appRoot.appendingPathComponent("Sources/companion-server.cjs").path]
        server.standardInput = serverInput
        let output = Pipe(); server.standardOutput = output
        server.standardError = Pipe()
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            guard let self else { return }
            let chunk = handle.availableData
            guard !chunk.isEmpty else { return }
            self.startup.append(chunk)
            guard self.startup.count < 16384, let newline = self.startup.firstIndex(of:10) else { return }
            let line = self.startup[..<newline]
            output.fileHandleForReading.readabilityHandler = nil
            guard let ready = try? JSONSerialization.jsonObject(with:Data(line)) as? [String:Any],
                  let port = ready["port"] as? Int, port > 0,
                  let token = ready["token"] as? String else {
                DispatchQueue.main.async { self.finish("FAIL: Invalid local backend startup",code:1) }; return
            }
            DispatchQueue.main.async { self.open(port:port,token:token) }
        }
        deadline = Timer.scheduledTimer(withTimeInterval:60,repeats:false) { [weak self] _ in self?.finish("FAIL: WebKit renderer did not finish within 60 seconds",code:1) }
        try server.run()
    }

    private func open(port:Int,token:String) {
        self.token = token
        panel = QAPanel(contentRect:NSRect(x:0,y:0,width:720,height:900),styleMask:[.borderless,.resizable],backing:.buffered,defer:false)
        panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false
        panel.isFloatingPanel = true; panel.level = .floating; panel.hidesOnDeactivate = false
        panel.collectionBehavior = [.canJoinAllSpaces,.fullScreenAuxiliary]
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        web = WKWebView(frame:panel.contentView!.bounds,configuration:configuration)
        web.autoresizingMask = [.width,.height]; web.navigationDelegate = self
        web.setValue(false,forKey:"drawsBackground")
        panel.contentView = web; panel.center(); panel.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps:true)
        web.load(URLRequest(url:URL(string:"http://127.0.0.1:\(port)/Companion/index.html?inspect=1")!))
    }

    func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!) {
        let message:[String:Any] = ["type":"mighty-companion-load","token":token,"appearance":["key":"local/chars/hailey/hailey.glb","name":"Hailey","directory":"local/chars/hailey","file":"hailey.glb"]]
        guard let data = try? JSONSerialization.data(withJSONObject:message),let json = String(data:data,encoding:.utf8) else { finish("FAIL: Could not create model load request",code:1); return }
        web.evaluateJavaScript("window.qaFrames=0;function qaFrame(){window.qaFrames++;requestAnimationFrame(qaFrame)}requestAnimationFrame(qaFrame);window.postMessage(\(json),location.origin);window.postMessage({type:'mighty-companion-control',playing:true,desktopInteraction:true,framing:'full'},location.origin)") { [weak self] _,error in
            if let error { self?.finish("FAIL: \(error.localizedDescription)",code:1); return }
            self?.poll = Timer.scheduledTimer(withTimeInterval:0.2,repeats:true) { [weak self] _ in self?.checkReady() }
        }
    }
    func webView(_ webView:WKWebView,didFail navigation:WKNavigation!,withError error:Error) { finish("FAIL: \(error.localizedDescription)",code:1) }
    func webView(_ webView:WKWebView,didFailProvisionalNavigation navigation:WKNavigation!,withError error:Error) { finish("FAIL: \(error.localizedDescription)",code:1) }

    private func checkReady() {
        web.evaluateJavaScript("JSON.stringify({ready:document.getElementById('status').hidden,failed:document.getElementById('status').classList.contains('failed'),state:window.mightyCompanionInspect?.()})") { [weak self] value,error in
            guard let self, !self.finished, !self.modelReady else { return }
            guard error == nil, let text=value as? String, let data=text.data(using:.utf8),let result=try? JSONSerialization.jsonObject(with:data) as? [String:Any] else { return }
            if result["failed"] as? Bool == true { self.finish("FAIL: Native WebKit could not load Hailey",code:1); return }
            guard result["ready"] as? Bool == true, let state=result["state"] as? [String:Any] else { return }
            guard let lighting=state["lighting"] as? [String:Any] else { return }
            if lighting["environmentFailed"] as? Bool == true { self.finish("FAIL: Native studio environment failed: \(lighting["environmentError"] ?? "unknown error")",code:1);return }
            guard lighting["profile"] as? String == "studio-pbr",lighting["environmentReady"] as? Bool == true,lighting["prefiltered"] as? Bool == true else { return }
            guard lighting["transparentCanvas"] as? Bool == true,lighting["toneMapping"] as? String == "ACES" else { self.finish("FAIL: Native studio lighting changed canvas transparency or color processing",code:1);return }
            self.modelReady = true
            self.poll?.invalidate(); self.poll=nil
            self.deadline?.invalidate()
            self.deadline = Timer.scheduledTimer(withTimeInterval:29,repeats:false) { [weak self] _ in self?.finish("FAIL: Native verification exceeded 29 seconds after model ready",code:1) }
            guard self.validBones(state) else { self.finish("FAIL: Expected 247 finite Hailey bones",code:1); return }
            self.first=state
            self.readyTime=Date()
            DispatchQueue.main.asyncAfter(deadline:.now()+1.2) { self.checkMotion() }
        }
    }
    private func inspect(_ done:@escaping ([String:Any])->Void) {
        web.evaluateJavaScript("JSON.stringify({...mightyCompanionInspect(),qa:{frames:window.qaFrames,visibility:document.visibilityState}})") { [weak self] value,error in
            guard let self,!self.finished else { return }
            guard error == nil,let text=value as? String,let data=text.data(using:.utf8),let state=try? JSONSerialization.jsonObject(with:data) as? [String:Any] else { self.finish("FAIL: Native renderer inspection failed",code:1); return }
            done(state)
        }
    }
    private func validBones(_ state:[String:Any])->Bool {
        guard let bones=state["bones"] as? [[String:Any]],bones.count==247 else { return false }
        return bones.allSatisfy { bone in
            guard let rotation=bone["rotation"] as? [Double],rotation.count==4,let position=bone["position"] as? [Double],position.count==3 else { return false }
            return (rotation+position).allSatisfy { $0.isFinite }
        }
    }
    private func same(_ a:Any?,_ b:Any?)->Bool {
        guard let a,let b,let left=try? JSONSerialization.data(withJSONObject:a,options:.sortedKeys),let right=try? JSONSerialization.data(withJSONObject:b,options:.sortedKeys) else { return false }
        return left==right
    }
    private func checkMotion() {
        inspect { [weak self] state in self?.verifyMotion(state) }
    }
    private func verifyMotion(_ state:[String:Any]) {
        guard let first=first,validBones(state),!same(first["idle"],state["idle"]) else { reportMotionFailure(state); return }
        if same(first["bones"],state["bones"]) {
            guard let readyTime=readyTime,Date().timeIntervalSince(readyTime)<8 else { finish("FAIL: Native WebKit idle pose did not change across a hold and transition",code:1); return }
            DispatchQueue.main.asyncAfter(deadline:.now()+0.5) { [weak self] in self?.checkMotion() }
            return
        }
        rangeBaseline = state
        timelineStart = Date()
        sampleTimeline()
    }
    private func sampleTimeline() {
        inspect { [weak self] state in self?.captureTimeline(state) }
    }
    private func captureTimeline(_ state:[String:Any]) {
        guard validBones(state),let idle=state["idle"] as? [String:Any],let primary=idle["primary"] as? [String:Any],let name=primary["name"] as? String,let stage=idle["stage"] as? String else { finish("FAIL: Invalid sustained native idle state",code:1); return }
        guard idle["reacting"] as? Bool == false else { finish("FAIL: Hover animation must remain disabled",code:1); return }
        let phases=[primary,idle["secondary"] as? [String:Any]].compactMap { $0 }
        for phase in phases {
            guard let phaseName=phase["name"] as? String,let time=phase["time"] as? Double,let duration=clipDurations[phaseName],time>=0,time<=duration+1e-6 else { finish("FAIL: Invalid full-clip source time",code:1); return }
            guard (phase["clipStart"] as? Double ?? -1)==0,(phase["clipEnd"] as? Double ?? -1)>=duration-1e-6 else { finish("FAIL: Renderer still trims the authored animation",code:1); return }
            sourceMinimum[phaseName]=min(sourceMinimum[phaseName] ?? time,time)
            sourceMaximum[phaseName]=max(sourceMaximum[phaseName] ?? time,time)
        }
        if let clock=phaseClock(state) {
            if let previous=previousClock { let cycle=cycleDuration();animationClockAdvance+=(clock-previous+cycle).truncatingRemainder(dividingBy:cycle) }
            previousClock=clock
        }
        if let previous=lastState,let previousIdle=previous["idle"] as? [String:Any],let previousPrimary=previousIdle["primary"] as? [String:Any],previousIdle["holding"] as? Bool==true,idle["holding"] as? Bool==true,previousPrimary["name"] as? String==name {
            guard same(previous["bones"],state["bones"]) else { finish("FAIL: The full animation's ending pose did not freeze during its hold",code:1); return }
            heldClips.insert(name)
        }
        maximumJointRotation=max(maximumJointRotation,jointRotationRange(state))
        clips.insert(name);stages.insert(stage)
        captureFrame { [weak self] png,bitmap,method in
            guard let self else { return }
            let current=self.pixels(bitmap)
            var changed=0
            if let previous=self.lastPixels,previous.count==current.count {
                for index in stride(from:0,to:current.count,by:4) {
                    let difference=(0..<4).reduce(0) { $0+abs(Int(current[index+$1])-Int(previous[index+$1])) }
                    if difference>24 { changed+=1 }
                }
            }
            if changed>30,!self.same(self.lastBones,state["bones"]) { self.changingFrames+=1 }
            if changed>self.maximumPixelChanges {
                self.maximumPixelChanges=changed
                try? png.write(to:self.outputURL.deletingLastPathComponent().appendingPathComponent("hailey-webkit-motion.png"))
            }
            if self.lastPixels == nil { try? FileManager.default.createDirectory(at:self.outputURL.deletingLastPathComponent(),withIntermediateDirectories:true);try? png.write(to:self.outputURL.deletingLastPathComponent().appendingPathComponent("hailey-webkit-post-entry.png")) }
            self.lastPixels=current;self.lastBones=state["bones"];self.lastState=state
            self.timeline.append(["elapsed":Date().timeIntervalSince(self.timelineStart!),"animationClockAdvance":self.animationClockAdvance,"idle":idle,"changedPixels":changed,"capture":method,"qa":state["qa"] ?? [:],"render":state["render"] ?? [:]])
            if Date().timeIntervalSince(self.timelineStart!)<24 {
                DispatchQueue.main.asyncAfter(deadline:.now()+0.35) { self.sampleTimeline() };return
            }
            guard self.clips==Set(self.clipOrder),self.heldClips==Set(self.clipOrder),self.stages==Set(["animation","hold","transition"]),self.changingFrames>=8,self.maximumPixelChanges>100 else { self.finish("FAIL: Full post-entry native motion missing; clips=\(self.clips.sorted()), holds=\(self.heldClips.sorted()), stages=\(self.stages.sorted()), visible changes=\(self.maximumPixelChanges), changing frames=\(self.changingFrames)",code:1); return }
            for name in self.clipOrder {
                guard let duration=self.clipDurations[name],(self.sourceMinimum[name] ?? duration)<duration*0.2,(self.sourceMaximum[name] ?? 0)>=duration-1e-6 else { self.finish("FAIL: Did not observe the full source range of \(name)",code:1); return }
            }
            var timing:[String:Any]=["workload":"visible native panel with repeated snapshots"]
            if let firstSample=self.timeline.first,let lastSample=self.timeline.last,let firstQA=firstSample["qa"] as? [String:Any],let lastQA=lastSample["qa"] as? [String:Any],let firstFrames=firstQA["frames"] as? Double,let lastFrames=lastQA["frames"] as? Double,let firstTime=firstSample["elapsed"] as? Double,let lastTime=lastSample["elapsed"] as? Double,lastTime>firstTime { timing["approxFPS"]=(lastFrames-firstFrames)/(lastTime-firstTime) }
            self.timeline.append(["fullClipDurations":self.clipDurations,"cycleDuration":self.cycleDuration(),"sourceMinimum":self.sourceMinimum,"sourceMaximum":self.sourceMaximum,"verifiedFrozenHolds":self.heldClips.sorted(),"maximumJointRotationDegrees":self.maximumJointRotation,"verifiedSustainedNativeMotion":true,"lighting":state["lighting"] ?? [:],"render":state["render"] ?? [:],"frameTiming":timing])
            if let data=try? JSONSerialization.data(withJSONObject:self.timeline,options:[.prettyPrinted,.sortedKeys]) { try? data.write(to:self.outputURL.deletingLastPathComponent().appendingPathComponent("native-motion-check.json")) }
            self.checkPause()
        }
    }
    private func pixels(_ bitmap:NSBitmapImageRep)->[UInt8] {
        var result=[UInt8]();result.reserveCapacity(180*225*4)
        for y in 0..<225 {
            for x in 0..<180 {
                let color=bitmap.colorAt(x:min(bitmap.pixelsWide-1,x*bitmap.pixelsWide/180),y:min(bitmap.pixelsHigh-1,y*bitmap.pixelsHigh/225))?.usingColorSpace(.deviceRGB) ?? .clear
                for component in [color.redComponent,color.greenComponent,color.blueComponent,color.alphaComponent] { result.append(UInt8(max(0,min(255,Int((component*255).rounded()))))) }
            }
        }
        return result
    }
    private func cycleDuration()->Double {
        clipOrder.reduce(0) { $0+(clipDurations[$1] ?? 0)+3+0.65 }
    }
    private func jointRotationRange(_ state:[String:Any])->Double {
        guard let original=rangeBaseline?["bones"] as? [[String:Any]],let current=state["bones"] as? [[String:Any]] else { return 0 }
        let rotations=Dictionary(uniqueKeysWithValues:original.compactMap { bone -> (String,[Double])? in guard let name=bone["name"] as? String,let rotation=bone["rotation"] as? [Double] else { return nil };return (name,rotation) })
        var maximum=0.0
        for bone in current {
            guard let name=bone["name"] as? String,name.range(of:"(UpperArm|Forearm|Hand|Head)$",options:[.regularExpression,.caseInsensitive]) != nil,let old=rotations[name],let value=bone["rotation"] as? [Double],old.count==4,value.count==4 else { continue }
            let dot=zip(old,value).reduce(0.0) { $0+$1.0*$1.1 }
            maximum=max(maximum,2*acos(min(1,abs(dot)))*180/Double.pi)
        }
        return maximum
    }
    private func phaseClock(_ state:[String:Any])->Double? {
        guard let idle=state["idle"] as? [String:Any],let primary=idle["primary"] as? [String:Any],let index=primary["clipIndex"] as? Int,let stage=idle["stage"] as? String else { return nil }
        guard index>=0,index<clipOrder.count,let duration=clipDurations[clipOrder[index]] else { return nil }
        let base=clipOrder.prefix(index).reduce(0) { $0+(clipDurations[$1] ?? 0)+3+0.65 }
        if stage=="hold" { return base+duration+(idle["holdElapsed"] as? Double ?? 0) }
        if stage=="transition" { return base+duration+3+0.65*inverseEase(idle["blend"] as? Double ?? 0) }
        guard let time=primary["time"] as? Double else { return nil }
        return base+time
    }
    private func inverseEase(_ value:Double)->Double {
        var lower=0.0,upper=1.0
        for _ in 0..<40 { let middle=(lower+upper)/2;let eased=middle*middle*middle*(middle*(middle*6-15)+10);if eased<value { lower=middle } else { upper=middle } }
        return (lower+upper)/2
    }
    private func checkPause() {
        web.evaluateJavaScript("window.postMessage({type:'mighty-companion-control',playing:false,hovered:true},location.origin)") { [weak self] _,error in
            if error != nil { self?.finish("FAIL: Native pause failed",code:1); return }
            DispatchQueue.main.asyncAfter(deadline:.now()+0.2) { self?.capturePaused() }
        }
    }
    private func reportMotionFailure(_ state:[String:Any]) {
        let current=["playing":state["playing"] ?? false,"idle":state["idle"] ?? [:]]
        let firstIdle=first?["idle"] ?? [:]
        web.evaluateJavaScript("JSON.stringify({visibility:document.visibilityState,frames:window.qaFrames,status:document.getElementById('status').textContent})") { [weak self] value,_ in
            let before=(try? JSONSerialization.data(withJSONObject:firstIdle,options:.sortedKeys)).flatMap { String(data:$0,encoding:.utf8) } ?? "unknown"
            let after=(try? JSONSerialization.data(withJSONObject:current,options:.sortedKeys)).flatMap { String(data:$0,encoding:.utf8) } ?? "unknown"
            self?.finish("FAIL: Native WebKit idle scheduler did not advance; before=\(before); after=\(after); browser=\(value ?? "unknown")",code:1)
        }
    }
    private func capturePaused() {
        inspect { [weak self] paused in
            DispatchQueue.main.asyncAfter(deadline:.now()+0.5) {
                self?.inspect { frozen in self?.verifyFrozen(paused:paused,frozen:frozen) }
            }
        }
    }
    private func verifyFrozen(paused:[String:Any],frozen:[String:Any]) {
        guard same(paused["idle"],frozen["idle"]) else { finish("FAIL: Native pause did not freeze the idle scheduler",code:1); return }
        web.evaluateJavaScript("window.postMessage({type:'mighty-companion-control',playing:true,hovered:false},location.origin)") { [weak self] _,error in
            if error != nil { self?.finish("FAIL: Native resume failed",code:1); return }
            DispatchQueue.main.asyncAfter(deadline:.now()+0.5) {
                self?.inspect { resumed in self?.verifyResumed(frozen:frozen,resumed:resumed) }
            }
        }
    }
    private func verifyResumed(frozen:[String:Any],resumed:[String:Any]) {
        guard validBones(resumed),!same(frozen["idle"],resumed["idle"]) else { finish("FAIL: Native resume did not advance the idle scheduler",code:1); return }
        snapshot()
    }
    private func snapshot() {
        captureFrame { [weak self] png,_,method in self?.saveCapture(png,method:method) }
    }
    private func captureFrame(_ completion:@escaping (Data,NSBitmapImageRep,String)->Void) {
        let configuration=WKSnapshotConfiguration();configuration.rect=web.bounds;configuration.snapshotWidth=720;configuration.afterScreenUpdates=true
        web.takeSnapshot(with:configuration) { [weak self] image,error in
            guard let self,!self.finished else { return }
            if error == nil,let tiff=image?.tiffRepresentation,let bitmap=NSBitmapImageRep(data:tiff),self.hasCharacterPixels(bitmap),let png=bitmap.representation(using:.png,properties:[:]) { completion(png,bitmap,"WK snapshot"); return }
            // takeSnapshot can omit WebGL composited pixels. Read the real
            // WebKit canvas immediately after its next rendered frame instead.
            self.web.callAsyncJavaScript("return await new Promise(resolve=>requestAnimationFrame(()=>resolve(document.querySelector('canvas').toDataURL('image/png'))))",arguments:[:],in:nil,in:.page) { result in
                guard case .success(let value)=result,let dataURL=value as? String,let marker=dataURL.range(of:","),let png=Data(base64Encoded:String(dataURL[marker.upperBound...])),let bitmap=NSBitmapImageRep(data:png),self.hasCharacterPixels(bitmap) else { self.finish("FAIL: Native WebKit GPU canvas has no visible character pixels",code:1); return }
                completion(png,bitmap,"WebKit GPU canvas capture")
            }
        }
    }
    private func hasCharacterPixels(_ bitmap:NSBitmapImageRep)->Bool {
        var opaque=0
        for y in stride(from:0,to:bitmap.pixelsHigh,by:8) {
            for x in stride(from:0,to:bitmap.pixelsWide,by:8) {
                if let color=bitmap.colorAt(x:x,y:y),color.alphaComponent>0.1 { opaque+=1 }
            }
        }
        return opaque>100
    }
    private func saveCapture(_ png:Data,method:String) {
        do {
            try FileManager.default.createDirectory(at:outputURL.deletingLastPathComponent(),withIntermediateDirectories:true)
            try png.write(to:outputURL)
            let summary="native WKWebView 247 finite bones, both full source ranges, frozen holds for both clips, \(changingFrames) post-entry visible changes, max \(maximumPixelChanges)/40500 changed sample pixels, joint range \(maximumJointRotation) degrees, pause/resume; animation clock \(animationClockAdvance)s, cycle \(cycleDuration())s; \(method): \(outputURL.path)"
            finish("PASS: \(summary)",code:0)
        } catch { finish("FAIL: \(error.localizedDescription)",code:1) }
    }
    private func finish(_ message:String,code:Int32) {
        guard !finished else { return };finished=true
        poll?.invalidate();deadline?.invalidate();panel?.orderOut(nil)
        web?.stopLoading();web?.loadHTMLString("",baseURL:nil)
        try? serverInput.fileHandleForWriting.close()
        if server.isRunning { server.terminate() }
        print(token.isEmpty ? message : message.replacingOccurrences(of:token,with:"[redacted]"))
        exit(code)
    }
}
