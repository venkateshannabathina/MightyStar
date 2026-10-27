import Foundation
import AVFoundation
@main struct EnergyCheck {
 static func main() throws {
  let format=AVAudioFormat(standardFormatWithSampleRate:24000,channels:1)!
  let buffer=AVAudioPCMBuffer(pcmFormat:format,frameCapacity:24000)!
  buffer.frameLength=24000
  for i in 0..<24000 {buffer.floatChannelData![0][i] = i>=6000 && i<12000 ? Float(sin(Double(i)*0.15)*0.2) : 0}
  precondition(PlaybackEngine.energy(buffer,playedSamples:-1)==0)
  precondition(PlaybackEngine.energy(buffer,playedSamples:6000)==0,"Future audio must not open the jaw.")
  let voiced=PlaybackEngine.energy(buffer,playedSamples:10000)
  precondition(voiced>0.5 && voiced<=1)
  precondition(PlaybackEngine.energy(buffer,playedSamples:13000)==0,"Silence must release the envelope.")
  precondition(PlaybackEngine.energy(buffer,playedSamples:Int64.max)==0)
  for i in 0..<24000 {buffer.floatChannelData![0][i] = i%2==0 ? .nan : .infinity}
  precondition(PlaybackEngine.energy(buffer,playedSamples:10000)==0)
  for i in 0..<24000 {buffer.floatChannelData![0][i]=1}
  precondition(PlaybackEngine.energy(buffer,playedSamples:10000)==1)
  let file=try PlaybackEngine.decodeMP3(Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1])))
  let values=stride(from:0,to:Int(file.frameLength),by:480).map{PlaybackEngine.energy(file,playedSamples:Int64($0))}
  precondition(values.allSatisfy{$0.isFinite && $0>=0 && $0<=1} && values.max()!>0.1)
  print("Native energy: trailing played-sample RMS, no future samples, silence, finite/clamped output and real MP3 PCM passed.")
 }
}
