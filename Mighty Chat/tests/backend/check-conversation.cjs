'use strict';
const assert = require('node:assert/strict');
const { ConversationSession } = require('../../Backend/call/ConversationSession.cjs');
const { streamGroq } = require('../../Backend/providers/GroqLLM.cjs');

(async () => {
  const messages = [];
  const id = { sessionId: 's', characterId: 'c', generation: 0, turnId: 't' };
  const session = new ConversationSession({
    character: { name: 'Mira', description: 'Calm and helpful', profile: { memories: 'The user has a dog.' } },
    send: (type, identity, fields) => messages.push({ type, identity, fields }),
    apiKey: 'test', model: 'test',
    stream: async function* ({ messages: prompt }) {
      assert.match(prompt[0].content, /The user has a dog/);
      assert.match(prompt[0].content, /live voice call/);
      assert.equal(prompt.at(-1).content, 'Hello');
      yield 'Hello there. ';
      yield 'How can I help?';
    }
  });
  await session.turn(id, 'Hello', []);
  assert.equal(messages.filter(event => event.type === 'response.complete').length, 1);
  assert.deepEqual(messages.filter(event => event.type === 'speech.phrase').map(event => event.fields.text), ['Hello there.', 'How can I help?']);

  const paused = [];
  const cancelled = new ConversationSession({
    send: (type) => paused.push(type), apiKey: 'test',
    stream: async function* () { yield 'Old beginning. '; await new Promise(resolve => setTimeout(resolve, 10)); yield 'Old ending.'; }
  });
  const pending = cancelled.turn(id, 'Hi', []);
  await new Promise(resolve => setTimeout(resolve, 1));
  cancelled.advance(1);
  await pending;
  assert(!paused.includes('response.complete'));

  const failedSpeechEvents = [];
  const resilient = new ConversationSession({
    send: (type, identity, fields) => failedSpeechEvents.push({ type, fields }), apiKey: 'test',
    tts: { synthesize: () => Promise.reject(new Error('Voice service unavailable')), cancel() {} },
    stream: async function* () {
      yield 'First sentence. ';
      await new Promise(resolve => setTimeout(resolve, 5));
      yield 'The rest of the answer still arrives.';
    }
  });
  await resilient.turn(id, 'Hi', []);
  assert.equal(failedSpeechEvents.find(e => e.type === 'response.error').fields.stage, 'speech');
  assert.equal(failedSpeechEvents.find(e => e.type === 'response.complete').fields.text,
    'First sentence. The rest of the answer still arrives.');
  assert(failedSpeechEvents.some(e => e.type === 'speech.audio.complete'));
  const emptyEvents = [];
  const empty = new ConversationSession({ send: type => emptyEvents.push(type), stream: async function* () {} });
  await empty.turn(id, 'Hi', []);
  assert(emptyEvents.includes('response.error'));
  assert(!emptyEvents.includes('response.complete'));

  const encoder = new TextEncoder();
  const parts = ['data: {"choices":[{"delta":{"content":"Hello"}}]}\r', '\n\r\n', 'data: {"choices":[{"delta":{"content":" world"}}]}\n\n', 'data: [DONE]\n\n'];
  const body = new ReadableStream({ start(controller) { for (const part of parts) controller.enqueue(encoder.encode(part)); controller.close(); } });
  const tokens = [];
  for await (const token of streamGroq({ apiKey: 'test', messages: [], fetchImpl: async () => ({ ok: true, body }) })) tokens.push(token);
  assert.deepEqual(tokens, ['Hello', ' world']);
  const packed = 'data: {"choices":[{"delta":{"content":"word "}}]}\n\n'.repeat(2000) + 'data: [DONE]\n\n';
  const packedBody = new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(packed)); controller.close(); } });
  let packedCount = 0;
  for await (const token of streamGroq({ apiKey: 'test', messages: [], fetchImpl: async () => ({ ok: true, body: packedBody }) })) packedCount++;
  assert.equal(packedCount, 2000, 'many valid events in one network read are not an oversized frame');
  const oversizedBody = new ReadableStream({ start(controller) { controller.enqueue(encoder.encode('data: ' + 'x'.repeat(262145) + '\n\n')); controller.close(); } });
  await assert.rejects(async () => {
    for await (const token of streamGroq({ apiKey: 'test', messages: [], fetchImpl: async () => ({ ok: true, body: oversizedBody }) })) {}
  }, /frame limit/);
  console.log('Conversation context, streaming, phrase, and cancellation checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
