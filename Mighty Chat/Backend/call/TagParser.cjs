'use strict';
const { PhraseChunker } = require('./PhraseChunker.cjs');
const EMOTIONS = new Set('neutral happy amused surprised worried sad angry skeptical shy'.split(' '));
const GESTURES = new Set('talking arguing angry defeated dismissing-gesture rejected standing-greeting surprised thankful-2 thoughtful-head-nod victory thinking -'.split(' '));
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
function directive(text) {
  const fields = Object.fromEntries([...text.matchAll(/\b([eigp])=([^\s]+)/g)].map(match => [match[1],match[2]]));
  const e = fields.e === 'concerned' ? 'worried' : fields.e;
  return { e: EMOTIONS.has(e) ? e : 'neutral', i: clamp(fields.i), g: GESTURES.has(fields.g) ? fields.g : '-', ...(fields.p === undefined ? {} : {p:clamp(fields.p)}) };
}
// Hold incomplete brackets; untagged sentences need punctuation lookahead. Boundaries use
// the production chunker's abbreviation rules, never wall-clock/clause flushing.
class TagParser {
  constructor({ now = () => performance.now() } = {}) {
    this.now = now; this.raw = ''; this.text = ''; this.tag = null;
    this.emitted=0;this.started=false;
    this.index = 0; this.previous = {e:'neutral',i:0}; this.previousAt = now(); this.finished = false; this.stats={sentences:0,explicit:0,fallback:0,duplicates:0};
  }
  push(delta, final = false) {
    if(this.finished) throw Error('Tag stream is finished.');
    if(typeof delta !== 'string') throw TypeError('Tag delta must be text.');
    this.raw += delta;
    if(this.raw.length + this.text.length > 24000) throw Error('Tagged sentence limit exceeded.');
    const events = [];
    const flush = end => {
      const text = this.text.slice(0,end); this.text = this.text.slice(end);
      if(!text.trim()) return;
      const time = this.now();
      let tag = this.tag;
      if(!tag) {
        let i = this.previous.i * Math.pow(0.5,Math.max(0,time-this.previousAt)/2000);
        let e = this.previous.e;
        if(i < 0.05) {e='neutral';i=0;}
        if(text.trim().endsWith('!')) i = Math.min(1,i+0.15);
        if(e==='neutral' && text.trim().endsWith('?')) {e='skeptical';i=Math.max(i,0.2);}
        tag = {e,i,g:'-'};
      }
      if(!this.started){events.push({type:'sentence.start',index:this.index++,...tag});this.stats.sentences++;this.stats[tag===this.tag?'explicit':'fallback']++;}
      if(text.length>this.emitted)events.push({type:'assistant.delta',text:text.slice(this.emitted)});
      this.emitted=0;this.started=false;
      this.previous = tag; this.previousAt = time; this.tag = null;
    };
    const boundary = finalSentence => {
      const probe = new PhraseChunker({maxPhrase:24000,maxPending:24000,timedAfterMs:Infinity});
      probe.pending = this.text;
      const end = probe.findBoundary(finalSentence,0);
      if(end > 0) flush(end);
    };
    while(this.raw.length) {
      if(this.raw.startsWith('[[')) {
        // A tag following sentence punctuation supplies the otherwise missing lookahead.
        { const probe = new PhraseChunker({maxPhrase:24000,maxPending:24000,timedAfterMs:Infinity}); probe.pending=this.text+' '; const end=probe.findBoundary(false,0); if(end>0 && end<=this.text.length) flush(end); }
        const close = this.raw.indexOf(']]',2);
        if(close < 0) { if(final) this.raw=''; else if(this.raw.length>512) throw Error('Directive limit exceeded.'); break; }
        if(close>512) throw Error('Directive limit exceeded.');
        const value = this.raw.slice(2,close);
        if(!this.tag) this.tag = directive(value);else this.stats.duplicates++;
        this.raw = this.raw.slice(close+2); continue;
      }
      if(this.raw==='[') {if(final)this.raw='';break;}
      this.text += this.raw[0]; this.raw=this.raw.slice(1);
      boundary(false);
      if(this.tag && this.text.trim()) {
        if(!this.started){events.push({type:'sentence.start',index:this.index++,...this.tag});this.started=true;this.stats.sentences++;this.stats.explicit++;}
        if(this.text.length>this.emitted){events.push({type:'assistant.delta',text:this.text.slice(this.emitted)});this.emitted=this.text.length;}
      }
    }
    if(final) { while(this.text.trim()) boundary(true); this.finished=true; }
    return events;
  }
}
module.exports = { TagParser, directive };
