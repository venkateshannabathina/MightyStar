import Cocoa

@main struct CheckGazePointer {
    static func main() {
        // Pure state and coordinate tests: no window, mouse movement or app state.
        var gaze = CompanionGazePointer()
        precondition(gaze.sample(.zero,valid:false,at:0) == nil)
        let first = gaze.sample(NSPoint(x:0.75,y:0.25),valid:true,at:0)!
        precondition(first.valid && first.point == NSPoint(x:0.5,y:0.5))
        precondition(gaze.sample(.zero,valid:true,at:0.03) == nil)
        let edge = gaze.sample(NSPoint(x:1,y:1),valid:true,at:0.07)!
        precondition(edge.valid && edge.point == NSPoint(x:1,y:-1))
        let stopped = gaze.sample(.zero,valid:false,at:0.071)!
        precondition(!stopped.valid && stopped.point == .zero)
        precondition(gaze.sample(.zero,valid:false,at:0.08) == nil)
        precondition(gaze.sample(.zero,valid:true,at:0.081)!.valid)
        precondition(!gaze.sample(NSPoint(x:CGFloat.nan,y:0.5),valid:true,at:0.082)!.valid)
        precondition(gaze.sample(NSPoint(x:CGFloat.infinity,y:0.5),valid:true,at:1) == nil)
        precondition(gaze.sample(NSPoint(x:-0.1,y:0.5),valid:true,at:1) == nil)
        precondition(gaze.sample(NSPoint(x:0.5,y:0.5),valid:true,at:1)!.point == .zero)
        print("PASS: native gaze coordinates, 15 Hz throttling, immediate reset, resumption and invalid input rejection")
    }
}
