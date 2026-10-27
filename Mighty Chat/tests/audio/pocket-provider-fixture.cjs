'use strict';
// Only transcript/LLM responses are synthetic; speech goes through real Pocket TTS.
const actualFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const endpoint = String(url);
  if (/^http:\/\/127\.0\.0\.1:\d+\/(health|tts)$/.test(endpoint)) return actualFetch(url, options);
  if (endpoint.endsWith('/audio/transcriptions')) return new Response(JSON.stringify({text:'How does the new voice work?'}));
  if (endpoint.startsWith('https://api.groq.com/') && endpoint.endsWith('/chat/completions')) {
    const prompt=JSON.parse(options.body);
    if (prompt.messages[0].content.includes('Spoken reply openings')) throw Error('Edge recordings must not be used by Pocket');
    const text = 'The voice now runs locally on your Mac. You can interrupt me whenever you want.';
    return new Response(new ReadableStream({start(c) {
      for (const char of (process.env.MIGHTY_STREAM_CHAT==='1' ? '[[e=neutral i=.2 g=-]] '+text.replace('. ','. [[e=neutral i=.2 g=-]] ') : text))
        c.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:char}}]})+'\n\n'));
      c.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));c.close();
    }}));
  }
  throw Error('Pocket fixture blocked external network');
};
