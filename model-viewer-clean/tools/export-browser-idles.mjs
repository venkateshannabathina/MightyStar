// Extract the exact tested browser clips into the application's retarget format.
// Usage: node tools/export-browser-idles.mjs /path/to/browser/src/assets
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader.js';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import '@babylonjs/loaders/glTF/index.js';

const directory = process.argv[2];
if (!directory) throw new Error('Pass the browser test world assets directory.');
const bytes = fs.readFileSync(path.join(directory, 'tagged-character.glb'));
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'tagged-manifest.json')));
const engine = new NullEngine();
const scene = new Scene(engine);
scene.useRightHandedSystem = true;
SceneLoader.OnPluginActivatedObservable.add(plugin => { plugin.skipMaterials = true; });
const loaded = await SceneLoader.ImportMeshAsync(null, '', 'data:;base64,' + bytes.toString('base64'), scene, null, '.glb');
loaded.animationGroups.forEach(group => group.stop());
const bones = loaded.skeletons[0].bones;
const clean = name => name.replace(/^.*:/, '').replace(/^mixamorig/, '');
const selected = bones.filter(bone => /^(Hips|Spine\d?|Neck|Head|(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand.*|UpLeg|Leg|Foot|ToeBase))$/.test(clean(bone.name)));
const absolute = (bone, rest, cache) => {
    if (cache.has(bone)) return cache.get(bone);
    const node = bone.getTransformNode();
    const matrix = rest ? bone.getRestMatrix().clone() : Matrix.Compose(node.scaling, node.rotationQuaternion ?? Quaternion.FromEulerVector(node.rotation), node.position);
    if (bone.getParent()) matrix.multiplyToRef(absolute(bone.getParent(), rest, cache), matrix);
    cache.set(bone, matrix);
    return matrix;
};
const restCache = new Map();
const rest = new Map(bones.map(bone => {
    const matrix = absolute(bone, true, restCache), rotation = Quaternion.Identity(), position = Vector3.Zero();
    matrix.decompose(undefined, rotation, position);
    return [bone, { rotation, position }];
}));
const rounded = values => values.map(value => Math.round(value * 1e7) / 1e7);
const vector = point => rounded([point.x, point.y, -point.z]);
const restPositions = Object.fromEntries(selected.map(bone => [clean(bone.name), vector(rest.get(bone).position)]));
const children = { Hips: 'Spine', Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head' };
for (const side of ['Left', 'Right']) {
    for (const [a, b] of [['Shoulder','Arm'], ['Arm','ForeArm'], ['ForeArm','Hand'], ['Hand','HandMiddle1'], ['UpLeg','Leg'], ['Leg','Foot'], ['Foot','ToeBase']]) children[side + a] = side + b;
    for (const finger of ['Thumb','Index','Middle','Ring','Pinky']) for (let joint = 1; joint <= 3; joint++) children[side + 'Hand' + finger + joint] = side + 'Hand' + finger + (joint + 1);
}
const restDirections = Object.fromEntries(selected.map(bone => {
    const child = bones.find(candidate => clean(candidate.name) === children[clean(bone.name)]) ?? bones.find(candidate => candidate.getParent() === bone);
    const direction = child ? rest.get(child).position.subtract(rest.get(bone).position).normalize() : Vector3.Up();
    return [clean(bone.name), vector(direction)];
}));
for (const id of ['male', 'female', 'dwarf2']) {
    const info = manifest.clips.find(clip => clip.id === id);
    const group = loaded.animationGroups.find(group => group.name === info.animation);
    if (!group) throw new Error('Missing source animation ' + id);
    const fps = 30, frameCount = Math.round(info.duration * fps) + 1;
    const tracks = Object.fromEntries(selected.map(bone => [clean(bone.name), []]));
    const positions = Object.fromEntries(selected.map(bone => [clean(bone.name), []]));
    group.start(false);
    group.pause();
    const animationFps = group.targetedAnimations[0].animation.framePerSecond;
    for (let frame = 0; frame < frameCount; frame++) {
        group.goToFrame(group.from + frame / fps * animationFps);
        const cache = new Map();
        for (const bone of selected) {
            const rotation = Quaternion.Identity(), position = Vector3.Zero();
            absolute(bone, false, cache).decompose(undefined, rotation, position);
            const delta = rotation.multiply(rest.get(bone).rotation.conjugate()).normalize();
            tracks[clean(bone.name)].push(rounded([-delta.x, -delta.y, delta.z, delta.w]));
            positions[clean(bone.name)].push(vector(position));
        }
    }
    group.stop();
    const output = { name: info.animation, source: info.source, sourceAsset: 'animation-test-world/tagged-character.glb', sourceSha256: crypto.createHash('sha256').update(bytes).digest('hex'), fps, frameCount, space: 'absolute-rest-delta', restPositions, restDirections, tracks, positions };
    fs.writeFileSync(new URL('../res/animations/browser-idle-' + id + '.json', import.meta.url), JSON.stringify(output));
    console.log(id, info.animation, frameCount, 'frames;', selected.length, 'bones;', info.duration, 'seconds');
}
engine.dispose();
