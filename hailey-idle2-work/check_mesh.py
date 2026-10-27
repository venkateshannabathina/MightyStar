import bpy, json, math
from mathutils.bvhtree import BVHTree
scene=bpy.context.scene; old_frame=scene.frame_current
rig=bpy.data.objects['Hailey • Rig']; pants=bpy.data.objects['Hailey • Trousers & boots']; gear=bpy.data.objects['Hailey • Jacket & gear']
feet={}; hands={}
for side in ['L','R']:
    footgroups={g.index for g in pants.vertex_groups if g.name in ['Bip001-'+side+'-Foot','Bip001-'+side+'-Toe0','Bn_Shape_Bip001_'+side+'_Toe0']}
    feet[side]=[v.index for v in pants.data.vertices if sum(g.weight for g in v.groups if g.group in footgroups)>.8]
    handgroups={g.index for g in gear.vertex_groups if g.name=='Bip001-'+side+'-Hand' or g.name.startswith('Bip001-'+side+'-Finger')}
    hands[side]=[v.index for v in gear.data.vertices if sum(g.weight for g in v.groups if g.group in handgroups)>.9]
arm_groups={g.index for g in pants.vertex_groups if any(k in g.name for k in ['UpperArm','Forearm','Hand','Finger','Wrist'])}
arm_vertices={v.index for v in pants.data.vertices if sum(g.weight for g in v.groups if g.group in arm_groups)>.05}
# PartB also contains wrist trim. Exclude those surfaces from thigh collision checks.
collide_faces=[list(p.vertices) for p in pants.data.polygons if not any(i in arm_vertices for i in p.vertices)]
frames=sorted(set([1,128,130,165,167,215,243,257,370,372,500]+list(range(1,501,25))))
rows=[]
for f in frames:
    scene.frame_set(f); bpy.context.view_layer.update(); dg=bpy.context.evaluated_depsgraph_get()
    ep=pants.evaluated_get(dg); mp=ep.to_mesh(); eg=gear.evaluated_get(dg); mg=eg.to_mesh()
    pv=[ep.matrix_world@v.co for v in mp.vertices]
    tree=BVHTree.FromPolygons(pv,collide_faces)
    row={'frame':f,'feet':{},'hands':{}}
    for side in ['L','R']:
        row['feet'][side]={'min_z':min(pv[i].z for i in feet[side]),'foot_head':list(rig.matrix_world@rig.pose.bones['Bip001-'+side+'-Foot'].head)}
        depths=[]; distances=[]
        for i in hands[side]:
            p=eg.matrix_world@mg.vertices[i].co
            hit,normal,_,dist=tree.find_nearest(p)
            if hit is not None:
                distances.append(dist)
                signed=(p-hit).dot(normal)
                if signed<0 and dist<.025: depths.append(-signed)
        row['hands'][side]={'hand_vertices':len(hands[side]),'nearest_gap':min(distances) if distances else None,'inside_vertices':len(depths),'maximum_depth':max(depths) if depths else 0}
    rows.append(row); ep.to_mesh_clear(); eg.to_mesh_clear()
scene.frame_set(old_frame)
report={'frames':rows,'foot_vertex_counts':{s:len(v) for s,v in feet.items()},'floor_range':{s:[min(r['feet'][s]['min_z'] for r in rows),max(r['feet'][s]['min_z'] for r in rows)] for s in feet},'hand_penetration':{s:max(r['hands'][s]['maximum_depth'] for r in rows) for s in hands}}
open('<workspace>/hailey-idle2-work/mesh-check.json','w').write(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='frames'}))
