'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {PocketPacks}=require('../../Backend/providers/PocketPacks.cjs');
(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-pack-check-'));let count=0,bad=false;
 const file={repo:'kyutai/test',path:'languages/test/voice.bin',revision:'fixture',size:5,sha256:crypto.createHash('sha256').update('hello').digest('hex')};
 const options={resources:path.join(root,'resources'),cacheRoot:path.join(root,'cache'),fetchImpl:async(url)=>{count++;assert(url.startsWith('https://huggingface.co/kyutai/test/resolve/fixture/'));return new Response(bad?'wrong':'hello');}};
 let packs=new PocketPacks(options);
 try{
  await Promise.all([packs.file(file,'test'),packs.file(file,'test')]);assert.equal(count,1);assert.equal(fs.readFileSync(packs.target(file),'utf8'),'hello');
  packs.close();fs.writeFileSync(packs.target(file),'wrong');packs=new PocketPacks(options);await packs.file(file,'test');assert.equal(count,2,'same-size corrupt cached files must be repaired');
  const next={...file,path:'languages/test/bad.bin'};bad=true;await assert.rejects(packs.file(next,'test'),/verification/);assert(!fs.existsSync(packs.target(next)));assert(!fs.readdirSync(path.dirname(packs.target(next))).some(f=>f.endsWith('.part')));
  await assert.rejects(packs.ensure('../outside','alba'),/available/);
  console.log('Pocket packs: pinned URLs, hash/size validation, shared downloads, corrupt-cache repair, atomic failure cleanup and language validation passed.');
 }finally{packs.close();fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
