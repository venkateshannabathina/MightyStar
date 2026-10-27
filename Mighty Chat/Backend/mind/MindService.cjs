'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const {providerSettings}=require('../providers/ProviderSettings.cjs');
const {replyRequest,replyText}=require('../providers/ReplyRequest.cjs');
const {reactionFor}=require('./Reaction.cjs');

class MindService {
 constructor({root=process.env.MIGHTY_MIND_ROOT||(process.env.MIGHTY_MEMORY_ROOT?path.join(process.env.MIGHTY_MEMORY_ROOT,'Mind'):path.join(os.homedir(),'Library/Application Support/Mighty Chat/Mind')),python=process.env.MIGHTY_MIND_PYTHON||'/usr/bin/python3',fetchImpl=fetch,clock=()=>Date.now()/1000}={}){
  this.python=python;this.fetch=fetchImpl;this.clock=clock;this.chains=new Map();
  fs.mkdirSync(root,{recursive:true,mode:0o700});
  if(fs.lstatSync(root).isSymbolicLink())throw Error('Invalid mind directory.');
  fs.chmodSync(root,0o700);this.database=path.join(root,'mind.sqlite3');
  if(fs.lstatSync(this.database,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Invalid mind database.');
 }
 run(value){return new Promise((resolve,reject)=>{
  const child=spawn(this.python,[path.join(__dirname,'worker.py')],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},stdio:['pipe','pipe','pipe']});
  let output='';const timer=setTimeout(()=>{child.kill();reject(Error('Mind worker timed out.'));},10000);
  child.stdout.on('data',chunk=>{output+=chunk;if(output.length>128*1024)child.kill();});child.stderr.resume();
  child.on('error',error=>{clearTimeout(timer);reject(error);});
  child.on('close',code=>{clearTimeout(timer);try{const data=JSON.parse(output);if(code!==0||data.error)throw Error('Mind state unavailable.');resolve(data);}catch(error){reject(error);}});
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify({...value,database:this.database,now:this.clock()}));
 });}
 async appraise(character,messages,signal){
  const spec=await(this.spec??=this.run({action:'config'}));
  const context=messages.filter(m=>['user','assistant'].includes(m.role));
  const latest=context.at(-1);if(latest?.role!=='user')throw Error('A user message is required.');
  const config=providerSettings(process.env,character.profile);
  config.model=process.env.MIGHTY_APPRAISAL_MODEL||(config.provider==='groq'&&process.env.GROQ_APPRAISAL_MODEL)||config.model;
  const prompt=spec.prompt.replaceAll('{name}',character.name||'Companion');
  const appraisalMessages=[{role:'system',content:prompt},...context.slice(-spec.context-1)];
  const neutral={valence:0,arousal:0,type:'neutral',severity:0,sincere:true,summary:''};
  try{
   // These models spend the completion allowance on reasoning as well as JSON.
   // A 256-token total can silently truncate the appraisal into neutral.
   const reasoning=config.provider==='groq'&&/^openai\/gpt-oss-/.test(config.model);
   const request=replyRequest({...config,messages:appraisalMessages},{json:true,maxTokens:reasoning?spec.reasoningMaxTokens:spec.maxTokens,reasoningEffort:'low'});
   const body=JSON.parse(request.options.body);body.temperature=spec.temperature;
   const signals=[AbortSignal.timeout(spec.timeout*1000),...(signal?[signal]:[])];
   const response=await this.fetch(request.url,{...request.options,body:JSON.stringify(body),signal:AbortSignal.any(signals)});
   if(!response.ok)throw Error('Appraisal failed.');
   const parsed=JSON.parse(replyText(await response.json(),config.provider));return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:neutral;
  }catch{return neutral;}
 }
 async prepare({character,messages,turnId,mode='chat',signal,privateTurn=false}){
  const id=character.id;if(typeof id!=='string'||!id.trim())throw Error('A character identity is required for mood.');
  const previous=this.chains.get(id)||Promise.resolve();
  const task=previous.catch(()=>{}).then(async()=>{
   const appraisal=await this.appraise(character,messages,signal);
   if(privateTurn)appraisal.summary='private hurtful interaction';
   if(signal?.aborted)throw Error('Turn cancelled.');
   const turn=await this.run({action:'prepare',user_id:id,turn_id:turnId,appraisal});
   const nativeLabel={annoyed:'angry',excited:'happy',thinking:'neutral'}[turn.label]||turn.label;
   const reaction=reactionFor({...turn,nativeLabel},turnId),expression=reaction.expression;
   // Keep the existing production JSON/sentence/voice format. The mood engine
   // supplies tone and state; its standalone trailing tag must never be spoken.
   const block=turn.prompt.split('End every reply with this tag on its own line:')[0];
   const format=process.env.MIGHTY_STREAM_CHAT==='1'
    ? `Keep the required [[e=... i=... g=...]] sentence directives. Use e=${expression.mood} i=${expression.intensity.toFixed(3)} and g=- for this turn's reaction. Do not emit a trailing emotion tag.`
    : mode==='chat'?`Keep the required JSON reply format. Set mood=${expression.mood} and intensity=${expression.intensity.toFixed(3)}. Do not emit a trailing emotion tag.`
    :'Reply in plain spoken text. Do not emit any emotion tags or metadata.';
   const output=messages.map(m=>({...m}));const system=output.find(m=>m.role==='system');
   if(!system)throw Error('Missing persona system prompt.');system.content+='\n\n'+block+'\n'+reaction.prompt+'\n'+format;
   return {...turn,id,nativeLabel,expression,messages:output};
  });
  this.chains.set(id,task);try{return await task;}finally{if(this.chains.get(id)===task)this.chains.delete(id);}
 }
 async finish(turn){if(turn)await this.run({action:'finish',user_id:turn.id});}
 result(turn,result){if(!turn)return result;const expression=turn.expression||{mood:turn.nativeLabel,intensity:turn.intensity};return {...result,mood:expression.mood,intensity:expression.intensity,expression,
  ...(Array.isArray(result.sentenceEvents)?{sentenceEvents:result.sentenceEvents.map(e=>({...e,e:expression.mood,i:expression.intensity}))}: {})};}
 sentence(turn,event){const expression=turn?.expression||{mood:turn?.nativeLabel,intensity:turn?.intensity};return turn&&event.type==='sentence.start'?{...event,e:expression.mood,i:expression.intensity}:event;}
}
module.exports={MindService};
