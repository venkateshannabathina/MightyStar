import bpy, json, math
from pathlib import Path
from mathutils import Vector

out=Path('<workspace>/hailey-idle2-work/source-audit')
out.mkdir(parents=True, exist_ok=True)
source=bpy.data.objects['Mixamo • Idle 2 source']
scene=bpy.context.scene
assert source.animation_data.action.name=='Armature.001|mixamo.com|Layer0', source.animation_data.action.name
prefix=next(n[:-4] for n in source.data.bones.keys() if n=='Hips' or n.endswith(':Hips'))
parts=['Hips','Spine','Spine1','Spine2','Neck','Head']
parts += [s+p for s in ['Left','Right'] for p in ['Shoulder','Arm','ForeArm','Hand','UpLeg','Leg','Foot','ToeBase']]
parts += [s+'Hand'+f+str(j) for s in ['Left','Right'] for f in ['Thumb','Index','Middle','Ring','Pinky'] for j in [1,2,3]]
names={part:prefix+part for part in parts}
def angle(q1,q2): return math.degrees(2*math.acos(min(1.0,max(0.0,abs(q1.dot(q2))))))
world=source.matrix_world.copy()
samples=[]
for frame in range(1,501):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    sample={'frame':frame,'q':{},'local_q':{},'p':{},'toe_tips':{}}
    for part,name in names.items():
        pb=source.pose.bones[name]
        mat=world@pb.matrix
        sample['q'][part]=mat.to_quaternion().normalized()
        sample['local_q'][part]=pb.matrix_basis.to_quaternion().normalized()
        sample['p'][part]=mat.translation.copy()
    for side in ['Left','Right']:
        pb=source.pose.bones[names[side+'ToeBase']]
        sample['toe_tips'][side]=world@pb.tail
    samples.append(sample)
first,last=samples[0],samples[-1]
metrics={}
for part in parts:
    world_degs=[angle(first['q'][part],s['q'][part]) for s in samples]
    local_degs=[angle(first['local_q'][part],s['local_q'][part]) for s in samples]
    step_degs=[angle(samples[i-1]['q'][part],samples[i]['q'][part]) for i in range(1,len(samples))]
    maxwi=max(range(len(samples)),key=lambda i:world_degs[i]); maxli=max(range(len(samples)),key=lambda i:local_degs[i])
    maxsi=max(range(len(step_degs)),key=lambda i:step_degs[i])
    metrics[part]={'world_rotation_from_start_max_degrees':world_degs[maxwi],'world_rotation_extreme_frame':maxwi+1,
        'local_rotation_from_start_max_degrees':local_degs[maxli],'local_rotation_extreme_frame':maxli+1,
        'world_step_max_degrees':step_degs[maxsi],'world_step_extreme_frame':maxsi+2,
        'endpoint_world_rotation_degrees':world_degs[-1],'endpoint_local_rotation_degrees':local_degs[-1]}
hipz=[s['p']['Hips'].z for s in samples]
root={'lowest_frame':hipz.index(min(hipz))+1,'highest_frame':hipz.index(max(hipz))+1,
    'height_min':min(hipz),'height_max':max(hipz),'height_range':max(hipz)-min(hipz),
    'endpoint_displacement':(last['p']['Hips']-first['p']['Hips']).length,
    'root_max_displacement_from_start':max((s['p']['Hips']-first['p']['Hips']).length for s in samples)}
foot={}
for side in ['Left','Right']:
    part=side+'Foot'; toe=side+'ToeBase'
    footz=[s['p'][part].z for s in samples]; toez=[s['p'][toe].z for s in samples]; tipz=[s['toe_tips'][side].z for s in samples]
    footprint=[Vector((s['p'][part].x,s['p'][part].y,0)) for s in samples]
    maxdist=max((p-footprint[0]).length for p in footprint)
    groundz=[min(s['p'][toe].z,s['toe_tips'][side].z) for s in samples]
    foot[side]={'ankle_min_z':min(footz),'ankle_max_z':max(footz),
        'toe_knuckle_min_z':min(toez),'toe_knuckle_max_z':max(toez),'toe_tip_min_z':min(tipz),'toe_tip_max_z':max(tipz),
        'contact_proxy_z_min':min(groundz),'contact_proxy_z_max':max(groundz),
        'contact_proxy_lowest_frame':groundz.index(min(groundz))+1,'contact_proxy_highest_frame':groundz.index(max(groundz))+1,
        'max_horizontal_ankle_displacement_from_start':maxdist,
        'endpoint_ankle_displacement':(last['p'][part]-first['p'][part]).length}
body_parts=parts[:22]
endpointmax=max(body_parts,key=lambda p:metrics[p]['endpoint_world_rotation_degrees'])
keyparts=['Head','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftLeg','RightLeg']
check_frames=sorted(set([1,500,root['lowest_frame'],root['highest_frame']] + [metrics[p]['world_rotation_extreme_frame'] for p in keyparts]+[v['contact_proxy_highest_frame'] for v in foot.values()]))
report={'source':source.name,'action':source.animation_data.action.name,'frame_range':[1,500],
    'fps':scene.render.fps/scene.render.fps_base,'source_root':root,'feet':foot,'bone_rotation_metrics':metrics,
    'endpoint_max_body_rotation':{'bone':endpointmax,'degrees':metrics[endpointmax]['endpoint_world_rotation_degrees']},
    'suggested_visual_check_frames':check_frames,
    'note':'Foot contact uses toe-base/head and toe-tail joint positions, not surface mesh; z values are world units. All rotations are evaluated pose quaternions.'}
(out/'source-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='bone_rotation_metrics'},indent=2))
print(json.dumps({p:metrics[p] for p in keyparts},indent=2))
