import bpy, json, math
from mathutils import Matrix, Vector
scene=bpy.context.scene; rig=bpy.data.objects['Hailey • Rig']; pants=bpy.data.objects['Hailey • Trousers & boots']
work='<workspace>/hailey-idle2-work'
refs=json.load(open(work+'/preserved-helper-poses.json'))
for name,record in refs.items():
    p=rig.pose.bones[name]; p.rotation_mode='QUATERNION'; p.matrix_basis=Matrix(record['basis'])
    for frame in [1,500]:
        for prop in ['location','rotation_quaternion','scale']: p.keyframe_insert(prop,frame=frame,group=name)
action=rig.animation_data.action; action.use_fake_user=True
feet={}
for side in ['L','R']:
    groups={g.index for g in pants.vertex_groups if g.name in ['Bip001-'+side+'-Foot','Bip001-'+side+'-Toe0','Bn_Shape_Bip001_'+side+'_Toe0']}
    feet[side]=[v.index for v in pants.data.vertices if sum(g.weight for g in v.groups if g.group in groups)>.8]
rows=[]; first_pose=None; max_loop_rotation=0; loop_root=0
for frame in range(1,501):
    scene.frame_set(frame); bpy.context.view_layer.update(); dg=bpy.context.evaluated_depsgraph_get()
    assert all(math.isfinite(v) for p in rig.pose.bones for row in p.matrix for v in row)
    pose={p.name:(p.matrix.to_quaternion(),rig.matrix_world@p.head) for p in rig.pose.bones}
    if first_pose is None: first_pose=pose
    if frame==500:
        for name,(q,head) in pose.items():
            a=first_pose[name][0].normalized(); b=q.normalized()
            angle=math.degrees(2*math.acos(min(1,max(-1,abs(a.dot(b))))))
            max_loop_rotation=max(max_loop_rotation,angle)
        loop_root=(pose['Bip001'][1]-first_pose['Bip001'][1]).length
    ob=pants.evaluated_get(dg); mesh=ob.to_mesh()
    row={'frame':frame,'feet':{}}
    for side in ['L','R']:
        row['feet'][side]={'sole_min_z':min((ob.matrix_world@mesh.vertices[i].co).z for i in feet[side]),'ankle':list(rig.matrix_world@rig.pose.bones['Bip001-'+side+'-Foot'].head)}
    rows.append(row); ob.to_mesh_clear()
report={'action':action.name,'frames_checked':500,'fps':scene.render.fps,'finite_transforms':True,'loop_rotation_degrees':max_loop_rotation,'loop_root_difference_m':loop_root,'constraints':[p.name for p in rig.pose.bones if p.constraints],'floor_range':{s:[min(r['feet'][s]['sole_min_z'] for r in rows),max(r['feet'][s]['sole_min_z'] for r in rows)] for s in feet},'ankle_horizontal_span_m':{s:max((Vector(r['feet'][s]['ankle'])-Vector(rows[0]['feet'][s]['ankle'])).xy.length for r in rows) for s in feet},'source_dependency':False,'static_helper_bones_keyed':len(refs)}
assert min(v[0] for v in report['floor_range'].values())>-.001
assert loop_root<.001 and max_loop_rotation<.2
open(work+'/final-animation-verification.json','w').write(json.dumps(report,indent=2))
open(work+'/full-clip-foot-contact.json','w').write(json.dumps(rows))
scene.frame_set(1)
print(json.dumps(report))
