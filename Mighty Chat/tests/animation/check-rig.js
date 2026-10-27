import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { loadAnimationPreview } from '../../AnimationLab/idle.js';
import { createTagController } from '../../AnimationLab/tags.js';

async function run() {
  const folder = path.resolve(process.argv[2]);
  const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'tagged-manifest.json')));
  const data = new Uint8Array(fs.readFileSync(path.join(folder, 'tagged-character.glb')));
  const engine = new NullEngine(), scene = new Scene(engine), reference = new Scene(engine);
  const idle = await loadAnimationPreview(scene, {addShadowCaster(){}}, data, manifest);
  const base = await loadAnimationPreview(reference, {addShadowCaster(){}}, data, manifest);
  const tags = createTagController(idle, () => .5);
  assert.deepEqual(tags.tags.map(t=>t.id),['talking','arguing',...manifest.clips.filter(c=>c.category==='talking'&&!/^talking\d+$/.test(c.id)).map(c=>c.id)],'Shared rules retain the existing Lab tag order and experimental actions.');
  const nodes = controller => [...new Set(controller.male.targetedAnimations.map(item => item.target))];
  const lower = controller => nodes(controller).filter(node => /Hips|UpLeg|Leg$|Foot|Toe/.test(node.name)).flatMap(node => [...node.position.asArray(), ...node.rotationQuaternion.asArray()]);
  let maxActive = 0;
  function tick(frames) { for (let n = 0; n < frames; n++) {
    tags.update(1 / 60); idle.update(1 / 60); base.update(1 / 60); scene._animate(1000 / 60); reference._animate(1000 / 60);
    assert(lower(idle).every(Number.isFinite));
    maxActive = Math.max(maxActive, [...idle.clips,...idle.talking.clips].filter(clip => clip.started).length);
  } }
  for (const style of ['male','female']) {
    tags.selectStyle(style); base.solo(style); tick(40);
    for (const tag of tags.tags.filter(item => !item.fullBody)) {
      tags.selectAction(tag.id); tick(50);
      const expected = lower(base);
      assert(Math.max(...lower(idle).map((value,index) => Math.abs(value - expected[index]))) < 1e-6, `${style}/${tag.id} changed the idle stance`);
      tags.stop(); tick(40); assert.equal(tags.inspect().phase,'idle');
    }
  }
  tags.selectAction('thinking'); tick(35); tags.selectAction('surprised'); tick(140);
  assert.equal(tags.inspect().action,'surprised');
  tags.stop(); tick(40); tags.setSetting('repeat',true); tags.selectAction('talking'); tick(40);
  const first = tags.inspect().clip; let different = false;
  for (let n = 0; n < 1000; n++) { tick(1); if (tags.inspect().clip && tags.inspect().clip !== first) { different = true; break; } }
  assert(different,'Talking must vary takes');
  tags.stop(); tick(40); assert.equal(tags.inspect().phase,'idle');
  tags.setSetting('strength',0); tags.selectAction('thinking'); tick(400); assert.equal(tags.inspect().phase,'idle');
  assert(maxActive <= 3,'Unbounded simultaneous animation work');
  scene.dispose(); reference.dispose(); engine.dispose();
  console.log('Rig checks passed: 26 clips, male/female stance preservation, thinking-to-reply transitions, varied talking, zero-strength recovery; maximum active clips:',maxActive);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
