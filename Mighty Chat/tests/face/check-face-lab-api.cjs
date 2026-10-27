'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn}=require('node:child_process'),{once}=require('node:events');
const {CalibrationStore,CHANNELS,keyHash}=require('../../Backend/face/CalibrationStore.cjs');
const {loadEngine}=require('./load-engine.cjs');
assert.deepEqual(CHANNELS,Array.from(loadEngine().CH_LIST),'backend and engine channels must agree');
const root=fs.mkdtempSync('/private/tmp/mighty-wp8-api-'),key='hsr/chars/model/model.pmx';
(async()=>{
 const store=new CalibrationStore(path.join(root,'local'));
 assert.equal(store.read(key).calibration,null);
 const value={gains:{browWorry:.8},disable:['tongue'],aliases:{browAngry:['EB_Angry_01']}};
 const saved=store.write(key,value);assert.equal(saved.hash,keyHash(key));assert.deepEqual(store.read(key),saved);assert.equal(fs.statSync(path.join(root,'local',saved.hash+'.json')).mode&0o777,0o600);
 for(const bad of [{gains:{bad:1}},{gains:{browUp:-1}},{gains:{browUp:3}},{gains:{browUp:null}},{disable:['not-channel']},{aliases:{browUp:['x\0']}},{path:'../bad'},{gains:[]}])assert.throws(()=>store.write(key,bad),/Invalid/);
 assert.throws(()=>store.write('',{}));assert.throws(()=>store.write('x\0',{}));
 fs.unlinkSync(path.join(root,'local',saved.hash+'.json'));fs.symlinkSync('/private/tmp/never-created-wp8',path.join(root,'local',saved.hash+'.json'));
 assert.throws(()=>store.write(key,{}));assert.throws(()=>store.read(key));assert(!fs.existsSync('/private/tmp/never-created-wp8'));
 fs.symlinkSync(path.join(root,'local'),path.join(root,'symlink'));assert.throws(()=>new CalibrationStore(path.join(root,'symlink','child')).write(key,{}));assert(!fs.existsSync(path.join(root,'local','child')));
 for(const flags of [{lab:false,expr:false},{lab:true,expr:false},{lab:false,expr:true}]){
  const directory=path.join(root,`api-${flags.lab}-${flags.expr}`);
  const child=spawn(process.execPath,[path.resolve(__dirname,'../../Sources/companion-server.cjs')],{env:{...process.env,MIGHTY_FACE_LAB:flags.lab?'1':'0',MIGHTY_EXPR_V2:flags.expr?'1':'0',MIGHTY_MEMORY_V1:'0',MIGHTY_FACE_CALIBRATION_ROOT:directory},stdio:['pipe','pipe','pipe']});
  try{
   const ready=await new Promise((resolve,reject)=>{let s='';child.stdout.on('data',b=>{s+=b;if(s.includes('\n'))resolve(JSON.parse(s.split('\n')[0]));});child.once('exit',()=>reject(Error('Server exited')));});
   const origin='http://127.0.0.1:'+ready.port,headers={'X-Mighty-Token':ready.token,'Content-Type':'application/json'};
   const get=auth=>fetch(origin+'/api/face/calibration?appearanceKey='+encodeURIComponent(key),{headers:auth?headers:{}});
   assert.equal((await get(false)).status,401);
   const status=await(await fetch(origin+'/api/status',{headers})).json();assert.equal(status.faceLab,flags.lab);
   assert.equal((await get(true)).status,flags.lab||flags.expr?200:404);
   const post=body=>fetch(origin+'/api/face/calibration',{method:'POST',headers,body:JSON.stringify(body)});
   const response=await post({appearanceKey:key,calibration:value});assert.equal(response.status,flags.lab?200:404);
   if(flags.lab){assert.deepEqual((await(await get(true)).json()).calibration,value);assert.equal((await post({appearanceKey:key,calibration:{gains:{browUp:3}}})).status,400);try{assert.equal((await post({appearanceKey:key,calibration:{aliases:{browUp:['x'.repeat(18000)]}}})).status,413);}catch(error){assert(['UND_ERR_SOCKET','ECONNRESET'].includes(error.cause?.code));}}
   else assert(!fs.existsSync(directory),'flag-off route must not create storage');
  }finally{if(child.exitCode===null){const done=once(child,'exit');child.stdin.end();await done;}}
 }
 console.log('Face Lab API: flag matrix/auth, exact channel schema, model hash, persistence, bounds, symlink/parent/path protection passed');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>fs.rmSync(root,{recursive:true,force:true}));
