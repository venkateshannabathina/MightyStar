import bpy, json, os
from mathutils import Matrix, Vector
work='<workspace>/hailey-idle2-work'
s=bpy.data.objects['Mixamo • Idle 2 source']; t=bpy.data.objects['Hailey • Rig']
names={'Hips':'Bip001','Spine':'Bip001-Spine1','Spine1':'Bip001-Spine2','Spine2':'Bip001-Spine3','Neck':'Bip001-Neck','Head':'Bip001-Head'}
parts={'Shoulder':'Clavicle','Arm':'UpperArm','ForeArm':'Forearm','Hand':'Hand','UpLeg':'Thigh','Leg':'Calf','Foot':'Foot','ToeBase':'Toe0'}
for side,letter in [('Left','L'),('Right','R')]:
    for sp,tp in parts.items(): names[side+sp]='Bip001-'+letter+'-'+tp
    # Hailey's FingerN is the MCP knuckle, not a metacarpal. Its two children are PIP/DIP.
    for i,finger in enumerate(['Thumb','Index','Middle','Ring','Pinky']):
        for j,suffix in enumerate([str(i),str(i)+'1',str(i)+'2'],1):
            names[side+'Hand'+finger+str(j)]='Bip001-'+letter+'-Finger'+suffix
mapping={tn:'mixamorig:'+sn for sn,tn in names.items()}
assert all(n in t.data.bones for n in mapping)
assert all(n in s.data.bones for n in mapping.values())
segments=[]; palms=[]; legs=[]; inherited={}
def segment(a,b,prior=None):
    d={'target':names[a],'target_end':names[b],'source':'mixamorig:'+a,'source_end':'mixamorig:'+b}
    if prior: d['prior_palm']=names[prior]
    segments.append(d)
for side in ['Left','Right']:
    for chain in [('Shoulder','Arm','ForeArm','Hand'),('UpLeg','Leg','Foot','ToeBase')]:
        for a,b in zip(chain,chain[1:]): segment(side+a,side+b)
    keys=[side+'Hand',side+'HandMiddle1',side+'HandIndex1',side+'HandPinky1']
    palms.append({'target':[names[k] for k in keys],'source':['mixamorig:'+k for k in keys]})
    legs.append({'target':[names[side+k] for k in ['UpLeg','Leg','Foot']],'source':['mixamorig:'+side+k for k in ['UpLeg','Leg','Foot']]})
    for finger in ['Thumb','Index','Middle','Ring','Pinky']:
        base=side+'Hand'+finger
        for j in [1,2]: segment(base+str(j),base+str(j+1),side+'Hand')
        inherited[names[base+'3']]=names[base+'2']
def body_frame(obj,hips,neck,left,right):
    h={b.name:obj.matrix_world@b.head_local for b in obj.data.bones}
    up=(h[neck]-h[hips]).normalized(); assert up.z>.8
    across=h[left]-h[right]; x=Vector((across.x,across.y,0)).normalized(); z=Vector((0,0,1)); y=z.cross(x).normalized()
    return Matrix((x,y,z)).transposed().to_quaternion()
alignment=body_frame(t,names['Hips'],names['Neck'],names['LeftUpLeg'],names['RightUpLeg'])@body_frame(s,'mixamorig:Hips','mixamorig:Neck','mixamorig:LeftUpLeg','mixamorig:RightUpLeg').inverted()
config={'source_armature':s.name,'target_armature':t.name,'source_action':s.animation_data.action.name,'action_name':'Hailey • Idle 2','root_source':'mixamorig:Hips','root_target':'Bip001','mapping':mapping,'segments':segments,'palms':palms,'inherit_calibration':inherited,'leg_chains':legs,'alignment_quaternion':list(alignment),'frame_range':[1,500],'root_motion':'full','backup_path':work+'/Hailey-reference-with-Idle2.blend'}
open(work+'/retarget-config.json','w').write(json.dumps(config,indent=2))
reference={p.name:{'mode':p.rotation_mode,'basis':[list(row) for row in p.matrix_basis]} for p in t.pose.bones if p.name not in mapping}
open(work+'/preserved-helper-poses.json','w').write(json.dumps(reference,indent=2))
# Save the complete imported reference before temporarily normalizing static helpers for the engine.
if not os.path.exists(config['backup_path']): bpy.ops.wm.save_as_mainfile(filepath=config['backup_path'],copy=True,compress=True)
bpy.ops.wm.save_as_mainfile(filepath='<workspace>/hailey-idle2.blend',compress=True)
for name in reference: t.pose.bones[name].matrix_basis=Matrix.Identity(4)
bpy.context.view_layer.update()
print(json.dumps({'mapped':len(mapping),'frames':[1,500],'alignment':list(alignment),'preserved_helper_poses':len(reference),'finger_layout':'MCP=FingerN, PIP=FingerN1, DIP=FingerN2','spine_mapping':{k:names[k] for k in ['Spine','Spine1','Spine2']}}))
