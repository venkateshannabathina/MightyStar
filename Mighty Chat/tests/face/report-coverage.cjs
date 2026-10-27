'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {loadEngine}=require('./load-engine.cjs');
const fixtures=require('./fixtures/inventory.json');
const current=loadEngine();const reference=loadEngine(path.join(__dirname,'fixtures/ExpressiveFace.reference.ts'));
const emotions=['happy','amused','surprised','worried','sad','angry','skeptical','shy'];
const vowels=new Set(['あ','い','う','え','お','あ１','あ1','moutha','mouthi','mouthu','mouthe','moutho','vrc.v_aa','vrc.v_ih','vrc.v_ou','vrc.v_e','vrc.v_oh','aa','ih','ou','oh','jawOpen','jawOpen_a','jawOpen_yi','jawOpen_wu','jawOpen_ei','jawOpen_o']);
const ignore=/^(まばたき|両目閉じ|blink|biyan|TD_EyesClo|ウィンク|ｳｨﾝｸ|eyeBlink)/i;
function active(engine,names,emotion){
 const face=new engine.ExpressiveFace(names);let output;
 for(let frame=0;frame<60;frame++)output=face.update(1/60,{phase:'speaking',emotion,intensity:.9});
 return Object.entries(output.weights).filter(([name,weight])=>weight>.01&&!vowels.has(name)&&!ignore.test(name));
}
const models=fixtures.models.map(model=>{
 // Only author-categorized facial morphs: unrelated Other/System names cannot inflate coverage.
 const names=model.morphs.filter(m=>['Eyebrow','Eye','Lip'].includes(m.category)).map(m=>m.name);
 const counts={neutral:active(current,names,'neutral').length},baseline={neutral:active(reference,names,'neutral').length};
 for(const emotion of emotions){counts[emotion]=active(current,names,emotion).length;if(emotion!=='sad')baseline[emotion]=active(reference,names,emotion).length;}
 const coverage=new current.ExpressiveFace(names).coverage();
 return{id:model.id,name:model.name,excluded:names.length===0,channels:coverage.present,routes:coverage.routes,activeNonVowelMorphs:counts,referenceActiveNonVowelMorphs:baseline,passes:!names.length?null:emotions.every(e=>counts[e]>=3),referencePasses:!names.length?null:emotions.filter(e=>e!=='sad').every(e=>baseline[e]>=3)};
});
const usable=models.filter(m=>!m.excluded);
const result={fixtureSha256:fixtures.sha256,method:'60 frames at 60 Hz, speaking, intensity 0.9, no vowels or sentence pulse; active >0.01; unique exact facial morph names; blink/wink/vowels excluded; micro brow drift retained. Reference has no sad, so its counts omit sad. Neutral is reported but excluded from the emotion coverage gate (its preset is deliberately empty). Static availability only, not rendered calibration.',usableModels:usable.length,excluded:models.filter(m=>m.excluded).map(m=>m.id),passes:usable.filter(m=>m.passes).length,referencePasses:usable.filter(m=>m.referencePasses).length,goal:40,models};
fs.mkdirSync(path.resolve(__dirname,'../../docs/wp3-evidence'),{recursive:true});
fs.writeFileSync(path.resolve(__dirname,'../../docs/wp3-evidence/coverage.json'),JSON.stringify(result,null,2)+'\n');
const displayed=['neutral',...emotions];
const lines=['# WP3 static name coverage','',result.method,'',`Result: ${result.passes}/${result.usableModels}; goal ${result.goal}/46. Reference under this method: ${result.referencePasses}/46 (sad unavailable).`,'','| ID | Model | Mapped channels | '+displayed.join(' | ')+' | ≥3 every emotion |','|---|---|---|'+displayed.map(()=>'---:').join('|')+'|---|'];
for(const m of models)lines.push(`| ${m.id} | ${m.name} | ${m.channels.join(', ')} | ${displayed.map(e=>m.activeNonVowelMorphs[e]).join(' | ')} | ${m.excluded?'body-only':m.passes?'yes':'no'} |`);
fs.writeFileSync(path.resolve(__dirname,'../../docs/wp3-evidence/coverage.md'),lines.join('\n')+'\n');
console.log(`Static coverage: ${result.passes}/${usable.length} current, ${result.referencePasses}/${usable.length} reference; excluded ${result.excluded.join(', ')}.`);
console.log('Shortfalls:',usable.filter(m=>!m.passes).map(m=>({id:m.id,counts:m.activeNonVowelMorphs})));

assert(result.passes>=result.goal,`Static coverage ${result.passes}/46 is below ${result.goal}/46.`);
