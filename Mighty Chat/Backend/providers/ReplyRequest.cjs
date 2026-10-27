"use strict";
// Claude keeps system instructions separate from the conversation messages.
function replyRequest({provider,apiKey,model,messages}, {stream=false,maxTokens=1200,json=false,reasoningEffort}={}) {
  if(provider==='anthropic') return {url:'https://api.anthropic.com/v1/messages', options:{method:'POST',headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','Content-Type':'application/json'},body:JSON.stringify({model,stream,max_tokens:maxTokens,system:messages.filter(m=>m.role==='system').map(m=>m.content).join('\n\n'),messages:messages.filter(m=>m.role!=='system')})}};
  const base=provider==='gemini'?'https://generativelanguage.googleapis.com/v1beta/openai':provider==='openai'?'https://api.openai.com/v1':'https://api.groq.com/openai/v1';
  return {url:base+'/chat/completions',options:{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,messages,stream,...(provider==='groq' && /^openai\/gpt-oss-/.test(model) && reasoningEffort==='low'?{reasoning_effort:'low'}:{}),...(provider==='openai' && /^(gpt-5|o[134])/.test(model) ? {} : {temperature:0.8}),...(provider==='gemini'?{max_tokens:maxTokens}:{max_completion_tokens:maxTokens}),...(json?{response_format:{type:'json_object'}}:{})})}};
}
function replyText(data,provider){return provider==='anthropic'?(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join(''):data?.choices?.[0]?.message?.content;}
module.exports={replyRequest,replyText};
