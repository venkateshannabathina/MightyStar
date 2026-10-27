"""Export the supplied Mixamo FBX animation as a compact, retargetable clip.

Run with Blender in background mode. Export absolute pose deltas and rest
directions so the runtime can compensate for each target's bind pose.
"""

import bpy
import hashlib
import json
from pathlib import Path
import sys


INPUT = sys.argv[sys.argv.index("--") + 1]
OUTPUT = sys.argv[sys.argv.index("--") + 2]
TARGET_FPS = 30

# Humanoid joints plus the standard finger chains. Missing target bones are skipped.
BONES = [
    "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
    "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
    "RightShoulder", "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
    "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
]

for side in ("Left", "Right"):
    for finger in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
        BONES.extend(f"{side}Hand{finger}{joint}" for joint in (1, 2, 3))

CHILDREN = {"Spine": "Spine1", "Spine1": "Spine2", "Spine2": "Neck", "Neck": "Head"}
for side in ("Left", "Right"):
    for parent, child in (("Shoulder", "Arm"), ("Arm", "ForeArm"), ("ForeArm", "Hand"),
                          ("Hand", "HandMiddle1"), ("UpLeg", "Leg"), ("Leg", "Foot"), ("Foot", "ToeBase")):
        CHILDREN[side + parent] = side + child
    for finger in ("Thumb", "Index", "Middle", "Ring", "Pinky"):
        for joint in (1, 2):
            CHILDREN[f"{side}Hand{finger}{joint}"] = f"{side}Hand{finger}{joint + 1}"


def convert_vector(vector):
    return [round(vector.x, 7), round(vector.y, 7), round(-vector.z, 7)]


def convert_to_babylon(quaternion):
    """Reflect the imported armature's Y-up coordinates across Z for MMD."""
    return [-quaternion.x, -quaternion.y, quaternion.z, quaternion.w]


bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=INPUT, use_anim=True)

armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
if not armatures:
    raise RuntimeError("No armature was found in the FBX file")
armature = armatures[0]
action = armature.animation_data.action if armature.animation_data else None
if not action:
    raise RuntimeError("No animation action was found in the FBX file")

source_fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
start_frame, end_frame = action.frame_range
sample_count = max(1, round((end_frame - start_frame) * TARGET_FPS / source_fps) + 1)

source_bones = {
    bone: next(
        (candidate for candidate in (bone, f"mixamorig:{bone}") if armature.pose.bones.get(candidate)),
        None,
    )
    for bone in BONES
}
tracks = {bone: [] for bone, source_bone in source_bones.items() if source_bone}
rest_directions = {}
for name, source_name in source_bones.items():
    if not source_name:
        continue
    bone = armature.data.bones[source_name]
    child = source_bones.get(CHILDREN.get(name))
    direction = armature.data.bones[child].head_local - bone.head_local if child else bone.tail_local - bone.head_local
    rest_directions[name] = convert_vector(direction.normalized())
positions = {name: [] for name in tracks}
for sample in range(sample_count):
    source_frame = start_frame + sample * source_fps / TARGET_FPS
    whole_frame = int(source_frame)
    bpy.context.scene.frame_set(whole_frame, subframe=source_frame - whole_frame)
    bpy.context.view_layer.update()

    for bone_name in tracks:
        source_bone = source_bones[bone_name]
        pose_bone = armature.pose.bones[source_bone]
        rest_world = armature.data.bones[source_bone].matrix_local.to_quaternion()
        delta_world = pose_bone.matrix.to_quaternion() @ rest_world.inverted()
        tracks[bone_name].append([round(value, 7) for value in convert_to_babylon(delta_world)])
        positions[bone_name].append(convert_vector(pose_bone.head))

payload = {
    "name": "Mixamo Idle",
    "source": Path(INPUT).name,
    "sourceSha256": hashlib.sha256(Path(INPUT).read_bytes()).hexdigest(),
    "fps": TARGET_FPS,
    "frameCount": sample_count,
    "tracks": tracks,
    "space": "absolute-rest-delta",
    "restDirections": rest_directions,
    "positions": positions,
}
with open(OUTPUT, "w", encoding="utf-8") as output_file:
    json.dump(payload, output_file, separators=(",", ":"))

print(f"Exported {sample_count} frames at {TARGET_FPS} fps to {OUTPUT}")
