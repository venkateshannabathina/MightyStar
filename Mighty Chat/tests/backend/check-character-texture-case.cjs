'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {CharacterCache}=require('../../Backend/assets/CharacterCache.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mighty-texture-case-'));
 try{
  const fetched=[];const cache=new CharacterCache({root,fetchImpl:async(url,options)=>{
   assert.equal(new URL(url).origin,'https://phoshco.github.io');assert.equal(options.redirect,'error');fetched.push(decodeURIComponent(new URL(url).pathname));
   return new Response(url.includes('/Tex/')?'missing':'texture-bytes',{status:url.includes('/Tex/')?404:200});
  }});
  for(const texture of ['ww/chars/Lynae/Lynae/Tex/hair spa.png','ww/chars/Rover (Female)/Rover (Female)/Tex/cheek_00.tga']){
   const result=await cache.get(texture);assert.equal(await fs.readFile(result.file,'utf8'),'texture-bytes');
   const offline=new CharacterCache({root,fetchImpl:async()=>{throw Error('offline')}});
   assert.equal((await offline.get(texture)).cached,true,'original PMX path remains the durable cache key');
  }
  assert.equal(fetched.length,4);assert(fetched[1].includes('/tex/'));assert(fetched[3].includes('/tex/'));
  for(const [relative,status] of [['ww/chars/Lynae/Lynae/Tex/denied.png',403],['ww/chars/Lynae/Lynae/textures/missing.png',404]]){
   let count=0;const denied=new CharacterCache({root,fetchImpl:async()=>{count++;return new Response('missing',{status});}});
   await assert.rejects(denied.get(relative),/Download failed/);assert.equal(count,1,'no fallback for authorization errors or unrelated paths');
  }
  console.log('PASS: Lynae and female Rover texture directory-case fallback, original-key offline reuse, same-origin/redirect restrictions and no fallback on 403/unrelated paths');
 }finally{await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
