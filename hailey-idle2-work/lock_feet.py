import bpy, json, math
from mathutils import Matrix, Vector, Quaternion
scene=bpy.context.scene; rig=bpy.data.objects['Hailey • Rig']; source=bpy.data.objects['Mixamo • Idle 2 source']
work='<workspace>/hailey-idle2-work'
config=json.load(open(work+'/retarget-config.json')); align=Quaternion(config['alignment_quaternion']); scale=1.0192830958137429
base=rig.animation_data.action; base.name='Hailey • Idle 2 • Before foot contact'; base.use_fake_user=True
corrected=base.copy(); corrected.name='Hailey • Idle 2'; corrected.use_fake_user=True
scene.frame_set(1); bpy.context.view_layer.update()
anchors={side:(rig.matrix_world@rig.pose.bones['Bip001-'+side+'-Foot'].matrix).translation.copy() for side in ['L','R']}
source_start={side:(source.matrix_world@source.pose.bones['mixamorig:'+label+'Foot'].matrix).translation.copy() for side,label in [('L','Left'),('R','Right')]}
rows=[]; max_angle=0; max_unreachable=0
for frame in range(1,501):
    scene.frame_set(frame); bpy.context.view_layer.update(); row={}
    for side,label in [('L','Left'),('R','Right')]:
        thigh=rig.pose.bones['Bip001-'+side+'-Thigh']; calf=rig.pose.bones['Bip001-'+side+'-Calf']; foot=rig.pose.bones['Bip001-'+side+'-Foot']
        wt=rig.matrix_world@thigh.matrix; wc=rig.matrix_world@calf.matrix; wf=rig.matrix_world@foot.matrix
        hip,knee,ankle=wt.translation.copy(),wc.translation.copy(),wf.translation.copy()
        target=anchors[side]+scale*(align@((source.matrix_world@source.pose.bones['mixamorig:'+label+'Foot'].matrix).translation-source_start[side]))
        length1=(knee-hip).length; length2=(ankle-knee).length
        delta=target-hip; d=delta.length; direction=delta.normalized()
        max_unreachable=max(max_unreachable,d-(length1+length2))
        assert d<length1+length2+1e-5, 'Ankle target outside leg reach at '+str(frame)
        d=min(d,length1+length2-1e-7)
        along=(length1*length1-length2*length2+d*d)/(2*d)
        height=math.sqrt(max(0,length1*length1-along*along))
        bend=knee-hip-direction*(knee-hip).dot(direction)
        if bend.length<1e-5: bend=Vector((0,-1,0))-direction*direction.dot(Vector((0,-1,0)))
        bend.normalize(); new_knee=hip+along*direction+height*bend
        qt=(knee-hip).rotation_difference(new_knee-hip)@wt.to_quaternion()
        qc=(ankle-knee).rotation_difference(target-new_knee)@wc.to_quaternion()
        max_angle=max(max_angle,math.degrees((knee-hip).angle(new_knee-hip)),math.degrees((ankle-knee).angle(target-new_knee)))
        thigh_pose=rig.matrix_world.inverted()@Matrix.LocRotScale(hip,qt,Vector((1,1,1)))
        local_t=thigh.bone.convert_local_to_pose(thigh_pose,thigh.bone.matrix_local,invert=True,parent_matrix=thigh.parent.matrix,parent_matrix_local=thigh.parent.bone.matrix_local)
        local_t=Matrix.LocRotScale(Vector((0,0,0)),local_t.to_quaternion(),Vector((1,1,1)))
        thigh_pose=thigh.bone.convert_local_to_pose(local_t,thigh.bone.matrix_local,parent_matrix=thigh.parent.matrix,parent_matrix_local=thigh.parent.bone.matrix_local)
        calf_pose=rig.matrix_world.inverted()@Matrix.LocRotScale(new_knee,qc,Vector((1,1,1)))
        local_c=calf.bone.convert_local_to_pose(calf_pose,calf.bone.matrix_local,invert=True,parent_matrix=thigh_pose,parent_matrix_local=thigh.bone.matrix_local)
        local_c=Matrix.LocRotScale(Vector((0,0,0)),local_c.to_quaternion(),Vector((1,1,1)))
        calf_pose=calf.bone.convert_local_to_pose(local_c,calf.bone.matrix_local,parent_matrix=thigh_pose,parent_matrix_local=thigh.bone.matrix_local)
        foot_pose=rig.matrix_world.inverted()@Matrix.LocRotScale(target,wf.to_quaternion(),Vector((1,1,1)))
        local_f=foot.bone.convert_local_to_pose(foot_pose,foot.bone.matrix_local,invert=True,parent_matrix=calf_pose,parent_matrix_local=calf.bone.matrix_local)
        row.update({thigh.name:local_t.to_quaternion(),calf.name:local_c.to_quaternion(),foot.name:local_f.to_quaternion()})
    rows.append(row)
rig.animation_data.action=corrected
for frame,row in enumerate(rows,1):
    for name,q in row.items():
        p=rig.pose.bones[name]; p.rotation_mode='QUATERNION'; p.rotation_quaternion=q
        p.keyframe_insert('rotation_quaternion',frame=frame,group=name)
corrected['foot_contact']='Baked two-bone leg correction follows source ankle motion relative to first-frame target stance; no live IK constraints.'
report={'action':corrected.name,'source_ankle_motion_preserved':True,'max_leg_direction_adjustment_degrees':max_angle,'max_unreachable_distance_m':max_unreachable,'frames':500}
open(work+'/foot-contact-correction.json','w').write(json.dumps(report,indent=2))
scene.frame_set(1);print(json.dumps(report))
