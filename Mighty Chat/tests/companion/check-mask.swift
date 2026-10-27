import Cocoa

@main struct CheckMask {
    static func main() {
        // Five pixels per row crosses byte boundaries, with a hollow center.
        let values: [UInt8] = [0b00011111, 0b01000110, 0b00000000]
        let mask = CompanionHitMap(width:5,height:4,base64:Data(values).base64EncodedString())!
        precondition(mask.contains(NSPoint(x:0.1,y:0.1)))
        precondition(mask.contains(NSPoint(x:0.9,y:0.1)))
        precondition(!mask.contains(NSPoint(x:0.5,y:0.4)),"transparent gaps must pass through")
        precondition(mask.contains(NSPoint(x:0.9,y:0.4)),"row stride must cross byte boundaries")
        precondition(!mask.contains(NSPoint(x:0.5,y:0.9)),"empty lower area must pass through")
        for point in [NSPoint(x:-0.001,y:0.1),NSPoint(x:1,y:0.1),NSPoint(x:0.2,y:1),NSPoint(x:Double.nan,y:0)] { precondition(!mask.contains(point)) }
        precondition(CompanionHitMap(width:0,height:4,base64:"")==nil)
        precondition(CompanionHitMap(width:513,height:4,base64:"")==nil)
        precondition(CompanionHitMap(width:5,height:4,base64:"!!!")==nil)
        precondition(CompanionHitMap(width:5,height:4,base64:Data([0]).base64EncodedString())==nil)
        let panel = CompanionPanel(contentRect:NSRect(x:0,y:0,width:360,height:650),styleMask:.borderless,backing:.buffered,defer:false)
        let top=panel.normalizedPoint(NSPoint(x:180,y:650))
        precondition(top.x==0.5 && top.y==0,"AppKit bottom-left must map to canvas top-left")
        panel.controlRegions=[NSRect(x:0.2,y:0.1,width:0.4,height:0.2)]
        precondition(panel.overControl(NSPoint(x:0.3,y:0.2)))
        precondition(!panel.overControl(NSPoint(x:0.1,y:0.2)))
        panel.hitMap = mask
        precondition(!panel.shouldDismissControls(at:NSPoint(x:0.1,y:0.1)),"character presses keep resize controls available")
        precondition(!panel.shouldDismissControls(at:NSPoint(x:0.3,y:0.2)),"menu and resize handles do not count as outside")
        precondition(panel.shouldDismissControls(at:NSPoint(x:0.5,y:0.9)),"transparent area dismisses all controls")
        precondition(panel.shouldDismissControls(at:NSPoint(x:1.5,y:0.5)),"clicks in other windows dismiss all controls")
        let original = NSRect(x:300,y:200,width:360,height:650)
        for corner in [CompanionResize.Corner.topLeft,.topRight,.bottomLeft,.bottomRight] {
            let left = corner == .topLeft || corner == .bottomLeft
            let top = corner == .topLeft || corner == .topRight
            let resize = CompanionResize(initialFrame:original,initialPointer:.zero,corner:corner)
            let enlarged = resize.frame(at:NSPoint(x:left ? -23.04 : 23.04,y:top ? -54.6 : 54.6))
            precondition(abs(enlarged.width-396)<0.001 && abs(enlarged.height-715)<0.001,"every corner grows proportionally")
            let ax:CGFloat=left ? 0.82 : 0.18,ay:CGFloat=top ? 0.04 : 0.88
            precondition(abs(original.minX+ax*original.width-enlarged.minX-ax*enlarged.width)<0.001,"opposite horizontal bracket stays fixed")
            precondition(abs(original.minY+ay*original.height-enlarged.minY-ay*enlarged.height)<0.001,"opposite vertical bracket stays fixed")
            let reduced=resize.frame(at:NSPoint(x:left ? 23.04 : -23.04,y:top ? 54.6 : -54.6))
            precondition(abs(reduced.width-324)<0.001 && abs(reduced.height-585)<0.001,"every corner shrinks proportionally")
            let minimum=resize.frame(at:NSPoint(x:left ? 1e6 : -1e6,y:top ? 1e6 : -1e6))
            precondition(minimum.width>=280 && minimum.height>=360)
            precondition(abs(minimum.width/minimum.height-original.width/original.height)<0.001)
        }
        print("Silhouette boundaries, gaps, bit packing, invalid masks, coordinate conversion, menu regions and four anchored proportional resize corners passed")
    }
}
