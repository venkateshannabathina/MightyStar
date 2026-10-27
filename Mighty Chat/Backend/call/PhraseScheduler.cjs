'use strict';

class PhraseScheduler {
  constructor({ tts, voice, options = {}, onReady, onError, onDrained = () => {}, maxQueued = 8, maxReady = 2 }) {
    this.tts = tts; this.options = options; this.voice = voice; this.onReady = onReady; this.onError = onError; this.onDrained = onDrained;
    this.maxQueued = maxQueued; this.maxReady = maxReady;
    this.queue = []; this.ready = new Set(); this.current = null; this.closed = false;
    this.nextIndex = 0;
    this.capacityWaiters = [];
    this.finishedInput = false; this.reportedDrained = false;
  }
  enqueue(phrase) {
    if (this.closed || phrase.index !== this.nextIndex || typeof phrase.text !== 'string' || !phrase.text || phrase.text.length > 180) throw new Error('Invalid TTS phrase.');
    if (this.queue.length >= this.maxQueued) throw new Error('TTS phrase queue limit exceeded.');
    this.nextIndex++;
    this.queue.push(phrase);
    this.pump();
  }
  async enqueueWhenReady(phrase) {
    while (!this.closed && this.queue.length >= this.maxQueued) {
      await new Promise(resolve => this.capacityWaiters.push(resolve));
    }
    if (this.closed) return false;
    this.enqueue(phrase);
    return true;
  }
  releaseCapacity() {
    for (const resolve of this.capacityWaiters.splice(0)) resolve();
  }
  ack(index) {
    if (this.ready.delete(index)) this.pump();
  }
  finish() { this.finishedInput = true; this.pump(); }
  pump() {
    if (this.closed || this.current) return;
    if (!this.queue.length) {
      if (this.finishedInput && !this.reportedDrained) { this.reportedDrained = true; this.onDrained(); }
      return;
    }
    if (this.ready.size >= this.maxReady) return;
    const phrase = this.queue.shift();
    this.releaseCapacity();
    const job = this.tts.synthesize({ ...this.options, text: phrase.text, voice: this.voice });
    this.current = job;
    job.then(result => {
      if (this.closed || this.current !== job) return;
      this.current = null;
      this.ready.add(phrase.index);
      this.onReady({ ...phrase, ...result });
      this.pump();
    }).catch(error => {
      if (this.closed || this.current !== job) return;
      this.current = null;
      this.closed = true;
      this.queue.length = 0;
      this.releaseCapacity();
      this.onError(error);
    });
  }
  cancel() {
    if (this.closed) return;
    this.closed = true; this.queue.length = 0; this.ready.clear();
    this.releaseCapacity();
    if (this.current?.jobId) this.tts.cancel(this.current.jobId);
    this.current = null;
  }
}
module.exports = { PhraseScheduler };
