'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const {app,resources,output}=await require('./energy-stage.cjs')(),runs=[];
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required','--mute-audio']});
 try{for(const enabled of [false,true]){
  const server=spawn(process.execPath,['-r',path.join(__dirname,'energy-provider-fixture.cjs'),path.join(resources,'companion-server.cjs')],{env:{...process.env,MIGHTY_ENERGY_JAW:enabled?'1':'0',MIGHTY_EXPR_V2:'1',MIGHTY_MEMORY_V1:'0',OPENAI_API_KEY:'offline-fixture-key'},stdio:['pipe','pipe','pipe']});
  try{
   const ready=await new Promise((resolve,reject)=>{let text='';server.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.once('exit',()=>reject(Error('Fixture backend stopped.')));});
   const origin='http://127.0.0.1:'+ready.port,page=await browser.newPage({viewport:{width:360,height:420},deviceScaleFactor:2}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/Companion/index.html?inspect=1');
   const appearance={key:'ww/chars/Lynae/Lynae/Lynae.pmx',name:'Lynae',directory:'ww/chars/Lynae/Lynae',file:'Lynae.pmx'},character={id:'energy',appearance,profile:{speak:true,ttsProvider:'openai',openaiVoice:'marin'}};
   await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token,characterId:'energy'},location.origin),{appearance,token:ready.token});
   await page.waitForFunction(()=>document.getElementById('status').hidden&&mightyCompanionInspect().face?.v2,{},{timeout:90000});
   await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:false,framing:'player'},location.origin));
   const source=await fs.readFile(path.join(app,'Sources/companion-ui.js'),'utf8');
   await page.evaluate(({fragment,token,enabled})=>{
    window.qaMessages=[];window.mightyExprV2=true;window.mightyEnergyJaw=enabled;window.mightyBackendToken=token;window.dockOrb={speech:(kind,value)=>qaMessages.push({kind,value})};window.dockFrame={contentWindow:window};window.nativeCompanion=()=>{};window.companionOrigin=()=>location.origin;window.backendRequest=async(url,options)=>{const r=await fetch(url,{...options,headers:{'Content-Type':'application/json','X-Mighty-Token':token}});if(!r.ok)throw Error('Fixture request failed.');return r.json();};
    (0,eval)(fragment);
   },{fragment:source.slice(source.indexOf('let companionOutput='),source.indexOf('window.speakSavedMessage =')),token:ready.token,enabled});
   const result=await page.evaluate(async character=>{
    const chunks=[],recorder=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm;codecs=vp9'});recorder.ondataavailable=e=>chunks.push(e.data);const video=new Promise(resolve=>{recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};});recorder.start();
    const samples=[],start=performance.now();let peak=0;const timer=setInterval(()=>{const state=mightyCompanionInspect(),jaw=state.morphWeights['あ']||0,last=qaMessages.filter(m=>m.kind==='playback').at(-1)?.value;samples.push({time:performance.now()-start,jaw,energy:last?.energy,state:last?.state,quality:state.face?.director?.quality});if(jaw>peak){peak=jaw;}},16);
    for(let trial=0;trial<3;trial++){const id=mightyFaceEvent('text.submit',character);mightyFaceEvent('response.complete',character,{identity:id});await speakCharacterReply(character,'Hello there.',{mood:'neutral',intensity:0},[],id);await new Promise(resolve=>{const timer=setInterval(()=>{if(qaMessages.filter(m=>m.kind==='playback').at(-1)?.value.state==='ended'){clearInterval(timer);resolve();}},20);});await new Promise(r=>setTimeout(r,400));}
    await new Promise(r=>setTimeout(r,1100));clearInterval(timer);recorder.stop();return {samples,peak,performances:qaMessages.filter(m=>m.kind==='performance').map(m=>({quality:m.value.quality,version:m.value.version,mouthCues:m.value.mouthCues.length,words:m.value.words.length})),video:await video};
   },character);
   assert.deepEqual(errors,[]);assert(result.performances.every(p=>p.version===1&&p.mouthCues===0&&p.words===0));
   if(enabled){assert(result.peak>.05,'Actual audio must open the rendered jaw.');assert(result.performances.every(p=>p.quality==='energy-envelope'));assert(result.samples.some(s=>s.energy>0.1));assert(result.samples.at(-1).jaw<.01);assert(result.samples.every(s=>s.energy===undefined||(Number.isFinite(s.energy)&&s.energy>=0&&s.energy<=1)));}
   else{assert(result.peak===0);assert(result.samples.every(s=>s.energy===undefined));assert(result.performances.every(p=>p.quality==='audio-only'));}
   const label=enabled?'on':'off';await fs.writeFile(path.join(output,'openai-selected-'+label+'.webm'),Buffer.from(result.video,'base64'));
   delete result.video;runs.push({enabled,...result});console.log('Browser energy '+label+': peak rendered jaw '+result.peak.toFixed(3));await page.close();
  }finally{server.stdin.end();server.kill();}
 }
 await fs.writeFile(path.join(output,'browser.json'),JSON.stringify({scope:'OpenAI selected through actual provider adapter and authenticated TTS route, recorded MP3 replacing the remote HTTP response; actual AudioContext analyser, media playback and rendered Lynae jaw. Three plays per flag. Chrome output muted, no live OpenAI call or saved key.',runs},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
