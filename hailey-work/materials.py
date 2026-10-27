import bpy, os, math
from mathutils import Vector
RAW='<home>/Downloads/Raw Files'

def newmat(name, color=(.2,.2,.2,1), rough=.5, metal=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    n=m.node_tree.nodes; n.clear(); l=m.node_tree.links
    out=n.new('ShaderNodeOutputMaterial'); out.location=(900,100)
    bs=n.new('ShaderNodeBsdfPrincipled'); bs.location=(590,100)
    bs.inputs['Base Color'].default_value=color
    bs.inputs['Roughness'].default_value=rough
    bs.inputs['Metallic'].default_value=metal
    l.new(bs.outputs['BSDF'],out.inputs['Surface'])
    uv=n.new('ShaderNodeUVMap'); uv.uv_map='DiffuseUV'; uv.location=(-1000,100)
    m.diffuse_color=color
    return m,bs,uv

def tex(m,uv,file,pos, color=False):
    n=m.node_tree.nodes.new('ShaderNodeTexImage'); n.location=pos
    n.image=bpy.data.images.load(os.path.join(RAW,file),check_existing=True)
    n.image.colorspace_settings.name='sRGB' if color else 'Non-Color'
    n.image.alpha_mode='CHANNEL_PACKED'; n.label=file
    m.node_tree.links.new(uv.outputs['UV'],n.inputs['Vector'])
    return n

def sep(m,node,pos):
    s=m.node_tree.nodes.new('ShaderNodeSeparateColor'); s.location=pos
    m.node_tree.links.new(node.outputs['Color'],s.inputs[0]); return s

def maprange(m,socket,a,b,pos):
    n=m.node_tree.nodes.new('ShaderNodeMapRange'); n.location=pos
    n.inputs['To Min'].default_value=a; n.inputs['To Max'].default_value=b
    m.node_tree.links.new(socket,n.inputs['Value']); return n.outputs['Result']

def normal(m,bs,uv,file,strength):
    t=tex(m,uv,file,(-750,-500)); s=sep(m,t,(-450,-500))
    inv=m.node_tree.nodes.new('ShaderNodeMath'); inv.operation='SUBTRACT'; inv.location=(-230,-600)
    inv.inputs[0].default_value=1; m.node_tree.links.new(s.outputs['Green'],inv.inputs[1])
    c=m.node_tree.nodes.new('ShaderNodeCombineColor'); c.location=(-20,-470); c.label='DirectX normal → Blender tangent'
    for output,input in [('Red','Red'),('Blue','Blue')]: m.node_tree.links.new(s.outputs[output],c.inputs[input])
    m.node_tree.links.new(inv.outputs[0],c.inputs['Green'])
    nm=m.node_tree.nodes.new('ShaderNodeNormalMap'); nm.location=(220,-350); nm.uv_map='DiffuseUV'
    nm.inputs['Strength'].default_value=strength
    m.node_tree.links.new(c.outputs[0],nm.inputs['Color']); m.node_tree.links.new(nm.outputs[0],bs.inputs['Normal'])

def assign(obname,m,name):
    o=bpy.data.objects[obname]; o.data.materials.clear(); o.data.materials.append(m); o.name=name
    return o

for part,idx in [('Body','0000'),('PartA','0001'),('PartB','0002')]:
    skin=part=='Body'; prefix='PC_016_A_Body_000_'+part
    m,bs,uv=newmat('Hailey | '+('Skin • body' if skin else 'Suit • '+part))
    c=tex(m,uv,prefix+'_C.tga',(-750,450),True); m.node_tree.links.new(c.outputs['Color'],bs.inputs['Base Color'])
    normal(m,bs,uv,prefix+'_N.tga',.65 if skin else .8)
    if skin:
        p=tex(m,uv,prefix+'_P.tga',(-750,100)); s=sep(m,p,(-420,100))
        m.node_tree.links.new(maprange(m,s.outputs['Green'],.4,.58,(-120,100)),bs.inputs['Roughness'])
        m.node_tree.links.new(maprange(m,s.outputs['Blue'],0,.07,(120,-90)),bs.inputs['Subsurface Weight'])
        bs.inputs['Subsurface Radius'].default_value=(1,.42,.22); bs.inputs['Subsurface Scale'].default_value=.009
    else:
        ids=tex(m,uv,prefix+'_ID.tga',(-750,100)); s=sep(m,ids,(-420,100))
        m.node_tree.links.new(maprange(m,s.outputs['Blue'],.38,.62,(-120,100)),bs.inputs['Roughness'])
        # The packed P is sparse trim data, not an ORM map. Keep it available for editing.
        tex(m,uv,prefix+'_P.tga',(-750,-820))
        fx=tex(m,uv,prefix+'_FX.tga',(-750,790),True)
        m.node_tree.links.new(fx.outputs['Color'],bs.inputs['Emission Color']); bs.inputs['Emission Strength'].default_value=.6
    assign(idx+'_PC_016_A_VAR_BODY_000',m,{'Body':'Hailey • Body skin','PartA':'Hailey • Jacket & gear','PartB':'Hailey • Trousers & boots'}[part])

m,bs,uv=newmat('Hailey | Skin • face')
c=tex(m,uv,'PC_016_Makeup_Face_002A_C.tga',(-750,450),True); m.node_tree.links.new(c.outputs['Color'],bs.inputs['Base Color'])
p=tex(m,uv,'PC_016_Makeup_Face_002A_P.tga',(-750,100)); s=sep(m,p,(-420,100))
m.node_tree.links.new(maprange(m,s.outputs['Green'],.38,.58,(-120,100)),bs.inputs['Roughness'])
m.node_tree.links.new(maprange(m,s.outputs['Blue'],0,.075,(120,-100)),bs.inputs['Subsurface Weight'])
bs.inputs['Subsurface Radius'].default_value=(1,.42,.22); bs.inputs['Subsurface Scale'].default_value=.008
normal(m,bs,uv,'PC_016_A0101_Face_N.tga',.5)
assign('0000_PC_016_A_Face_000',m,'Hailey • Face & neck')

m,bs,uv=newmat('Hailey | Hair • chestnut strands',(.045,.019,.01,1),.4)
p=tex(m,uv,'PC_016_A_VAR_Head_000A_Hair_P.tga',(-750,100)); s=sep(m,p,(-470,100))
r=m.node_tree.nodes.new('ShaderNodeValToRGB'); r.location=(-130,330)
r.color_ramp.elements[0].position=.05; r.color_ramp.elements[0].color=(.016,.008,.004,1)
r.color_ramp.elements[1].position=.95; r.color_ramp.elements[1].color=(.11,.052,.025,1)
m.node_tree.links.new(s.outputs['Red'],r.inputs['Fac']); m.node_tree.links.new(r.outputs[0],bs.inputs['Base Color'])
m.node_tree.links.new(p.outputs['Alpha'],bs.inputs['Alpha'])
bs.inputs['Anisotropic'].default_value=.35
bs.inputs['Specular IOR Level'].default_value=.3
m.surface_render_method='DITHERED'
for idx,label in [('0001','Hair'),('0002','Ponytail')]: assign(idx+'_PC_016_A_VAR_HEAD_000',m,'Hailey • '+label)
m,bs,uv=newmat('Hailey | Headset',(.025,.03,.034,1),.36,.35)
assign('0000_PC_016_A_VAR_HEAD_000',m,'Hailey • Headset')

# Eyes have front-centered radial UVs. Use their mask texture only within the iris.
m,bs,uv=newmat('Hailey | Eyes • blue grey',(.75,.72,.66,1),.2)
t=tex(m,uv,'PC_016_Makeup_PT_Iris_A_002A_H.tga',(-720,500))
# Scale iris texture up in UV space to make a natural-sized iris on each eyeball.
v=m.node_tree.nodes.new('ShaderNodeVectorMath'); v.operation='SUBTRACT'; v.location=(-900,-150); v.inputs[1].default_value=(.5,.5,0)
m.node_tree.links.new(uv.outputs[0],v.inputs[0])
dist=m.node_tree.nodes.new('ShaderNodeVectorMath'); dist.operation='LENGTH'; dist.location=(-650,-150); m.node_tree.links.new(v.outputs[0],dist.inputs[0])
mask=m.node_tree.nodes.new('ShaderNodeMath'); mask.operation='LESS_THAN'; mask.location=(-410,-120); mask.inputs[1].default_value=.205; m.node_tree.links.new(dist.outputs['Value'],mask.inputs[0])
sc=m.node_tree.nodes.new('ShaderNodeVectorMath'); sc.operation='SCALE'; sc.location=(-670,200); sc.inputs['Scale'].default_value=2.1; m.node_tree.links.new(v.outputs[0],sc.inputs[0])
add=m.node_tree.nodes.new('ShaderNodeVectorMath'); add.operation='ADD'; add.location=(-480,200); add.inputs[1].default_value=(.5,.5,0); m.node_tree.links.new(sc.outputs[0],add.inputs[0]); m.node_tree.links.new(add.outputs[0],t.inputs['Vector'])
col=m.node_tree.nodes.new('ShaderNodeValToRGB'); col.location=(-170,470)
col.color_ramp.elements[0].position=.05; col.color_ramp.elements[0].color=(.001,.002,.003,1)
col.color_ramp.elements[1].position=.85; col.color_ramp.elements[1].color=(.13,.23,.29,1)
m.node_tree.links.new(t.outputs['Color'],col.inputs[0])
mix=m.node_tree.nodes.new('ShaderNodeMixRGB'); mix.location=(290,230); mix.inputs[1].default_value=(.68,.64,.6,1)
m.node_tree.links.new(mask.outputs[0],mix.inputs[0]); m.node_tree.links.new(col.outputs[0],mix.inputs[2]); m.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
bs.inputs['Coat Weight'].default_value=.35; bs.inputs['Coat Roughness'].default_value=.08
assign('0001_PC_016_A_Face_000',m,'Hailey • Eyes')

m,bs,uv=newmat('Hailey | Mouth interior',(.16,.04,.035,1),.45)
assign('0002_PC_016_A_Face_000',m,'Hailey • Mouth interior')
m,bs,uv=newmat('Hailey | Tearline',(.35,.12,.10,1),.18)
bs.inputs['Coat Weight'].default_value=.4
assign('0003_PC_016_A_Face_000',m,'Hailey • Tearline')
m,bs,uv=newmat('Hailey | Eyelashes',(.009,.004,.002,1),.5)
assign('0004_PC_016_A_Face_000',m,'Hailey • Eyelashes')
m,bs,uv=newmat('Hailey | Eyebrows',(.025,.009,.004,1),.7)
assign('0005_PC_016_A_Face_000',m,'Hailey • Eyebrows')
m,bs,uv=newmat('Hailey | Eye moisture',(.6,.6,.6,1),.05)
bs.inputs['Transmission Weight'].default_value=1; bs.inputs['IOR'].default_value=1.333
o=assign('0006_PC_016_A_Face_000',m,'Hailey • Eye moisture')

# Organize an editable character separately from the optional preview studio.
character=bpy.data.collections.new('HAILEY • Character'); bpy.context.scene.collection.children.link(character)
for ob in list(bpy.context.scene.objects):
    for old in list(ob.users_collection): old.objects.unlink(ob)
    character.objects.link(ob)
studio=bpy.data.collections.new('STUDIO • Preview'); bpy.context.scene.collection.children.link(studio)
def move_studio(ob):
    for old in list(ob.users_collection): old.objects.unlink(ob)
    studio.objects.link(ob)
def aim(ob,point): ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()
def light(name,loc,power,size,color):
    d=bpy.data.lights.new(name,'AREA'); d.energy=power; d.shape='DISK'; d.size=size; d.color=color
    ob=bpy.data.objects.new(name,d); studio.objects.link(ob); ob.location=loc; aim(ob,(0,0,1.1))
light('Key • softbox',(-2.8,-3.2,4),420,3,(1,.88,.78))
light('Fill • softbox',(2,-2,2.4),260,2.5,(.72,.84,1))
light('Rim • softbox',(1,2.2,3.2),500,2,(.75,.86,1))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0))
floor=bpy.context.object; floor.name='Studio floor'; move_studio(floor)
fm,_,_=newmat('Studio | Charcoal',(.025,.032,.045,1),.85); floor.data.materials.append(fm)
d=bpy.data.cameras.new('Hailey • Full length'); cam=bpy.data.objects.new(d.name,d); studio.objects.link(cam)
cam.location=(2.5,-6.8,2.6); aim(cam,(0,0,.94)); d.type='ORTHO'; d.ortho_scale=2.13; d.lens=70
scene=bpy.context.scene; scene.camera=cam
scene.world.use_nodes=True; scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.16,.19,.24,1); scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.3
scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
scene.render.resolution_x=900; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath='<workspace>/hailey-work/hailey-full-preview.png'
for ob in bpy.context.selected_objects: ob.select_set(False)
bpy.context.view_layer.objects.active=bpy.data.objects['Hailey • Rig']
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.shading.type='MATERIAL'
            a.spaces.active.overlay.show_overlays=False
            a.spaces.active.region_3d.view_location=(0,0,.92)
            a.spaces.active.region_3d.view_distance=2.7
            a.spaces.active.clip_start=.001
            a.spaces.active.clip_end=100
bpy.ops.wm.save_as_mainfile(filepath='<workspace>/hailey-work/hailey-in-progress.blend')
print('Materials rebuilt; preview studio ready.')
