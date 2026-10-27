import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";

export const characterCameraAlpha = -Math.PI/2;
export const characterCameraBeta = Math.PI/2;

/** Crop one perspective across views. Moving the camera into the character
 * for close-ups changes the apparent proportions of the head and chest. */
export function frameCharacter(camera:ArcRotateCamera, height:number, mode:string,
    aspect:number, editorInset:number, viewportWidth:number, poseEditing:boolean, editorLeftInset=0): void {
    const inset = Math.min(editorInset/Math.max(1,viewportWidth),.55);
    const leftInset = Math.min(editorLeftInset/Math.max(1,viewportWidth),.3);
    const selectionAspect = Math.max(.1,aspect*(1-inset-leftInset));
    const span = mode === "face" ? Math.max(height*.32,height*.23/selectionAspect)
        : mode === "selection" && poseEditing ? Math.max(height*1.22,height*.72/selectionAspect)
        : mode === "selection" ? Math.max(height*.66,height*.50/selectionAspect)
        : mode === "player" ? Math.max(height*.36,height*.27/Math.max(.1,aspect))
        : mode === "portrait" ? Math.max(height*.52,height*.38/Math.max(.1,aspect))
        : Math.max(height*1.22,height*.72/Math.max(.1,aspect));
    const center = mode === "face" ? .875 : mode === "player" ? .82 : mode === "portrait" ? .79
        : mode === "selection" && !poseEditing ? .72 : .5;
    camera.target.set(0,height*.72,0);
    camera.radius = height*.8;
    camera.fov = 2*Math.atan(span/(2*camera.radius));
    camera.targetScreenOffset.set(0,0);
    camera.unfreezeProjectionMatrix();
    const projection = camera.getProjectionMatrix(true).clone();
    const viewCenter = Vector3.TransformCoordinates(new Vector3(0,height*center,0),camera.getViewMatrix(true));
    const projectedCenter = Vector3.TransformCoordinates(viewCenter,projection);
    // Lens shift is a true image crop. A view-space target offset would move
    // near and far surfaces differently and reintroduce perspective changes.
    projection.addAtIndex(8,(mode === "face" ? leftInset-inset : mode === "selection" ? -inset : 0)-projectedCenter.x);
    projection.addAtIndex(9,-projectedCenter.y);
    camera.freezeProjectionMatrix(projection);
}
