import Foundation
import AVFoundation

@main struct ContextRuntimeCheck {
 @MainActor static func main() async throws {
  let origin=CommandLine.arguments[1],token=CommandLine.arguments[2],output=URL(fileURLWithPath:CommandLine.arguments[3])
  let prefix="You're right, I missed your point. Here's the answer to what you actually asked."
  let body="The audio engine was restarting between the two clips."
  let character:[String:Any] = ["id":"context-native","name":"Mira","profile":["aiProvider":"groq","aiModel":"openai/gpt-oss-20b","ttsProvider":"edge","voice":"en-US-AvaMultilingualNeural"]]
  let call=try LiveCallRuntime(character:character,origin:origin,token:token,history:[])
  var started=false,finished=false,reply="",performances:[[String:Any]]=[],positions:[String:Double]=[:],error:String?
  call.onStatus={state,label in
   if state=="active" && label=="Hold to talk" && !started {
    started=true;let samples=(0..<16000).map{Float(sin(Double($0)*0.1)*0.03)}
    DispatchQueue.main.asyncAfter(deadline:.now()+0.15){call.submitVoiceFixture(samples,sampleRate:16000)}
   }
  }
  call.onMessage={role,text in if role=="assistant"{reply=text};if role=="error"{error=text}}
  call.onPerformance={value in if value["text"] != nil {performances.append(value)}}
  call.onPlayback={value in
   if value["state"] as? String=="speaking",let id=value["utteranceId"] as? String,let position=value["positionSeconds"] as? Double {positions[id]=max(positions[id] ?? 0,position)}
   if value["state"] as? String=="ended" {finished=true}
  }
  call.setOutputMuted(true);call.start()
  for _ in 0..<240 {if finished || error != nil {break};try await Task.sleep(nanoseconds:100_000_000)}
  func words(_ text:String)->String {text.split(whereSeparator:{$0.isWhitespace}).joined(separator:" ")}
  guard finished,error==nil,words(reply)==prefix+" "+body,performances.count==2,
        words(performances[0]["text"] as? String ?? "")==prefix,words(performances[1]["text"] as? String ?? "")==body,positions.count==2 else {
   print("FAIL: contextual native turn: completed=\(finished), performances=\(performances.count), errors=\(error != nil)");exit(1)
  }
  for item in performances {
   let duration=item["durationSeconds"] as! Double
   let words=item["words"] as! [[String:Any]]
   precondition(!words.isEmpty)
   for word in words {precondition((word["start"] as! Double)>=0 && (word["end"] as! Double)<=duration+0.001,"captions must align after codec padding trim")}
  }
  let data=try await call.exportPerformance()
  let rows=String(data:data,encoding:.utf8)!.split(separator:"\n").map{try! JSONSerialization.jsonObject(with:Data($0.utf8)) as! [String:Any]}
  let stamps=rows.last!["timestamps"] as! [String:Double]
  precondition(stamps["filler_playback_start"]==nil,"no independent filler playback")
  guard let end=stamps["chunk_0_end"],let start=stamps["chunk_1_start"] else{exit(1)}
  let gap=start-end
  precondition(gap < 150,"coherent opening must join the queued answer without a long gap")
  try data.write(to:output.appendingPathComponent("context-native-timing.jsonl"))
  try JSONSerialization.data(withJSONObject:["reply":reply,"speechChunks":performances.map{$0["text"]!},"gapMs":gap,"independentFillers":false,"scope":"Real native voice endpoint/transport, word captions and muted sample clock; synthetic input/provider, cached Ava opening, 2.2-second delayed Ava body."],options:[.prettyPrinted,.sortedKeys]).write(to:output.appendingPathComponent("context-native.json"))
  let sourceRoot=URL(fileURLWithPath:CommandLine.arguments[4])
  let openingData=try Data(contentsOf:sourceRoot.appendingPathComponent("Sources/VoiceOpenings/opening-07.mp3"))
  let bodyData=try Data(contentsOf:sourceRoot.appendingPathComponent("tests/fixtures/context-body.mp3"))
  let settings:[String:Any] = [AVFormatIDKey:kAudioFormatLinearPCM,AVSampleRateKey:24000,AVNumberOfChannelsKey:1,AVLinearPCMBitDepthKey:16,AVLinearPCMIsFloatKey:false]
  let preview=try AVAudioFile(forWriting:output.appendingPathComponent("context-demo.wav"),settings:settings,commonFormat:.pcmFormatFloat32,interleaved:false)
  for mp3 in [openingData,bodyData] {let decoded=try PlaybackEngine.decodeMP3(mp3);let trimmed=PlaybackEngine.trimSpeechSilence(decoded).0;try preview.write(from:trimmed)}
  call.end();print("PASS: one contextual answer opening plus continuation, exact spoken/text agreement, aligned captions, no filler loop; native handoff \(Int(gap)) ms.")
 }
}
