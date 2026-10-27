'use strict';

// A model's fact is eligible only when it cites the user's own statement.
// Inspect its containing sentence too: quoting a fragment cannot turn a question
// or an output instruction into a durable assertion.
function groundedEvidence(input,evidence){
 if(typeof evidence!=='string'||evidence.trim().length<4)return false;
 for(let from=0;from<input.length;){
  const start=input.indexOf(evidence,from);if(start<0)return false;
  const end=start+evidence.length;from=end;
  const left=input.slice(0,start).search(/[^.!?。！？\n]*$/);
  const after=/[.!?。！？\n]$/.test(evidence)?end-1:end;
  const tail=input.slice(after).search(/[.!?。！？\n]/);
  const sentence=input.slice(left,tail<0?input.length:after+tail+1);
  if(/[?？]/.test(sentence))continue;
  if(/\b(?:in|for)\s+(?:this|the|your|my|next)\s+(?:\w+\s+){0,3}(?:reply|response|answer|checks?)\b/i.test(sentence))continue;
  if(/\b(?:reply|respond|answer)\s+(?:with|only|in|using)|\b(?:number|numbers|digits?)\s+only\b/i.test(sentence))continue;
  return true;
 }
 return false;
}
// Used for recall of pre-evidence records too. Keep stored records intact, but
// do not promote a question or a transient output constraint into user context.
function statements(input){
 return (String(input).match(/[^.!?。！？\n]+[.!?。！？\n]?/gu)||[]).filter(s=>groundedEvidence(s,s.trim())&&!/\b(?:checks?|tests?)\s+(?:are|is|were|have|has)\b.{0,18}\b(?:finished|complete|done)\b/i.test(s));
}
const stop=new Set('the a an and or of to is are was were be been being i me my mine you your user users has have had that this these those what which who when where why how do does did can could would should please remember imaginary fictional color colour name named called favorite favourite likes like prefers prefer asked says states with for in on it its no not only reply response answer'.split(' '));
function terms(text){return [...new Set((String(text).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(w=>w.length>=3&&!stop.has(w)))];}
function recalledAssertion(fact,source){
 if(source==null)return true; // User-edited/imported facts and older unlinked rows.
 const eligible=statements(source);if(!eligible.length)return false;
 const words=new Set(eligible.flatMap(terms));
 const factWords=terms(fact);
 if(factWords.some(w=>words.has(w)))return true;
 // Lack of word overlap alone is not disproof (paraphrases/translations).
 // Reject only a claim whose literal support is confined to excluded clauses.
 const allWords=new Set(terms(source));
 return !factWords.some(w=>allWords.has(w));
}
function lexicalRecall(facts,input){
 const query=terms(input);if(!query.length)return [];
 const documents=facts.map(f=>({fact:f,words:new Set(terms(f.text))}));
 const frequency=new Map(query.map(w=>[w,documents.filter(d=>d.words.has(w)).length]));
 return documents.map(({fact,words})=>({ ...fact,lexicalScore:query.reduce((n,w)=>n+(words.has(w)?Math.log(1+documents.length/(1+frequency.get(w))):0),0)})).filter(f=>f.lexicalScore>0).sort((a,b)=>b.lexicalScore-a.lexicalScore||b.last_seen-a.last_seen||a.id-b.id).slice(0,4);
}
function mergeRecall(lexical,semantic){return [...lexical,...semantic.filter(f=>!lexical.some(l=>l.id===f.id))].slice(0,4);}
module.exports={groundedEvidence,statements,recalledAssertion,lexicalRecall,mergeRecall};
