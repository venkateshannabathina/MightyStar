import bpy, math, json
from mathutils import Matrix, Vector, Quaternion
scene=bpy.context.scene; rig=bpy.data.objects['Hailey • Rig']
base=bpy.data.actions['Hailey • Idle 2 • Original transfer']
corrected=rig.animation_data.action
rig.animation_data.action=base
rows=[]
chest=rig.data.bones['Bip001-Spine3']
rest_chest=(rig.matrix_world@chest.matrix_local).to_quaternion()
for frame in range(1,501):
    scene.frame_set(frame); bpy.context.view_layer.update()
    chest_pose=(rig.matrix_world@rig.pose.bones[chest.name].matrix).to_quaternion()
    axis=(chest_pose@rest_chest.inverted())@Vector((0,1,0))
    row={}
    for side,sign in [('L',-1),('R',1)]:
        pb=rig.pose.bones['Bip001-'+side+'-UpperArm']
        world=rig.matrix_world@pb.matrix
        q=Quaternion(axis,sign*math.radians(8))@world.to_quaternion()
        posed=rig.matrix_world.inverted()@Matrix.LocRotScale(world.translation,q,Vector((1,1,1)))
        local=pb.bone.convert_local_to_pose(posed,pb.bone.matrix_local,invert=True,parent_matrix=pb.parent.matrix,parent_matrix_local=pb.parent.bone.matrix_local)
        row[pb.name]=local.to_quaternion()
    rows.append(row)
rig.animation_data.action=corrected
for frame,row in enumerate(rows,1):
    for name,q in row.items():
        pb=rig.pose.bones[name]; pb.rotation_mode='QUATERNION'; pb.rotation_quaternion=q
        pb.keyframe_insert('rotation_quaternion',frame=frame,group=name)
# Translate the whole grounded rig by the measured sole penetration plus a 0.3 mm margin.
rig.location.z=.0108
corrected['corrections']='8 degree outward upper-arm rotation in torso space; 10.8 mm floor offset; static helper poses retained.'
scene.frame_set(165); bpy.context.view_layer.update()
report={'base_action':base.name,'corrected_action':corrected.name,'arm_outward_degrees':8,'floor_offset_m':.0108,'frames':[1,500]}
open('<workspace>/hailey-idle2-work/corrections.json','w').write(json.dumps(report,indent=2))
print(json.dumps(report))
