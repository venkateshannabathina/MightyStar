'use strict';
const assert = require('node:assert/strict');
const { PhraseScheduler } = require('../../Backend/call/PhraseScheduler.cjs');

(async () => {
  const ready = [], started = [], resolvers = [];
  const tts = { synthesize({ text }) {
    started.push(text);
    const job = new Promise(resolve => resolvers.push(resolve));
    job.jobId = `job-${started.length}`;
    return job;
  }, cancel() {} };
  const scheduler = new PhraseScheduler({ tts, voice: 'test', onReady: chunk => ready.push(chunk), onError: error => { throw error; } });
  scheduler.enqueue({ index: 0, text: 'One.' });
  scheduler.enqueue({ index: 1, text: 'Two.' });
  scheduler.enqueue({ index: 2, text: 'Three.' });
  assert.deepEqual(started, ['One.']);
  resolvers[0]({ audioId: 'a' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(started, ['One.', 'Two.'], 'next phrase prepares without waiting for playback acknowledgement');
  resolvers[1]({ audioId: 'b' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(started, ['One.', 'Two.'], 'ready audio is bounded');
  scheduler.ack(0);
  assert.deepEqual(started, ['One.', 'Two.', 'Three.']);
  scheduler.cancel();
  resolvers[2]({ audioId: 'c' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ready.length, 2, 'cancelled result does not reach playback');
  let played = 0;
  const long = new PhraseScheduler({
    tts: { synthesize: async () => ({ audioId: 'fixture' }) }, voice: 'test',
    maxQueued: 2, maxReady: 1,
    onReady: chunk => setImmediate(() => { played++; long.ack(chunk.index); }),
    onError: error => { throw error; }
  });
  for (let index = 0; index < 100; index++) {
    assert.equal(await long.enqueueWhenReady({ index, text: 'A story sentence.' }), true);
    assert.ok(long.queue.length <= 2);
  }
  long.finish();
  while (played < 100) await new Promise(resolve => setImmediate(resolve));
  const blocked = new PhraseScheduler({ tts, voice: 'test', maxQueued: 1, onReady() {}, onError() {} });
  blocked.enqueue({ index: 0, text: 'First.' });
  blocked.enqueue({ index: 1, text: 'Second.' });
  const pending = blocked.enqueueWhenReady({ index: 2, text: 'Third.' });
  blocked.cancel();
  assert.equal(await pending, false, 'interruption releases a producer waiting for capacity');
  console.log('Phrase preparation overlap, backpressure, and cancellation checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
