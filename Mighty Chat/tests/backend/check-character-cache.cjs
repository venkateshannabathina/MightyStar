'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');const path=require('node:path');
const {CharacterCache,pmxTextures,assetPath,modelPath}=require('../../Backend/assets/CharacterCache.cjs');
function integer(n){const b=Buffer.alloc(4);b.writeInt32LE(n);return b;}
function fixture(encoding=1){
 const text=s=>{const b=Buffer.from(s,encoding?'utf8':'utf16le');return Buffer.concat([integer(b.length),b]);};
 const header=Buffer.concat([Buffer.from('PMX '),Buffer.from([0,0,0,64]),Buffer.from([8,encoding,0,2,1,1,2,1,1]),...Array.from({length:4},()=>text(''))]);
 const vertices=[0,1,2,3,4].map((type)=>Buffer.concat([Buffer.alloc(32),Buffer.from([type]),Buffer.alloc([2,8,24,44,24][type]+4)]));
 return Buffer.concat([header,integer(5),...vertices,integer(3),Buffer.alloc(6),integer(2),text('textures\\face.png'),text('shared/body.png')]);
}
function glbFixture(model={asset:{version:'2.0'},scenes:[{nodes:[]}],scene:0}){
 const json=Buffer.from(JSON.stringify(model));const size=Math.ceil(json.length/4)*4;
 const data=Buffer.alloc(20+size,0x20);data.write('glTF');data.writeUInt32LE(2,4);data.writeUInt32LE(data.length,8);data.writeUInt32LE(size,12);data.writeUInt32LE(0x4e4f534a,16);json.copy(data,20);return data;
}
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mighty-cache-'));
 try{
  assert.deepEqual(pmxTextures(fixture()),['textures\\face.png','shared/body.png']);
  assert.deepEqual(pmxTextures(fixture(0)),['textures\\face.png','shared/body.png']);
  assert.throws(()=>pmxTextures(fixture().subarray(0,35)),/Incomplete/);
  for(const p of ['../secret','gi/chars/../../secret','gi/chars/x?url=evil','https://other/model.pmx'])assert.throws(()=>assetPath(p));
  assert.throws(()=>modelPath({directory:'ww/chars/removed',file:'removed.pmx'}),/supported/);
  assert.throws(()=>assetPath('ww/chars/removed/portrait.png'),/Unsupported/);
  const bundledRoot=path.join(root,'Characters');await fs.mkdir(path.join(bundledRoot,'hailey'),{recursive:true});
  const localModel='local/chars/hailey/hailey.glb',localPortrait='local/chars/hailey/portrait.jpeg';
  const localAppearance={directory:'local/chars/hailey',file:'hailey.glb'};
  await fs.writeFile(path.join(bundledRoot,'hailey','hailey.glb'),glbFixture());
  await fs.writeFile(path.join(bundledRoot,'hailey','portrait.jpeg'),Buffer.from([0xff,0xd8,0xff,0xd9]));
  let localRequests=0;const bundled=new CharacterCache({root:path.join(root,'unused-cache'),bundledRoot,fetchImpl:async()=>{localRequests++;throw Error('offline');}});
  assert.equal(modelPath(localAppearance),localModel);
  assert.deepEqual(await bundled.prepare(localAppearance),{path:localModel,cached:true,bundled:true,files:1});
  assert.equal((await bundled.get(localPortrait)).file,await fs.realpath(path.join(bundledRoot,'hailey','portrait.jpeg')));
  assert.equal(localRequests,0,'bundled model and portrait work offline without remote rewriting');
  await assert.rejects(()=>fs.stat(path.join(root,'unused-cache')),/ENOENT/,'bundled loads do not create remote cache entries');
  for(const p of ['local/chars/hailey/../portrait.jpeg','local/chars/hailey/%2e%2e/portrait.jpeg','local/chars/other/hailey.glb','local/chars/hailey/secret.png','local/chars/hailey/portrait.jpeg?x=1'])assert.throws(()=>assetPath(p));
  for(const appearance of [{directory:'local/chars/hailey',file:'../hailey.glb'},{directory:'local/chars/other',file:'hailey.glb'},{directory:'local/chars/hailey',file:'portrait.jpeg'}])assert.throws(()=>modelPath(appearance));
  await fs.writeFile(path.join(bundledRoot,'hailey','hailey.glb'),glbFixture({asset:{version:'2.0'},images:[{uri:'https://other/texture.png'}]}));
  await assert.rejects(()=>bundled.prepare(localAppearance),/must be embedded/,'GLB files cannot reference external resources');
  await fs.writeFile(path.join(bundledRoot,'hailey','hailey.glb'),Buffer.from('invalid model'));
  await assert.rejects(()=>bundled.prepare(localAppearance),/Invalid bundled/);
  await fs.writeFile(path.join(bundledRoot,'hailey','hailey.glb'),glbFixture());
  const outside=path.join(root,'outside.jpeg');await fs.writeFile(outside,'private');
  await fs.unlink(path.join(bundledRoot,'hailey','portrait.jpeg'));await fs.symlink(outside,path.join(bundledRoot,'hailey','portrait.jpeg'));
  await assert.rejects(()=>bundled.get(localPortrait),/Invalid bundled character path/,'symlinks cannot expose files outside the Characters bundle');
  const appearance={directory:'ww/chars/Lucy',file:'Lucy.pmx'};let requests=0;
  const fetchImpl=async()=>{requests++;return new Response(requests===1?fixture():Buffer.from('texture'));};
  const cache=new CharacterCache({root,fetchImpl});
  const [a,b]=await Promise.all([cache.prepare(appearance),cache.prepare(appearance)]);
  assert.equal(a.files,3);assert.equal(b.files,3);assert.equal(requests,3,'simultaneous loads share downloads');
  const offline=new CharacterCache({root,fetchImpl:async()=>{throw new Error('offline');}});
  assert.equal((await offline.prepare(appearance)).cached,true,'cache survives a backend restart without network');
  const file=await offline.get('ww/chars/Lucy/textures/face.png');assert.equal(file.cached,true);
  const failing=new CharacterCache({root:path.join(root,'fail'),maxFile:4,fetchImpl:async()=>new Response(Buffer.alloc(10))});
  await assert.rejects(()=>failing.get('ww/chars/Lynae/x.png'),/too large/);
  assert.equal((await fs.readdir(path.join(root,'fail'))).length,0,'failed downloads leave no partial cache entry');
  let attempts=0;const retry=new CharacterCache({root:path.join(root,'retry'),fetchImpl:async()=>{if(++attempts===1)throw new Error('offline');return new Response(Buffer.from('BPMXtest'));}});
  await assert.rejects(()=>retry.prepare({directory:'ww/chars/Rover (Male)/Rover (Male)',file:'Rover (Male).bpmx'}),/offline/);
  await retry.prepare({directory:'ww/chars/Rover (Male)/Rover (Male)',file:'Rover (Male).bpmx'});assert.equal(attempts,2);
  await fs.unlink(cache.file('ww/chars/Lucy/shared/body.png'));
  await assert.rejects(()=>offline.prepare(appearance),/offline/,'missing textures cannot report a complete download');
  // A stalled roster must not starve a newly selected model or its textures.
  let unblockPortraits;const portraitGate=new Promise(resolve=>{unblockPortraits=resolve;});
  const started=[];
  const priorityCache=new CharacterCache({root:path.join(root,'priority'),fetchImpl:async url=>{
    const relative=new URL(url).pathname.slice(1);started.push(relative);
    if(!relative.includes('/chars/'))await portraitGate;
    return new Response(relative.endsWith('.pmx')?fixture():Buffer.from('texture'));
  }});
  const portraits=Array.from({length:12},(_,i)=>priorityCache.get(['ww/WuWa/Lynae.png','ww/WuWa/Rover (Male).png','ww/WuWa/Rover (Female).png','ww/WuWa/Lucy.png'][i%4]));
  const timeout=(promise)=>Promise.race([promise,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Model blocked by portraits')),2000);timer.unref();})]);
  try{
    const model={...appearance,portrait:'https://phoshco.github.io/ww/WuWa/Lucy.png'};
    const loaded=await timeout(priorityCache.prepare(model));
    assert.equal(loaded.files,3,'model and textures load while portrait responses remain blocked');
    assert.equal(started.filter(file=>!file.includes('/chars/')).length,2,'portrait requests leave model slots free');
    assert.equal((await timeout(priorityCache.prepare(model))).cached,true,'cached model does not await its optional portrait');
  }finally{unblockPortraits();await Promise.all(portraits);}
  console.log('Character cache: bundled GLB and portrait, offline loading, embedded resources, symlink and path bounds, PMX encodings/textures, concurrency and retry passed');
 }finally{await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
