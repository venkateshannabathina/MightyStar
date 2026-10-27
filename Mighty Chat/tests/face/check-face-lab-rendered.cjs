'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),{once}=require('node:events');
const {chromium}=require('playwright');
const app=path.resolve(__dirname,'../..'),output=path.join(app,'docs/wp8-evidence'),stage=path.join(app,'build/wp8-render-check'),inventory=require('./rendered-models.cjs');
const calibrationRoot='/private/tmp/mighty-wp8-rendered-calibration';
(async()=>{
 await fs.mkdir(output,{recursive:true});await fs.mkdir(path.join(stage,'Resources'),{recursive:true});await fs.rm(calibrationRoot,{recursive:true,force:true});
 await fs.copyFile(path.join(app,'Sources/companion-server.cjs'),path.join(stage,'Resources/companion-server.cjs'));
 for(const [target,link]of [[path.join(app,'Backend'),path.join(stage,'Backend')],['/private/tmp/mighty-wp8-renderer',path.join(stage,'Resources/Companion')],[path.join(app,'Sources/Characters'),path.join(stage,'Resources/Characters')]])await fs.symlink(target,link).catch(e=>{if(e.code!=='EEXIST')throw e;});
 let browser;const report={scope:'Actual selected MMD/GLB GPU preview, no provider call/audio or human blind ratings.',models:[],flagMatrix:[]};
 const deadline=setTimeout(()=>{console.error('WP8 render timeout');process.exit(1);},240000);
 try{
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  for(const [lab,expr] of [[false,false],[true,false],[false,true],[true,true]]){
   const server=spawn(process.execPath,[path.join(stage,'Resources/companion-server.cjs')],{env:{...process.env,MIGHTY_FACE_LAB:lab?'1':'0',MIGHTY_EXPR_V2:expr?'1':'0',MIGHTY_MEMORY_V1:'0',MIGHTY_GESTURES_V2:'0',MIGHTY_FACE_CALIBRATION_ROOT:calibrationRoot},stdio:['pipe','pipe','pipe']});
   let context;
   try{
    const ready=await new Promise((resolve,reject)=>{let s='';server.stdout.on('data',b=>{s+=b;if(s.includes('\n'))resolve(JSON.parse(s.split('\n')[0]));});server.once('exit',()=>reject(Error('Server failed')));});const origin='http://127.0.0.1:'+ready.port;
    context=await browser.newContext({viewport:{width:1100,height:760},deviceScaleFactor:1});await context.addInitScript(()=>{Math.random=()=>.8;});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).origin===origin||/^(blob|data):/.test(r.request().url())?r.continue():r.abort());
    await page.goto(origin+'/Companion/index.html?inspect=1');
    const load=async appearance=>{
     await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token,characterId:'wp8'},location.origin),{appearance,token:ready.token});
     await page.waitForFunction(key=>window.mightyCompanionInspect?.().key===key&&document.getElementById('status').hidden,appearance.key,{timeout:90000});
     await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:false,framing:'player',desktopInteraction:true,reset:true},location.origin));await page.waitForTimeout(250);
    };
    const appearance=m=>{const parts=m.assetPath.split('/'),file=parts.pop();return{key:m.assetPath,name:m.name,directory:parts.join('/'),file};};
    const first=inventory.models.find(m=>m.id==='01');await load(appearance(first));
    assert.equal(await page.locator('#face-lab-toggle').count(),lab?1:0);
    assert.equal((await page.evaluate(()=>mightyCompanionInspect())).face.v2,expr);
    if(!lab){assert.equal((await page.evaluate(()=>mightyCompanionInspect())).faceLab,undefined);if(expr){
      await load(appearance(inventory.models.find(m=>m.id==='24')));
      await page.evaluate(()=>{const identity={sessionId:'wp8',characterId:'wp8',generation:1,turnId:'saved-calibration'};const appearanceKey=mightyCompanionInspect().key;
       window.postMessage({type:'mighty-companion-phase',value:{type:'text.submit',identity,characterId:'wp8'}},location.origin);
       window.postMessage({type:'mighty-companion-performance',performance:{version:1,identity,utteranceId:'saved-calibration',characterId:'wp8',appearanceKey,text:'Fixture.',durationSeconds:10,quality:'fixture',mouthCues:[],expression:{mood:'worried',intensity:.9},sentenceCues:[{index:0,e:'worried',i:.9,g:'-',offset:0}]}},location.origin);
       window.postMessage({type:'mighty-companion-playback',snapshot:{utteranceId:'saved-calibration',characterId:'wp8',sequence:1,positionSeconds:.1,state:'speaking',playbackRate:1}},location.origin);
      });await page.waitForTimeout(700);
      const verified=await page.evaluate(()=>{const d=mightyCompanionInspect().face.director;const route=d.coverage.routes.browWorry;if(!route)return false;return route.names.every(name=>{let expected=0;for(const [channel,r]of Object.entries(d.coverage.routes))if(r.names.includes(name))expected+=d.output.channels[channel]*r.gain*(channel==='browWorry'?.55:1);return Math.abs(d.output.weights[name]-Math.min(1,expected))<1e-6;});});assert(verified,'saved calibration is consumed by the normal Director while Face Lab is off');report.normalPlaybackCalibration=true;
     }report.flagMatrix.push({lab,expr,controlsAbsent:true});continue;}
    await page.locator('#face-lab-toggle').click();
    await page.waitForFunction(()=>mightyCompanionInspect().faceLab?.output);
    const equal=await page.evaluate(()=>{const s=mightyCompanionInspect();return Object.entries(s.morphWeights).every(([key,w])=>Math.abs(w-(s.faceLab.output.weights[key]??0))<1e-6);});assert(equal,'lab is the exclusive writer even with normal face enabled');
    if(!expr){
     // Real controls on three rigs, all nine emotions and all phases.
     for(const id of ['01','07','24']){
      const model=inventory.models.find(m=>m.id===id);if(id!=='01'){await load(appearance(model));await page.locator('#face-lab-toggle').click();}
      const entry={id,name:model.name,emotions:[],phases:[]};
      await page.getByRole('button',{name:'speaking',exact:true}).click();
      for(const emotion of ['neutral','happy','amused','surprised','worried','sad','angry','skeptical','shy']){
       await page.getByRole('button',{name:emotion,exact:true}).click();await page.waitForTimeout(600);
       await page.waitForFunction(()=>{const c=mightyCompanionInspect().faceLab.output.channels;return c.blink<.01&&c.winkR<.01;});const state=await page.evaluate(()=>mightyCompanionInspect());assert.equal(state.faceLab.emotion,emotion);for(const [key,w]of Object.entries(state.faceLab.output.weights)){assert(Number.isFinite(w)&&w>=0&&w<=1);assert(Math.abs(state.morphWeights[key]-w)<1e-6,'MMD Float32 weight agrees with lab output');}
       const image=`${id}-${emotion}.png`;await page.screenshot({path:path.join(output,image)});entry.emotions.push({emotion,image});
      }
      for(const phase of ['idle','listening','thinking','speaking']){await page.getByRole('button',{name:phase,exact:true}).click();await page.waitForTimeout(150);assert.equal((await page.evaluate(()=>mightyCompanionInspect())).faceLab.phase,phase);entry.phases.push(phase);}
      if(id==='01'){
       await page.getByRole('button',{name:'thinking',exact:true}).click();await page.waitForTimeout(2500);
       const firstHead=await page.evaluate(()=>mightyCompanionInspect().bones.find(b=>['頭','Head','head'].includes(b.name))?.rotation);
       await page.waitForTimeout(1200);const nextHead=await page.evaluate(()=>mightyCompanionInspect().bones.find(b=>['頭','Head','head'].includes(b.name))?.rotation);
       assert(firstHead&&nextHead);assert(Math.abs(firstHead.reduce((s,v,i)=>s+v*nextHead[i],0))>.9999,'lab head offsets do not accumulate');report.headStable=true;
      }
      entry.coverage=(await page.evaluate(()=>mightyCompanionInspect())).faceLab.coverage;
      assert((await page.locator('#face-lab-coverage').textContent()).includes('Missing:'));
      report.models.push(entry);
     }
     // Zero intensity and gain edits/save/reload; no keys or calibration paths in UI requests.
     await page.getByLabel('Intensity',{exact:true}).evaluate(el=>{el.value='0';});await page.getByLabel('Intensity',{exact:true}).dispatchEvent('input');
     assert.equal((await page.evaluate(()=>mightyCompanionInspect())).faceLab.intensity,0);
     await page.getByText('Channel gains',{exact:true}).click();await page.getByLabel('browWorry',{exact:true}).evaluate(el=>{el.value='0.55';});await page.getByLabel('browWorry',{exact:true}).dispatchEvent('input');
     await page.getByRole('button',{name:'Save calibration',exact:true}).click();await page.waitForFunction(()=>document.getElementById('face-lab')?.textContent.includes('Saved '));
     await page.locator('#face-lab-toggle').click();await page.waitForFunction(()=>document.getElementById('status').hidden&&!mightyCompanionInspect().faceLab.active);
     await page.locator('#face-lab-toggle').click();assert.equal((await page.evaluate(()=>mightyCompanionInspect())).faceLab.calibration.gains.browWorry,.55);
     // Failed save leaves preview editable; retry uses the same model key.
     await page.route('**/api/face/calibration',r=>r.request().method()==='POST'?r.fulfill({status:503,body:'{}'}):r.continue());
     await page.getByRole('button',{name:'Save calibration',exact:true}).click();await page.waitForFunction(()=>document.getElementById('face-lab').textContent.includes('Save failed'));
     await page.unroute('**/api/face/calibration');await page.getByRole('button',{name:'Save calibration',exact:true}).click();await page.waitForFunction(()=>document.getElementById('face-lab').textContent.includes('Saved '));report.saveRetry=true;
     await page.evaluate(()=>{const chunks=[];const recorder=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:900000});recorder.ondataavailable=e=>chunks.push(e.data);window.wp8Video=new Promise(resolve=>{recorder.onstop=async()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};});window.wp8Recorder=recorder;recorder.start();});
     await page.getByRole('button',{name:'Run auto-demo',exact:true}).click();const seen=new Set();for(let n=0;n<25;n++){await page.waitForTimeout(1000);const s=await page.evaluate(()=>mightyCompanionInspect().faceLab);seen.add(s.phase+':'+s.emotion);}assert(seen.has('thinking:neutral')&&seen.has('speaking:shy'));report.demoStates=[...seen];const recording=await page.evaluate(async()=>{wp8Recorder.stop();return await wp8Video;});await fs.writeFile(path.join(output,'face-lab-demo.webm'),Buffer.from(recording,'base64'));
     await page.locator('#face-lab').evaluate(el=>{el.scrollTop=el.scrollHeight;});await page.screenshot({path:path.join(output,'live-weights.png')});
     const glb={key:'local/chars/hailey/hailey.glb',name:'Hailey',directory:'local/chars/hailey',file:'hailey.glb'};await load(glb);await page.locator('#face-lab-toggle').click();assert((await page.locator('#face-lab').textContent()).includes('no supported MMD'));assert.equal(await page.locator('#face-lab input').count(),0);report.bodyOnly=true;
    }
    report.flagMatrix.push({lab,expr,exclusiveWeights:equal});assert.deepEqual(errors,[]);
   }finally{await context?.close();if(server.exitCode===null){const done=once(server,'exit');server.stdin.end();await done;}}
  }
  await fs.writeFile(path.join(output,'rendered.json'),JSON.stringify(report,null,2)+'\n');console.log('Face Lab rendered controls: 4 flag combinations, 3 MMD rigs × 9 emotions, 4 phases, gains/save/reload/failure, full demo and GLB fallback passed');
 }finally{clearTimeout(deadline);await browser?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
