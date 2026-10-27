import json, math
from pathlib import Path
folder=Path('<workspace>/blender-idle-retarget-2026-10-08')
d=json.loads((folder/'rig-inventory.json').read_text()); sb={b['name']:b for b in d['armatures'][0]['bones']}; tb={b['name']:b for b in d['armatures'][1]['bones']}
mapping={k:'mixamorig:'+v for k,v in {'腰':'Hips','上半身':'Spine','上半身3':'Spine1','上半身2':'Spine2','首':'Neck','頭':'Head'}.items()}
segments=[];palms=[];legs=[]
for side,suffix in [('Left','.L'),('Right','.R')]:
    for jp,en in [('肩','Shoulder'),('腕','Arm'),('ひじ','ForeArm'),('手首','Hand'),('足D','UpLeg'),('ひざD','Leg'),('足首D','Foot'),('足先EX','ToeBase')]:
        mapping[jp+suffix]='mixamorig:'+side+en
    for tj,te,sj,se in [('肩','腕','Shoulder','Arm'),('腕','ひじ','Arm','ForeArm'),('ひじ','手首','ForeArm','Hand'),('足D','ひざD','UpLeg','Leg'),('ひざD','足首D','Leg','Foot')]:
        segments.append({'target':tj+suffix,'target_end':te+suffix,'source':'mixamorig:'+side+sj,'source_end':'mixamorig:'+side+se})
    palms.append({'target':[x+suffix for x in ['手首','中指１','人指１','小指１']], 'source':['mixamorig:'+side+x for x in ['Hand','HandMiddle1','HandIndex1','HandPinky1']]})
    legs.append({'target':[x+suffix for x in ['足D','ひざD','足首D']], 'source':['mixamorig:'+side+x for x in ['UpLeg','Leg','Foot']]})
    for jp,en,nums in [('親指','Thumb','０１２'),('人指','Index','１２３'),('中指','Middle','１２３'),('薬指','Ring','１２３'),('小指','Pinky','１２３')]:
        for i,n in enumerate(nums,1):
            tn=jp+n+suffix;sn='mixamorig:'+side+'Hand'+en+str(i);mapping[tn]=sn
            segments.append({'target':tn,'target_end':jp+(nums[i] if i<3 else nums[-1]+'先')+suffix,'source':sn,'source_end':'mixamorig:'+side+'Hand'+en+str(i+1),'prior_palm':'手首'+suffix})
# Prove names, unique sources, ancestry, and nonzero anatomical segments from observed inventory.
assert len(mapping)==52 and len(set(mapping.values()))==52
for tn,sn in mapping.items():
    assert tn in tb and sn in sb,(tn,sn)
    n=tn
    while n!='腰':
        n=tb[n]['parent']; assert n is not None,tn
for segment in segments:
    for names,a,b in [(tb,'target','target_end'),(sb,'source','source_end')]:
        assert segment[a] in names and segment[b] in names
        assert math.dist(names[segment[a]]['head_world'],names[segment[b]]['head_world'])>1e-5
cfg={'source_armature':'Idle_Source','target_armature':'Augusta_Idle_Rig','source_action':'Idle • Source (static object)','action_name':'Augusta • Idle (retargeted)','root_source':'mixamorig:Hips','root_target':'腰','mapping':mapping,'segments':segments,'palms':palms,'inherit_calibration':{},'leg_chains':legs,'alignment_quaternion':[1,0,0,0],'root_motion':'full','frame_range':[1,1567],'backup_path':str(folder/'Augusta-before-idle-retarget.blend')}
(folder/'mapping-proposal.json').write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'config':str(folder/'mapping-proposal.json'),'mapping':len(mapping),'segments':len(segments),'palms':len(palms),'validated_anatomy':True},ensure_ascii=False))
