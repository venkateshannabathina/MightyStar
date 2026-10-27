"""Keep the native hand shape and blend in 35% of transferred finger rotation."""
import bpy, json, math
import numpy as np
from pathlib import Path
from mathutils import Quaternion

work = Path('<workspace>/blender-idle-retarget-2026-10-08')
rig = bpy.data.objects['Augusta_Idle_Rig']
mesh = bpy.data.objects['Augusta_Idle_Mesh']
scene = bpy.context.scene
base = bpy.data.actions['Augusta • Idle (hands clear)']
result = bpy.data.actions['Augusta • Idle (relaxed hands)']
names = [p.name for p in rig.pose.bones if p.name.startswith(('親指','人指','中指','薬指','小指')) and p.name.endswith(('.L','.R')) and '先' not in p.name]
def curves(action):
    return {(c.data_path,c.array_index): c for layer in action.layers for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves}
bc, rc = curves(base), curves(result)
changed = set()
peak = (0,0)
for name in names:
    path = 'pose.bones["'+name+'"].rotation_quaternion'
    previous = None
    for i in range(1567):
        q = Quaternion([bc[(path,j)].keyframe_points[i].co.y for j in range(4)]).normalized()
        if q.w < 0: q.negate()
        a = math.degrees(2*math.acos(min(1,abs(q.w))))
        if i > 0 and a > peak[0]: peak = (a,i+1)
        relaxed = q if i == 0 else Quaternion().slerp(q,0.35).normalized()
        if previous and relaxed.dot(previous) < 0: relaxed.negate()
        for j in range(4):
            rc[(path,j)].keyframe_points[i].co.y = relaxed[j]
            changed.add((path,j))
        previous = relaxed.copy()
    for j in range(4): rc[(path,j)].update()
for key, fc in rc.items():
    if key not in changed:
        assert [tuple(k.co) for k in fc.keyframe_points] == [tuple(k.co) for k in bc[key].keyframe_points]

rest = np.array([tuple(v.co) for v in mesh.data.vertices])
edges = np.array([tuple(e.vertices) for e in mesh.data.edges])
rest_length = np.linalg.norm(rest[edges[:,1]]-rest[edges[:,0]],axis=1)
hand_masks = {}
for side in ['L','R']:
    ids = {g.index for g in mesh.vertex_groups if g.name.startswith(('手首','親指','人指','中指','薬指','小指')) and g.name.endswith('.'+side)}
    mask = np.array([sum(g.weight for g in v.groups if g.group in ids)>.75 for v in mesh.data.vertices])
    hand_masks[side] = mask[edges[:,0]] & mask[edges[:,1]] & (rest_length>1e-5)
frames = sorted({2,51,400,800,1200,1384,1500,1567,peak[1]})
old_frame = scene.frame_current
reports = {}
max_length_error = 0
try:
    for label, action in [('before',base),('after',result)]:
        rig.animation_data.action = action
        rig.animation_data.action_slot = action.slots[0]
        reports[label] = []
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
            em = ev.to_mesh()
            try:
                coords = np.empty(len(em.vertices)*3,dtype=np.float32)
                em.vertices.foreach_get('co',coords)
                coords = coords.reshape((-1,3))
                assert np.isfinite(coords).all()
                length = np.linalg.norm(coords[edges[:,1]]-coords[edges[:,0]],axis=1)
                metrics = {}
                for side, mask in hand_masks.items():
                    ratio = length[mask]/rest_length[mask]
                    metrics[side] = {'p99_edge_length_ratio':float(np.percentile(ratio,99)), 'max_edge_length_ratio':float(ratio.max())}
                reports[label].append({'frame':frame,'hand_surface':metrics})
                for name in names:
                    pb = rig.pose.bones[name]
                    max_length_error = max(max_length_error,abs(pb.length-pb.bone.length))
                    assert max(abs(s-1) for s in pb.scale)<1e-5 and pb.location.length<1e-5
            finally:
                ev.to_mesh_clear()
    assert max_length_error < 1e-5
finally:
    rig.animation_data.action=result
    rig.animation_data.action_slot=result.slots[0]
    scene.frame_set(old_frame)
    bpy.context.view_layer.update()
report = {'status':'passed','action':result.name,'finger_rotation_fraction':0.35,
    'unchanged_channels':len(rc)-len(changed),'modified_channels':len(changed),
    'sample_frames':frames,'max_finger_bone_length_error':max_length_error,
    'original_peak_local_finger_angle_degrees':peak[0],'original_peak_frame':peak[1],
    'surface_measurements':reports}
(work/'hand-relaxation-verification.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps({k:v for k,v in report.items() if k!='surface_measurements'},ensure_ascii=False))
print('Worst sampled hand surface p99 ratio:',{label:max(s['hand_surface'][side]['p99_edge_length_ratio'] for s in rows for side in ['L','R']) for label,rows in reports.items()})
