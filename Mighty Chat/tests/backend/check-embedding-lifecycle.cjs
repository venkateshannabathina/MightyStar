'use strict';
const assert=require('node:assert/strict'),{LocalEmbeddings}=require('../../Backend/memory/LocalEmbeddings.cjs');
const deadline=setTimeout(()=>{console.error('Embedding lifecycle did not finish');process.exit(1);},15000);
(async()=>{
 const cold=new LocalEmbeddings();await cold.close();assert.equal(cold.worker.threadId,-1);await assert.rejects(cold.embed('Closed query'),/stopped/);
 const active=new LocalEmbeddings();await active.ready;assert(active.isReady);
 const pending=active.embed('A new query about everyday preferences and plans.');const settled=pending.catch(()=>null);
 await active.close();await settled;assert.equal(active.worker.threadId,-1);assert.equal(active.jobs.size,0);
 console.log('Local ONNX lifecycle: warm readiness, close during startup/inference, rejected post-close queries and clean worker exit passed.');
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>clearTimeout(deadline));
