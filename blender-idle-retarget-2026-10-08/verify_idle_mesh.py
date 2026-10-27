"""Independent, efficient evaluated-mesh checks; run inside Blender, no persistent scene edits.
Optional runpy globals: REPORT_PATH, TARGET_RIG, TARGET_MESH, SOURCE_RIG, SAMPLE_FRAMES.
"""
import bpy
import json
from pathlib import Path
import numpy as np

rig_name = globals().get('TARGET_RIG', 'Augusta_Idle_Rig')
mesh_name = globals().get('TARGET_MESH', 'Augusta_Idle_Mesh')
source_name = globals().get('SOURCE_RIG', 'Idle_Source')
frames = list(globals().get('SAMPLE_FRAMES', [2, 51, 400, 800, 1200, 1500, 1567]))
report_path = Path(globals().get('REPORT_PATH', '<workspace>/blender-idle-retarget-2026-10-08/mesh-verification.json'))
scene = bpy.context.scene
rig, mesh, source = (bpy.data.objects.get(n) for n in (rig_name, mesh_name, source_name))
assert rig and rig.type == 'ARMATURE', 'Missing intended target rig'
assert mesh and mesh.type == 'MESH', 'Missing intended target mesh'
assert frames and len(frames) == len(set(frames)), 'Expected distinct sample frames'
old_frame, old_subframe = scene.frame_current, scene.frame_subframe


def vec(values):
    return [round(float(x), 7) for x in values]


def curves_for_object(obj):
    ad = obj.animation_data
    action = ad.action if ad else None
    if not action:
        return []
    if not getattr(action, 'is_action_layered', False):
        return list(getattr(action, 'fcurves', []))
    slot = getattr(ad, 'action_slot', None)
    assert slot is not None, 'Layered target action has no assigned slot'
    curves = []
    for layer in action.layers:
        for strip in layer.strips:
            bag = strip.channelbag(slot) if hasattr(strip, 'channelbag') else None
            if bag:
                curves.extend(bag.fcurves)
    return curves


def deformation_stats(delta):
    lengths = np.linalg.norm(delta, axis=1)
    return {'max': round(float(lengths.max()), 7), 'rms': round(float(np.sqrt(np.mean(lengths**2))), 7)}


# Vertex-group membership is read once from the original topology.
foot_indices = {}
for suffix in ('.L', '.R'):
    names = ['足首D' + suffix, '足先EX' + suffix]
    ids = {mesh.vertex_groups[n].index for n in names if n in mesh.vertex_groups}
    assert ids, 'Missing foot groups for ' + suffix
    selected = [v.index for v in mesh.data.vertices if sum(g.weight for g in v.groups if g.group in ids) >= 0.25]
    assert selected, 'No weighted foot vertices for ' + suffix
    foot_indices[suffix[1:]] = np.asarray(selected, dtype=np.int32)

constraint_details = []
for obj in (rig, mesh):
    for constraint in obj.constraints:
        constraint_details.append({'owner': obj.name, 'name': constraint.name, 'type': constraint.type,
                                   'target': getattr(getattr(constraint, 'target', None), 'name', None),
                                   'active': not constraint.mute and constraint.influence > 0})
for pb in rig.pose.bones:
    for constraint in pb.constraints:
        constraint_details.append({'owner': pb.name, 'name': constraint.name, 'type': constraint.type,
                                   'target': getattr(getattr(constraint, 'target', None), 'name', None),
                                   'active': not constraint.mute and constraint.influence > 0})
driver_details = []
for obj in (rig, mesh):
    ad = obj.animation_data
    if ad:
        for fc in ad.drivers:
            driver_details.append({'owner': obj.name, 'path': fc.data_path,
                                   'targets': [getattr(t.id, 'name', None) for v in fc.driver.variables for t in v.targets]})
source_names = {source_name, 'mixamorig:Reference'}
source_dependencies = [c for c in constraint_details if c['target'] in source_names and c['active']]
source_driver_dependencies = [d for d in driver_details if any(n in source_names for n in d['targets'])]
armature_bindings = [{'modifier': m.name, 'rig': m.object.name if m.object else None,
                      'viewport_enabled': bool(m.show_viewport), 'render_enabled': bool(m.show_render)}
                     for m in mesh.modifiers if m.type == 'ARMATURE']
assert any(b['rig'] == rig_name and b['viewport_enabled'] for b in armature_bindings), 'Target mesh not bound to target rig'
assert not source_dependencies and not source_driver_dependencies, 'Target still depends on live source'

ad = rig.animation_data
assert ad and ad.action, 'Target has no active baked action'
curves = curves_for_object(rig)
assert curves, 'Target active slot contains no animation curves'
key_counts = [len(fc.keyframe_points) for fc in curves]
root_name = '腰'
assert root_name in rig.pose.bones, 'Expected target hips bone'
reference_vertices = reference_root = None
reference_floor = None
samples = []
try:
    for frame in frames:
        scene.frame_set(int(frame))
        bpy.context.view_layer.update()
        depsgraph = bpy.context.evaluated_depsgraph_get()
        evaluated = mesh.evaluated_get(depsgraph)
        evaluated_mesh = evaluated.to_mesh(preserve_all_data_layers=False, depsgraph=depsgraph)
        try:
            count = len(evaluated_mesh.vertices)
            assert count == len(mesh.data.vertices), 'Modifier changes topology; foot group indices cannot be safely reused'
            local = np.empty(count * 3, dtype=np.float32)
            evaluated_mesh.vertices.foreach_get('co', local)
            local = local.reshape((-1, 3))
            matrix = np.asarray(evaluated.matrix_world, dtype=np.float64)
            world = local @ matrix[:3, :3].T + matrix[:3, 3]
        finally:
            evaluated.to_mesh_clear()
        finite = bool(np.isfinite(world).all())
        assert finite, 'Nonfinite evaluated mesh coordinates at frame ' + str(frame)
        root = np.asarray(rig.matrix_world @ rig.pose.bones[root_name].matrix.translation, dtype=np.float64)
        if reference_vertices is None:
            reference_vertices = world.copy()
            reference_root = root.copy()
            reference_floor = min(float(world[indices, 2].min()) for indices in foot_indices.values())
        delta = world - reference_vertices
        root_aligned_delta = delta - (root - reference_root)
        foot_report = {}
        for side, indices in foot_indices.items():
            positions = world[indices]
            z = positions[:, 2]
            # This is relative to frame-2 foot minimum, not a claimed scene ground plane.
            foot_report[side] = {
                'vertices': int(len(indices)),
                'min_z': round(float(z.min()), 7),
                'p01_z': round(float(np.percentile(z, 1)), 7),
                'p10_z': round(float(np.percentile(z, 10)), 7),
                'max_z': round(float(z.max()), 7),
                'min_z_change_from_reference_floor': round(float(z.min() - reference_floor), 7),
                'vertices_within_0_02_of_reference_floor': int(np.count_nonzero(np.abs(z - reference_floor) <= 0.02)),
                'centroid': vec(positions.mean(axis=0)),
                'deformation_vs_reference': deformation_stats(delta[indices]),
            }
        samples.append({'frame': int(frame), 'vertex_count': int(count), 'all_vertices_finite': finite,
                        'bbox_min': vec(world.min(axis=0)), 'bbox_max': vec(world.max(axis=0)),
                        'root_world': vec(root),
                        'deformation_vs_reference': deformation_stats(delta),
                        'deformation_after_removing_root_translation': deformation_stats(root_aligned_delta),
                        'feet': foot_report})
finally:
    scene.frame_set(old_frame, subframe=old_subframe)
    bpy.context.view_layer.update()

maximum_shape_motion = max(s['deformation_after_removing_root_translation']['max'] for s in samples[1:])
assert maximum_shape_motion > 1e-5, 'Evaluated mesh is effectively static after root translation is removed'
report = {
    'status': 'passed', 'target_rig': rig_name, 'target_mesh': mesh_name,
    'reference_frame': frames[0], 'sample_frames': frames,
    'frame_restored': scene.frame_current == old_frame and abs(scene.frame_subframe - old_subframe) < 1e-6,
    'action': ad.action.name, 'action_frame_range': list(ad.action.frame_range),
    'assigned_slot': getattr(getattr(ad, 'action_slot', None), 'identifier', None),
    'curve_count': len(curves), 'key_count': sum(key_counts),
    'keys_per_curve_min': min(key_counts), 'keys_per_curve_max': max(key_counts),
    'armature_bindings': armature_bindings,
    'target_constraints_count': len(constraint_details), 'target_driver_count': len(driver_details),
    'active_constraints_to_source': source_dependencies, 'drivers_to_source': source_driver_dependencies,
    'reference_floor_z': round(reference_floor, 7),
    'reference_floor_note': 'Frame-2 minimum across vertices weighted >=0.25 to either ankle/toe group; not an independently measured scene floor.',
    'max_shape_motion_after_removing_root_translation': maximum_shape_motion,
    'samples': samples,
    'notes': ['Finite sampled evaluated vertices and nonzero deformation verified independently of retarget solver.',
              'Foot heights are measurements, not proof of contact or absence of sliding.',
              'Full action includes source T reference pose at frame 1 and later turn; no seamless-loop claim.'],
}
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
print(json.dumps({'status': report['status'], 'report': str(report_path), 'sampled_frames': frames,
                  'vertices_per_frame': samples[0]['vertex_count'], 'curves': report['curve_count'],
                  'keys': report['key_count'], 'no_live_source_dependencies': True,
                  'max_shape_motion': maximum_shape_motion, 'frame_restored': report['frame_restored'],
                  'feet_min_z_range': [min(s['feet'][k]['min_z'] for s in samples for k in ('L', 'R')),
                                       max(s['feet'][k]['min_z'] for s in samples for k in ('L', 'R'))]},
                 ensure_ascii=False, allow_nan=False))
