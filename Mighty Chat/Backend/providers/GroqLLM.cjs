'use strict';
const { replyRequest } = require('./ReplyRequest.cjs');

async function* streamGroq({ apiKey, model = 'openai/gpt-oss-20b', messages, signal, provider = 'groq', fetchImpl = fetch, onRequestSent, maxTokens = 900, reasoningEffort }) {
  const label = provider === 'gemini' ? 'Gemini' : provider === 'anthropic' ? 'Claude' : provider === 'openai' ? 'OpenAI' : 'Groq';
  if (!apiKey) throw new Error(`${label} is not configured.`);
  const request = replyRequest({provider,apiKey,model,messages},{stream:true,maxTokens,reasoningEffort});
  onRequestSent?.();
  let response;
  try { response = await fetchImpl(request.url, {...request.options,signal}); }
  catch (error) { if (signal?.aborted) throw error; throw Object.assign(new Error(`${label} connection failed.`), {retryable:true}); }
  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    throw Object.assign(new Error(`${label} reply failed (${response.status}).`), {retryable:response.status >= 500 && response.status <= 599});
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      let item;
      try { item = await reader.read(); }
      catch (error) { if (signal?.aborted) throw error; throw Object.assign(new Error(`${label} connection failed.`), {retryable:true}); }
      const { value, done } = item;
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      pending = pending.replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = pending.indexOf('\n\n')) >= 0) {
        if (boundary > 262144) throw new Error(`${label} stream frame limit exceeded.`);
        const block = pending.slice(0, boundary);
        pending = pending.slice(boundary + 2);
        const payload = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
        if (!payload) continue;
        if (payload === '[DONE]') return;
        let event;
        try { event = JSON.parse(payload); } catch { throw new Error(`Invalid ${label} stream event.`); }
        if(event.type === 'error' || event.error) throw new Error(`${label} interrupted the reply. Try again.`);
        if(event.type === 'message_stop') return;
        const token = provider === 'anthropic' ? (event.delta?.type === 'text_delta' ? event.delta.text : null) : event.choices?.[0]?.delta?.content;
        if (typeof token === 'string' && token) yield token;
      }
      if (pending.length > 262144) throw new Error(`${label} stream frame limit exceeded.`);
    }
  } finally { await reader.cancel().catch(() => {}); }
}

module.exports = { streamGroq };
