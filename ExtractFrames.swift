import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let inputPath = args.count > 1 ? args[1] : "reference.mp4"
let outputPath = args.count > 2 ? args[2] : "frames"

let inputURL = URL(fileURLWithPath: inputPath)
let outputURL = URL(fileURLWithPath: outputPath, isDirectory: true)

try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

let asset = AVAsset(url: inputURL)
let semaphore = DispatchSemaphore(value: 0)
var loadedTracks: [AVAssetTrack] = []
var loadedDuration = CMTime.zero
var loadError: Error?

asset.loadValuesAsynchronously(forKeys: ["tracks", "duration"]) {
    var error: NSError?
    let tracksStatus = asset.statusOfValue(forKey: "tracks", error: &error)
    if tracksStatus == .loaded {
        loadedTracks = asset.tracks(withMediaType: .video)
        loadedDuration = asset.duration
    } else {
        loadError = error
    }
    semaphore.signal()
}

semaphore.wait()

if let loadError {
    throw loadError
}

guard let videoTrack = loadedTracks.first else {
    throw NSError(domain: "ExtractFrames", code: 1, userInfo: [NSLocalizedDescriptionKey: "No video track found"])
}

let fps = Double(videoTrack.nominalFrameRate > 0 ? videoTrack.nominalFrameRate : 30)
let durationSeconds = CMTimeGetSeconds(loadedDuration)
let frameCount = max(1, Int(ceil(durationSeconds * fps)))

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero

func writePNG(_ image: CGImage, to url: URL) throws {
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        throw NSError(domain: "ExtractFrames", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not create PNG destination"])
    }
    CGImageDestinationAddImage(destination, image, nil)
    if !CGImageDestinationFinalize(destination) {
        throw NSError(domain: "ExtractFrames", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not write PNG"])
    }
}

var saved = 0
for index in 0..<frameCount {
    let seconds = min(Double(index) / fps, max(0, durationSeconds - 0.0001))
    let time = CMTime(seconds: seconds, preferredTimescale: 600)
    do {
        let image = try generator.copyCGImage(at: time, actualTime: nil)
        let file = outputURL.appendingPathComponent(String(format: "frame_%05d.png", index + 1))
        try writePNG(image, to: file)
        saved += 1
        if saved % 25 == 0 {
            print("saved \(saved) frames")
        }
    } catch {
        print("skipped frame \(index + 1): \(error.localizedDescription)")
    }
}

let manifest = """
{
  "source": "\(inputURL.path)",
  "frames": \(saved),
  "duration": \(durationSeconds),
  "fps": \(fps),
  "width": \(Int(videoTrack.naturalSize.width)),
  "height": \(Int(videoTrack.naturalSize.height))
}
"""

try manifest.write(to: outputURL.appendingPathComponent("frames_manifest.json"), atomically: true, encoding: .utf8)
print(manifest)
