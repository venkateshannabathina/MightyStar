'use strict';
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
const app=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-face-visual-'));
const output=path.join(app,'build/face-motion-review');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const server=spawn(process.execPath,[path.join(app,'Sources/companion-server.cjs'),'--preview'],{stdio:['pipe','pipe','pipe'],env:{...process.env,MIGHTY_MEMORY_ROOT:path.join(temp,'memory')}});let browser;
 try{
  const ready=await new Promise((resolve,reject)=>{let text='',err='';const timeout=setTimeout(()=>reject(Error(err||'Backend timeout')),15000);server.stderr.on('data',v=>err+=v);server.stdout.on('data',v=>{text+=v;if(text.includes('\n')){clearTimeout(timeout);resolve(JSON.parse(text.split('\n')[0]));}});server.once('exit',()=>{clearTimeout(timeout);reject(Error(err));});});
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:800,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto('http://127.0.0.1:'+ready.port+'/Companion/index.html?inspect=1');
  const catalog=require('../../Sources/catalog.js'),reports=[];
  for(const name of ['Lynae','Rover (Female)','Evelyn','Lucy','Hailey']){
   const appearance=catalog.appearances.find(a=>a.name===name&&!a.variant),id='qa-'+name;assert(appearance);
   await page.evaluate(({appearance,id,token})=>postMessage({type:'mighty-companion-load',appearance,characterId:id,token,idleStyle:'female'},'*'),{appearance,id,token:ready.token});
   await page.waitForFunction(key=>document.getElementById('status').hidden&&mightyCompanionInspect().key===key,appearance.key,{timeout:90000});
   await page.evaluate(()=>postMessage({type:'mighty-companion-control',framing:'portrait'},'*'));await page.waitForTimeout(400);
   const initial=await page.evaluate(()=>mightyCompanionInspect());
   const morphNames=Object.keys(initial.face.weights);
   if(name==='Hailey'){
    assert.equal(initial.face.capabilities.mouth,false);assert.equal(morphNames.length,0,'current Hailey asset has no mouth morphs');
    reports.push({name,keys:0,lipSync:false,reason:'No authored mouth morphs or jaw bone in the current GLB'});
    console.log('PASS: Hailey safely reports unavailable facial rig instead of deforming unrelated body bones');continue;
   }
   assert(initial.face.capabilities.mouth,`${name} has mapped mouth keys`);
   const stem=name.toLowerCase().replace(/[^a-z]+/g,'-');
   await page.evaluate(id=>postMessage({type:'mighty-companion-phase',value:{characterId:id,type:'response.complete',expression:{mood:'happy',intensity:.72,ambient:{mood:'neutral',intensity:.2},reactionId:'compliment-'+id,durationSeconds:3.5}}},'*'),id);
   await page.waitForTimeout(550);
   const pleased=await page.evaluate(()=>({face:mightyCompanionInspect().face,keys:mightyAppearanceEditor().expressions}));
   const corners=pleased.keys.filter(k=>/にやり|口角上げ|mouthsmile|^smile$/i.test(k.name));
   assert(corners.some(k=>(pleased.face.weights[k.stableId]||0)>.25),`${name} has a visible compliment smile`);
   assert(pleased.keys.filter(k=>k.group==='Eyes').some(k=>(pleased.face.weights[k.stableId]||0)>.15),`${name} smiles with the eyes too`);
   await page.screenshot({path:path.join(output,stem+'-compliment.png')});
   const result=await page.evaluate(async({id,key})=>{
    const send=(type,value)=>postMessage({type:'mighty-companion-'+type,value},'*');
    send('performance',{characterId:id,appearanceKey:key,utteranceId:'speech-'+id,expression:{mood:'angry',intensity:.65},mouthCues:[{start:0,end:.5,pose:'a'},{start:.5,end:1,pose:'o'}]});
    const frames=[];let sequence=0;
    for(let i=0;i<22;i++){
     send('playback',{characterId:id,utteranceId:'speech-'+id,sequence:++sequence,positionSeconds:i*.04,playbackRate:1,state:'speaking',energy:.7});
     await new Promise(r=>setTimeout(r,40));frames.push(mightyCompanionInspect().face);
    }
    return frames;
   },{id,key:appearance.key});
   assert(result.some(f=>Object.values(f.weights).some(w=>w>.05)),`${name} actual morphs change during speech`);
   await page.screenshot({path:path.join(output,stem+'-speaking.png')});
   await page.evaluate(id=>postMessage({type:'mighty-companion-playback',value:{characterId:id,utteranceId:'speech-'+id,sequence:100,positionSeconds:1,state:'cancelled'}},'*'),id);
   await page.waitForTimeout(350);const after=await page.evaluate(()=>mightyCompanionInspect());
   assert.equal(after.face.utteranceId,null);
   assert(Object.values(after.face.weights).every(x=>Number.isFinite(x)&&x>=0&&x<=1));
   await page.screenshot({path:path.join(output,stem+'-rest.png')});
   await page.evaluate(id=>postMessage({type:'mighty-companion-phase',value:{characterId:id,type:'response.complete',expression:{mood:'neutral',intensity:0}}},'*'),id);
   await page.waitForTimeout(1000);
   const browPeak=await page.evaluate(async()=>{let peak=0;const ids=mightyAppearanceEditor().expressions.filter(k=>k.group==='Eyebrows').map(k=>k.stableId);for(let i=0;i<45;i++){await new Promise(r=>setTimeout(r,150));const w=mightyCompanionInspect().face.weights;for(const id of ids)peak=Math.max(peak,w[id]||0);}return peak;});
   assert(browPeak>.025,`${name} has actual idle eyebrow micro-motion`);
   assert(browPeak<.12,`${name} idle eyebrow movement stays subtle`);
   console.log(`PASS: ${name}, visible eye/corner smile and idle eyebrow peak ${browPeak.toFixed(3)}`);
   reports.push({name,keys:morphNames.length,quality:result.at(-1).quality,cancelled:true});
   console.log('PASS: '+name+', '+morphNames.length+' real face keys, audio-clock mouth motion + upper-face emotion, cancellation and bounded transforms');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(reports,null,2));
 }finally{await browser?.close();server.kill();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
