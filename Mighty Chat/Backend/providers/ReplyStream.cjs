'use strict';
const {providerSettings}=require('./ProviderSettings.cjs');
const {streamGroq}=require('./GroqLLM.cjs');
const PROVIDERS=new Set(['groq','openai','gemini','anthropic']);
function fallbackProfiles(profile={}) {
  return (Array.isArray(profile?.aiFallbackProviders)?profile.aiFallbackProviders:[]).slice(0,4)
    .map(value=>typeof value==='string'?{aiProvider:value}:value)
    .filter(value=>value && PROVIDERS.has(value.aiProvider))
    .map(value=>({aiProvider:value.aiProvider,aiModel:typeof value.aiModel==='string'?value.aiModel.trim().slice(0,200):''}));
}
function replyLimit(profile={},mode='chat',config={}) {
  const value=profile?.[mode==='call'?'callMaxTokens':'chatMaxTokens'];
  // GPT-OSS spends this same allowance on reasoning. The existing 900 cap
  // avoids empty replies observed at 220 in real WP7 trials.
  const reasoningModel=config.provider==='groq' && /^openai\/gpt-oss-/.test(config.model||'');
  return Number.isSafeInteger(value)?Math.max(64,Math.min(1200,value)):(reasoningModel?900:mode==='call'?220:300);
}
// A retry owns a fresh abort signal. Once even one upstream token is yielded,
// the provider is committed, including tokens that the directive parser buffers.
async function* streamReply(options, {profile={},mode='chat',stream=streamGroq,env=process.env,firstTokenMs=3000}={}) {
  if(env.MIGHTY_STREAM_CHAT!=='1') {yield* stream(options);return;}
  const primary={provider:options.provider,apiKey:options.apiKey,model:options.model};
  const next=fallbackProfiles(profile).map(p=>providerSettings(env,p)).find(p=>p.provider!==primary.provider && p.apiKey);
  const attempts=[primary,...(next?[next]:[])];
  for(let index=0;index<attempts.length;index++) {
    const controller=new AbortController();
    const abort=()=>controller.abort(options.signal?.reason);
    if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
    let timer,committed=false;
    const iterator=stream({...options,...attempts[index],maxTokens:replyLimit(profile,mode,attempts[index]),reasoningEffort:'low',signal:controller.signal})[Symbol.asyncIterator]();
    try {
      const first=await Promise.race([iterator.next(),new Promise((_,reject)=>{
        timer=setTimeout(()=>{controller.abort();reject(Object.assign(new Error('Reply first-token timeout.'),{retryable:true}));},firstTokenMs);
      })]);
      clearTimeout(timer);
      if(options.signal?.aborted)throw new Error('Reply cancelled.');
      if(first.done)return;
      committed=true;options.onProviderSelected?.({provider:attempts[index].provider,model:attempts[index].model});yield first.value;
      while(true){const item=await iterator.next();if(item.done)return;if(options.signal?.aborted)throw new Error('Reply cancelled.');yield item.value;}
    } catch(error) {
      if(committed || options.signal?.aborted || !error.retryable || index===attempts.length-1)throw error;
    } finally {
      clearTimeout(timer);controller.abort();options.signal?.removeEventListener('abort',abort);
      // A mocked/non-cooperative source must not hold up the 3 second retry.
      Promise.resolve(iterator.return?.()).catch(()=>{});
    }
  }
}
module.exports={streamReply,replyLimit,fallbackProfiles};
