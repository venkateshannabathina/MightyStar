'use strict';
const { getEncoding } = require('../vendor/memory/node_modules/js-tiktoken');
const encoder = getEncoding('o200k_base');
// Byte ceilings also bound unknown tokenizers conservatively. For known models,
// static and historical slots use one third as many exact token units. The
// current message is preserved in full after the separate 7,000-byte input check.
const LIMITS = Object.freeze({persona:10500,style:1200,mode:650,core:900,memories:1800,summary:2000,state:250,recent:2400,current:7000});
class Budget {
  constructor({provider='groq',model='openai/gpt-oss-20b'}={}) { this.exact = (provider === 'openai' && /^(gpt-4o|gpt-4\.1|gpt-5|o[134])/.test(model)) || (provider === 'groq' && /gpt-oss/.test(model)); }
  count(text) { return this.exact ? encoder.encode(String(text), [], []).length : Buffer.byteLength(String(text),'utf8'); }
  take(text, max) {
    text = String(text || ''); if (this.count(text) <= max) return text;
    if (this.exact) {
      const tokens=encoder.encode(text,[],[]).slice(0,Math.max(0,max));
      let result=encoder.decode(tokens);
      while(tokens.length && (result.endsWith('\ufffd') || this.count(result)>max)){tokens.pop();result=encoder.decode(tokens);}
      return result;
    }
    let result = ''; for (const char of text) { if (Buffer.byteLength(result+char)>max) break; result += char; } return result;
  }
  limit(key) { return this.exact ? Math.ceil(LIMITS[key]/3) : LIMITS[key]; }
  messages(messages) { return messages.reduce((n,m)=>n+this.count(m.content)+6,3); }
}
module.exports={Budget,LIMITS};
