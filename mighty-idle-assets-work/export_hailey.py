"""Export an isolated, textured Hailey asset for the shared idle runtime."""
import bpy
import json
from pathlib import Path
from mathutils import Matrix

WORK = Path('<workspace>')
TEXTURES = WORK / 'mighty-idle-assets-work/textures'
OUTPUT = WORK / 'Mighty Chat/Sources/Characters/hailey/hailey.glb'
RIG = bpy.data.objects['Hailey • Rig']
CHARACTER = bpy.data.collections['HAILEY • Character']
MAPPING = json.loads((WORK / 'hailey-idle2-work/retarget-config.json').read_text())['mapping']

# Detach motion only in this disposable background copy. Main humanoid bones
# expose neutral reference transforms; static accessory/hair fixes stay posed.
RIG.animation_data_clear()
for name in MAPPING:
    RIG.pose.bones[name].matrix_basis = Matrix.Identity(4)
RIG.data.pose_position = 'POSE'
RIG['idleRetarget'] = {'handedness': 'right', 'armClearanceDegrees': 8}
RIG['characterName'] = 'Hailey'
for ob in list(bpy.context.scene.objects):
    if ob.name not in CHARACTER.objects or ob.type not in {'MESH', 'ARMATURE'} or ob.hide_render:
        bpy.data.objects.remove(ob, do_unlink=True)
for ob in CHARACTER.objects:
    ob.hide_set(False)
    ob.hide_viewport = False
    ob.hide_render = False
    if ob.type == 'MESH':
        # Only DiffuseUV is used. Spare face UV channels increase payload size.
        for index in range(len(ob.data.uv_layers) - 1, -1, -1):
            uv = ob.data.uv_layers[index]
            if uv.name != 'DiffuseUV':
                ob.data.uv_layers.remove(uv)
        ob.data.uv_layers.active = ob.data.uv_layers.get('DiffuseUV')
        for uv in ob.data.uv_layers:
            uv.active_render = uv.name == 'DiffuseUV'

def principled(material_name, color, roughness, metallic=0, alpha=1):
    m = bpy.data.materials[material_name]
    m.use_nodes = True
    nodes = m.node_tree.nodes
    nodes.clear()
    bs = nodes.new('ShaderNodeBsdfPrincipled')
    out = nodes.new('ShaderNodeOutputMaterial')
    m.node_tree.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Alpha'].default_value = alpha
    m.diffuse_color = (*color, alpha)
    uv = nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'DiffuseUV'
    m.use_backface_culling = False
    return m, bs, uv

def texture(m, uv, filename, color=False):
    t = m.node_tree.nodes.new('ShaderNodeTexImage')
    t.image = bpy.data.images.load(str(TEXTURES / filename), check_existing=True)
    t.image.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
    t.image.alpha_mode = 'STRAIGHT'
    m.node_tree.links.new(uv.outputs['UV'], t.inputs['Vector'])
    return t

for part, material, strength, rough in (
    ('Body', 'Hailey | Skin • body', .65, .49),
    ('Face', 'Hailey | Skin • face', .5, .48),
    ('PartA', 'Hailey | Suit • PartA', .8, .5),
    ('PartB', 'Hailey | Suit • PartB', .8, .5),
):
    m, bs, uv = principled(material, (.7, .7, .7), rough)
    t = texture(m, uv, part + '-color.jpg', True)
    m.node_tree.links.new(t.outputs['Color'], bs.inputs['Base Color'])
    t = texture(m, uv, part + '-normal.png')
    nm = m.node_tree.nodes.new('ShaderNodeNormalMap')
    nm.uv_map = 'DiffuseUV'
    nm.inputs['Strength'].default_value = strength
    m.node_tree.links.new(t.outputs['Color'], nm.inputs['Color'])
    m.node_tree.links.new(nm.outputs['Normal'], bs.inputs['Normal'])
    t = texture(m, uv, part + '-orm.png')
    sep = m.node_tree.nodes.new('ShaderNodeSeparateColor')
    m.node_tree.links.new(t.outputs['Color'], sep.inputs[0])
    m.node_tree.links.new(sep.outputs['Green'], bs.inputs['Roughness'])
    m.node_tree.links.new(sep.outputs['Blue'], bs.inputs['Metallic'])
    if part in ('PartA', 'PartB'):
        t = texture(m, uv, part + '-emission.jpg', True)
        m.node_tree.links.new(t.outputs['Color'], bs.inputs['Emission Color'])
        bs.inputs['Emission Strength'].default_value = .6

m, bs, uv = principled('Hailey | Hair • chestnut strands', (.045, .019, .01), .4)
t = texture(m, uv, 'Hair-color-alpha.png', True)
m.node_tree.links.new(t.outputs['Color'], bs.inputs['Base Color'])
m.node_tree.links.new(t.outputs['Alpha'], bs.inputs['Alpha'])
bs.inputs['Specular IOR Level'].default_value = .3
m.surface_render_method = 'DITHERED'
m, bs, uv = principled('Hailey | Eyes • blue grey', (.75, .72, .66), .2)
t = texture(m, uv, 'Eyes-color.png', True)
m.node_tree.links.new(t.outputs['Color'], bs.inputs['Base Color'])
bs.inputs['Coat Weight'].default_value = .35
bs.inputs['Coat Roughness'].default_value = .08
for material, alpha in [('Hailey | Eye moisture', .035), ('Hailey | Tearline', .025)]:
    m, bs, uv = principled(material, (1, 1, 1), .12, alpha=alpha)
    bs.inputs['Coat Weight'].default_value = 1
    bs.inputs['Coat Roughness'].default_value = .08
    m.surface_render_method = 'DITHERED'

for ob in bpy.context.scene.objects:
    ob.select_set(True)
bpy.context.view_layer.objects.active = RIG
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
result = bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB',
    use_selection=True, export_animations=False, export_skins=True,
    export_rest_position_armature=False, export_current_frame=True,
    export_apply=False, export_yup=True, export_extras=True,
    export_cameras=False, export_lights=False, export_morph=True,
    export_texcoords=True, export_normals=True, export_tangents=True,
    export_image_format='AUTO', export_influence_nb=4, export_all_influences=False)
assert result == {'FINISHED'}
report = dict(path=str(OUTPUT), bytes=OUTPUT.stat().st_size,
              meshCount=len([o for o in bpy.context.scene.objects if o.type == 'MESH']),
              boneCount=len(RIG.data.bones), animations=False,
              helperPosePreserved=True, neutralHumanoid=True)
(WORK / 'mighty-idle-assets-work/hailey-export-report.json').write_text(json.dumps(report, indent=2))
print('HAILEY_GLB_EXPORTED', json.dumps(report))

# A disposable working copy is useful for render comparison/re-export.
bpy.ops.wm.save_as_mainfile(filepath=str(WORK / 'mighty-idle-assets-work/hailey-export.blend'))
