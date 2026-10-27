import Cocoa

@main struct CheckHover {
    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        precondition(NSEvent.pressedMouseButtons == 0, "Run the hover check while no mouse button is held")
        // Center a temporary invisible panel on the existing pointer. The test
        // never moves the cursor or touches the app's saved state.
        let pointer = NSEvent.mouseLocation
        let panel = CompanionPanel(contentRect:NSRect(x:pointer.x-180,y:pointer.y-325,width:360,height:650),styleMask:.borderless,backing:.buffered,defer:false)
        panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false
        panel.ignoresMouseEvents = true
        defer { panel.stopPointerTracking(); panel.orderOut(nil) }
        let full = CompanionHitMap(width:1,height:1,base64:Data([UInt8(1)]).base64EncodedString())!
        var entries: [Bool] = []
        panel.onCharacterHover = { entries.append($0) }
        panel.hitMap = full
        panel.orderFront(nil)
        panel.refreshPointer(); panel.refreshPointer()
        precondition(entries == [true], "a stable silhouette hover sends one entry edge")
        panel.controlRegions = [NSRect(x:0,y:0,width:1,height:1)]
        panel.refreshPointer()
        precondition(entries == [true,false], "menu and resize controls suppress character hover")
        panel.controlRegions = []
        panel.refreshPointer()
        precondition(entries == [true,false,true], "leaving controls re-enters the silhouette")
        panel.hitMap = nil; panel.refreshPointer()
        precondition(entries.last == false, "loading or resizing without a mask clears hover")
        panel.hitMap = full; panel.refreshPointer()
        precondition(entries.last == true)
        panel.orderOut(nil); panel.refreshPointer(); panel.refreshPointer()
        precondition(entries == [true,false,true,false,true,false], "hidden views clear hover once")
        panel.orderFront(nil); panel.refreshPointer()
        precondition(entries.last == true)
        panel.stopPointerTracking()
        precondition(entries.last == false, "stopping pointer tracking clears the hover state")
        print("Native hover: silhouette entry deduplication, control suppression, missing-mask reset, hidden-view reset and tracking shutdown passed")
    }
}
