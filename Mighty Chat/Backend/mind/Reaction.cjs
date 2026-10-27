'use strict';
// Social reactions use the existing semantic appraisal, never word triggers.
const LABELS=new Set(['neutral','happy','amused','excited','sad','concerned','worried','surprised','angry','annoyed','shy','skeptical']);
const clamp=(n,fallback=0)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;
function sanitizeExpression(value){
 const v=value&&typeof value==='object'?value:{};
 const result={mood:LABELS.has(v.mood)?v.mood:'neutral',intensity:clamp(v.intensity)};
 if(v.ambient&&LABELS.has(v.ambient.mood))result.ambient={mood:v.ambient.mood,intensity:clamp(v.ambient.intensity)};
 if(typeof v.reactionId==='string'&&v.reactionId.length<=200&&v.reactionId)result.reactionId=v.reactionId;
 if(result.reactionId&&result.ambient)result.durationSeconds=Math.max(1,Math.min(6,Number(v.durationSeconds)||3.5));
 return result;
}
function reactionFor(turn,turnId){
 const a=turn.appraisal||{},state=turn.state,ambient={mood:state.anger>.25?'angry':turn.nativeLabel,intensity:state.anger>.25?Math.max(state.anger,turn.intensity):turn.intensity};
 let mood=ambient.mood,intensity=ambient.intensity,kind='steady';
 const guarded=state.grudges.some(g=>g.weight>.3);
 if(state.anger<.25&&a.valence>0){
  if(['compliment','affection'].includes(a.type)&&a.sincere!==false){
   mood='happy';intensity=Math.max(.5,Math.min(.78,.48+.3*clamp(a.valence)));kind='appreciation';
  }else if(a.type==='joke'){
   mood='amused';intensity=Math.max(.45,Math.min(.75,.5+.2*clamp(a.valence)));kind='amusement';
  }
  if(guarded&&kind!=='steady'){intensity=Math.min(.35,intensity);kind='guarded appreciation';}
 }
 if(state.anger<.25&&a.valence<-.15&&!['insult','threat','apology'].includes(a.type)){
  mood='concerned';intensity=Math.min(.7,.4+.25*Math.abs(a.valence));kind='concern';
 }
 const expression=kind==='steady'?ambient:{mood,intensity,ambient,reactionId:String(turnId),durationSeconds:3.5};
 const prompt=[
  'SOCIAL RESPONSE: React to the intent of the latest user message in your own established voice, taking the current mood and earlier conversation into account.',
  kind==='appreciation'?'The user gave a sincere positive remark. Let it land: answer with brief, warm appreciation or a playful/shy acknowledgment that suits your character. A small smile is appropriate. A light chuckle is optional when it feels natural, never mandatory. Do not turn a compliment into a generic offer to help.':
  kind==='amusement'?'The appraisal judged the exchange as friendly and positive humor. Let genuine amusement show through a short playful response or a small chuckle if it suits the joke. Do not explain the joke or force laughter.':
  kind==='guarded appreciation'?'Acknowledge the positive intent quietly, but remain a little distant about the earlier incident. Do not gush, laugh it off, or imply instant forgiveness.':
  kind==='concern'?'The latest exchange calls for concern. Acknowledge the actual difficulty with gentle seriousness; do not tease, flirt, smile cheerfully, or laugh. Offer practical support when it fits what the user asked.':
  state.anger>=.25?'Your irritation still governs this response. A compliment does not buy instant forgiveness; an apology can soften you gradually. Do not add cheerful laughter to an angry reply.':
  'Keep this reaction proportionate. A neutral task is not automatically funny, flirting, or praise. Distress calls for care, not teasing or cheerful laughter.',
  'Use varied, specific wording. Preserve your character\'s register, restraint and boundaries. Never copy a canned example, narrate facial stage directions, or say you changed an internal mood.',
  'Speak as the established character in an ordinary conversation. Avoid calling yourself a professional assistant or a productivity tool. If asked what you are, be honest that you are a fictional-character AI companion and describe your particular character, rather than listing administrative services. Do not append generic service questions such as "How can I help/assist you?" or "What\'s on your agenda?". Ask a follow-up only when it meaningfully follows this conversation.',
 ].join('\n');
 return {expression:sanitizeExpression(expression),prompt,kind};
}
module.exports={reactionFor,sanitizeExpression};
