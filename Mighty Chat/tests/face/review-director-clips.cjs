'use strict';
// Decode the recorded canvas footage in Chrome; no external video converter.
const fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const output=path.resolve(__dirname,'../../docs/wp4-evidence');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:900}}),report=JSON.parse(await fs.readFile(path.join(output,'blink-comparison.json'),'utf8'));
  const captures=[];
  for(const run of report.runs){
   const peak=run.samples.reduce((a,b)=>a.blink>b.blink?a:b),bytes=await fs.readFile(path.join(output,'blink-'+run.mode+'.webm'));
   await page.setContent('<video muted></video>');
   await page.evaluate(async data=>{const v=document.querySelector('video');v.src=data;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;});},'data:video/webm;base64,'+bytes.toString('base64'));
   const frames=[];
   for(const offset of [-100,-50,0,50,100]){
    const time=Math.max(0,peak.time/1000+offset/1000);
    frames.push(await page.evaluate(async time=>{const v=document.querySelector('video');await new Promise(resolve=>{v.onseeked=resolve;v.currentTime=time;});const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL();},time));
   }
   captures.push({mode:run.mode,peak:peak.blink,frames});
  }
  await page.setContent('<body style="margin:0;font:16px system-ui;background:#ddd">'+captures.map(c=>'<h2>'+c.mode+' · peak weight '+c.peak.toFixed(3)+'</h2><div style="display:flex">'+c.frames.map((src,n)=>'<div><b>'+[-100,-50,0,50,100][n]+' ms from peak</b><img style="width:210px;height:245px;display:block" src="'+src+'"></div>').join('')+'</div>').join('')+'</body>');
  await page.screenshot({path:path.join(output,'blink-contact-sheet.png'),fullPage:true});
  console.log('Decoded actual legacy/v2 blink footage to blink-contact-sheet.png.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
