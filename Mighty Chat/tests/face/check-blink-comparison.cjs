'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const app=path.resolve(__dirname,'../..'),stage=path.join(app,'build/wp4-render-check'),output=path.join(app,'docs/wp4-evidence');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),report=[];
 try{for(const enabled of [false,true]){
  const server=spawn(process.execPath,[path.join(stage,'Resources/companion-server.cjs')],{env:{...process.env,MIGHTY_EXPR_V2:enabled?'1':'0',MIGHTY_MEMORY_V1:'0'},stdio:['pipe','pipe','pipe']});
  try{
   const ready=await new Promise((resolve,reject)=>{let text='';server.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.once('exit',()=>reject(Error('Server stopped.')));});
   const origin='http://127.0.0.1:'+ready.port,page=await browser.newPage({viewport:{width:360,height:420},deviceScaleFactor:2});
   await page.addInitScript(()=>{Math.random=()=>.1;});await page.goto(origin+'/Companion/index.html?inspect=1');
   const appearance={key:'ww/chars/Lynae/Lynae/Lynae.pmx',name:'Lynae',directory:'ww/chars/Lynae/Lynae',file:'Lynae.pmx'};
   await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token,characterId:'blink'},location.origin),{appearance,token:ready.token});
   await page.waitForFunction(()=>document.getElementById('status').hidden&&mightyCompanionInspect().face,{},{timeout:90000});
   await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:false,framing:'player'},location.origin));
   const result=await page.evaluate(async()=>{
    const chunks=[],recorder=new MediaRecorder(document.querySelector('canvas').captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1200000});recorder.ondataavailable=e=>chunks.push(e.data);const complete=new Promise(resolve=>{recorder.onstop=()=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};});recorder.start();
    const start=performance.now(),samples=[];await new Promise(resolve=>{const tick=()=>{samples.push({time:performance.now()-start,blink:mightyCompanionInspect().morphWeights['まばたき']||0});if(performance.now()-start<7000)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});recorder.stop();return{samples,video:await complete,v2:mightyCompanionInspect().face.v2};
   });
   const label=enabled?'v2':'legacy';await fs.writeFile(path.join(output,'blink-'+label+'.webm'),Buffer.from(result.video,'base64'));
   const peak=Math.max(...result.samples.map(s=>s.blink));report.push({mode:label,v2:result.v2,peakBlinkWeight:peak,samples:result.samples});
   console.log('Blink '+label+': peak '+peak.toFixed(3));await page.close();
  }finally{server.stdin.end();}
 }
 await fs.writeFile(path.join(output,'blink-comparison.json'),JSON.stringify({scope:'Actual Lynae idle morph weights and canvas footage, same renderer build with flag off/on, fixed RNG 0.1.',runs:report},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
