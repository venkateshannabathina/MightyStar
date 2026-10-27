"""Derive browser-ready textures from the character's supplied packed maps.

Procedural colors are evaluated onto their original DiffuseUV texture domain.
DirectX normals have green flipped once to the glTF/OpenGL convention.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

SOURCE = Path('<home>/Downloads/Raw Files')
OUT = Path('<workspace>/mighty-idle-assets-work/textures')
OUT.mkdir(parents=True, exist_ok=True)

def read(name):
    return Image.open(SOURCE / name).convert('RGBA')

def linear_to_srgb(c):
    return np.where(c <= .0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - .055)

def png(arr, name):
    Image.fromarray(np.round(np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(OUT / name, optimize=True)

records = []
for part, skin in [('Body', True), ('PartA', False), ('PartB', False), ('Face', True)]:
    prefix = 'PC_016_A_Body_000_' + part
    color = 'PC_016_Makeup_Face_002A_C.tga' if part == 'Face' else prefix + '_C.tga'
    normal = 'PC_016_A0101_Face_N.tga' if part == 'Face' else prefix + '_N.tga'
    packed = 'PC_016_Makeup_Face_002A_P.tga' if part == 'Face' else prefix + ('_P.tga' if skin else '_ID.tga')
    read(color).convert('RGB').save(OUT / (part + '-color.jpg'), quality=93, subsampling=0, optimize=True)
    n = np.asarray(read(normal)).copy()
    n[..., 1] = 255 - n[..., 1]
    n[..., 3] = 255
    Image.fromarray(n).convert('RGB').save(OUT / (part + '-normal.png'), optimize=True)
    p = np.asarray(read(packed)) / 255
    rough = (.38 + .20 * p[..., 1]) if part == 'Face' else (.40 + .18 * p[..., 1]) if skin else (.38 + .24 * p[..., 2])
    orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough)], -1)
    png(orm, part + '-orm.png')
    if not skin:
        read(prefix + '_FX.tga').convert('RGB').save(OUT / (part + '-emission.jpg'), quality=95, subsampling=0, optimize=True)
    records.append({'part':part,'color':color,'normal':normal,'derivedRoughness':packed})

# Hair color ramp is linear RGB; alpha already is strand coverage.
p = np.asarray(read('PC_016_A_VAR_Head_000A_Hair_P.tga')) / 255
t = np.clip((p[..., 0] - .05) / .90, 0, 1)[..., None]
color = np.array([.016, .008, .004]) * (1 - t) + np.array([.11, .052, .025]) * t
png(np.concatenate([linear_to_srgb(color), p[..., 3:4]], -1), 'Hair-color-alpha.png')

# Reproduce the radial eye shader's UV scale, mask and iris ramp into one map.
size = 1024
yy, xx = np.mgrid[0:size, 0:size]
u = (xx + .5) / size
v = 1 - (yy + .5) / size
iris = np.asarray(read('PC_016_Makeup_PT_Iris_A_002A_H.tga').convert('RGB'), dtype=float) / 255
su = np.clip((u - .5) * 2.1 + .5, 0, 1)
sv = np.clip((v - .5) * 2.1 + .5, 0, 1)
sx = np.clip(su * (iris.shape[1] - 1), 0, iris.shape[1] - 1)
sy = np.clip((1 - sv) * (iris.shape[0] - 1), 0, iris.shape[0] - 1)
x0, y0 = sx.astype(int), sy.astype(int)
x1, y1 = np.minimum(x0 + 1, iris.shape[1] - 1), np.minimum(y0 + 1, iris.shape[0] - 1)
tx, ty = (sx - x0)[..., None], (sy - y0)[..., None]
sample = (iris[y0, x0]*(1-tx)+iris[y0, x1]*tx)*(1-ty)+(iris[y1, x0]*(1-tx)+iris[y1, x1]*tx)*ty
fac = np.sum(sample * np.array([.2126, .7152, .0722]), -1)
t = np.clip((fac - .05) / .8, 0, 1)[..., None]
color = np.array([.001, .002, .003]) * (1-t) + np.array([.13, .23, .29])*t
mask = np.sqrt((u-.5)**2 + (v-.5)**2) < .205
color[~mask] = [.68, .64, .6]
png(linear_to_srgb(color), 'Eyes-color.png')
(OUT.parent / 'texture-export-report.json').write_text(json.dumps(records, indent=2))
print('Prepared', len(list(OUT.iterdir())), 'browser textures')
