'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const report=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert(report.turns>=20 && report.completeAudioTurns===report.turns,'At least 20 completed real turns are required');
const gates={request_to_first_token:[700,1000],sentence_to_phrase:[100,100],phrase_to_audio_ready:[4000,5800],commit_to_playback:[5500,7400]};
for(const [name,[p50,p90]] of Object.entries(gates)){
 const d=report.deltas[name];assert(d.n===report.turns,`${name}: missing observations`);
 assert(d.p50<=p50 && d.p90<=p90,`${name}: ${d.p50.toFixed(2)}/${d.p90.toFixed(2)} ms exceeds ${p50}/${p90}`);
}
assert(report.chunkGaps?.n>0,'Native interchunk observations are required');
console.log('WP7 real-series count, completeness and WP0-adjusted measured latency gates passed. Renderer/physical/acoustic onset are outside this harness.');
