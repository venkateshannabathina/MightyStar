const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
require(path.join(root, "tools/register-mmd.cjs"));
const encode = source => "data:text/javascript;base64," + Buffer.from(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText).toString("base64");

async function main() {
    const sequenceUrl = encode(fs.readFileSync(path.join(__dirname, "idleSequence.ts"), "utf8"));
    const { IdleSequence } = await import(sequenceUrl);
    const clipFiles = ["dwarf-idle.json", "dwarf-idle-2.json"];
    const clips = clipFiles.map(file => JSON.parse(fs.readFileSync(path.join(root, "res/animations", file))));
    const sequence = new IdleSequence(clips);
    const order = [0];
    let last = 0;
    for (let frame = 0; frame < 6000; frame++) {
        const state = sequence.advance(1 / 60);
        assert.ok(state.blend >= 0 && state.blend <= 1);
        assert.equal(state.reacting, false);
        for (const phase of [state.primary, state.secondary].filter(Boolean)) {
            assert.ok(phase.clipIndex === 0 || phase.clipIndex === 1);
            assert.equal(phase.clipStart, 0);
            assert.equal(phase.clipEnd, sequence.duration(phase.clipIndex));
            assert.ok(phase.time >= -1e-8, "full clips start at frame zero");
            assert.ok(phase.time <= sequence.duration(phase.clipIndex) + 1e-8);
        }
        if (!state.secondary && state.primary.clipIndex !== last) {
            order.push(state.primary.clipIndex);
            last = state.primary.clipIndex;
        }
    }
    assert.deepEqual(order.slice(0, 7), [0, 1, 0, 1, 0, 1, 0]);
    sequence.reset();
    assert.equal(sequence.getState().primary.time, 0);
    const authored = sequence.advance(0.5);
    assert.equal(authored.stage, "animation");
    assert.equal(authored.primary.time, 0.5, "clips play at authored speed without retiming");
    const endpoint = sequence.advance(sequence.duration(0) - 0.5);
    assert.equal(endpoint.stage, "hold");
    assert.equal(endpoint.primary.time, sequence.duration(0));
    const held = sequence.advance(2.9);
    assert.equal(held.stage, "hold");
    assert.equal(held.primary.time, endpoint.primary.time, "the final pose is held exactly");
    assert.equal(held.holdElapsed, 2.9);
    assert.equal(sequence.setHovered(true), false, "hover playback is disabled");
    assert.deepEqual(sequence.getState(), held, "hover cannot alter the loop");
    assert.equal(sequence.advance(0.1).stage, "transition");
    const middle = sequence.advance(0.325);
    assert.ok(Math.abs(middle.blend - 0.5) < 1e-8);
    assert.equal(middle.primary.clipIndex, 0); assert.equal(middle.secondary.clipIndex, 1);
    assert.equal(middle.primary.time, sequence.duration(0), "outgoing pose remains at its endpoint");
    assert.equal(middle.secondary.time, 0, "incoming animation remains at its first pose during the blend");
    const second = sequence.advance(0.325);
    assert.equal(second.primary.clipIndex, 1); assert.equal(second.stage, "animation");
    assert.equal(second.primary.time, 0, "the complete next animation starts after the transition");
    const nearEnd = sequence.advance(sequence.duration(1) - 0.1);
    assert.equal(nearEnd.stage, "animation", "the entire clip plays after the blend");
    assert.ok(nearEnd.primary.time < sequence.duration(1));
    assert.equal(sequence.advance(0.1).stage, "hold");
    const snapshot = sequence.getState();
    sequence.advance(2);
    assert.equal(sequence.getState().primary.time, snapshot.primary.time);
    const single = new IdleSequence([clips[0]]);
    single.advance(single.duration(0) * 8);
    assert.equal(single.getState().primary.clipIndex, 0, "single-clip clients remain supported");
    const badDelta = single.getState();
    single.advance(NaN);
    assert.deepEqual(single.getState(), badDelta);
    const { Quaternion: SampleQuaternion } = await import("@babylonjs/core/Maths/math.vector.js");
    const sample = (phase, bone) => {
        const clip = clips[phase.clipIndex], frames = clip.tracks[bone];
        const frame = Math.min(phase.time * clip.fps, frames.length - 1), first = Math.floor(frame), next = Math.min(first + 1, frames.length - 1);
        return SampleQuaternion.Slerp(SampleQuaternion.FromArray(frames[first]), SampleQuaternion.FromArray(frames[next]), frame - first).normalize();
    };
    const pose = (state, bone) => state.secondary ? SampleQuaternion.Slerp(sample(state.primary, bone), sample(state.secondary, bone), state.blend).normalize() : sample(state.primary, bone);
    const continuity = new IdleSequence(clips);
    for (let transition = 0; transition < 8; transition++) {
        const clip = continuity.getState().primary.clipIndex;
        continuity.advance(continuity.duration(clip) + 3 - (transition === 0 ? 1e-6 : 2e-6));
        const before = continuity.getState(), after = continuity.advance(2e-6);
        for (const bone of Object.keys(clips[0].tracks)) assert.ok(Math.abs(SampleQuaternion.Dot(pose(before, bone), pose(after, bone))) > 1 - 1e-8, "crossfade starts continuously");
        continuity.advance(0.65 - 2e-6);
        const beforeEnd = continuity.getState(), afterEnd = continuity.advance(2e-6);
        for (const bone of Object.keys(clips[0].tracks)) assert.ok(Math.abs(SampleQuaternion.Dot(pose(beforeEnd, bone), pose(afterEnd, bone))) > 1 - 1e-8, "crossfade ends continuously");
    }

    globalThis.__idleTestClips = Object.fromEntries([...clipFiles, "browser-idle-male.json", "browser-idle-female.json", "browser-idle-dwarf2.json"].map(name => [name, JSON.parse(fs.readFileSync(path.join(root, "res/animations", name)))]));
    const behaviorUrl = encode(fs.readFileSync(path.join(__dirname, "idleBehavior.ts"), "utf8"));
    let motionSource = fs.readFileSync(path.join(__dirname, "idleMotion.ts"), "utf8");
    motionSource = motionSource.replace(/import (\w+) from "\.\.\/\.\.\/res\/animations\/([^"]+)";/g, (_, name, file) => `const ${name} = globalThis.__idleTestClips[${JSON.stringify(file)}];`);
    motionSource = motionSource.replace('"./idleSequence"', JSON.stringify(sequenceUrl));
    motionSource = motionSource.replace('"./idleBehavior"', JSON.stringify(behaviorUrl));
    motionSource = motionSource.replace('"@babylonjs/core/Maths/math.vector"', JSON.stringify(pathToFileURL(require.resolve("@babylonjs/core/Maths/math.vector.js")).href));
    const { IdleMotion } = await import(encode(motionSource));
    const { NullEngine } = await import("@babylonjs/core/Engines/nullEngine.js");
    const { Scene } = await import("@babylonjs/core/scene.js");
    const { Skeleton } = await import("@babylonjs/core/Bones/skeleton.js");
    const { Bone } = await import("@babylonjs/core/Bones/bone.js");
    const { Matrix, Quaternion, Vector3 } = await import("@babylonjs/core/Maths/math.vector.js");
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const sparse = new Skeleton("incomplete", "incomplete", scene);
    const hips = new Bone("Hips", sparse, null, Matrix.Translation(0, 1, 0));
    const head = new Bone("Head", sparse, hips, Matrix.Translation(0, 0.65, 0));
    const original = [hips, head].map(bone => bone.getRotationQuaternion().clone());
    const driver = new IdleMotion({ clips });
    for (let frame = 0; frame < 2400; frame++) {
        driver.applySkeleton(sparse, 1 / 60, { rightHanded: false });
        if (frame === 120) assert.equal(driver.setHovered(true), false);
        for (const bone of sparse.bones) {
            const values = bone.getRotationQuaternion().asArray();
            assert.ok(values.every(Number.isFinite));
            assert.ok(Math.abs(Math.hypot(...values) - 1) < 1e-6);
            assert.ok(bone.position.length() < 3, "root displacement stays proportional to target height");
        }
    }
    driver.release();
    sparse.bones.forEach((bone, index) => assert.ok(Math.abs(Quaternion.Dot(bone.getRotationQuaternion(), original[index])) > 1 - 1e-8));
    assert.ok(Vector3.Distance(hips.position, new Vector3(0, 1, 0)) < 1e-8, "release restores the root position");
    const { Mesh } = await import("@babylonjs/core/Meshes/mesh.js");
    const { MmdRuntime } = await import("babylon-mmd/esm/Runtime/mmdRuntime.js");
    const mmdSkeleton = new Skeleton("MMD", "MMD", scene);
    const specifications = [
        ["センター", -1, [0, 1, 0]], ["下半身", 0, [0, 1, 0]], ["上半身", 0, [0, 1.1, 0]],
        ["首", 2, [0, 1.5, 0]], ["頭", 3, [0, 1.65, 0]],
        ["左腕", 2, [0.15, 1.45, 0]], ["左ひじ", 5, [0.4, 1.45, 0]], ["左手首", 6, [0.65, 1.45, 0]],
        ["左腕捩", 5, [0.3, 1.45, 0]], ["左中指１", 7, [0.73, 1.45, 0]],
        ["右腕", 2, [-0.15, 1.45, 0]], ["右ひじ", 10, [-0.4, 1.45, 0]], ["右手首", 11, [-0.65, 1.45, 0]],
        ["左足", 1, [0.09, 1, 0]], ["左ひざ", 13, [0.09, 0.55, 0]], ["左足首", 14, [0.09, 0.1, 0]],
        ["右足", 1, [-0.09, 1, 0]], ["右ひざ", 16, [-0.09, 0.55, 0]], ["右足首", 17, [-0.09, 0.1, 0]]
    ];
    const metadata = specifications.map(([name, parentBoneIndex, position], index) => ({
        name, englishName: "", parentBoneIndex, position, transformOrder: index,
        flag: index === 8 ? 0x11e : 0x1e, tailPosition: [0, 0.1, 0],
        ...(index === 8 ? { appendTransform: { parentIndex: 5, ratio: 0.5 } } : {})
    }));
    metadata.forEach((bone, index) => {
        const local = Vector3.FromArray(bone.position);
        if (bone.parentBoneIndex >= 0) local.subtractInPlace(Vector3.FromArray(metadata[bone.parentBoneIndex].position));
        new Bone(bone.name, mmdSkeleton, bone.parentBoneIndex >= 0 ? mmdSkeleton.bones[bone.parentBoneIndex] : null, Matrix.Translation(local.x, local.y, local.z));
        assert.equal(mmdSkeleton.bones[index].name, bone.name);
    });
    const mmdMesh = new Mesh("MMD", scene);
    mmdMesh.metadata = { isMmdModel: true, header: { modelName: "test", englishModelName: "test", comment: "", englishComment: "" }, bones: metadata, morphs: [], rigidBodies: [], joints: [], meshes: [mmdMesh], materials: [], skeleton: mmdSkeleton };
    const runtime = new MmdRuntime(scene), model = runtime.createMmdModel(mmdMesh);
    const mmdDriver = new IdleMotion({ clips });
    const ik = model.ikSolverStates.slice();
    for (let frame = 0; frame < 2400; frame++) {
        mmdDriver.apply(model, 1 / 60, metadata);
        if (frame === 300) assert.equal(mmdDriver.setHovered(true), false);
        model.beforePhysics(null); model.afterPhysics();
        for (const bone of model.runtimeBones) {
            assert.ok([...bone.worldMatrix].every(Number.isFinite));
            assert.ok(Math.abs(Math.hypot(...bone.linkedBone.rotationQuaternion.asArray()) - 1) < 1e-5);
        }
        const headWorld = Vector3.Zero(); model.runtimeBones[4].getWorldTranslationToRef(headWorld);
        assert.ok(headWorld.y > 1.4 && headWorld.length() < 2, "MMD torso siblings and append rotation remain stable");
    }
    mmdDriver.release();
    assert.deepEqual(model.ikSolverStates, ik);
    assert.ok(Vector3.Distance(mmdSkeleton.bones[0].position, new Vector3(0, 1, 0)) < 1e-8);
    runtime.dispose(scene);
    console.log("PASS: actual MMD runtime solves torso siblings and append bones through the two full authored clips, then restores the rig");
    const glbPath = path.join(root, "../Mighty Chat/Sources/Characters/hailey/hailey.glb");
    if (fs.existsSync(glbPath)) {
        await import("@babylonjs/loaders/glTF/index.js");
        const { SceneLoader } = await import("@babylonjs/core/Loading/sceneLoader.js");
        SceneLoader.OnPluginActivatedObservable.add(plugin => { plugin.skipMaterials = true; });
        const glb = fs.readFileSync(glbPath);
        const loaded = await SceneLoader.ImportMeshAsync(null, "", "data:;base64," + glb.toString("base64"), scene, null, ".glb");
        const skeleton = loaded.skeletons[0];
        const neutral = skeleton.bones.map(bone => bone.getTransformNode().rotationQuaternion.clone());
        const node = name => skeleton.bones.find(bone => bone.name === name).getTransformNode();
        const position = name => node(name).computeWorldMatrix(true).getTranslation();
        let largestStep = 0, largestStepDetail, worstAlignment = 1;
        const feet = { left: [Infinity, -Infinity], right: [Infinity, -Infinity] };
        const toes = { left: [Infinity, -Infinity], right: [Infinity, -Infinity] };
        const toeNeutral = { left: position("Bip001-L-Toe0").y, right: position("Bip001-R-Toe0").y };
        const previous = new Map();
        const leftHandMotion = [];
        const glbDriver = new IdleMotion({ clips });
        let heldPose, heldClip = -1, heldFrames = 0, previousHolding = false;
        const important = ["Bip001-Head", "Bip001-L-Hand", "Bip001-R-Hand", "Bip001-L-Foot", "Bip001-R-Foot"];
        for (let frame = 0; frame < 3900; frame++) {
            glbDriver.applySkeleton(skeleton, 1 / 60, { rightHanded: true });
            if (frame === 300 || frame === 2200) { glbDriver.setHovered(false); assert.equal(glbDriver.setHovered(true), false); }
            for (const name of important) {
                const point = position(name);
                assert.ok(point.asArray().every(Number.isFinite));
                if (previous.has(name)) {
                    const step = Vector3.Distance(point, previous.get(name));
                    if (step > largestStep) { largestStep = step; largestStepDetail = { frame, name, state: glbDriver.getState() }; }
                }
                previous.set(name, point);
            }
            const headPosition = position("Bip001-Head"), hipsPosition = position("Bip001");
            if (frame > 50) {
                for (const [side, bone] of [["left", "Bip001-L-Foot"], ["right", "Bip001-R-Foot"]]) {
                    const height = position(bone).y;
                    feet[side][0] = Math.min(feet[side][0], height); feet[side][1] = Math.max(feet[side][1], height);
                }
                for (const [side, bone] of [["left", "Bip001-L-Toe0"], ["right", "Bip001-R-Toe0"]]) {
                    const height = position(bone).y;
                    toes[side][0] = Math.min(toes[side][0], height); toes[side][1] = Math.max(toes[side][1], height);
                }
            }
            assert.ok(headPosition.y - hipsPosition.y > 0.45, `Hailey's head stays above her hips: frame ${frame}, head=${headPosition.asArray()}, hips=${hipsPosition.asArray()}, state=${JSON.stringify(glbDriver.getState())}`);
            assert.ok(Math.abs(headPosition.x) < 0.5 && Math.abs(headPosition.z) < 0.5, "the body stays upright in the actual glTF hierarchy");
            const state = glbDriver.getState();
            if (frame > 100) leftHandMotion.push(position("Bip001-L-Hand").clone());
            if (state.holding) {
                const currentPose = important.map(name => position(name));
                if (previousHolding && heldClip === state.primary.clipIndex) {
                    currentPose.forEach((point, index) => assert.ok(Vector3.Distance(point, heldPose[index]) < 1e-6, "real GLB final pose stays frozen during its hold"));
                    heldFrames++;
                }
                heldPose = currentPose; heldClip = state.primary.clipIndex;
            }
            previousHolding = state.holding;
            if (frame > 50 && !state.secondary) {
                const phase = state.primary, clip = clips[phase.clipIndex], calibration = glbDriver.clipCalibrations[phase.clipIndex];
                const at = bone => {
                    const values = clip.positions[bone], f = Math.min(phase.time * clip.fps, values.length - 1), first = Math.floor(f), next = Math.min(first + 1, values.length - 1);
                    const point = Vector3.Lerp(Vector3.FromArray(values[first]), Vector3.FromArray(values[next]), f - first); point.z *= -1; return point;
                };
                const outer = skeleton.bones[0].getTransformNode().parent.computeWorldMatrix(true);
                for (const [sourceA, sourceB, targetA, targetB] of [["LeftArm", "LeftForeArm", "Bip001-L-UpperArm", "Bip001-L-Forearm"], ["LeftForeArm", "LeftHand", "Bip001-L-Forearm", "Bip001-L-Hand"], ["RightArm", "RightForeArm", "Bip001-R-UpperArm", "Bip001-R-Forearm"], ["RightForeArm", "RightHand", "Bip001-R-Forearm", "Bip001-R-Hand"]]) {
                    const expected = at(sourceB).subtract(at(sourceA)).rotateByQuaternionToRef(calibration.alignment, Vector3.Zero());
                    const axis = Vector3.Forward().rotateByQuaternionToRef(calibration.alignment, Vector3.Zero());
                    expected.rotateByQuaternionToRef(Quaternion.RotationAxis(axis, 8 * Math.PI / 180 * (sourceA.startsWith("Left") ? 1 : -1)), expected);
                    const expectedWorld = Vector3.TransformNormal(expected, outer).normalize();
                    const actual = position(targetB).subtract(position(targetA)).normalize();
                    const cosine = Vector3.Dot(expectedWorld, actual); worstAlignment = Math.min(worstAlignment, cosine);
                    assert.ok(cosine > 0.995, `retargeted arm direction matches source with clearance: ${sourceA} frame${frame} cosine${cosine}`);
                }
            }
            for (const bone of skeleton.bones) {
                const values = bone.getTransformNode().rotationQuaternion.asArray();
                assert.ok(values.every(Number.isFinite));
                assert.ok(Math.abs(Math.hypot(...values) - 1) < 1e-5);
            }
        }
        assert.ok(heldFrames > 500, "the real GLB repeatedly holds each endpoint for several seconds");
        assert.ok(largestStep < 0.06, `authored motion remains smooth without pose jumps: ${largestStep}m ${JSON.stringify(largestStepDetail)}`);
        let leftHandTravel = 0;
        for (let first = 0; first < leftHandMotion.length; first += 5) {
            for (let next = first + 5; next < leftHandMotion.length; next += 5) leftHandTravel = Math.max(leftHandTravel, Vector3.Distance(leftHandMotion[first], leftHandMotion[next]));
        }
        assert.ok(leftHandTravel > 0.5, `the full authored gestures remain visible after entry: left hand travels ${leftHandTravel}m`);
        glbDriver.release();
        skeleton.bones.forEach((bone, index) => assert.ok(Math.abs(Quaternion.Dot(bone.getTransformNode().rotationQuaternion, neutral[index])) > 1 - 1e-6));
        console.log(`PASS: Hailey's actual 247-bone GLB stays upright; the two full animations alternate with frozen endpoint holds; post-entry left hand travel ${(leftHandTravel * 100).toFixed(1)}cm; arm alignment cosine >=${worstAlignment.toFixed(6)}; largest joint step ${largestStep.toFixed(5)}m`);
        console.log("Hailey ankle heights across the sequence:", JSON.stringify(feet));
        console.log("Hailey toe heights:", JSON.stringify({ neutral: toeNeutral, animated: toes }));
        assert.ok(toes.left[1] - toes.left[0] < 0.012 && toes.right[1] - toes.right[0] < 0.012, "toe contact remains near the source's grounded range");
        const liftedClip = {
            ...clips[0], name: "airborne contact regression",
            positions: Object.fromEntries(Object.entries(clips[0].positions).map(([name, frames]) => [name, frames.map(([x, y, z]) => [x, y + 15, z])]))
        };
        const liftedPoses = [];
        for (const groundContact of [true, false]) {
            const liftedDriver = new IdleMotion({ clips: [liftedClip] });
            for (let frame = 0; frame < 90; frame++) liftedDriver.applySkeleton(skeleton, 1 / 60, { rightHanded: true, groundContact });
            liftedPoses.push(position("Bip001").clone());
            assert.ok(position("Bip001-L-Toe0").y > toeNeutral.left + 0.08, "authored airborne movement lifts the foot above the ground");
            liftedDriver.release();
        }
        assert.ok(Vector3.Distance(liftedPoses[0], liftedPoses[1]) < 1e-6, "ground contact releases fully when both source feet lift");
        console.log("PASS: ground compensation preserves planted toe height and releases fully for authored airborne movement");
    }
    engine.dispose();
    console.log("PASS: exactly two complete clips at authored speed, 3s frozen endpoint holds, 0.65s continuous blends, disabled hover, long advances, single clip, sparse rig transforms and release");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
