'use strict';
const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const path=require('node:path');const fs=require('node:fs/promises');const os=require('node:os');
(async()=>{
 // A fixture bundle exercises the same resource layout as the installed app.
 const stage=await fs.mkdtemp(path.join(os.tmpdir(),'mighty-character-routes-'));
 const source=path.join(stage,'Resources');await fs.mkdir(path.join(source,'OrbAssets'),{recursive:true});await fs.mkdir(path.join(source,'Characters','hailey'),{recursive:true});
 await fs.copyFile(path.resolve(__dirname,'../../Sources/companion-server.cjs'),path.join(source,'companion-server.cjs'));
 await fs.symlink(path.resolve(__dirname,'../../Backend'),path.join(stage,'Backend'));
 const json=Buffer.from('{"asset":{"version":"2.0"},"scenes":[{"nodes":[]}],"scene":0}');const jsonSize=Math.ceil(json.length/4)*4;
 const glb=Buffer.alloc(20+jsonSize,0x20);glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(jsonSize,12);glb.writeUInt32LE(0x4e4f534a,16);json.copy(glb,20);
 const portrait=Buffer.from([0xff,0xd8,0xff,0xd9]);
 await fs.writeFile(path.join(source,'Characters','hailey','hailey.glb'),glb);await fs.writeFile(path.join(source,'Characters','hailey','portrait.jpeg'),portrait);
 const server=spawn(process.execPath,[path.join(source,'companion-server.cjs')],{stdio:['pipe','pipe','pipe']});
 const timer=setTimeout(()=>server.kill(),10000);
 try{
  const ready=await new Promise((resolve,reject)=>{let text='',error='';server.stdout.on('data',b=>{text+=b;if(text.includes('\n'))resolve(JSON.parse(text.split('\n')[0]));});server.stderr.on('data',b=>error+=b);server.on('exit',()=>reject(new Error('Server stopped: '+error)));});
  const origin='http://127.0.0.1:'+ready.port;
  assert.equal((await fetch(origin+'/api/appearance/cache',{method:'POST',body:'{}'})).status,401);
  assert.equal((await fetch(origin+'/assets/'+'a'.repeat(43)+'/gi/chars/a/model.pmx')).status,401);
  assert.equal((await fetch(origin+'/assets/'+encodeURIComponent('é'.repeat(43))+'/gi/chars/a/model.pmx')).status,401);
  assert.equal((await fetch(origin+'/api/status',{headers:{'X-Mighty-Token':ready.token}})).status,200,'bad token must not crash server');
  assert.notEqual((await fetch(origin+'/api/appearance/cache',{method:'POST',headers:{'X-Mighty-Token':ready.token,'Content-Type':'application/json'},body:JSON.stringify({appearance:{directory:'../../private',file:'x.pmx'}})})).status,200);
  const localRoot=origin+'/assets/'+ready.token+'/local/chars/hailey/';
  const model=await fetch(localRoot+'hailey.glb');assert.equal(model.status,200);assert.equal(model.headers.get('content-type'),'model/gltf-binary');assert.deepEqual(Buffer.from(await model.arrayBuffer()),glb);
  const image=await fetch(localRoot+'portrait.jpeg');assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');assert.deepEqual(Buffer.from(await image.arrayBuffer()),portrait);
  const head=await fetch(localRoot+'hailey.glb',{method:'HEAD'});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),glb.length);assert.equal((await head.arrayBuffer()).byteLength,0);
  const prepared=await fetch(origin+'/api/appearance/cache',{method:'POST',headers:{'X-Mighty-Token':ready.token,'Content-Type':'application/json'},body:JSON.stringify({appearance:{directory:'local/chars/hailey',file:'hailey.glb'}})});
  assert.equal(prepared.status,200);assert.deepEqual(await prepared.json(),{path:'local/chars/hailey/hailey.glb',cached:true,bundled:true,files:1});
  for(const suffix of ['../other/hailey.glb','%2e%2e%2f%2e%2e%2fsecret.jpeg','extra.png','hailey.glb%5c..%5csecret.jpeg'])assert.notEqual((await fetch(localRoot+suffix)).status,200,'local bundle traversal/unknown resources rejected: '+suffix);
  assert.equal((await fetch(localRoot+'hailey.glb',{method:'POST'})).status,405);
  console.log('Character routes: authenticated bundled model/portrait, MIME types, HEAD, prepare, traversal, invalid tokens and path validation passed');
 }finally{clearTimeout(timer);server.stdin.end();server.kill();await fs.rm(stage,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
