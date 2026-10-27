import Foundation
@preconcurrency import AVFoundation

@_silgen_name("MightyAudioRingCreate") private func ringCreate(_ capacity: UInt32) -> UnsafeMutableRawPointer?
@_silgen_name("MightyAudioRingDestroy") private func ringDestroy(_ ring: UnsafeMutableRawPointer?)
@_silgen_name("MightyAudioRingPush") private func ringPush(_ ring: UnsafeMutableRawPointer?, _ source: UnsafePointer<Float>?, _ count: UInt32) -> UInt32
@_silgen_name("MightyAudioRingPop") private func ringPop(_ ring: UnsafeMutableRawPointer?, _ destination: UnsafeMutablePointer<Float>?, _ maximum: UInt32) -> UInt32
@_silgen_name("MightyAudioRingOverruns") private func ringOverruns(_ ring: UnsafeMutableRawPointer?) -> UInt64

/// AVCaptureDevice owns input; AVAudioEngine owns output. A silent default Bluetooth
/// microphone can be replaced with the built-in microphone without changing macOS settings.
final class AudioHost: NSObject, AVCaptureAudioDataOutputSampleBufferDelegate, @unchecked Sendable {
    enum AudioError: LocalizedError {
        case microphoneDenied, ringUnavailable, inputUnavailable, outputUnavailable
        var errorDescription: String? {
            switch self {
            case .microphoneDenied: return "Microphone access is off. Enable it for Mighty Chat in macOS Privacy & Security."
            case .ringUnavailable: return "The microphone capture buffer could not start."
            case .inputUnavailable: return "No available microphone is sending audio. Check the macOS input device and try again."
            case .outputUnavailable: return "The audio output could not start. Check the macOS output device and try again."
            }
        }
    }

    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let playerLock = NSLock()
    let playbackFormat = AVAudioFormat(standardFormatWithSampleRate: 24_000, channels: 1)!
    private let captureQueue = DispatchQueue(label: "MightyChat.Microphone", qos: .userInitiated)
    private let analysisQueue = DispatchQueue(label: "MightyChat.AudioAnalysis", qos: .userInitiated)
    private var captureSession: AVCaptureSession?
    private var captureOutput: AVCaptureAudioDataOutput?
    private var timer: DispatchSourceTimer?
    private var captureRing: UnsafeMutableRawPointer?
    private let captureLock = NSLock()
    private var capturedSampleCount = 0
    private var captureSampleRate: Double = 0
    private var capturePeak: Float = 0
    private var lastOverruns: UInt64 = 0
    private var routeObserver: NSObjectProtocol?
    private var outputStarted = false
    private(set) var inputDeviceName = ""
    let voiceProcessingEnabled = false
    var onCapture: (([Float], Double) -> Void)?
    var onOverrun: ((UInt64) -> Void)?
    var onRouteChange: (() -> Void)?
    var onOutputFailure: ((Error) -> Void)?

    var sampleRate: Double {
        captureLock.lock(); defer { captureLock.unlock() }
        return captureSampleRate
    }
    var captureOverruns: UInt64 { ringOverruns(captureRing) }

    init(ringCapacity: UInt32 = 192_000) throws {
        super.init()
        guard let ring = ringCreate(ringCapacity) else { throw AudioError.ringUnavailable }
        captureRing = ring
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: playbackFormat)
        routeObserver = NotificationCenter.default.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main) { [weak self] _ in
            guard let self, self.outputStarted else { return }
            self.onRouteChange?()
            self.stopOutput()
            do { try self.engine.start() }
            catch { self.onOutputFailure?(AudioError.outputUnavailable) }
        }
    }
    deinit {
        if let observer = routeObserver { NotificationCenter.default.removeObserver(observer) }
        stop(); ringDestroy(captureRing)
    }

    static func availableInputs() -> [AVCaptureDevice] {
        let types: [AVCaptureDevice.DeviceType]
        if #available(macOS 14, *) { types = [.microphone, .external] }
        else { types = [.builtInMicrophone, .externalUnknown] }
        return AVCaptureDevice.DiscoverySession(deviceTypes:types,mediaType:.audio,position:.unspecified).devices
    }

    func start() async throws {
        let allowed = await withCheckedContinuation { continuation in
            AVCaptureDevice.requestAccess(for: .audio) { continuation.resume(returning: $0) }
        }
        guard allowed else { throw AudioError.microphoneDenied }
        guard !Task.isCancelled else { throw CancellationError() }
        do { try engine.start() } catch { throw AudioError.outputUnavailable }
        outputStarted = true
        let devices = Self.availableInputs()
        guard !devices.isEmpty else { stop(); throw AudioError.inputUnavailable }
        let selectedID = UserDefaults.standard.string(forKey:"mightyMicrophone") ?? "default"
        let selected = devices.first { $0.uniqueID == selectedID }
        if selectedID != "default" && selected == nil { stop(); throw AudioError.inputUnavailable }
        let preferred = selected ?? AVCaptureDevice.default(for:.audio) ?? devices[0]
        let builtIn = devices.first { $0.uniqueID == "BuiltInMicrophoneDevice" }
        let candidates = (selected == nil ? [preferred,builtIn].compactMap{$0} : [preferred]).reduce(into:[AVCaptureDevice]()) { result,device in
            if !result.contains(where:{$0.uniqueID == device.uniqueID}) { result.append(device) }
        }
        let source = DispatchSource.makeTimerSource(queue: analysisQueue)
        source.schedule(deadline: .now() + .milliseconds(20), repeating: .milliseconds(20))
        source.setEventHandler { [weak self] in self?.drainCapture() }
        source.resume(); timer = source
        for device in candidates {
            guard !Task.isCancelled else { stop(); throw CancellationError() }
            resetCaptureHealth()
            do { try await startCapture(device) } catch { continue }
            guard !Task.isCancelled else { stop(); throw CancellationError() }
            do { try await Task.sleep(nanoseconds: 900_000_000) }
            catch { stop(); throw error }
            if hasLiveInput(allowQuiet: device.uniqueID == candidates.last?.uniqueID) {
                inputDeviceName = device.localizedName
                return
            }
            stopCapture()
        }
        stop()
        throw AudioError.inputUnavailable
    }

    private func startCapture(_ device: AVCaptureDevice) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            captureQueue.async { [self] in
                do {
                    let session = AVCaptureSession()
                    let input = try AVCaptureDeviceInput(device: device)
                    let output = AVCaptureAudioDataOutput()
                    output.setSampleBufferDelegate(self, queue: captureQueue)
                    session.beginConfiguration()
                    guard session.canAddInput(input), session.canAddOutput(output) else { throw AudioError.inputUnavailable }
                    session.addInput(input); session.addOutput(output)
                    session.commitConfiguration()
                    session.startRunning()
                    guard session.isRunning else { throw AudioError.inputUnavailable }
                    captureSession = session; captureOutput = output
                    continuation.resume()
                } catch { continuation.resume(throwing: error) }
            }
        }
    }
    private func stopCapture() {
        captureQueue.sync {
            captureOutput?.setSampleBufferDelegate(nil, queue: nil)
            captureSession?.stopRunning()
            captureOutput = nil; captureSession = nil
        }
    }
    func captureOutput(_ output: AVCaptureOutput, didOutput buffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let description = CMSampleBufferGetFormatDescription(buffer),
              let format = CMAudioFormatDescriptionGetStreamBasicDescription(description)?.pointee,
              format.mFormatID == kAudioFormatLinearPCM, format.mChannelsPerFrame == 1,
              let block = CMSampleBufferGetDataBuffer(buffer) else { return }
        let count = CMSampleBufferGetNumSamples(buffer)
        guard count > 0, count <= 8192 else { return }
        var samples = [Float](repeating: 0, count: count)
        let copied: OSStatus
        if format.mBitsPerChannel == 32 && format.mFormatFlags & kAudioFormatFlagIsFloat != 0 {
            copied = samples.withUnsafeMutableBytes { bytes in
                CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: count * 4, destination: bytes.baseAddress!)
            }
        } else if format.mBitsPerChannel == 16 && format.mFormatFlags & kAudioFormatFlagIsSignedInteger != 0 {
            var words = [Int16](repeating: 0, count: count)
            copied = words.withUnsafeMutableBytes { bytes in
                CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: count * 2, destination: bytes.baseAddress!)
            }
            if copied == noErr { for index in words.indices { samples[index] = Float(words[index]) / 32768 } }
        } else { return }
        guard copied == noErr else { return }
        let peak = samples.reduce(Float(0)) { max($0, abs($1)) }
        let ring = captureRing
        let written = samples.withUnsafeBufferPointer { ringPush(ring, $0.baseAddress, UInt32($0.count)) }
        if written > 0 {
            captureLock.lock()
            capturedSampleCount += Int(written)
            captureSampleRate = format.mSampleRate
            capturePeak = max(capturePeak, peak)
            captureLock.unlock()
        }
    }
    private func resetCaptureHealth() {
        captureLock.lock(); defer { captureLock.unlock() }
        capturedSampleCount = 0; capturePeak = 0
    }
    private func hasLiveInput(allowQuiet: Bool = false) -> Bool {
        captureLock.lock(); defer { captureLock.unlock() }
        return capturedSampleCount > 0 && (allowQuiet || capturePeak > 0.001)
    }
    private func drainCapture() {
        guard let ring = captureRing else { return }
        var samples = [Float](repeating: 0, count: 4096)
        let count = samples.withUnsafeMutableBufferPointer { ringPop(ring, $0.baseAddress, UInt32($0.count)) }
        if count > 0 {
            samples.removeLast(samples.count - Int(count))
            onCapture?(samples, sampleRate)
        }
        let overruns = ringOverruns(ring)
        if overruns != lastOverruns { lastOverruns = overruns; onOverrun?(overruns) }
    }

    private var outputVolume: Float = 1
    private var outputMuted = false
    func setOutputMuted(_ muted: Bool) {
        playerLock.lock(); defer { playerLock.unlock() }
        outputMuted = muted; player.volume = muted ? 0 : outputVolume
    }
    func setOutputVolume(_ volume: Double) {
        guard volume.isFinite else { return }
        playerLock.lock(); defer { playerLock.unlock() }
        outputVolume = Float(min(1,max(0,volume)))
        player.volume = outputMuted ? 0 : outputVolume
    }
    func stopOutput() { playerLock.lock(); defer { playerLock.unlock() }; player.stop() }
    func schedulePCM(_ buffer: AVAudioPCMBuffer, onPlayed: @escaping () -> Void) throws {
        guard engine.isRunning, buffer.format.sampleRate == playbackFormat.sampleRate,
              buffer.format.channelCount == playbackFormat.channelCount else { throw AudioError.outputUnavailable }
        playerLock.lock(); defer { playerLock.unlock() }
        player.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { _ in onPlayed() }
        if !player.isPlaying { player.play() }
    }
    var playedSamples: Int64? {
        playerLock.lock(); defer { playerLock.unlock() }
        guard let nodeTime = player.lastRenderTime,
              let playbackTime = player.playerTime(forNodeTime: nodeTime) else { return nil }
        return playbackTime.sampleTime
    }
    func stop() {
        outputStarted = false
        timer?.cancel(); timer = nil
        stopCapture()
        stopOutput()
        if engine.isRunning { engine.stop() }
    }
    func playFixtureTone() {
        guard engine.isRunning else { return }
        let frames = AVAudioFrameCount(playbackFormat.sampleRate * 0.2)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: playbackFormat, frameCapacity: frames),
              let data = buffer.floatChannelData?.pointee else { return }
        buffer.frameLength = frames
        for frame in 0..<Int(frames) { data[frame] = Float(sin(2 * Double.pi * 220 * Double(frame) / playbackFormat.sampleRate) * 0.05) }
        try? schedulePCM(buffer, onPlayed: {})
    }
    #if MIGHTY_VOICE_TESTING
    /// Output-only fixture: exercises the real player without accessing the microphone.
    func startOutputFixture() throws { try engine.start(); outputStarted = true }
    #endif
}
