import bpy,json
from pathlib import Path
report={'objects':[], 'materials':[],'images':[]}
for o in bpy.context.scene.objects:
 x={'name':o.name,'type':o.type,'visible':not o.hide_render,'hideViewport':o.hide_viewport,'hideSet':o.hide_get(),'collections':[c.name for c in o.users_collection],'matrix': [list(v) for v in o.matrix_world]}
 if o.type=='ARMATURE':
  x.update(bones=[b.name for b in o.data.bones],action=o.animation_data.action.name if o.animation_data and o.animation_data.action else None,pose=[{'name':b.name,'basis':[list(v) for v in b.matrix_basis]} for b in o.pose.bones if b.matrix_basis!=__import__('mathutils').Matrix.Identity(4)])
 if o.type=='MESH': x.update(materials=[m.name if m else None for m in o.data.materials],uvs=[u.name for u in o.data.uv_layers],modifiers=[{'type':m.type,'object':getattr(getattr(m,'object',None),'name',None)} for m in o.modifiers],vertices=len(o.data.vertices))
 report['objects'].append(x)
for m in bpy.data.materials:
 report['materials'].append({'name':m.name,'nodes':[{'name':n.name,'type':n.type,'image':n.image.name if n.type=='TEX_IMAGE' and n.image else None,'inputs':{i.name:list(i.default_value) if hasattr(i.default_value,'__len__') else i.default_value for i in n.inputs if hasattr(i,'default_value') and not i.is_linked and isinstance(i.default_value,(int,float,tuple,list))}} for n in m.node_tree.nodes] if m.use_nodes else [],'links':[(l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in m.node_tree.links] if m.use_nodes else []})
for i in bpy.data.images: report['images'].append({'name':i.name,'filepath':i.filepath,'size':list(i.size),'packed':bool(i.packed_file),'colorspace':i.colorspace_settings.name})
Path('<workspace>/mighty-idle-assets-work/inventory.json').write_text(json.dumps(report,indent=2))
print('REPORT_WRITTEN')
