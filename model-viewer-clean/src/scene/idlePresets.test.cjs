const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const ts = require("typescript");
const root = path.resolve(__dirname, "../..");
require(path.join(root, "tools/register-mmd.cjs"));
const encode = source => "data:text/javascript;base64," + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText).toString("base64");

async function main() {
    const files = ["browser-idle-male.json", "browser-idle-female.json", "browser-idle-dwarf2.json"];
    const clips = files.map(file => JSON.parse(fs.readFileSync(path.join(root, "res/animations", file))));
    const source = "<home>/Documents/Codex/2026-10-09/so-x20/outputs/animation-test-world/src/assets/tagged-character.glb";
    if (fs.existsSync(source)) {
        const hash = crypto.createHash("sha256").update(fs.readFileSync(source)).digest("hex");
        clips.forEach(clip => assert.equal(clip.sourceSha256, hash, "clips originate from the tested browser character"));
    }
    assert.deepEqual(clips.map(clip => clip.frameCount), [251, 181, 201]);
    const sequenceUrl = encode(fs.readFileSync(path.join(__dirname, "idleSequence.ts"), "utf8"));
    const behaviorUrl = encode(fs.readFileSync(path.join(__dirname, "idleBehavior.ts"), "utf8"));
    const { SelectedIdleLoop, IdleAttention } = await import(behaviorUrl);
    const loop = new SelectedIdleLoop(clips);
    for (let i = 0; i < 3; i++) {
        loop.select(i, true);
        for (let step = 0; step < 1000; step++) {
            const state = loop.advance(1 / 60);
            assert.equal(state.primary.clipIndex, i);
            assert.equal(state.secondary, undefined);
            assert.equal(state.holding, false);
            assert.ok(state.primary.time >= 0 && state.primary.time < (clips[i].frameCount - 1) / clips[i].fps);
        }
    }
    loop.select(0); loop.advance(0.2); loop.select(1); loop.select(2);
    for (let i = 0; i < 100; i++) loop.advance(1 / 60);
    assert.equal(loop.getState().primary.clipIndex, 2, "rapid switches resolve to the final requested preset");
    assert.equal(loop.getState().secondary, undefined);
    for (const style of ["male", "female", "dwarf2"]) {
        const attention = new IdleAttention(() => 0.4);
        attention.setStyle(style);
        let glances = 0, mouseFrames = 0;
        for (let frame = 0; frame < 1800; frame++) {
            attention.setPointer(1, 1, true);
            attention.advance(1 / 60);
            const state = attention.getState();
            if (state.phase === "glance") glances++;
            if (state.mouseLook) mouseFrames++;
            assert.equal(state.sensitivity, 0.35);
            assert.ok(Math.abs(state.yaw) <= 42 * Math.PI / 180 * 0.35 + 1e-8);
            assert.ok(Math.abs(state.pitch) <= 25 * Math.PI / 180 * 0.35 + 1e-8);
        }
        assert.ok(glances > 0 && glances < 1200, "attention alternates relaxed rests and glances");
        assert.equal(mouseFrames > 0, style === "male", "only male occasionally follows the pointer");
        attention.setPointer(0, 0, false); attention.advance(1 / 60);
        assert.equal(attention.getState().mouseLook, false, "leaving the character cancels mouse targeting");
    }
    globalThis.__idlePresetClips = Object.fromEntries(files.map((file, index) => [file, clips[index]]));
    let sourceCode = fs.readFileSync(path.join(__dirname, "idleMotion.ts"), "utf8")
        .replace(/import (\w+) from "\.\.\/\.\.\/res\/animations\/([^"]+)";/g, (_, name, file) => `const ${name} = globalThis.__idlePresetClips[${JSON.stringify(file)}];`)
        .replace('"./idleSequence"', JSON.stringify(sequenceUrl))
        .replace('"./idleBehavior"', JSON.stringify(behaviorUrl))
        .replace('"@babylonjs/core/Maths/math.vector"', JSON.stringify(pathToFileURL(require.resolve("@babylonjs/core/Maths/math.vector.js")).href));
    const { IdleMotion } = await import(encode(sourceCode));
    const { NullEngine } = await import("@babylonjs/core/Engines/nullEngine.js");
    const { Scene } = await import("@babylonjs/core/scene.js");
    const { SceneLoader } = await import("@babylonjs/core/Loading/sceneLoader.js");
    const { Quaternion, Vector3, Matrix } = await import("@babylonjs/core/Maths/math.vector.js");
    await import("@babylonjs/loaders/glTF/index.js");
    SceneLoader.OnPluginActivatedObservable.add(plugin => { plugin.skipMaterials = true; });
    const engine = new NullEngine(), scene = new Scene(engine);
    const bytes = fs.readFileSync(path.join(root, "../Mighty Chat/Sources/Characters/hailey/hailey.glb"));
    const loaded = await SceneLoader.ImportMeshAsync(null, "", "data:;base64," + bytes.toString("base64"), scene, null, ".glb");
    loaded.animationGroups.forEach(group => group.stop());
    const skeleton = loaded.skeletons[0], node = name => skeleton.bones.find(bone => bone.name === name).getTransformNode();
    const position = name => node(name).computeWorldMatrix(true).getTranslation();
    const neutral = skeleton.bones.map(bone => bone.getTransformNode().rotationQuaternion.clone());
    const important = ["Bip001-Head", "Bip001-L-Hand", "Bip001-R-Hand", "Bip001-L-Foot", "Bip001-R-Foot"];
    const driver = new IdleMotion({ random: () => 0.4 });
    for (const clip of driver.clips) for (const frames of Object.values(clip.tracks)) {
        assert.ok(Math.abs(Quaternion.Dot(Quaternion.FromArray(frames[0]).normalize(), Quaternion.FromArray(frames.at(-1)).normalize())) > 1 - 1e-8, "every loop seam returns to its first rotation");
    }
    for (const style of ["male", "female", "dwarf2"]) {
        driver.setStyle(style);
        driver.applySkeleton(skeleton, 0, { rightHanded: true });
        assert.equal(driver.getState().primary.clipIndex, ["male", "female", "dwarf2"].indexOf(style));
        assert.ok(Math.abs(Quaternion.Dot(node("Bip001-L-UpperArm").rotationQuaternion, neutral[skeleton.bones.findIndex(bone => bone.name === "Bip001-L-UpperArm")] )) < 0.97, "the first rendered frame already has an idle pose, not the bind pose");
        const previous = new Map();
        let maxStep = 0, maxSeamStep = 0, previousTime = 0;
        const toes = [Infinity, -Infinity];
        for (let frame = 0; frame < 1800; frame++) {
            driver.setPointer(0.8, 0.5, true);
            driver.applySkeleton(skeleton, 1 / 60, { rightHanded: true });
            const time = driver.getState().primary.time;
            for (const name of important) {
                const point = position(name);
                assert.ok(point.asArray().every(Number.isFinite));
                if (previous.has(name)) {
                    const step = Vector3.Distance(point, previous.get(name));
                    maxStep = Math.max(maxStep, step);
                    if (time < previousTime) maxSeamStep = Math.max(maxSeamStep, step);
                }
                previous.set(name, point);
            }
            previousTime = time;
            for (const side of ["L", "R"]) { const y = position(`Bip001-${side}-Toe0`).y; toes[0] = Math.min(toes[0], y); toes[1] = Math.max(toes[1], y); }
            assert.ok(position("Bip001-Head").y - position("Bip001").y > 0.45, "the character stays upright");
            for (const bone of skeleton.bones) assert.ok(Math.abs(bone.getTransformNode().rotationQuaternion.length() - 1) < 1e-5, "rotation stays normalized across repeated glances");
        }
        assert.ok(maxStep < 0.025, `${style} has no visible joint jump: ${maxStep}m`);
        assert.ok(maxSeamStep < 0.015, `${style} wraps continuously: ${maxSeamStep}m`);
        assert.ok(toes[0] > -0.02 && toes[1] < 0.07, `${style} feet remain grounded: ${toes}`);
        console.log(`PASS: ${style}, 30 seconds of real Hailey motion; largest step ${(maxStep * 100).toFixed(2)}cm, seam ${(maxSeamStep * 100).toFixed(2)}cm; toe heights ${toes.map(value => value.toFixed(3))}`);
        driver.release();
    }
    driver.setStyle("female"); driver.applySkeleton(skeleton, 0, { rightHanded: true });
    const previous = new Map(); let maxSwitchStep = 0;
    for (let frame = 0; frame < 400; frame++) {
        if ([2, 4, 6, 10, 43, 44, 50].includes(frame)) driver.setStyle(["male", "dwarf2", "female"][frame % 3]);
        driver.applySkeleton(skeleton, 1 / 60, { rightHanded: true });
        for (const name of important) {
            const point = position(name);
            if (previous.has(name)) maxSwitchStep = Math.max(maxSwitchStep, Vector3.Distance(point, previous.get(name)));
            previous.set(name, point);
        }
    }
    assert.ok(maxSwitchStep < 0.04, `rapid preset switches remain continuous: ${maxSwitchStep}m`);
    // Real GLB: corrections survive animation writes and never compound on pause.
    driver.applySkeleton(skeleton, 0, {rightHanded:true});
    const baseline = node("Bip001-Spine3").rotationQuaternion.clone();
    driver.setBoneTuning({bones:{Spine2:[15,-8,4]}});
    driver.applySkeleton(skeleton, 0, {rightHanded:true});
    const corrected = node("Bip001-Spine3").rotationQuaternion.clone();
    assert.ok(Math.abs(Quaternion.Dot(baseline,corrected)) < 0.999, "bone correction changes the animated pose");
    for(let i=0;i<100;i++) driver.applySkeleton(skeleton, 0, {rightHanded:true});
    assert.ok(Math.abs(Quaternion.Dot(corrected,node("Bip001-Spine3").rotationQuaternion)) > 1-1e-8,"paused updates do not accumulate offsets");
    driver.setBoneTuning({enabled:false,bones:{Spine2:[15,-8,4]}});
    driver.applySkeleton(skeleton,0,{rightHanded:true});
    assert.ok(Math.abs(Quaternion.Dot(baseline,node("Bip001-Spine3").rotationQuaternion)) > 1-1e-8,"bypass restores the exact animated pose");
    driver.setBoneTuning({strength:0,bones:{Spine2:[45,45,45]}});
    driver.applySkeleton(skeleton,0,{rightHanded:true});
    assert.ok(Math.abs(Quaternion.Dot(baseline,node("Bip001-Spine3").rotationQuaternion)) > 1-1e-8,"zero strength restores the original pose");
    driver.setBoneTuning({bones:{Spine2:[NaN,0,0],Head:[Infinity,0,0],toString:[1,2,3],LeftArm:[10]}});
    driver.applySkeleton(skeleton,0,{rightHanded:true});
    assert.ok(Math.abs(Quaternion.Dot(baseline,node("Bip001-Spine3").rotationQuaternion)) > 1-1e-8,"malformed offsets are ignored");
    assert.ok(driver.getTunableBones().some(b=>b.source==="Spine2"),"the editor receives actual available bones");
    driver.setBoneTuning(null);
    driver.applySkeleton(skeleton,0,{rightHanded:true});
    const mathSource = fs.readFileSync(path.join(root,"../Mighty Chat/Renderer/PoseEditorMath.ts"),"utf8")
        .replace('"@babylonjs/core/Maths/math.vector"',JSON.stringify(pathToFileURL(require.resolve("@babylonjs/core/Maths/math.vector.js")).href));
    const {correctionAfterWorldDrag,degreesFromQuaternion} = await import(encode(mathSource));
    const headWorld = node("Bip001-Head").computeWorldMatrix(true).clone(), proxy = Quaternion.Identity();
    headWorld.decompose(undefined,proxy);
    const worldTurn = Quaternion.RotationAxis(Vector3.Up(),0.3);
    const headCorrection = correctionAfterWorldDrag(headWorld,proxy,worldTurn.multiply(proxy),Quaternion.Identity());
    driver.setBoneTuning({bones:{Head:degreesFromQuaternion(headCorrection)}});
    driver.applySkeleton(skeleton,0,{rightHanded:true});
    const finalHeadWorld = node("Bip001-Head").computeWorldMatrix(true);
    for(const axis of [Vector3.Right(),Vector3.Up(),Vector3.Forward()]){
        const expected = Vector3.TransformNormal(axis,headWorld).normalize().rotateByQuaternionToRef(worldTurn,Vector3.Zero());
        const actual = Vector3.TransformNormal(axis,finalHeadWorld).normalize();
        assert.ok(Vector3.Dot(expected,actual)>1-1e-6,"real GLB joint follows a world-space gizmo turn");
    }
    driver.setBoneTuning(null);
    console.log("PASS: real Hailey joint follows the rotation rings in world space, including its reflected root");
    console.log("PASS: real GLB bone tuning, exact bypass/reset, zero strength, invalid values and 100 nonaccumulating paused updates");
    driver.release();
    skeleton.bones.forEach((bone, index) => assert.ok(Math.abs(Quaternion.Dot(bone.getTransformNode().rotationQuaternion, neutral[index])) > 1 - 1e-6, "release restores every authored bone"));
    console.log(`PASS: rapid preset switching without snapping (largest joint step ${(maxSwitchStep * 100).toFixed(2)}cm); selected loop, exact sources, bounded 35% gaze, startup pose, and release`);
    // Match the native companion's imported-character orientation and camera.
    loaded.meshes[0].rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), Math.PI).multiply(loaded.meshes[0].rotationQuaternion ?? Quaternion.Identity());
    const faceForward = Vector3.TransformNormal(new Vector3(0, 0, -1), Matrix.Invert(node("Bip001-Head").computeWorldMatrix(true))).normalize();
    const glance = (x, y) => {
        const gaze = new IdleMotion({ random: () => 0.4 });
        gaze.setStyle("male"); gaze.applySkeleton(skeleton, 0, { rightHanded: true });
        for (let frame = 0; frame < 210; frame++) { gaze.setPointer(x, y, true); gaze.applySkeleton(skeleton, 1 / 60, { rightHanded: true }); }
        assert.equal(gaze.getIdleState().mouseLook, true);
        const direction = Vector3.TransformNormal(faceForward, node("Bip001-Head").computeWorldMatrix(true)).normalize();
        gaze.release();
        return direction;
    };
    const right = glance(1, 0), left = glance(-1, 0), up = glance(0, 1), down = glance(0, -1);
    assert.ok(right.x > left.x + 0.1, `the native character looks toward the pointer horizontally: right ${right.asArray()} left ${left.asArray()}`);
    assert.ok(up.y > down.y + 0.1, `the native character looks toward the pointer vertically: up ${up.asArray()} down ${down.asArray()}`);
    console.log("PASS: mouse glances follow both horizontal and vertical pointer direction in the native companion orientation");
    for (const [rigName,rigKey] of [["Lynae","ww/chars/Lynae/Lynae/Lynae.pmx"],["Evelyn","zzz/chars/Evelyn Chevalier/Evelyn.pmx"]]) {
        const rigPath = path.join(require("node:os").homedir(), "Library/Application Support/Mighty Chat/Character Assets", crypto.createHash("sha256").update(rigKey).digest("hex") + ".asset");
        if (!fs.existsSync(rigPath)) { console.log(`SKIP: ${rigName} is not cached`); continue; }
        const { PmxReader } = await import("babylon-mmd/esm/Loader/Parser/pmxReader.js");
        const { MmdRuntime } = await import("babylon-mmd/esm/Runtime/mmdRuntime.js");
        const { Skeleton } = await import("@babylonjs/core/Bones/skeleton.js");
        const { Bone } = await import("@babylonjs/core/Bones/bone.js");
        const { Mesh } = await import("@babylonjs/core/Meshes/mesh.js");
        const data = fs.readFileSync(rigPath);
        const pmx = await PmxReader.ParseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
        const rig = new Skeleton(rigName, rigName, scene), created = [];
        const make = index => {
            if (created[index]) return created[index];
            const bone = pmx.bones[index], parent = bone.parentBoneIndex >= 0 ? make(bone.parentBoneIndex) : null;
            const local = Vector3.FromArray(bone.position);
            if (parent) local.subtractInPlace(Vector3.FromArray(pmx.bones[bone.parentBoneIndex].position));
            return created[index] = new Bone(bone.name, rig, parent, Matrix.Translation(local.x, local.y, local.z));
        };
        pmx.bones.forEach((_, index) => make(index)); rig.bones = created;
        const mesh = new Mesh(rigName, scene);
        mesh.metadata = { isMmdModel: true, header: pmx.header, bones: pmx.bones, morphs: [], rigidBodies: [], joints: [], meshes: [mesh], materials: [], skeleton: rig };
        const runtime = new MmdRuntime(scene), model = runtime.createMmdModel(mesh);
        const glanceMmd = (x, y) => {
            const gaze = new IdleMotion({ random: () => 0.4 }); gaze.setStyle("male");
            for (let frame = 0; frame < 210; frame++) {
                gaze.setPointer(x, y, true); gaze.apply(model, 1 / 60, pmx.bones);
                model.beforePhysics(null); model.afterPhysics();
            }
            assert.equal(gaze.getIdleState().mouseLook, true);
            const head = model.runtimeBones.find(bone => bone.name === "頭");
            const direction = Vector3.TransformNormal(new Vector3(0, 0, -1), Matrix.FromArray(head.worldMatrix)).normalize();
            gaze.release(); return direction;
        };
        const pmxRight = glanceMmd(1, 0), pmxLeft = glanceMmd(-1, 0), pmxUp = glanceMmd(0, 1), pmxDown = glanceMmd(0, -1);
        assert.ok(pmxRight.x > pmxLeft.x + 0.1, `PMX turns toward horizontal pointer: ${pmxRight.asArray()} / ${pmxLeft.asArray()}`);
        assert.ok(pmxUp.y > pmxDown.y + 0.1, `PMX turns toward vertical pointer: ${pmxUp.asArray()} / ${pmxDown.asArray()}`);
        const tuned = new IdleMotion({attention:false});
        tuned.apply(model,0,pmx.bones);
        const chest = model.runtimeBones.find(b=>b.name==="上半身2");
        assert.ok(chest);
        const original = chest.linkedBone.rotationQuaternion.clone();
        const source = tuned.getTunableBones().find(b=>b.name===chest.name).source;
        tuned.setBoneTuning({bones:{[source]:[12,0,0]}});
        tuned.apply(model,0,pmx.bones); model.beforePhysics(null); model.afterPhysics();
        const corrected = chest.linkedBone.rotationQuaternion.clone();
        assert.ok(Math.abs(Quaternion.Dot(original,corrected)) < 0.999,"MMD runtime keeps the bone adjustment");
        for(let i=0;i<100;i++){tuned.apply(model,0,pmx.bones);model.beforePhysics(null);model.afterPhysics();}
        assert.ok(Math.abs(Quaternion.Dot(corrected,chest.linkedBone.rotationQuaternion)) > 1-1e-8,"MMD pause does not compound offsets");
        tuned.setBoneTuning({});tuned.apply(model,0,pmx.bones);model.beforePhysics(null);model.afterPhysics();
        assert.ok(Math.abs(Quaternion.Dot(original,chest.linkedBone.rotationQuaternion)) > 1-1e-8,"MMD reset restores original pose");
        const headBone = model.runtimeBones.find(b=>b.name==="頭");
        const beforeWorld = headBone.getWorldMatrixToRef(Matrix.Identity()).multiply(mesh.computeWorldMatrix(true));
        const mmdProxy = Quaternion.Identity();beforeWorld.decompose(undefined,mmdProxy);
        const turn = Quaternion.RotationAxis(Vector3.Up(),.25);
        const headOffset = correctionAfterWorldDrag(beforeWorld,mmdProxy,turn.multiply(mmdProxy),Quaternion.Identity());
        tuned.setBoneTuning({bones:{Head:degreesFromQuaternion(headOffset)}});
        tuned.apply(model,0,pmx.bones);model.beforePhysics(null);model.afterPhysics();
        const afterWorld = headBone.getWorldMatrixToRef(Matrix.Identity()).multiply(mesh.computeWorldMatrix(true));
        for(const axis of [Vector3.Right(),Vector3.Up(),Vector3.Forward()]){
            const expected=Vector3.TransformNormal(axis,beforeWorld).normalize().rotateByQuaternionToRef(turn,Vector3.Zero());
            const actual=Vector3.TransformNormal(axis,afterWorld).normalize();
            assert.ok(Vector3.Dot(expected,actual)>1-1e-6,"real MMD joint follows a world-space ring turn");
        }
        tuned.release();
        console.log(`PASS: actual ${rigName} MMD bone follows world-space rotation rings`);
        console.log(`PASS: actual ${rigName} MMD runtime bone tuning, nonaccumulation and reset`);
        runtime.dispose(scene);
        console.log(`PASS: ${rigName} actual PMX runtime follows horizontal and vertical pointer direction`);
    }
    engine.dispose();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
