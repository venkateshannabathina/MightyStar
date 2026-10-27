'use strict';
const { Worker }=require('node:worker_threads');
const path=require('node:path');
class LocalEmbeddings {
 constructor(){this.jobs=new Map();this.next=0;this.cache=new Map();this.cacheEpoch=0;this.isReady=false;this.closed=false;this.worker=new Worker(path.join(__dirname,'embedding-worker.cjs'));
  this.ready=new Promise((resolve,reject)=>{this.worker.on('message',m=>{if(m.ready){this.isReady=true;if(!this.closed)this.worker.unref();resolve();return;}if(m.fatal){reject(Error('Local embedding model unavailable.'));return;}const job=this.jobs.get(m.id);if(!job)return;this.jobs.delete(m.id);clearTimeout(job.timer);if(!this.jobs.size&&!this.closed)this.worker.unref();m.error?job.reject(Error('Local embedding failed.')):job.resolve(m.values);});this.worker.on('error',()=>{this.isReady=false;reject(Error('Local embedding worker unavailable.'));this.fail();});this.worker.on('exit',()=>{this.isReady=false;reject(Error('Local embedding worker stopped.'));this.fail();});});this.ready.catch(()=>{});
 }
 fail(){for(const job of this.jobs.values()){clearTimeout(job.timer);job.reject(Error('Local embedding worker stopped.'));}this.jobs.clear();}
 async embed(text){const epoch=this.cacheEpoch;if(this.closed)throw Error('Local embedding worker stopped.');if(!this.isReady)await this.ready;if(this.closed)throw Error('Local embedding worker stopped.');if(this.cache.has(text))return this.cache.get(text).slice();if(this.jobs.size>=32)throw Error('Local embedding queue is full.');const id=++this.next;this.worker.ref();const value=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.jobs.delete(id);reject(Error('Local embedding timed out.'));if(!this.jobs.size&&!this.closed)this.worker.unref();},10000);this.jobs.set(id,{resolve,reject,timer});this.worker.postMessage({id,text:String(text).slice(0,8000)});});if(this.cache.size>=128)this.cache.delete(this.cache.keys().next().value);if(epoch===this.cacheEpoch)this.cache.set(text,value);return value.slice();}
 clear(){this.cacheEpoch++;this.cache.clear();}
 close(){
  if(this.closing)return this.closing;
  this.closed=true;this.fail();this.cache.clear();
  if(this.worker.threadId===-1)return Promise.resolve();
  // Let ONNX finish native work and release its session before the worker exits.
  // Abrupt termination during startup/inference can abort the hosting Node process.
  this.worker.ref();
  this.closing=new Promise(resolve=>{
   const timeout=setTimeout(()=>{void this.worker.terminate().catch(()=>{});},5000);timeout.unref();
   this.worker.once('exit',()=>{clearTimeout(timeout);resolve();});
   this.worker.postMessage({close:true});
  });
  return this.closing;
 }
}
function cosine(a,b){if(a.length!==384||b.length!==384)return 0;let dot=0,aa=0,bb=0;for(let i=0;i<384;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}return aa&&bb?dot/Math.sqrt(aa*bb):0;}
module.exports={LocalEmbeddings,cosine};
