'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {createHash,randomUUID} = require('node:crypto');
const roster = require(require('node:fs').existsSync(path.resolve(__dirname,'../../Sources/catalog.js')) ? '../../Sources/catalog.js' : '../../Resources/catalog.js');
const allowedModels = new Set([...roster.appearances,...roster.legacyAppearances].map(item=>item.key));
const modelDirectories = [...new Set([...allowedModels].filter(key=>!key.startsWith('local/')).map(key=>key.split('/').slice(0,3).join('/')))];
const portraits = new Set([...roster.appearances,...roster.legacyAppearances].filter(item=>item.portrait.startsWith('https://phoshco.github.io/')).map(item=>item.portrait.slice('https://phoshco.github.io/'.length)));
const ASSET_ORIGIN = 'https://phoshco.github.io/';
const MAX_FILE = 512 * 1024 * 1024;
// Local model paths are catalog identifiers, never user-supplied filesystem paths.
const BUNDLED_ASSETS = new Map([
  ['local/chars/hailey/hailey.glb','hailey/hailey.glb'],
  ['local/chars/hailey/portrait.jpeg','hailey/portrait.jpeg']
]);
function assetPath(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\x00-\x1f\\?#]/.test(value) || value.split('/').some(p=>p==='..'||p==='.'||!p)) throw new Error('Invalid character asset.');
  if (value.startsWith('local/')) {
    if (!BUNDLED_ASSETS.has(value)) throw new Error('Unsupported bundled character asset.');
    return value;
  }
  const model = /\.(pmx|bpmx|glb)$/i.test(value);
  if (!(model ? allowedModels.has(value) : portraits.has(value) || modelDirectories.some(directory=>value.startsWith(directory+'/')))) throw new Error('Unsupported character asset.');
  return value;
}
function modelPath(appearance) {
  const item = roster.resolve(appearance);
  if (!item) throw new Error('Choose a supported character.');
  return assetPath(item.key);
}
// Read only the PMX texture table. Geometry and animation stay in the renderer.
function pmxTextures(data) {
  let at=0;
  function skip(n){if(!Number.isInteger(n)||n<0||at+n>data.length)throw new Error('Incomplete character model.');at+=n;}
  function byte(){skip(1);return data[at-1];}
  function int(){skip(4);const n=data.readInt32LE(at-4);if(n<0)throw new Error('Invalid character model.');return n;}
  if(data.toString('ascii',0,4)!=='PMX ')throw new Error('Invalid PMX model.');
  skip(8);const headerSize=byte();if(headerSize<8)throw new Error('Invalid PMX header.');
  const headerStart=at;const encoding=byte(),uv=byte(),vertexSize=byte();skip(2);const boneSize=byte();
  if(![0,1].includes(encoding)||uv>4||![1,2,4].includes(vertexSize)||![1,2,4].includes(boneSize))throw new Error('Invalid PMX format.');
  at=headerStart;skip(headerSize);
  function string(){const size=int();if(size>1024*1024)throw new Error('Invalid PMX text.');const start=at;skip(size);return data.toString(encoding===0?'utf16le':'utf8',start,at);}
  for(let i=0;i<4;i++)string();
  const vertices=int();if(vertices>4000000)throw new Error('Character model is too large.');
  for(let i=0;i<vertices;i++){
    skip(32+uv*16);const type=byte();const weights=[boneSize,boneSize*2+4,boneSize*4+16,boneSize*2+40,boneSize*4+16];
    if(type>4)throw new Error('Invalid PMX weights.');skip(weights[type]+4);
  }
  skip(int()*vertexSize);const count=int();if(count>4096)throw new Error('Too many character textures.');
  return Array.from({length:count},()=>string()).filter(Boolean);
}
class CharacterCache {
  constructor({root=process.env.MIGHTY_CHARACTER_ROOT||path.join(os.homedir(),'Library','Application Support','Mighty Chat','Character Assets'),bundledRoot=path.resolve(__dirname,'../../Sources/Characters'),fetchImpl=fetch,maxFile=MAX_FILE}={}) {
    this.root=root;this.bundledRoot=bundledRoot;this.fetch=fetchImpl;this.maxFile=maxFile;this.assets=new Map();this.models=new Map();this.active=0;this.activePortraits=0;this.queue=[];
  }
  async bundledAsset(relative){
    const resource=BUNDLED_ASSETS.get(assetPath(relative));
    if(!resource)throw new Error('Unsupported bundled character asset.');
    const root=await fs.realpath(this.bundledRoot);
    const file=await fs.realpath(path.join(root,resource));
    if(!file.startsWith(root+path.sep))throw new Error('Invalid bundled character path.');
    const stat=await fs.stat(file);
    if(!stat.isFile()||stat.size===0)throw new Error('Bundled character asset is missing.');
    if(stat.size>this.maxFile)throw new Error('Character asset is too large.');
    return {file,cached:true,bundled:true};
  }
  file(relative){return path.join(this.root,createHash('sha256').update(assetPath(relative)).digest('hex')+'.asset');}
  async exists(relative){try{return (await fs.stat(this.file(relative))).size>0;}catch{return false;}}
  acquire(relative){
    const model=/^(gi|hsr|zzz|ww|hna|nte)\/chars\//.test(relative);
    return new Promise(resolve=>{this.queue.push({model,resolve});this.drain();});
  }
  drain(){
    while(this.active<4){
      // Keep two slots available for model files and textures, even when portraits stall.
      let index=this.queue.findIndex(job=>job.model);
      if(index<0 && this.activePortraits<2)index=this.queue.findIndex(job=>!job.model);
      if(index<0)return;
      const job=this.queue.splice(index,1)[0];this.active++;
      if(!job.model)this.activePortraits++;
      job.resolve(()=>{this.active--;if(!job.model)this.activePortraits--;this.drain();});
    }
  }
  async get(relative){
    relative=assetPath(relative);
    if(BUNDLED_ASSETS.has(relative))return this.bundledAsset(relative);
    if(this.assets.has(relative))return this.assets.get(relative);
    const work=this.download(relative);this.assets.set(relative,work);
    try{return await work;}finally{this.assets.delete(relative);}
  }
  async download(relative){
    const destination=this.file(relative);
    if(await this.exists(relative))return {file:destination,cached:true};
    const release=await this.acquire(relative);let temp;
    try{
      // Recheck after waiting for another download to finish.
      if(await this.exists(relative))return {file:destination,cached:true};
      await fs.mkdir(this.root,{recursive:true,mode:0o700});
      const options={redirect:'error',signal:AbortSignal.timeout(120000)};
      const url=file=>ASSET_ORIGIN+file.split('/').map(encodeURIComponent).join('/');
      let response=await this.fetch(url(relative),options);
      // Some authored PMX files say Tex while the hosted directory is tex.
      // Retry only this directory-case mismatch after 404; keep the original
      // cache key so the renderer can follow the unmodified PMX references.
      if(response.status===404 && relative.includes('/Tex/')){
        await response.body?.cancel();
        const alternate=assetPath(relative.replace(/\/Tex\//g,'/tex/'));
        response=await this.fetch(url(alternate),options);
      }
      if(!response.ok||!response.body)throw new Error('Download failed. Try again when online.');
      const expected=response.headers.get('content-encoding') ? 0 : Number(response.headers.get('content-length'));
      if(expected>this.maxFile)throw new Error('Character asset is too large.');
      temp=destination+'.'+randomUUID()+'.part';const handle=await fs.open(temp,'wx',0o600);let size=0;
      try{for await(const chunk of response.body){size+=chunk.length;if(size>this.maxFile)throw new Error('Character asset is too large.');await handle.writeFile(chunk);}if(!size||(expected>0&&size!==expected))throw new Error('Download incomplete. Try again.');}
      finally{await handle.close();}
      await fs.rename(temp,destination);temp=null;
      return {file:destination,cached:false};
    }finally{if(temp)await fs.unlink(temp).catch(()=>{});release();}
  }
  async prepare(appearance){
    const relative=modelPath(appearance);
    if(this.models.has(relative))return this.models.get(relative);
    const work=this.prepareModel(relative);this.models.set(relative,work);
    // Portraits are cached by their own image requests; they must never delay a model.
    try{return await work;}finally{this.models.delete(relative);}
  }

  async prepareModel(relative){
    if(BUNDLED_ASSETS.has(relative)){
      const {file}=await this.bundledAsset(relative);
      const handle=await fs.open(file,'r');
      try{
        const header=Buffer.alloc(20);const {bytesRead}=await handle.read(header,0,20,0);
        const stat=await handle.stat();
        const jsonLength=header.readUInt32LE(12);
        if(bytesRead!==20||header.toString('ascii',0,4)!=='glTF'||header.readUInt32LE(4)!==2||header.readUInt32LE(8)!==stat.size||header.readUInt32LE(16)!==0x4e4f534a||jsonLength<2||jsonLength>8*1024*1024||20+jsonLength>stat.size)throw new Error('Invalid bundled character model.');
        const chunk=Buffer.alloc(jsonLength);const result=await handle.read(chunk,0,jsonLength,20);
        if(result.bytesRead!==jsonLength)throw new Error('Incomplete bundled character model.');
        const model=JSON.parse(chunk.toString('utf8'));
        if(model.asset?.version!=='2.0')throw new Error('Invalid bundled character model.');
        if([...(model.buffers||[]),...(model.images||[])].some(item=>item.uri && !item.uri.startsWith('data:')))throw new Error('Bundled character resources must be embedded.');
      }finally{await handle.close();}
      return {path:relative,cached:true,bundled:true,files:1};
    }
    const manifest=this.file(relative)+'.json';
    try{const record=JSON.parse(await fs.readFile(manifest,'utf8'));if(record.version===1&&Array.isArray(record.files)&&record.files[0]===relative&&(await Promise.all(record.files.map(f=>this.exists(f)))).every(Boolean))return {path:relative,cached:true,files:record.files.length};}catch{}
    const main=await this.get(relative);let textures=[];
    if(/\.bpmx$/i.test(relative)){const handle=await fs.open(main.file,'r');const magic=Buffer.alloc(4);try{await handle.read(magic,0,4,0);}finally{await handle.close();}if(magic.toString()!=='BPMX'){await fs.unlink(main.file).catch(()=>{});throw new Error('Invalid character model.');}}
    if(/\.pmx$/i.test(relative)){
      try{textures=pmxTextures(await fs.readFile(main.file));}catch(error){await fs.unlink(main.file).catch(()=>{});throw error;}
    }
    const files=[relative,...new Set(textures.map(texture=>{
      const normalized=texture.replace(/\\/g,'/');
      if(normalized.startsWith('/')||normalized.includes(':'))throw new Error('Unsupported texture path.');
      return assetPath(path.posix.normalize(path.posix.join(path.posix.dirname(relative),normalized)));
    }))];
    // Four workers avoid hundreds of simultaneous requests for large PMX files.
    let next=1;
    await Promise.all(Array.from({length:Math.min(4,files.length-1)},async()=>{while(next<files.length)await this.get(files[next++]);}));
    const temp=manifest+'.'+randomUUID()+'.part';
    try{await fs.writeFile(temp,JSON.stringify({version:1,files}),{mode:0o600});await fs.rename(temp,manifest);}finally{await fs.unlink(temp).catch(()=>{});}
    return {path:relative,cached:false,files:files.length};
  }
}
module.exports={CharacterCache,assetPath,modelPath,pmxTextures};
