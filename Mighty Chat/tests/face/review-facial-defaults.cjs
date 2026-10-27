'use strict';
const {spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const app=path.resolve(__dirname,'../..'),out=path.join(app,'build/facial-editor-review/defaults');
const appearance={key:'zzz/chars/Evelyn Chevalier/Evelyn.pmx',name:'Evelyn',directory:'zzz/chars/Evelyn Chevalier',file:'Evelyn.pmx'};
async function main(){
 await fs.mkdir(out,{recursive:true});
 const server=spawn(process.execPath,[path.join(app,'Sources/companion-server.cjs')],{stdio:['pipe','pipe','pipe']});let browser;
 try{
  const ready=await new Promise((resolve,reject)=>{let text='';server.stdout.on('data',chunk=>{text+=chunk;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.once('exit',code=>reject(Error('Backend stopped: '+code)));});
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:700,height:700},deviceScaleFactor:1});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  await page.goto(`http://127.0.0.1:${ready.port}/Companion/index.html?inspect=1`);
  await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token},location.origin),{appearance,token:ready.token});
  await page.waitForFunction(()=>window.mightyAppearanceEditor?.().expressions.length===49,{},{timeout:60000});
  await page.evaluate(()=>window.postMessage({type:'mighty-companion-control',playing:false,framing:'face',editorInset:0,editorLeftInset:0},location.origin));
  const inventory=await page.evaluate(()=>window.mightyAppearanceEditor());
  const shots={neutral:{},niyari:{'にやり':1},cornerUp:{'口角上げ':1},corners:{'口角上げ左':.8,'口角上げ右':.8},smile:{'口角上げ':.8,'にやり':.6,'笑い':.2},happy:{'口角上げ':.85,'ワ':.6,'笑い':1},laugh:{'い２':.6,'ワ':.5,'笑い':1}};
  for(const [name,weights] of Object.entries(shots)){
   const facePreview=Object.fromEntries(Object.entries(weights).map(([name,value])=>[inventory.expressions.find(key=>key.name===name).stableId,value]));
   await page.evaluate(facePreview=>window.postMessage({type:'mighty-companion-control',facePreview},location.origin),facePreview);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.screenshot({path:path.join(out,name+'.png')});
  }
  const report=[];
  for(const preset of inventory.expressionLibrary.presets){
   await page.evaluate(facePreview=>window.postMessage({type:'mighty-companion-control',facePreview},location.origin),preset.weights);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const rendered=await page.evaluate(()=>window.mightyCompanionInspect().morphWeights);
   for(const [id,value] of Object.entries(preset.weights)){
    const key=inventory.expressions.find(key=>key.stableId===id);assert.ok(Math.abs(rendered[key.name]-value)<1e-5,preset.name+' applies '+key.name);
   }
   report.push({id:preset.id,name:preset.name,keyCount:Object.keys(preset.weights).length});
   await page.screenshot({path:path.join(out,'preset-'+preset.id+'.png')});
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({keyCount:inventory.expressions.length,presets:report,errors},null,2));
  console.log('PASS: every default applies its exact weights to the real Evelyn PMX; captured default expressions and smile candidates.');
 }finally{await browser?.close();server.stdin.end();server.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
