'use strict';
const assert=require('node:assert/strict');
const {TagParser}=require('../../Backend/call/TagParser.cjs');
function parse(parts){const p=new TagParser({now:()=>1000});return parts.flatMap(part=>p.push(part)).concat(p.push('',true));}
const source=Array.from({length:200},(_,i)=>`[[e=${i%2?'amused':'worried'} i=0.6 g=${i%3?'bad':'talking'} p=0.4]] Sentence ${i}! `).join('');
const expected=parse([source]);assert.equal(expected.filter(e=>e.type==='sentence.start').length,200);
let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
for(let trial=0;trial<200;trial++){let parts=[];for(let at=0;at<source.length;){const n=1+random()%61;parts.push(source.slice(at,at+n));at+=n;}assert.deepEqual(parse(parts),expected);}
assert(!expected.filter(e=>e.text).map(e=>e.text).join('').includes('[['));
let events=parse(['[','[e=concerned i=9 g=invalid p=-3]','] A [[e=angry i=1 g=angry]] friend. [[e=thinking i=no g=thinking]] Okay. [[unfinished']);
assert.deepEqual(events.filter(e=>e.type==='sentence.start').map(({index,type,...e})=>e),[{e:'worried',i:1,g:'-',p:0},{e:'neutral',i:0,g:'thinking'}]);
assert(!JSON.stringify(events).includes('unfinished'));
let time=0;const p=new TagParser({now:()=>time});
assert.equal(p.push('[[e=happy i=.8 g=-]] Hi. ')[0].e,'happy');time=2000;
assert.equal(p.push('Still here. ')[0].i,.4);time=4000;
assert.equal(p.push('Yes! ')[0].i,.35);
const q=parse(['What? ']);assert.equal(q[0].e,'skeptical');assert.equal(q[0].i,.2);
assert.equal(parse(['Dr. Gray is here. ']).filter(e=>e.type==='sentence.start').length,1);
assert.equal(parse(['[[e=happy i=.3 g=-]]Hello.[[e=sad i=.4 g=-]]Bye.']).filter(e=>e.type==='sentence.start')[1].e,'sad');
assert.throws(()=>parse(['[['+'x'.repeat(600)]),/limit/);
assert(!parse(['Hello [']).some(e=>e.text?.includes('[')));
assert.equal(parse(['[[e=happy i=.4 g=-]] Partial']).filter(e=>e.type==='sentence.start').length,1);
console.log('Tag parser: 200 sentences × 200 seeded random splits, split brackets, clamps, first wins, fallback decay/questions, abbreviations, truncation and bounds passed');
