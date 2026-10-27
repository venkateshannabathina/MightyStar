'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const output=path.resolve(__dirname,'../../docs/wp5-evidence');
(async()=>{
 const report=JSON.parse(await fs.readFile(path.join(output,'browser.json'),'utf8')),browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:1000}}),captures=[];
  for(const run of report.runs){
   const label=run.enabled?'on':'off',bytes=await fs.readFile(path.join(output,'openai-selected-'+label+'.webm')),peak=run.samples.reduce((a,b)=>a.jaw>b.jaw?a:b),samples=run.enabled?[run.samples[0],peak,run.samples.at(-1)]:[run.samples[0],run.samples[Math.floor(run.samples.length/2)],run.samples.at(-1)];
   await page.setContent('<video muted></video>');await page.evaluate(async data=>{const v=document.querySelector('video');v.src=data;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;});},'data:video/webm;base64,'+bytes.toString('base64'));
   const frames=[];
   for(const sample of samples){frames.push(await page.evaluate(async time=>{const v=document.querySelector('video');await new Promise(resolve=>{v.onseeked=resolve;v.currentTime=time;});const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL();},Math.max(.001,sample.time/1000-.03)));}
   if(run.enabled)await fs.writeFile(path.join(output,'openai-selected-on-peak.png'),Buffer.from(frames[1].split(',')[1],'base64'));
   captures.push({label,frames,samples});
  }
  await page.setContent('<body style="margin:0;font:16px system-ui;background:#ddd">'+captures.map(c=>'<h2>MIGHTY_ENERGY_JAW '+c.label+' · OpenAI selected · recorded MP3 response</h2><div style="display:flex">'+c.frames.map((src,n)=>'<div><b>'+c.samples[n].time.toFixed(0)+' ms · jaw '+c.samples[n].jaw.toFixed(3)+'</b><img style="width:360px;height:420px;display:block" src="'+src+'"></div>').join('')+'</div>').join('')+'</body>');await page.screenshot({path:path.join(output,'energy-contact-sheet.png'),fullPage:true});
  console.log('Decoded actual recorded playback frames to energy-contact-sheet.png.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
