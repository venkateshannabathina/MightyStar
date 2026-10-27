import Foundation
@main struct GestureNativeCheck {
 @MainActor static func main() async {
  do {
   let origin=CommandLine.arguments[1],token=CommandLine.arguments[2],output=CommandLine.arguments[3]
   let character:[String:Any] = ["id":"native-fixture","name":"Mira","appearance":["key":"fixture"],"profile":["aiProvider":"groq","aiModel":"openai/gpt-oss-20b"]]
   let enabled=ProcessInfo.processInfo.environment["MIGHTY_GESTURES_V2"] == "1"
   let call=try LiveCallRuntime(character:character,origin:origin,token:token,history:[])
   var started=false,finished=false,phases:[String]=[],performances=0,positiveClock=false
   call.onPhase = { value in if let type=value["type"] as? String {phases.append(type)} }
   // Let initial device negotiation settle before this synthetic turn. Route
   // changes correctly cancel output; they are not provider/face test input.
   call.onStatus = { state,label in if state=="active" && label=="Hold to talk" && !started {started=true;let samples=(0..<16000).map{Float(sin(Double($0)*0.1)*0.03)};DispatchQueue.main.asyncAfter(deadline:.now()+3){call.submitVoiceFixture(samples,sampleRate:16000)}} }
   call.onPerformance = { value in if let cues=value["sentenceCues"] as? [[String:Any]], !cues.isEmpty, value["identity"] != nil {performances+=1} }
   call.onPlayback = { value in if value["state"] as? String=="speaking",(value["positionSeconds"] as? Double ?? 0)>0 {positiveClock=true};if value["state"] as? String=="ended" {finished=true} }
   call.onMessage = { role,_ in if role=="error" {print("FAIL: Native fixture error; no message content logged.");exit(1)} }
   call.setOutputMuted(true);call.start()
   for _ in 0..<400 {if finished{break};try await Task.sleep(nanoseconds:100_000_000)}
   guard finished,positiveClock,enabled ? (performances>=2 && phases.contains("input.begin") && phases.contains("input.commit") && phases.contains("response.complete") && phases.contains("audio.complete")) : (performances==0 && phases.isEmpty) else{print("Fixture diagnostics: enabled=\(enabled), ended=\(finished), positiveClock=\(positiveClock), performances=\(performances), phases=\(phases)");throw URLError(.timedOut)}
   let receipt:[String:Any] = ["enabled":enabled,"scope":"Actual native hold endpoint and call protocol, fixture STT/reply/audio, real decoder/sample clock, gesture phase and sentence metadata with expressive-face flag off. Muted output; no provider call.","phaseOrder":phases,"phrasePerformancesWithCues":performances,"positivePlaybackClock":positiveClock,"ended":finished]
   let timings=try await call.exportPerformance();try timings.write(to:URL(fileURLWithPath:output+(enabled ? "/gesture-native-timing.jsonl" : "/gesture-native-timing-off.jsonl")),options:.atomic)
   try JSONSerialization.data(withJSONObject:receipt,options:[.prettyPrinted,.sortedKeys]).write(to:URL(fileURLWithPath:output+(enabled ? "/gesture-native.json" : "/gesture-native-off.json")),options:.atomic)
   call.end();print("PASS: Gesture-only native flag off/on, input/commit phases, sentence metadata, real muted playback and completion.")
  }catch{print("FAIL: Native Director bridge check (\((error as NSError).code)); no content logged.");exit(1)}
 }
}
