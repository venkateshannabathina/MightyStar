'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawn}=require('node:child_process'),{chromium}=require('playwright');
const app=path.resolve(__dirname,'../..'),stage=path.join(app,'build/wp4-render-check'),output=path.join(app,'docs/wp4-evidence');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),runs=[];
 try{for(const enabled of [false,true]){
  const server=spawn(process.execPath,[path.join(stage,'Resources/companion-server.cjs')],{env:{...process.env,MIGHTY_EXPR_V2:enabled?'1':'0',MIGHTY_MEMORY_V1:'0'},stdio:['pipe','pipe','pipe']});
  try{const ready=await new Promise((resolve,reject)=>{let text='';server.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.once('exit',()=>reject(Error('Server stopped.')));});
   const origin='http://127.0.0.1:'+ready.port,page=await browser.newPage({viewport:{width:360,height:420},deviceScaleFactor:2}),appearance={key:'local/chars/hailey/hailey.glb',name:'Hailey',directory:'local/chars/hailey',file:'hailey.glb'};
   await page.goto(origin+'/Companion/index.html?inspect=1');await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token,characterId:'body'},location.origin),{appearance,token:ready.token});
   await page.waitForFunction(()=>document.getElementById('status').hidden,{},{timeout:60000});
   await page.evaluate(()=>{window.postMessage({type:'mighty-companion-control',playing:false,framing:'player'},location.origin);window.postMessage({type:'mighty-companion-phase',value:{type:'text.submit',characterId:'body',identity:{sessionId:'body',characterId:'body',generation:1,turnId:'thinking'}}},location.origin);});
   await page.waitForTimeout(1800);const state=await page.evaluate(()=>mightyCompanionInspect());
   if(enabled){assert(state.face.bodyOnly);assert.equal(state.face.director.phase,'thinking');assert.equal(Object.keys(state.face.director.output.weights).length,0);assert(state.face.bones.head);assert(state.face.director.output.head.tilt>6);}
   else assert(!state.face?.v2);
   assert(state.bones.every(b=>b.rotation.every(Number.isFinite)));await page.screenshot({path:path.join(output,'body-'+(enabled?'v2':'legacy')+'.png')});runs.push({enabled,bodyOnly:state.face?.bodyOnly||false,bones:state.face?.bones||null});await page.close();
  }finally{server.stdin.end();}
 }
 await fs.writeFile(path.join(output,'body-fallback.json'),JSON.stringify({runs},null,2)+'\n');console.log('Body fallback: actual Hailey GLB keeps legacy behavior off, named head phase offsets on, no face morph writes or guessed eyes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
