import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

/** Convert the ring's actual world rotation into the animated bone's local space.
 * The determinant sign matters for reflected glTF roots (including Hailey).
 * The gizmo manipulates a unit-scale proxy, never the skinned joint itself.
 */
export function correctionAfterWorldDrag(startWorld: Matrix, startProxy: Quaternion, endProxy: Quaternion, startCorrection: Quaternion): Quaternion {
    const delta = endProxy.multiply(startProxy.conjugate()).normalize();
    if (delta.w < 0) delta.scaleInPlace(-1);
    const length = Math.hypot(delta.x, delta.y, delta.z);
    if (length < 1e-9 || Math.abs(startWorld.determinant()) < 1e-12) return startCorrection.clone();
    const axis = Vector3.TransformNormal(new Vector3(delta.x / length, delta.y / length, delta.z / length), Matrix.Invert(startWorld)).normalize();
    if (startWorld.determinant() < 0) axis.scaleInPlace(-1);
    return startCorrection.multiply(Quaternion.RotationAxis(axis, 2 * Math.atan2(length, delta.w))).normalize();
}

export const degreesFromQuaternion = (rotation: Quaternion): [number, number, number] => {
    const angles = rotation.toEulerAngles();
    return [angles.x, angles.y, angles.z].map(v => v * 180 / Math.PI) as [number, number, number];
};
