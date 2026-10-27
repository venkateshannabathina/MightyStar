import Foundation
import AVFoundation

@main struct PocketRuntimeCheck {
 @MainActor static func main() async throws {
  let origin=CommandLine.arguments[1], token=CommandLine.arguments[2]
  let character:[String:Any] = ["id":"pocket-native","name":"Mira","profile":["aiProvider":"groq","ttsProvider":"pocket","pocketVoice":ProcessInfo.processInfo.environment["MIGHTY_TEST_POCKET_VOICE"] ?? "alba", "pocketSpeed":ProcessInfo.processInfo.environment["MIGHTY_TEST_POCKET_TUNING"] == "1" ? 1.1 : 1.0, "pocketPitch":ProcessInfo.processInfo.environment["MIGHTY_TEST_POCKET_TUNING"] == "1" ? 1.0 : 0.0, "pocketVolume":ProcessInfo.processInfo.environment["MIGHTY_TEST_POCKET_TUNING"] == "1" ? 0.8 : 1.0]]
  let call=try LiveCallRuntime(character:character,origin:origin,token:token,history:[])
  var started=false,finished=false,reply="",performances:[[String:Any]]=[],positions:[String:Double]=[:],error:String?
  call.onStatus={state,label in
   if state=="active" && label=="Hold to talk" && !started {
    started=true
    DispatchQueue.main.asyncAfter(deadline:.now()+2) {call.submitVoiceFixture((0..<16000).map{Float(sin(Double($0)*0.1)*0.03)},sampleRate:16000)}
   }
  }
  call.onMessage={role,text in if role=="assistant"{reply=text};if role=="error"{error=text}}
  call.onPerformance={value in if value["text"] != nil {performances.append(value)}}
  call.onPlayback={value in
   if value["state"] as? String=="speaking",let id=value["utteranceId"] as? String,let position=value["positionSeconds"] as? Double {positions[id]=max(positions[id] ?? 0,position)}
   if value["state"] as? String=="ended" {finished=true}
  }
  call.setOutputMuted(true);call.start()
  for _ in 0..<300 {if finished || error != nil {break};try await Task.sleep(nanoseconds:100_000_000)}
  func words(_ text:String)->String {text.split(whereSeparator:{$0.isWhitespace}).joined(separator:" ")}
  guard finished,error==nil,words(reply)=="The voice now runs locally on your Mac. You can interrupt me whenever you want.",performances.count==2,positions.count==2 else {
   print("FAIL: Pocket native turn finished=\(finished), chunks=\(performances.count), positions=\(positions.count), error=\(error ?? "none")");exit(1)
  }
  for item in performances {
   precondition((item["durationSeconds"] as? Double ?? 0)>0)
   precondition((item["words"] as? [Any] ?? []).isEmpty,"Pocket must not fabricate word timestamps")
  }
  let data=try await call.exportPerformance()
  try data.write(to:URL(fileURLWithPath:CommandLine.arguments[3]).appendingPathComponent("pocket-native-timing.jsonl"))
  call.end()
  print("PASS: real Pocket speech through native transport, WAV download/decode, two sentence captions, sample clock and completion; no Edge recordings or fabricated word timings.")
 }
}
