import Foundation
@main struct EnergyNativeCheck {
 @MainActor static func main() async {
  do {
   let origin=CommandLine.arguments[1],token=CommandLine.arguments[2],output=CommandLine.arguments[3]
   let character:[String:Any] = ["id":"native-fixture","name":"Mira","appearance":["key":"fixture"],"profile":["aiProvider":"groq","aiModel":"openai/gpt-oss-20b","ttsProvider":"openai","openaiVoice":"marin"]]
   let enabled=ProcessInfo.processInfo.environment["MIGHTY_ENERGY_JAW"] == "1"
   let call=try LiveCallRuntime(character:character,origin:origin,token:token,history:[])
   var started=false,finished=false,phases:[String]=[],performances=0,positiveClock=false,energies:[Double]=[],qualities:[String]=[]
   call.onPhase = { value in if let type=value["type"] as? String {phases.append(type)} }
   // Let initial device negotiation settle before this synthetic turn. Route
   // changes correctly cancel output; they are not provider/face test input.
   call.onStatus = { state,label in if state=="active" && label=="Hold to talk" && !started {started=true;let samples=(0..<16000).map{Float(sin(Double($0)*0.1)*0.03)};DispatchQueue.main.asyncAfter(deadline:.now()+3){call.submitVoiceFixture(samples,sampleRate:16000)}} }
   call.onPerformance = { value in if let quality=value["quality"] as? String {qualities.append(quality);performances+=1} }
   call.onPlayback = { value in if let energy=value["energy"] as? Double {energies.append(energy)};if value["state"] as? String=="speaking",(value["positionSeconds"] as? Double ?? 0)>0 {positiveClock=true};if value["state"] as? String=="ended" {finished=true} }
   call.onMessage = { role,_ in if role=="error" {print("FAIL: Native fixture error; no message content logged.");exit(1)} }
   call.setOutputMuted(true);call.start()
   for _ in 0..<400 {if finished{break};try await Task.sleep(nanoseconds:100_000_000)}
   guard finished,positiveClock,performances>=2,energies.allSatisfy({$0.isFinite && $0>=0 && $0<=1}),enabled ? ((energies.max() ?? 0)>0.1 && energies.last==0 && qualities.allSatisfy{$0=="energy-envelope"}) : (energies.isEmpty && qualities.allSatisfy{$0=="audio-only"}) else{print("Fixture diagnostics: enabled=\(enabled), ended=\(finished), positiveClock=\(positiveClock), performances=\(performances), phases=\(phases)");throw URLError(.timedOut)}
   let receipt:[String:Any] = ["enabled":enabled,"energySamples":energies,"qualities":qualities,"scope":"Actual native hold endpoint, OpenAI TTS selection and adapter with recorded MP3 HTTP fixture, real decoder/playback clock and energy snapshots. Muted output; no live provider call.","phaseOrder":phases,"phrasePerformances":performances,"positivePlaybackClock":positiveClock,"ended":finished]
   let timings=try await call.exportPerformance();try timings.write(to:URL(fileURLWithPath:output+(enabled ? "/native-energy-timing.jsonl" : "/native-energy-timing-off.jsonl")),options:.atomic)
   try JSONSerialization.data(withJSONObject:receipt,options:[.prettyPrinted,.sortedKeys]).write(to:URL(fileURLWithPath:output+(enabled ? "/native-energy.json" : "/native-energy-off.json")),options:.atomic)
   call.end();print("PASS: Native energy flag off/on, OpenAI selection, real decode/playback, bounded envelope samples, quality and ended-zero passed.")
  }catch{print("FAIL: Native energy bridge check (\((error as NSError).code)); no content logged.");exit(1)}
 }
}
