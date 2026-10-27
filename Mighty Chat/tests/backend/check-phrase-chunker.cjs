'use strict';
const assert = require('node:assert/strict');
const { PhraseChunker } = require('../../Backend/call/PhraseChunker.cjs');

const chunker = new PhraseChunker();
assert.deepEqual(chunker.push('Dr. Sen thinks 3.', 100), []);
assert.deepEqual(chunker.push('14 is fine. Let us', 110).map(item => item.text), ['Dr. Sen thinks 3.14 is fine.']);
assert.deepEqual(chunker.push(' begin.', 120), []);
assert.deepEqual(chunker.push('', 130, true).map(item => item.text), ['Let us begin.']);
assert.throws(() => chunker.push('again'), /finished/);

const timed = new PhraseChunker();
assert.deepEqual(timed.push('I can explain that in a few clear steps ', 100), []);
assert.deepEqual(timed.push('if you like', 500).map(item => item.text), ['I can explain that in a few clear steps if you']);
assert.deepEqual(timed.push('', 510, true).map(item => item.text), ['like']);

const short = new PhraseChunker();
assert.deepEqual(short.push('Yes.', 0), []);
assert.deepEqual(short.push('', 1, true).map(item => item.text), ['Yes.']);
const limited = new PhraseChunker({ maxPending: 12 });
assert.throws(() => limited.push('longer than twelve characters'), /limit/);
console.log('Phrase chunker boundary, timing, and cap checks passed');

// WP7: opt in only, first clause/word-safe ~25 characters, later rules unchanged.
for (const text of ['Well hello, welcome back today.', 'Well hello — welcome back today.', 'Well hello - welcome back today.']) {
 const fast=new PhraseChunker({firstPhraseFast:true});
 const out=fast.push(text,0);assert.equal(out.length,1);assert.match(out[0].text,/^Well hello/);
 assert(fast.push('',1,true)[0].text.includes('welcome'));
}
const fast=new PhraseChunker({firstPhraseFast:true});
assert.deepEqual(fast.push('These are exactly twenty five words to speak',0).map(p=>p.text),['These are exactly twenty']);
assert.deepEqual(fast.push('',1,true).map(p=>p.text),['five words to speak']);
const split=new PhraseChunker({firstPhraseFast:true});let pieces=[];
for(const ch of 'One small hello, and welcome back.')pieces.push(...split.push(ch,0));
pieces.push(...split.push('',1,true));assert.equal(pieces.map(p=>p.text).join(' '),'One small hello, and welcome back.');
assert.deepEqual(new PhraseChunker().push('Well hello, welcome back today.',0),[]);
console.log('WP7 first phrase opt-in, split deltas, clause and legacy rules passed');

assert.equal(new PhraseChunker({firstPhraseFast:true}).push('Yes. These are twenty five characters, with a clause.',0)[0].text,'Yes.');
assert.deepEqual(new PhraseChunker({firstPhraseFast:true}).push('It costs 1,000',0),[]);

for(const input of ['Hi, welcome back','Hi—welcome back'])assert.equal(new PhraseChunker({firstPhraseFast:true}).push(input,0)[0].text,input.startsWith('Hi,')?'Hi,':'Hi—');
