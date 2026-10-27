'use strict';
// Contact sheets from the actual screenshots/recorded canvas; no generated model images.
const fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const output=path.resolve(__dirname,'../../docs/wp8-evidence'),emotions=['neutral','happy','amused','surprised','worried','sad','angry','skeptical','shy'];
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage();
  const sheet=async(frames,rows)=>page.evaluate(async({frames,rows})=>{
   const c=document.createElement('canvas');c.width=1050;c.height=370*rows;const g=c.getContext('2d');g.fillStyle='#e6e8eb';g.fillRect(0,0,c.width,c.height);g.font='13px system-ui';
   for(let n=0;n<frames.length;n++){const im=new Image();im.src=frames[n].src;await im.decode();const x=n%3*350,y=Math.floor(n/3)*370;g.fillStyle='#fff';g.fillRect(x+13,y+25,324,345);g.drawImage(im,350,70,600,640,x+13,y+25,324,345);g.fillStyle='#111';g.fillText(frames[n].label,x+12,y+18);}
   return c.toDataURL('image/jpeg',.9).split(',')[1];
  },{frames,rows});
  for(const id of ['01','07','24']){
   const frames=await Promise.all(emotions.map(async e=>({label:e,src:'data:image/png;base64,'+(await fs.readFile(path.join(output,`${id}-${e}.png`))).toString('base64')})));
   await fs.writeFile(path.join(output,id+'-grid.jpg'),Buffer.from(await sheet(frames,3),'base64'));
  }
  await page.setContent('<video muted></video>');const bytes=await fs.readFile(path.join(output,'face-lab-demo.webm'));
  await page.evaluate(async data=>{const v=document.querySelector('video');v.src=data;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=reject;});},'data:video/webm;base64,'+bytes.toString('base64'));
  const frames=[];
  for(let second=1;second<24;second+=2){const src=await page.evaluate(async second=>{const v=document.querySelector('video');await new Promise(r=>{v.onseeked=r;v.currentTime=second;});const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(v,0,0);return c.toDataURL();},second);frames.push({label:second+' s (recorded canvas)',src});}
  await fs.writeFile(path.join(output,'demo-contact-sheet.jpg'),Buffer.from(await sheet(frames,4),'base64'));
  console.log('Face Lab: three nine-emotion sheets and twelve decoded auto-demo frames generated from actual captured evidence.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
