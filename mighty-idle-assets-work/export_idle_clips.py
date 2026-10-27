"""Export all supplied idles without touching an interactive Blender scene.

Run with background Blender. Coordinates match the existing Babylon/MMD
absolute-rest-delta clip contract; metadata also supports palm/root calibration.
"""
import bpy
import hashlib
import json
from pathlib import Path

WORK = Path('<workspace>')
SOURCE = Path('<home>/Downloads/idle')
OUTPUT = WORK / 'model-viewer-clean/res/animations'
FPS = 30
BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
         'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
         'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
         'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
         'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']
for side in ('Left', 'Right'):
    for finger in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        BONES.extend(f'{side}Hand{finger}{joint}' for joint in (1, 2, 3))
CHILDREN = {'Hips': 'Spine', 'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Neck', 'Neck': 'Head'}
for side in ('Left', 'Right'):
    for a, b in (('Shoulder', 'Arm'), ('Arm', 'ForeArm'), ('ForeArm', 'Hand'),
                 ('Hand', 'HandMiddle1'), ('UpLeg', 'Leg'), ('Leg', 'Foot'), ('Foot', 'ToeBase')):
        CHILDREN[side + a] = side + b
    for finger in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        for joint in (1, 2):
            CHILDREN[f'{side}Hand{finger}{joint}'] = f'{side}Hand{finger}{joint + 1}'

def vector(v):
    return [round(v.x, 7), round(v.y, 7), round(-v.z, 7)]

def quaternion(q):
    q.normalize()
    return [round(-q.x, 7), round(-q.y, 7), round(q.z, 7), round(q.w, 7)]

reports = []
for source_file, destination, label in (
    ('Idle-2.fbx', 'idle-mixamo.json', 'Idle 2'),
    ('Dwarf Idle.fbx', 'dwarf-idle.json', 'Dwarf Idle'),
    ('Dwarf Idle-2.fbx', 'dwarf-idle-2.json', 'Dwarf Idle 2'),
    ('Dwarf Idle-3.fbx', 'dwarf-idle-3.json', 'Dwarf Idle 3'),
):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.fbx(filepath=str(SOURCE / source_file), use_anim=True)
    rigs = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    assert len(rigs) == 1, (source_file, [o.name for o in rigs])
    rig = rigs[0]
    action = rig.animation_data.action
    assert action is not None
    source_fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base
    start, end = action.frame_range
    count = round((end - start) * FPS / source_fps) + 1
    names = {name: next((n for n in (name, 'mixamorig:' + name) if rig.data.bones.get(n)), None) for name in BONES}
    names = {name: actual for name, actual in names.items() if actual}
    semantic = {actual: name for name, actual in names.items()}
    rest_directions, rest_positions, rest_rotations, parents = {}, {}, {}, {}
    for name, actual in names.items():
        bone = rig.data.bones[actual]
        child = names.get(CHILDREN.get(name))
        direction = rig.data.bones[child].head_local - bone.head_local if child else bone.tail_local - bone.head_local
        rest_directions[name] = vector(direction.normalized())
        rest_positions[name] = vector(bone.head_local)
        rest_rotations[name] = quaternion(bone.matrix_local.to_quaternion())
        parent = bone.parent
        while parent and parent.name not in semantic:
            parent = parent.parent
        parents[name] = semantic.get(parent.name) if parent else None
    tracks = {n: [] for n in names}
    positions = {n: [] for n in names}
    prior = {}
    for sample in range(count):
        frame = start + sample * source_fps / FPS
        whole = int(frame)
        bpy.context.scene.frame_set(whole, subframe=frame - whole)
        bpy.context.view_layer.update()
        for name, actual in names.items():
            pose = rig.pose.bones[actual]
            rest = rig.data.bones[actual].matrix_local.to_quaternion()
            delta = (pose.matrix.to_quaternion() @ rest.inverted()).normalized()
            # Sign continuity prevents noisy compression/interpolation; q and -q
            # encode the same rotation.
            if name in prior and delta.dot(prior[name]) < 0:
                delta.negate()
            prior[name] = delta.copy()
            tracks[name].append(quaternion(delta))
            positions[name].append(vector(pose.head))
    payload = dict(name=label, source=source_file,
                   sourceSha256=hashlib.sha256((SOURCE / source_file).read_bytes()).hexdigest(),
                   fps=FPS, sourceFps=source_fps, frameCount=count,
                   tracks=tracks, space='absolute-rest-delta', handedness='left',
                   restDirections=rest_directions, positions=positions,
                   restPositions=rest_positions, restWorldRotations=rest_rotations,
                   parents=parents, sourceFrameRange=[start, end])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / destination).write_text(json.dumps(payload, separators=(',', ':')))
    report = dict(source=source_file, file=destination, frames=count, fps=FPS, sourceFps=source_fps, bones=len(tracks), bytes=(OUTPUT / destination).stat().st_size)
    reports.append(report)
    print('IDLE_CLIP_EXPORTED', json.dumps(report))
(WORK / 'mighty-idle-assets-work/clip-export-report.json').write_text(json.dumps(reports, indent=2))
