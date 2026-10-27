'use strict';
const { performance } = require('node:perf_hooks');
const MARKS = Object.freeze(['input_commit', 'stt_done', 'llm_request_sent', 'llm_first_token',
  'first_sentence_end', 'first_phrase_emitted', 'tts_first_byte', 'tts_audio_ready',
  'filler_playback_start', 'playback_start', 'face_listen_onset', 'face_think_onset', 'face_first_expression', 'response_complete', 'audio_complete', 'memory_retrieval_timeout']);
const CLIENT_MARKS = { browser: new Set(['input_begin', 'input_commit']), native: new Set(['input_begin', 'input_commit', 'filler_playback_start', 'playback_start', 'audio_complete']),
  renderer: new Set(['face_listen_onset', 'face_think_onset', 'face_first_expression']) };
function validIdentity(id) {
  return id && ['sessionId', 'characterId', 'turnId'].every(key => typeof id[key] === 'string' && id[key].length > 0 && id[key].length <= 100) && Number.isSafeInteger(id.generation) && id.generation >= 0;
}
// Process-local ring; explicitly project only IDs and validated timestamp fields.
class TurnTiming {
  constructor({ enabled = process.env.MIGHTY_DEBUG_PERF === '1', capacity = 128, now = () => performance.now() } = {}) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 4096) throw new Error('Invalid timing capacity');
    this.enabled = enabled; this.capacity = capacity; this.now = now; this.turns = new Map();
  }
  key(id) { return JSON.stringify([id.sessionId, id.characterId, id.generation, id.turnId]); }
  row(id) {
    if (!this.enabled || !validIdentity(id)) return null;
    const key = this.key(id);
    if (!this.turns.has(key)) {
      this.turns.set(key, { sessionId: id.sessionId, characterId: id.characterId, generation: id.generation,
        turnId: id.turnId, timestamps: {}, clockUncertaintyMs: {}, clockOffsetsMs: {} });
      if (this.turns.size > this.capacity) this.turns.delete(this.turns.keys().next().value);
    }
    return this.turns.get(key);
  }
  mark(id, name) {
    if (!this.enabled || !MARKS.includes(name)) return;
    const row = this.row(id); if (!row) return;
    const key = name === 'input_commit' && row.nativeCommit ? 'input_commit_received' : name;
    if (!(key in row.timestamps)) row.timestamps[key] = this.now();
  }
  importSample(body) {
    if (!this.enabled) return false;
    const { identity, source, timestamps, offsetMs, uncertaintyMs } = body || {};
    if (!validIdentity(identity) || !Object.hasOwn(CLIENT_MARKS, source) || !timestamps || typeof timestamps !== 'object' || Array.isArray(timestamps) ||
        !Number.isFinite(offsetMs) || Math.abs(offsetMs) > 1e12 || !Number.isFinite(uncertaintyMs) || uncertaintyMs < 0 || uncertaintyMs > 1000) return false;
    const entries = Object.entries(timestamps);
    const now = this.now();
    if (!entries.length || entries.length > 133 || entries.some(([key, n]) => !(CLIENT_MARKS[source].has(key) || source === 'native' && /^chunk_(?:[0-9]|[1-5][0-9]|6[0-3])_(?:start|end)$/.test(key)) || !Number.isFinite(n) || n < 0 || n + offsetMs > now + uncertaintyMs + 100 || n + offsetMs < now - 3600000)) return false;
    const row = this.row(identity);
    // Native commit is the user's boundary. Preserve server receipt separately for transport delay.
    if (source === 'native' && entries.some(([key]) => key === 'input_commit') && !row.nativeCommit) {
      if (row.timestamps.input_commit !== undefined) row.timestamps.input_commit_received = row.timestamps.input_commit;
      row.nativeCommit = true; delete row.timestamps.input_commit;
    }
    for (const [key, value] of entries) if (!(key in row.timestamps)) row.timestamps[key] = value + offsetMs;
    row.clockUncertaintyMs[source] = uncertaintyMs;
    row.clockOffsetsMs[source] = offsetMs;
    return true;
  }
  jsonLines() {
    return [...this.turns.values()].map(({ nativeCommit, ...row }) => JSON.stringify(row)).join('\n');
  }
}
const turnTiming = new TurnTiming();
module.exports = { TurnTiming, turnTiming, MARKS, validIdentity };
