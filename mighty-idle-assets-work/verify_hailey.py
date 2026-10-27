"""Re-import the shipped GLB, inspect skinning and render its actual payload."""
import bpy
import json
from pathlib import Path
from mathutils import Vector

WORK = Path('<workspace>')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(WORK / 'Mighty Chat/Sources/Characters/hailey/hailey.glb'))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
report = {'meshCount':len(meshes),'boneCount':len(rig.data.bones),
          'worldBounds':{}, 'skinBindings':[], 'restBonePositions':{}}
for ob in meshes:
    report['skinBindings'].append({'name':ob.name, 'rig':next((m.object.name for m in ob.modifiers if m.type == 'ARMATURE'),None),'vertexGroups':len(ob.vertex_groups), 'vertices':len(ob.data.vertices)})
    corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    report['worldBounds'][ob.name] = [[min(c[i] for c in corners) for i in range(3)], [max(c[i] for c in corners) for i in range(3)]]
for name in ['Bip001','Bip001-Head','Bip001-L-Foot','Bip001-R-Foot','Bip001-L-Hand','Bip001-R-Hand']:
    p = rig.matrix_world @ rig.pose.bones[name].head
    report['restBonePositions'][name] = list(p)

def aim(ob, point):
    ob.rotation_euler = (Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()

for name, loc, energy, color in (
    ('Key',(-2.8,-3.2,4),420,(1,.88,.78)),
    ('Fill',(2,-2,2.4),260,(.72,.84,1)),
    ('Rim',(1,2.2,3.2),500,(.75,.86,1)),
):
    data = bpy.data.lights.new(name,'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = 3
    data.color = color
    ob = bpy.data.objects.new(name,data)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    aim(ob,(0,0,1.1))
scene = bpy.context.scene
scene.world.use_nodes = True
scene.world.node_tree.nodes.get('Background').inputs[0].default_value = (.16,.19,.24,1)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value = .3
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.cycles.device = 'CPU'
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.file_format = 'PNG'
scene.render.resolution_percentage = 100
data = bpy.data.cameras.new('Verification camera')
cam = bpy.data.objects.new('Verification camera',data)
scene.collection.objects.link(cam)
scene.camera = cam
data.type = 'ORTHO'
cam.location = (2.5,-6.8,2.6)
aim(cam,(0,0,.94))
data.ortho_scale = 2.13
scene.render.resolution_x = 800
scene.render.resolution_y = 1000
scene.render.filepath = str(WORK / 'mighty-idle-assets-work/hailey-glb-full.png')
bpy.ops.render.render(write_still=True)
cam.location = (.35,-2.5,1.72)
aim(cam,(0,-.04,1.53))
data.ortho_scale = .64
scene.render.resolution_x = 700
scene.render.resolution_y = 800
scene.render.filepath = str(WORK / 'mighty-idle-assets-work/hailey-glb-portrait.png')
bpy.ops.render.render(write_still=True)
(WORK / 'mighty-idle-assets-work/hailey-glb-verification.json').write_text(json.dumps(report,indent=2))
print('GLB_PAYLOAD_VERIFIED',len(meshes),'meshes',len(rig.data.bones),'bones')
