"""Apply a chest-relative 16 degree arm clearance correction inside Blender."""
import bpy
import json
import math
from pathlib import Path
from mathutils import Quaternion, Vector, Matrix

work = Path('<workspace>/blender-idle-retarget-2026-10-08')
rig = bpy.data.objects['Augusta_Idle_Rig']
scene = bpy.context.scene
base = bpy.data.actions['Augusta • Idle (retargeted)']
result = bpy.data.actions['Augusta • Idle (hands clear)']
old_frame = scene.frame_current
names = ['腕.L', '腕.R']
samples = {2, 51, 400, 800, 1200, 1500, 1567}
quaternions = {name: [] for name in names}
expected = {}

def assign(action):
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]

def curves(action):
    return {(c.data_path, c.array_index): c for layer in action.layers
            for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves}

def angle(a, b):
    return math.degrees(2 * math.acos(min(1.0, abs(a.normalized().dot(b.normalized())))))

assign(base)
try:
    for frame in range(1, 1568):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        chest = rig.pose.bones['上半身2']
        axis = (chest.matrix.to_quaternion() @ chest.bone.matrix_local.to_quaternion().inverted()) @ Vector((0, -1, 0))
        if frame in samples:
            expected[frame] = {}
        for name, sign in zip(names, (1, -1)):
            pb = rig.pose.bones[name]
            delta = Quaternion(axis, math.radians(16 * sign if frame > 1 else 0))
            rotation = delta @ pb.matrix.to_quaternion()
            desired = Matrix.LocRotScale(pb.matrix.translation, rotation, Vector((1, 1, 1)))
            local = pb.bone.convert_local_to_pose(desired, pb.bone.matrix_local, invert=True,
                parent_matrix=pb.parent.matrix, parent_matrix_local=pb.parent.bone.matrix_local)
            q = local.to_quaternion().normalized()
            if quaternions[name] and q.dot(quaternions[name][-1]) < 0:
                q.negate()
            quaternions[name].append(q)
            if frame in samples:
                wrist = rig.pose.bones['手首.' + name[-1]].head
                expected[frame][name] = {'head': pb.head.copy(), 'rotation': rotation,
                    'wrist': pb.head + delta @ (wrist - pb.head), 'original_wrist': wrist.copy()}
    original_curves, result_curves = curves(base), curves(result)
    changed_paths = {'pose.bones["' + n + '"].rotation_quaternion' for n in names}
    untouched = 0
    for key, fc in result_curves.items():
        if key[0] in changed_paths:
            name = next(n for n in names if n in key[0])
            assert len(fc.keyframe_points) == 1567
            for point in fc.keyframe_points:
                frame = round(point.co.x)
                point.co.y = quaternions[name][frame - 1][key[1]]
            fc.update()
        else:
            assert [tuple(k.co) for k in fc.keyframe_points] == [tuple(k.co) for k in original_curves[key].keyframe_points]
            untouched += 1
    assign(result)
    max_rotation_error = max_shoulder_error = max_wrist_error = 0.0
    report_samples = []
    for frame, bones in expected.items():
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        row = {'frame': frame, 'hands': {}}
        for name, data in bones.items():
            pb = rig.pose.bones[name]
            wrist = rig.pose.bones['手首.' + name[-1]].head
            max_rotation_error = max(max_rotation_error, angle(pb.matrix.to_quaternion(), data['rotation']))
            max_shoulder_error = max(max_shoulder_error, (pb.head - data['head']).length)
            max_wrist_error = max(max_wrist_error, (wrist - data['wrist']).length)
            row['hands'][name[-1]] = {'original_wrist': list(data['original_wrist']), 'new_wrist': list(wrist)}
        report_samples.append(row)
    assert max_rotation_error < 0.15 and max_shoulder_error < 1e-5 and max_wrist_error < 1e-5
    report = {'status': 'passed', 'action': result.name, 'outward_degrees_each_arm': 16,
        'baked_frames': [1, 1567], 'reference_frame_1_preserved': True,
        'unchanged_channels': untouched, 'modified_channels': 8,
        'max_rotation_error_degrees': max_rotation_error,
        'max_shoulder_position_error': max_shoulder_error, 'max_wrist_position_error': max_wrist_error,
        'samples': report_samples}
    (work / 'arm-spacing-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    rig['arm_spacing_correction_degrees'] = 16.0
    print(json.dumps({k: v for k, v in report.items() if k != 'samples'}, ensure_ascii=False))
finally:
    assign(result)
    scene.frame_set(old_frame)
    bpy.context.view_layer.update()
