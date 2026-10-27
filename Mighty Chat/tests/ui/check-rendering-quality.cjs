'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const label=process.argv[2]||'after';
assert.match(label,/^[a-z0-9-]+$/);
const appRoot=path.resolve(__dirname,'../..');
const reviewRoot=process.env.MIGHTY_RENDER_REVIEW_ROOT ? path.resolve(process.env.MIGHTY_RENDER_REVIEW_ROOT) : path.join(appRoot,'build','render-review');
const output=path.join(reviewRoot,label);
const appearances=[
 {key:'local/chars/hailey/hailey.glb',name:'Hailey',directory:'local/chars/hailey',file:'hailey.glb'},
 {key:'ww/chars/Lynae/Lynae/Lynae.pmx',name:'Lynae',directory:'ww/chars/Lynae/Lynae',file:'Lynae.pmx'},
 {key:'ww/chars/Rover (Male)/Rover (Male)/Rover (Male).bpmx',name:'Rover (Male)',directory:'ww/chars/Rover (Male)/Rover (Male)',file:'Rover (Male).bpmx'}
];
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const percentile=(values,amount)=>values[Math.min(values.length-1,Math.floor((values.length-1)*amount))]||0;

function imageMetrics(buffer){
 const image=PNG.sync.read(buffer),{width,height,data}=image;
 let occupied=0,partial=0,edge=0,magenta=0,minX=width,minY=height,maxX=-1,maxY=-1;
 let red=0,green=0,blue=0,gradient=0,gradientPairs=0;const luminance=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,a=data[i+3];if(a>0&&a<255)partial++;
  if(a<32)continue;occupied++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  if(x===0||y===0||x===width-1||y===height-1)edge++;
  const r=data[i],g=data[i+1],b=data[i+2];red+=r;green+=g;blue+=b;luminance.push(.2126*r+.7152*g+.0722*b);
  if(r>220&&b>180&&g<80)magenta++;
  if(x&&data[i-1]>230&&a>230){gradient+=Math.abs(r-data[i-4])+Math.abs(g-data[i-3])+Math.abs(b-data[i-2]);gradientPairs++;}
 }
 luminance.sort((a,b)=>a-b);let cornerOccupied=0,topCornerOccupied=0;
 for(const [startX,startY] of [[0,0],[width-8,0],[0,height-8],[width-8,height-8]])for(let y=startY;y<startY+8;y++)for(let x=startX;x<startX+8;x++)if(data[(y*width+x)*4+3]>0){cornerOccupied++;if(startY===0)topCornerOccupied++;}
 const bounds={minX,minY,maxX,maxY};const skin=[];
 const center=(minX+maxX)/2,bodyHeight=maxY-minY;
 for(let y=Math.max(0,Math.floor(minY+bodyHeight*.02));y<Math.min(height,minY+bodyHeight*.19);y++)for(let x=Math.max(0,Math.floor(center-(maxX-minX)*.12));x<Math.min(width,center+(maxX-minX)*.12);x++){
  const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2];
  if(data[i+3]>230&&r>g+5&&g>b+3&&r>40&&g>20)skin.push([r,g,b]);
 }
 const meanSkin=skin.length?[0,1,2].map(channel=>skin.reduce((sum,value)=>sum+value[channel],0)/skin.length):null;
 return {image,metrics:{width,height,occupiedPixels:occupied,occupiedFraction:occupied/(width*height),partialAlphaPixels:partial,edgePixels:edge,cornerOccupied,topCornerOccupied,magentaFraction:magenta/Math.max(1,occupied),bounds,meanRGB:[red,green,blue].map(value=>value/Math.max(1,occupied)),luminance:{p10:percentile(luminance,.1),median:percentile(luminance,.5),p90:percentile(luminance,.9)},opaqueGradientMean:gradient/Math.max(1,gradientPairs),skinCandidatePixels:skin.length,skinMeanRGB:meanSkin}};
}
function imageDifference(before,after){
 assert.equal(before.width,after.width);assert.equal(before.height,after.height);
 let visible=0,changed=0,total=0,alphaDifference=0;
 for(let i=0;i<after.data.length;i+=4){if(Math.max(before.data[i+3],after.data[i+3])<32)continue;visible++;let difference=0;for(let c=0;c<3;c++)difference+=Math.abs(before.data[i+c]-after.data[i+c]);total+=difference;alphaDifference+=Math.abs(before.data[i+3]-after.data[i+3]);if(difference>12)changed++;}
 return {visiblePixels:visible,changedPixels:changed,changedFraction:changed/Math.max(1,visible),meanAbsoluteRGBDelta:total/(Math.max(1,visible)*3),meanAlphaDelta:alphaDifference/Math.max(1,visible)};
}
function composite(image){
 const result=new PNG({width:image.width,height:image.height});
 for(let i=0;i<image.data.length;i+=4){const alpha=image.data[i+3]/255;for(let channel=0;channel<3;channel++)result.data[i+channel]=Math.round(image.data[i+channel]*alpha+28*(1-alpha));result.data[i+3]=255;}
 return PNG.sync.write(result);
}
function pairedPreview(before,after){
 const left=PNG.sync.read(composite(before)),right=PNG.sync.read(composite(after));
 const result=new PNG({width:left.width+right.width+4,height:Math.max(left.height,right.height)});result.data.fill(28);
 for(let index=3;index<result.data.length;index+=4)result.data[index]=255;
 for(const [source,offset] of [[left,0],[right,left.width+4]])for(let y=0;y<source.height;y++)source.data.copy(result.data,(y*result.width+offset)*4,y*source.width*4,(y+1)*source.width*4);
 return PNG.sync.write(result);
}
async function stage(){
 await fs.mkdir(output,{recursive:true});
 const directory=path.join(output,'server'),resources=path.join(directory,'Resources');
 // A pre-frozen baseline survives renderer rebuilds. Other labels snapshot the
 // completed source renderer before testing so captures use a single bundle.
 const frozen=label==='baseline'&&await fs.stat(path.join(resources,'Companion','companion.js')).then(()=>true).catch(()=>false);
 await fs.mkdir(resources,{recursive:true});
 if(!frozen){await fs.cp(path.join(appRoot,'Sources','Companion'),path.join(resources,'Companion'),{recursive:true});await fs.copyFile(path.join(appRoot,'Sources','companion-server.cjs'),path.join(resources,'companion-server.cjs'));}
 for(const [target,destination] of [[path.join(appRoot,'Backend'),'Backend'],[path.join(appRoot,'Sources','Characters'),'Resources/Characters']])await fs.symlink(target,path.join(directory,destination)).catch(error=>{if(error.code!=='EEXIST')throw error;});
 const preload=path.join(directory,'offline-fetch.cjs');
 await fs.writeFile(preload,"globalThis.fetch=async()=>{throw new Error('Rendering QA forbids remote asset requests.');};\n");
 return {directory,preload,bundle:path.join(resources,'Companion','companion.js')};
}
async function main(){
 const staged=await stage(),server=spawn(process.execPath,['--require',staged.preload,path.join(staged.directory,'Resources','companion-server.cjs')],{stdio:['pipe','pipe','pipe']});
 let browser;const errors=[],remoteRequests=[],report={label,bundleSHA256:hash(await fs.readFile(staged.bundle)),viewport:{width:460,height:760,dpr:2},characters:[],errors,remoteRequests};
 try{
  const ready=await new Promise((resolve,reject)=>{let text='',error='';const timer=setTimeout(()=>reject(Error('QA backend startup timed out')),10000);server.stdout.on('data',chunk=>{text+=chunk;if(text.includes('\n')){clearTimeout(timer);resolve(JSON.parse(text.split('\n')[0]));}});server.stderr.on('data',chunk=>error+=chunk);server.once('exit',()=>{clearTimeout(timer);reject(Error('QA backend stopped: '+error));});});
  const origin='http://127.0.0.1:'+ready.port;
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:460,height:760},deviceScaleFactor:2});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin||['data:','blob:'].includes(url.protocol))return route.continue();remoteRequests.push(url.origin+url.pathname.replace(/\/assets\/[^/]+\//,'/assets/[redacted]/'));return route.abort();});
  await page.addInitScript(()=>{Math.random=()=>.1;window.qaIntervals=[];let last=0;function frame(now){if(last)qaIntervals.push(now-last);last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);});
  await page.goto(origin+'/Companion/index.html?inspect=1');
  const control=async value=>{await page.evaluate(value=>window.postMessage({type:'mighty-companion-control',...value},location.origin),value);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
  for(const appearance of appearances){
   const name=appearance.name.toLowerCase(),entry={name:appearance.name,key:appearance.key,views:{}};
   await page.evaluate(({appearance,token})=>window.postMessage({type:'mighty-companion-load',appearance,token},location.origin),{appearance,token:ready.token});
   await page.waitForFunction(key=>document.getElementById('status').hidden&&mightyCompanionInspect().key===key,appearance.key,{timeout:60000});
   if(label!=='baseline'){
    await page.waitForFunction(pbr=>{const light=mightyCompanionInspect().lighting;return light&&(pbr?light.environmentReady||light.environmentFailed:light.profile==='authored-toon');},appearance.name==='Hailey',{timeout:30000});
    const light=await page.evaluate(()=>mightyCompanionInspect().lighting);
    assert.equal(light.profile,appearance.name==='Hailey'?'studio-pbr':'authored-toon');
    assert.equal(light.appearanceKey,appearance.key);
    assert.equal(light.transparentCanvas,true);
    if(appearance.name==='Hailey'){assert.equal(light.environmentReady,true);assert.equal(light.environmentFailed,false,light.environmentError);assert.equal(light.prefiltered,true);assert.equal(light.toneMapping,'ACES');}
    else assert.equal(light.toneMapping,'none','MMD keeps authored color processing');
   }
   await control({playing:true,idleStyle:'male',desktopInteraction:true,framing:'full',reset:true});
   // Production uses the selected full-clip loop, not the old sequence endpoint hold.
   await page.waitForFunction(()=>{const state=mightyCompanionInspect().idle;return state.stage==='animation'&&state.primary.clipIndex===0&&state.primary.time>.35&&state.primary.time<1.7;},{},{timeout:30000});
   await control({playing:false});
   const stable=await page.evaluate(()=>mightyCompanionInspect());
   assert.ok(stable.bones.length>20);assert.ok(stable.bones.every(bone=>[...bone.rotation,...bone.position].every(Number.isFinite)));if(appearance.name==='Hailey')assert.equal(stable.bones.length,247);entry.bones=stable.bones.length;entry.poseSHA256=hash(JSON.stringify(stable.bones));entry.idle=stable.idle;
   for(const mode of ['full','portrait','selection']){
    await control({framing:mode,reset:true});
    await page.waitForTimeout(180);
    const screenshot=await page.screenshot({omitBackground:true}),{image,metrics}=imageMetrics(screenshot);
    assert.ok(metrics.occupiedFraction>.03&&metrics.occupiedFraction<.9,appearance.name+' '+mode+' has visible character and transparent space');
    assert.equal(metrics.topCornerOccupied,0,appearance.name+' '+mode+' preserves transparent background above the character');
    if(mode==='full'){assert.equal(metrics.cornerOccupied,0,appearance.name+' full body preserves transparent corners');assert.equal(metrics.edgePixels,0,appearance.name+' full body fits without clipping');}
    assert.ok(metrics.magentaFraction<.005,appearance.name+' '+mode+' has no missing-texture magenta');
    const state=await page.evaluate(()=>mightyCompanionInspect());
    assert.deepEqual(state.bones,stable.bones,'View framing leaves the paused skeletal pose unchanged');
    const file=name+'-'+mode+'.png';await fs.writeFile(path.join(output,file),screenshot);await fs.writeFile(path.join(output,name+'-'+mode+'-neutral.png'),composite(image));
    entry.views[mode]={file,camera:state.camera,metrics,lighting:state.lighting??null,render:state.render??state.renderStats??null};
   }
   await control({framing:'full',reset:true,playing:true});await page.evaluate(()=>{qaIntervals.length=0;});
   const before=await page.evaluate(()=>mightyCompanionInspect());await page.waitForTimeout(4000);let moving=await page.evaluate(()=>mightyCompanionInspect());
   if(JSON.stringify(before.bones)===JSON.stringify(moving.bones)){await page.waitForTimeout(3000);moving=await page.evaluate(()=>mightyCompanionInspect());}
   assert.notDeepEqual(moving.bones,before.bones,appearance.name+' still animates with its render profile');
   const intervals=await page.evaluate(()=>qaIntervals.slice().filter(value=>value>0&&Number.isFinite(value)).sort((a,b)=>a-b));
   entry.frameTiming={samples:intervals.length,medianMs:percentile(intervals,.5),p95Ms:percentile(intervals,.95),approxFPS:1000/percentile(intervals,.5),render:moving.render??moving.renderStats??null};
   report.characters.push(entry);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remoteRequests,[],'Quality QA makes no remote requests');
  // Release captures validate current rendering without claiming a historical
  // pixel comparison against captures made with a different idle controller.
  if(label!=='baseline'&&label!=='release'){
   const baseline=JSON.parse(await fs.readFile(path.join(reviewRoot,'baseline','quality-report.json'),'utf8'));
   report.comparison=[];
   for(const character of report.characters){
    const original=baseline.characters.find(item=>item.key===character.key);assert.equal(character.poseSHA256,original.poseSHA256,'Baseline/after capture uses identical skeletal pose');const views={};
    for(const [mode,view] of Object.entries(character.views)){
     const before=original.views[mode];assert.deepEqual(view.camera,before.camera,'Baseline/after camera is identical');
     const beforeImage=PNG.sync.read(await fs.readFile(path.join(reviewRoot,'baseline',before.file))),afterImage=PNG.sync.read(await fs.readFile(path.join(output,view.file)));
     const delta=imageDifference(beforeImage,afterImage);
     assert.ok(delta.meanAlphaDelta<.1,character.name+' '+mode+' retains the original transparent silhouette');
     if(character.name!=='Hailey'){assert.ok(delta.meanAbsoluteRGBDelta<1,character.name+' '+mode+' keeps authored colors');assert.ok(delta.changedFraction<.02,character.name+' '+mode+' avoids a global lighting change');}
     const preview=character.name.toLowerCase()+'-'+mode+'-baseline-left-after-right.png';await fs.writeFile(path.join(output,preview),pairedPreview(beforeImage,afterImage));
     views[mode]={comparisonFile:preview,pixelDelta:delta,meanRGBBefore:before.metrics.meanRGB,meanRGBAfter:view.metrics.meanRGB,luminanceBefore:before.metrics.luminance,luminanceAfter:view.metrics.luminance,partialAlphaBefore:before.metrics.partialAlphaPixels,partialAlphaAfter:view.metrics.partialAlphaPixels,opaqueGradientBefore:before.metrics.opaqueGradientMean,opaqueGradientAfter:view.metrics.opaqueGradientMean};
    }
    report.comparison.push({name:character.name,samePose:true,views});
   }
  }
  await fs.writeFile(path.join(output,'quality-report.json'),JSON.stringify(report,null,2));
  console.log('PASS: '+label+' GLB/PMX/BPMX offline GPU renders, three camera framings, transparent edges, textures, finite poses, motion and frame timing; '+output+(label==='release'?' (current capture only; no historical pixel comparison)':''));
 }finally{await browser?.close();server.stdin.end();server.kill();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
