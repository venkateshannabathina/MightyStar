'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const{spawn}=require('node:child_process');const{chromium}=require('playwright');
const app=path.resolve(__dirname,'../..'),output=path.join(app,'docs/wp4-evidence'),stage=path.join(app,'build/wp4-render-check');
const fixtures=require('./rendered-models.cjs');
(async()=>{
 await fs.mkdir(output,{recursive:true});const resources=path.join(stage,'Resources');await fs.mkdir(resources,{recursive:true});
 await fs.copyFile(path.join(app,'Sources/companion-server.cjs'),path.join(resources,'companion-server.cjs'));
 for(const [target,link]of [[path.join(app,'Backend'),path.join(stage,'Backend')],[path.join(app,'Sources/Characters'),path.join(resources,'Characters')],['/private/tmp/mighty-wp4-renderer',path.join(resources,'Companion')]])await fs.symlink(target,link).catch(e=>{if(e.code!=='EEXIST')throw e;});
 const preload=path.join(stage,'offline.cjs');await fs.writeFile(preload,"const original=fetch;globalThis.fetch=(url,options)=>{if(!String(url).startsWith('https://phoshco.github.io/'))throw Error('QA permits only the existing character asset origin.');return original(url,options);};\n");
 const server=spawn(process.execPath,['-r',preload,path.join(resources,'companion-server.cjs')],{env:{...process.env,MIGHTY_EXPR_V2:'1',MIGHTY_DEBUG_PERF:'1',MIGHTY_MEMORY_V1:'0'},stdio:['pipe','pipe','pipe']});let browser;
 const deadline=setTimeout(()=>{console.error('Rendering QA exceeded its four-minute deadline.');server.kill();process.exit(1);},240000);
 try{
  console.log('QA: starting local renderer server.');
  const ready=await new Promise((resolve,reject)=>{let text='',error='';server.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.stderr.on('data',b=>error+=b);server.once('exit',()=>reject(Error('QA server failed: '+error)));});
  console.log('QA: backend ready; launching isolated browser.');const origin='http://127.0.0.1:'+ready.port;browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const context=await browser.newContext({viewport:{width:360,height:420},deviceScaleFactor:2});
  console.log('QA: browser context ready.');const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log('Renderer diagnostic: '+m.text().replace(/assets\/[^/]+\//g,'assets/[redacted]/'));});
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
  await page.addInitScript(()=>{Math.random=()=>.8;});await page.goto(origin+'/Companion/index.html?inspect=1');
  console.log('QA: renderer page loaded.');await page.evaluate(()=>{const chunks=[];window.qaRecorder=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1200000});qaRecorder.ondataavailable=e=>chunks.push(e.data);window.qaRecording=new Promise(resolve=>{qaRecorder.onstop=async()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};});qaRecorder.start();});
  const report={scope:'Actual local GPU renderer with controlled phase/playback fixtures, not a physical microphone or provider speech benchmark.',models:[],errors};
  for(const id of ['01','07','24']){
   await page.evaluate(()=>{Math.random=()=>.8;});console.log('QA: opening model '+id);const model=fixtures.models.find(m=>m.id===id),parts=model.assetPath.split('/'),file=parts.pop(),appearance={key:model.assetPath,name:model.name,directory:parts.join('/'),file};
   await page.evaluate(({appearance,token,id})=>window.postMessage({type:'mighty-companion-load',appearance,token,characterId:'qa-'+id},location.origin),{appearance,token:ready.token,id});
   await page.waitForFunction(key=>document.getElementById('status').classList.contains('failed') || (document.getElementById('status').hidden&&window.mightyCompanionInspect?.().key===key),appearance.key,{timeout:90000});
   const loadedState=await page.evaluate(()=>mightyCompanionInspect());console.log('QA: loaded '+id+'; v2 face active: '+!!loadedState.face?.v2);assert(loadedState.face?.v2,'Expected usable MMD runtime on '+id);
   const failure=await page.locator('#status').evaluate(el=>el.classList.contains('failed')?el.textContent:'');if(failure)throw Error('Model '+id+': '+failure);
   await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:false,framing:'player',desktopInteraction:true,reset:true},location.origin));
   await page.waitForTimeout(300);
   const entry={id,name:model.name,appearance,emotions:[],timing:[],bones:await page.evaluate(()=>mightyCompanionInspect().face.bones)};
   let gen=0;
   for(const emotion of ['neutral','happy','amused','surprised','worried','sad','angry','skeptical','shy']){
    const identity={sessionId:'qa-'+id,characterId:'qa-'+id,generation:++gen,turnId:'emotion-'+emotion};
    await page.evaluate(({identity,emotion,appearance})=>{
     const post=(type,value)=>window.postMessage(type==='phase'?{type:'mighty-companion-phase',value}:{type:'mighty-companion-'+type,[type==='performance'?'performance':'snapshot']:value},location.origin);
     post('phase',{type:'text.submit',characterId:identity.characterId,identity});
     post('performance',{version:1,identity,utteranceId:identity.turnId,characterId:identity.characterId,appearanceKey:appearance.key,text:'A controlled facial pose.',durationSeconds:10,quality:'fixture-no-audio',mouthCues:[],expression:{mood:emotion,intensity:.9},sentenceCues:[{index:0,e:emotion,i:.9,g:'-',offset:0}]});
     post('playback',{utteranceId:identity.turnId,characterId:identity.characterId,sequence:1,positionSeconds:.1,playbackRate:1,state:'speaking'});
    },{identity,emotion,appearance});
    await page.waitForTimeout(1100);await page.waitForFunction(emotion=>{const d=mightyCompanionInspect().face?.director;return d?.emotion===emotion&&d.output?.channels.blink<.01;},emotion);const state=await page.evaluate(()=>mightyCompanionInspect().face.director);assert.equal(state.emotion,emotion);assert.equal(state.phase,'speaking');
    const image=`${id}-${emotion}.png`;await page.screenshot({path:path.join(output,image)});entry.emotions.push({emotion,image});
   }
   // Five-probe clock correlation, as in WP0, with an explicitly browser-sourced input boundary.
   for(let trial=0;trial<3;trial++){
    const identity={sessionId:'qa-timing-'+id,characterId:'qa-'+id,generation:++gen,turnId:'timing-'+trial};
    await page.evaluate(async({token,identity})=>{
     const headers={'Content-Type':'application/json','X-Mighty-Token':token};let best;
     for(let n=0;n<5;n++){const sent=performance.now(),r=await fetch('/api/debug/perf/clock',{method:'POST',headers,body:'{}'}),v=await r.json(),received=performance.now();const uncertaintyMs=Math.max(0,((received-sent)-(v.sentMs-v.receivedMs))/2),offsetMs=(v.receivedMs-sent+v.sentMs-received)/2;if(!best||uncertaintyMs<best.uncertaintyMs)best={offsetMs,uncertaintyMs};}
     const input_begin=performance.now();window.postMessage({type:'mighty-companion-phase',value:{type:'input.begin',characterId:identity.characterId,identity,debugPerf:{identity,phase:'listening'}}},location.origin);
     await fetch('/api/debug/perf/sample',{method:'POST',headers,body:JSON.stringify({identity,source:'browser',timestamps:{input_begin},...best})});
    },{token:ready.token,identity});
    await page.waitForTimeout(180);
    await page.evaluate(async({token,identity})=>{
     const headers={'Content-Type':'application/json','X-Mighty-Token':token},sent=performance.now(),r=await fetch('/api/debug/perf/clock',{method:'POST',headers,body:'{}'}),v=await r.json(),received=performance.now();const uncertaintyMs=Math.max(0,((received-sent)-(v.sentMs-v.receivedMs))/2),offsetMs=(v.receivedMs-sent+v.sentMs-received)/2,input_commit=performance.now();
     window.postMessage({type:'mighty-companion-phase',value:{type:'input.commit',characterId:identity.characterId,identity,debugPerf:{identity,phase:'thinking'}}},location.origin);
     await fetch('/api/debug/perf/sample',{method:'POST',headers,body:JSON.stringify({identity,source:'browser',timestamps:{input_commit},offsetMs,uncertaintyMs})});
    },{token:ready.token,identity});
    await page.waitForTimeout(180);
    const raw=await(await fetch(origin+'/api/debug/perf/export',{headers:{'X-Mighty-Token':ready.token}})).text();const row=raw.trim().split('\n').map(JSON.parse).find(r=>r.sessionId===identity.sessionId&&r.turnId===identity.turnId);
    assert(row?.timestamps.face_listen_onset!==undefined);assert(row?.timestamps.face_think_onset!==undefined);
    entry.timing.push({trial,listeningMs:row.timestamps.face_listen_onset-row.timestamps.input_begin,thinkingMs:row.timestamps.face_think_onset-row.timestamps.input_commit,clockUncertaintyMs:row.clockUncertaintyMs});
   }
   for(const sample of entry.timing){assert(sample.listeningMs+sample.clockUncertaintyMs.browser+sample.clockUncertaintyMs.renderer<100);assert(sample.thinkingMs+sample.clockUncertaintyMs.browser+sample.clockUncertaintyMs.renderer<150);}
   // Recorded phase fixture: hold/listen, commit/think, and two audible-clock sentence changes.
   const identity={sessionId:'clip-'+id,characterId:'qa-'+id,generation:++gen,turnId:'clip'};
   await page.evaluate(identity=>window.postMessage({type:'mighty-companion-phase',value:{type:'input.begin',identity,characterId:identity.characterId}},location.origin),identity);await page.waitForTimeout(1800);await page.screenshot({path:path.join(output,id+'-listening.png')});
   await page.evaluate(identity=>window.postMessage({type:'mighty-companion-phase',value:{type:'input.commit',identity,characterId:identity.characterId}},location.origin),identity);await page.waitForTimeout(1800);await page.screenshot({path:path.join(output,id+'-thinking.png')});
   for(const [emotion,index]of [['amused',0],['worried',1],['happy',2]]){
    await page.evaluate(({identity,appearance,emotion,index})=>{
     Math.random=()=>.05;
     window.postMessage({type:'mighty-companion-performance',performance:{version:1,identity,utteranceId:'clip-'+index,characterId:identity.characterId,appearanceKey:appearance.key,durationSeconds:3,quality:'controlled-playback-fixture',text:'A speaking fixture.',mouthCues:[{start:0,end:3,pose:'a'}],expression:{mood:emotion,intensity:.9},sentenceCues:[{index,e:emotion,i:.9,g:'-',offset:0}]}},location.origin);
     window.postMessage({type:'mighty-companion-playback',snapshot:{utteranceId:'clip-'+index,characterId:identity.characterId,sequence:1,positionSeconds:.1,playbackRate:1,state:'speaking'}},location.origin);
    },{identity,appearance,emotion,index});await page.waitForTimeout(1800);
   }
   await page.evaluate(identity=>window.postMessage({type:'mighty-companion-phase',value:{type:'cancel',identity,characterId:identity.characterId}},location.origin),identity);await page.waitForTimeout(1000);
   if(id==='01') {
    entry.speakingVariation=await page.evaluate(async({identity,appearance})=>{
     const id={...identity,generation:identity.generation+1,turnId:'thirty-seconds'};const emotions=['happy','amused','surprised','worried','sad','angry','skeptical','shy'];let text='',sentenceCues=[],words=[];
     for(let n=0;n<20;n++){sentenceCues.push({index:n,e:emotions[n%8],i:.9,g:'-',offset:text.length});words.push({text:'Sentence'+n,start:n*1.5,end:n*1.5+1});text+='Sentence'+n+'. ';}
     const mouthCues=Array.from({length:120},(_,n)=>({start:n*.25,end:(n+1)*.25,pose:['a','i','o','closed'][n%4]}));
     window.postMessage({type:'mighty-companion-phase',value:{type:'text.submit',identity:id,characterId:id.characterId}},location.origin);
     window.postMessage({type:'mighty-companion-performance',performance:{version:1,identity:id,utteranceId:id.turnId,characterId:id.characterId,appearanceKey:appearance.key,text,words,durationSeconds:30,quality:'scripted-playback-clock',sentenceCues,mouthCues,expression:{mood:'happy',intensity:.9}}},location.origin);
     const groups={brows:['browUp','browHappy','browWorry','browAngry','browUpL','browUpR'],eyes:['blink','halfLid','smileEye','wide','sharp'],mouth:['smirk','cornerUp','cornerDown','frown','a','i','o']};let sequence=0,last={},changed={},max={},frames=0;const start=performance.now();
     await new Promise(resolve=>{const tick=()=>{const elapsed=performance.now()-start;window.postMessage({type:'mighty-companion-playback',snapshot:{utteranceId:id.turnId,characterId:id.characterId,sequence:++sequence,positionSeconds:elapsed/1000,playbackRate:1,state:'speaking'}},location.origin);const state=mightyCompanionInspect(),routes=state.face.director.coverage.routes;
      for(const [group,channels]of Object.entries(groups)){const names=[...new Set(channels.flatMap(c=>routes[c]?.names||[]))],values=names.map(n=>state.morphWeights[n]||0);if(!last[group]||values.some((v,i)=>Math.abs(v-last[group][i])>.001))changed[group]=elapsed;max[group]=Math.max(max[group]||0,elapsed-(changed[group]||0));last[group]=values;}frames++;if(elapsed<30000)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
     window.postMessage({type:'mighty-companion-phase',value:{type:'cancel',identity:id,characterId:id.characterId}},location.origin);return{seconds:30,frames,maxFrozenMs:max,scope:'Actual MMD morph-controller weights in the live renderer, controlled playback clock.'};
    },{identity,appearance});
    assert(Object.values(entry.speakingVariation.maxFrozenMs).every(ms=>ms<3000));
   }
   report.models.push(entry);console.log(`Rendered ${model.name}: nine emotions, phase clip, eye bindings and ${entry.timing.length} correlated onset trials.`);
  }
  const video=await page.evaluate(async()=>{qaRecorder.stop();return await qaRecording;});await fs.writeFile(path.join(output,'phase-fixtures.webm'),Buffer.from(video,'base64'));await context.close();
  const grid=await browser.newPage({viewport:{width:1080,height:1370},deviceScaleFactor:1});
  for(const model of report.models){let html='<html><body style="margin:0;background:#ddd;font:16px system-ui"><h2 style="margin:12px">'+model.name+' · intensity 0.9 · controlled playback fixture</h2><main style="display:grid;grid-template-columns:repeat(3,360px)">';for(const item of model.emotions){const bytes=await fs.readFile(path.join(output,item.image));html+='<div style="position:relative;height:435px;background:#dce0e4"><img style="width:360px;height:420px" src="data:image/png;base64,'+bytes.toString('base64')+'"><b style="position:absolute;top:8px;left:12px">'+item.emotion+'</b></div>';}html+='</main></body></html>';await grid.setContent(html);await grid.screenshot({path:path.join(output,model.id+'-emotion-grid.png'),fullPage:true});}
  assert.equal(errors.length,0,errors.join('\n'));await fs.writeFile(path.join(output,'rendering.json'),JSON.stringify(report,null,2)+'\n');
  console.log('QA captures and correlated timing evidence saved.');
 }finally{clearTimeout(deadline);server.stdin.end();await browser?.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
