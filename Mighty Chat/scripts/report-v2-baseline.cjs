'use strict';
const fs = require('node:fs');
const { MARKS } = require('../Backend/performance/TurnTiming.cjs');
const PAIRS = Object.freeze({
  commit_to_stt: ['input_commit', 'stt_done'],
  stt_to_request: ['stt_done', 'llm_request_sent'],
  request_to_first_token: ['llm_request_sent', 'llm_first_token'],
  first_token_to_sentence: ['llm_first_token', 'first_sentence_end'],
  sentence_to_phrase: ['first_sentence_end', 'first_phrase_emitted'],
  phrase_to_tts_first_byte: ['first_phrase_emitted', 'tts_first_byte'],
  phrase_to_audio_ready: ['first_phrase_emitted', 'tts_audio_ready'],
  audio_ready_to_playback: ['tts_audio_ready', 'playback_start'],
  commit_to_playback: ['input_commit', 'playback_start'],
  commit_to_filler: ['input_commit', 'filler_playback_start'],
  commit_to_response_complete: ['input_commit', 'response_complete'],
  commit_to_audio_complete: ['input_commit', 'audio_complete'],
  input_to_listen: ['input_begin', 'face_listen_onset'],
  playback_to_expression: ['playback_start', 'face_first_expression'],
});
function summarize(rows) {
  const seen = new Set();
  for (const row of rows) {
    const key = JSON.stringify([row.sessionId, row.characterId, row.generation, row.turnId]);
    if (seen.has(key)) throw new Error('Duplicate turn'); seen.add(key);
    if (!row.timestamps || Object.values(row.timestamps).some(n => !Number.isFinite(n))) throw new Error('Invalid timestamps');
  }
  const stats = values => {
    const ordered = values.slice().sort((a, b) => a - b), n = ordered.length;
    const percentile = p => n ? ordered[Math.ceil(n * p) - 1] : null;
    return { n, missing: rows.length - n, p50: percentile(0.5), p90: percentile(0.9), min: n ? ordered[0] : null, max: n ? ordered[n - 1] : null };
  };
  const gaps=rows.flatMap(row=>Object.entries(row.timestamps).flatMap(([key,start])=>{
    const match=/^chunk_(\d+)_start$/.exec(key);if(!match || Number(match[1])===0)return [];
    const end=row.timestamps[`chunk_${Number(match[1])-1}_end`];return Number.isFinite(end)?[start-end]:[];
  }));
  const {missing:ignored,...chunkGaps}=stats(gaps);
  return { chunkGaps: {...chunkGaps, unit:'ms', definition:'next decoded sample-clock start minus previous dataPlayedBack callback; signed, not acoustic'}, turns: rows.length, completeAudioTurns: rows.filter(r => Number.isFinite(r.timestamps.audio_complete)).length,
    unit: 'ms', percentile: 'nearest-rank', deltas: Object.fromEntries(Object.entries(PAIRS).map(([name, [a, b]]) =>
      [name, stats(rows.filter(r => Number.isFinite(r.timestamps[a]) && Number.isFinite(r.timestamps[b])).map(r => r.timestamps[b] - r.timestamps[a]))])),
    marks: Object.fromEntries(MARKS.map(mark => [mark, rows.filter(row => Number.isFinite(row.timestamps[mark])).length])),
    maxClockUncertaintyMs: Math.max(0, ...rows.flatMap(row => Object.values(row.clockUncertaintyMs || {}))) };
}
if (require.main === module) {
  const rows = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  process.stdout.write(JSON.stringify(summarize(rows), null, 2) + '\n');
}
module.exports = { summarize, PAIRS };
