import Foundation
import AVFoundation

// Output-only offline processing. This helper never opens a microphone or device.
@main struct PocketAudioTuner {
 static func main() throws {
  if CommandLine.arguments.contains("--worker") {
   // Initialize audio components once, before any tuned reply is requested.
   let warm=AVAudioEngine(),player=AVAudioPlayerNode(),pitch=AVAudioUnitTimePitch()
   warm.attach(player);warm.attach(pitch)
   print("{\"ready\":true}");fflush(stdout)
   while let line=readLine() {
    guard let bytes=line.data(using:.utf8),let job=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:Any],let id=job["id"] as? String else {continue}
    var ok=false
    if let input=job["input"] as? String,let output=job["output"] as? String,let speed=job["speed"] as? Double,let tone=job["tone"] as? Double,let gain=job["gain"] as? Double {
     do {try process(["audio-tuner",input,output,String(speed),String(tone),String(gain)]);ok=true}catch{}
    }
    let response=try JSONSerialization.data(withJSONObject:["id":id,"ok":ok]);print(String(data:response,encoding:.utf8)!);fflush(stdout)
   }
   return
  }
  try process(CommandLine.arguments)
 }
 static func process(_ arguments:[String]) throws {
  guard arguments.count == 6,
        let rate = Float(arguments[3]), rate >= 0.75, rate <= 1.25,
        let semitones = Float(arguments[4]), abs(semitones) <= 3,
        let gain = Float(arguments[5]), gain >= 0.5, gain <= 1.25 else { exit(2) }
  let input=try AVAudioFile(forReading:URL(fileURLWithPath:arguments[1]),commonFormat:.pcmFormatFloat32,interleaved:false)
  guard input.processingFormat.sampleRate==24000,input.processingFormat.channelCount==1,
        input.length>0,input.length<=24000*180,
        let samples=AVAudioPCMBuffer(pcmFormat:input.processingFormat,frameCapacity:AVAudioFrameCount(input.length)) else {exit(3)}
  try input.read(into:samples)
  let engine=AVAudioEngine(),player=AVAudioPlayerNode(),pitch=AVAudioUnitTimePitch()
  engine.attach(player);engine.attach(pitch);pitch.rate=rate;pitch.pitch=semitones*100
  engine.connect(player,to:pitch,format:input.processingFormat)
  engine.connect(pitch,to:engine.mainMixerNode,format:input.processingFormat)
  try engine.enableManualRenderingMode(.offline,format:input.processingFormat,maximumFrameCount:4096)
  guard let buffer=AVAudioPCMBuffer(pcmFormat:engine.manualRenderingFormat,frameCapacity:4096) else {exit(4)}
  let settings:[String:Any]=[AVFormatIDKey:kAudioFormatLinearPCM,AVSampleRateKey:24000,AVNumberOfChannelsKey:1,AVLinearPCMBitDepthKey:16,AVLinearPCMIsFloatKey:false]
  let output=try AVAudioFile(forWriting:URL(fileURLWithPath:arguments[2]),settings:settings,commonFormat:.pcmFormatFloat32,interleaved:false)
  player.scheduleBuffer(samples);try engine.start();player.play()
  defer {player.stop();engine.stop()}
  let target=AVAudioFramePosition(ceil(Double(samples.frameLength)/Double(rate)))+7200
  var retries=0
  while engine.manualRenderingSampleTime<target {
   let count=AVAudioFrameCount(min(4096,target-engine.manualRenderingSampleTime))
   switch try engine.renderOffline(count,to:buffer) {
   case .success:
    retries=0
    if let channel=buffer.floatChannelData?[0] {for i in 0..<Int(buffer.frameLength){channel[i]=min(0.98,max(-0.98,channel[i]*gain))}}
    try output.write(from:buffer)
   case .cannotDoInCurrentContext,.insufficientDataFromInputNode:
    retries+=1;if retries>100 {exit(5)}
   case .error:exit(6)
   @unknown default:exit(7)
   }
  }
 }
}
