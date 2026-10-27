'use strict';
const MAX_CONTROL_BYTES = 64 * 1024;
const states = new Set(['buffering', 'playing', 'ended', 'cancelled', 'error']);
function boundedString(value, max = 100) { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function integer(value) { return Number.isSafeInteger(value) && value >= 0; }
function identity(value) {
  return !!value && typeof value === 'object' &&
    boundedString(value.sessionId) && boundedString(value.characterId) &&
    integer(value.generation) && boundedString(value.turnId);
}
function envelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_CONTROL_BYTES) return false;
  return value.version === 2 && boundedString(value.type, 80) &&
    boundedString(value.eventId) && integer(value.sequence) && identity(value.identity);
}
function playbackSnapshot(value) {
  return envelope(value) && value.type === 'playback.snapshot' && integer(value.clockEpoch) &&
    (value.chunkId === null || boundedString(value.chunkId)) && integer(value.chunkIndex) &&
    integer(value.playedSamplesInChunk) && Number.isFinite(value.sampleRate) &&
    value.sampleRate >= 8000 && value.sampleRate <= 192000 && states.has(value.state);
}
module.exports = { MAX_CONTROL_BYTES, identity, envelope, playbackSnapshot };
