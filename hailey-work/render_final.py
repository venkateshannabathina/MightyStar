import bpy, json, os
scene=bpy.context.scene
report={
    'filepath':bpy.data.filepath,
    'packed_images':sum(bool(i.packed_file) for i in bpy.data.images),
    'unpacked_images':[i.name for i in bpy.data.images if i.source=='FILE' and not i.packed_file],
    'armatures':[(o.name,len(o.data.bones)) for o in scene.objects if o.type=='ARMATURE'],
    'character_meshes':len([o for o in scene.objects if o.type=='MESH' and 'source_fbx' in o]),
}
open('<workspace>/hailey-work/reopen-verification.json','w').write(json.dumps(report,indent=2))
scene.cycles.samples=24
scene.render.resolution_x=800
scene.render.resolution_y=1000
scene.camera=bpy.data.objects['Hailey • Full length']
scene.render.filepath='<workspace>/hailey-preview.png'
bpy.ops.render.render(write_still=True)
scene.camera=bpy.data.objects['Hailey • Portrait']
scene.render.resolution_x=760
scene.render.resolution_y=900
scene.render.filepath='<workspace>/hailey-work/hailey-portrait.png'
bpy.ops.render.render(write_still=True)
print('VERIFIED',json.dumps(report))
