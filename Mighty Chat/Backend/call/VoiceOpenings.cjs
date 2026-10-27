'use strict';
const { PhraseChunker } = require('./PhraseChunker.cjs');
const OPENINGS = Object.freeze([
  {id:'01',intent:'a simple greeting',text:"Hey! It's good to hear from you."},
  {id:'02',intent:'a simple greeting',text:"Hi there. I'm glad you stopped by."},
  {id:'03',intent:'a simple greeting',text:"Hey, I'm here. What's on your mind?"},
  {id:'04',intent:'thanks for something that helped',text:"You're welcome. I'm glad that helped."},
  {id:'05',intent:'thanks after resolving something',text:"Of course. I'm happy we could sort that out."},
  {id:'06',intent:'frustration about an external problem, NOT feedback about this conversation',text:"I hear you. Let's focus on what's actually going wrong."},
  {id:'07',intent:'your earlier answer missed the user’s question',text:"You're right, I missed your point. Here's the answer to what you actually asked."},
  {id:'08',intent:'sadness or emotional difficulty',text:"I'm sorry it's been so hard. I'm here with you."},
  {id:'09',intent:'an overwhelming or difficult situation',text:"That sounds really difficult. We can take it one step at a time."},
  {id:'10',intent:'good news or a personal success',text:"That's lovely to hear. I'm really happy for you."},
  {id:'11',intent:'good news or a personal success',text:"That's great news. I'm glad you shared it with me."},
  {id:'12',intent:'a practical problem needing an explanation',text:"Let's work through it. I'll start with the part that matters most."},
  {id:'13',intent:'a request for an approach or explanation',text:"I see what you're asking. Here's how I'd approach it."},
  {id:'14',intent:'a request for a personal opinion',text:"I'll give you my honest take, based on what you've told me."},
  {id:'15',intent:'a request for a personal impression',text:"From what you've shared, here's how it comes across to me."},
  {id:'16',intent:'an ambiguous message needing clarification',text:"I want to make sure I understand you before I answer."},
  {id:'17',intent:'an ambiguous message needing clarification',text:"There are a couple of ways to read that. Let me check what you mean."},
  {id:'18',intent:'the user wants to talk about what happened',text:"I'm listening. You can tell me what's been happening."},
]);
const normalize = text => String(text).replace(/[’‘]/g,"'").replace(/:(?=\s|$)/g,'.').replace(/\s+/g,' ').toLowerCase();
function patterns(choices) {
  return choices.map(choice=>{
    let source=choice.text.split(/\s+/).map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/'/g,"['’‘]")).join('\\s+');
    source=source.replace(/\\\.$/,'[.:]');
    return {choice,expression:new RegExp('^\\s*'+source,'i')};
  });
}
function matchOpening(compiled,text) {
  for(const item of compiled) {const match=item.expression.exec(text);if(match)return {choice:item.choice,length:match[0].length};}
  return null;
}
function openingPrompt(choices, recent = []) {
  return `Spoken reply openings:\nYou may start with ONE exact opening below only when it fits the user's actual meaning, emotional tone, your character, and the conversation. These are real words in your answer, not a separate acknowledgement. You can answer directly with no opening whenever none fits; do not force an emotional reaction or assume a problem was resolved. Never chain openings, thinking noises, or waiting phrases. Write it as ordinary speech, without quotes or role labels. If the existing format requires sentence directives, keep them; the opening refers to the spoken words after those directives. Continue the thought naturally after the opening; do not repeat it, paraphrase the same acknowledgement, restart with another greeting, or add filler. If one opening already fully answers a short social turn, stop there. Otherwise give the useful answer immediately after it. If the user criticizes a previous answer, address that specific miss; do not substitute a generic technical explanation. Do not invent prior events or missing details; ask a focused question when needed. Do not describe this list or say that audio is loading.\n${choices.map(c=>`- ${c.intent}: ${JSON.stringify(c.text)}`).join('\n')}\n${recent.length ? 'Avoid these recently used openings unless needed for meaning: '+recent.map(x=>JSON.stringify(x)).join('; ') : ''}`;
}
// Buffer only the possible cached start; all unknown text falls through unchanged.
// An exact immediately echoed opening is removed from text AND speech, not from speech alone.
class OpeningTextGate {
  constructor(choices) { this.choices=choices;this.patterns=patterns(choices);this.pending='';this.phase='opening';this.opening=null;this.echoes=0; }
  push(delta, final=false) {
    this.pending+=delta;
    if(this.pending.length>512)this.phase='pass';
    if(this.phase==='echo' && this.echoes>0)this.pending=' '+this.pending.trimStart();
    if(this.phase==='pass') {const result=this.pending;this.pending='';return result;}
    if(this.phase==='opening') {
      const value=normalize(this.pending).trimStart(), match=matchOpening(this.patterns,this.pending);
      if(match) {
        const length=match.length;const prefix=this.pending.slice(0,length);this.pending=this.pending.slice(length);
        this.opening=match.choice;this.phase='echo';
        return prefix+this.push('',final);
      }
      if(!final && this.choices.some(c=>normalize(c.text).startsWith(value)))return '';
      this.phase='pass';const result=this.pending;this.pending='';return result;
    }
    const whitespace=this.pending.match(/^\s*/)[0], body=this.pending.slice(whitespace.length), target=normalize(this.opening.text);
    const echoed=matchOpening(this.patterns.filter(p=>p.choice.id===this.opening.id),body);
    if(echoed && this.echoes<2) {
      this.pending=(whitespace || ' ')+body.slice(echoed.length).trimStart();this.echoes++;return this.push('',final);
    }
    if(!final && this.echoes<2 && target.startsWith(normalize(body)))return '';
    this.phase='pass';const result=this.pending;this.pending='';return result;
  }
}
class VoiceOpeningChunker {
  constructor(choices) { this.choices=choices;this.patterns=patterns(choices);this.pending='';this.decided=false;this.offset=0;this.body=new PhraseChunker({timedAfterMs:Infinity}); }
  push(delta, now=Date.now(), final=false) {
    if(this.decided)return this.body.push(delta,now,final).map(p=>({...p,index:p.index+this.offset}));
    this.pending+=delta;
    if(this.pending.length>512){this.decided=true;const text=this.pending;this.pending='';return this.body.push(text,now,final);}
    const value=normalize(this.pending).trimStart(), match=matchOpening(this.patterns,this.pending);
    if(match) {
      this.decided=true;this.offset=1;this.body=new PhraseChunker({timedAfterMs:Infinity});
      const length=match.length;
      const opening={index:0,text:this.pending.slice(0,length).trim()};
      const rest=this.pending.slice(length);this.pending='';
      return [opening,...this.body.push(rest,now,final).map(p=>({...p,index:p.index+1}))];
    }
    if(!final && this.choices.some(c=>normalize(c.text).startsWith(value)))return [];
    this.decided=true;const text=this.pending;this.pending='';return this.body.push(text,now,final);
  }
}
module.exports={OPENINGS,normalize,openingPrompt,OpeningTextGate,VoiceOpeningChunker};
