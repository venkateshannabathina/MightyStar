'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { VoiceOpeningCache } = require('./VoiceOpeningCache.cjs');

class EdgeTTS {
  constructor({ audioRoot, python = '/usr/bin/python3', openingDirectory }) {
    this.audioRoot = audioRoot;
    this.openingCache = new VoiceOpeningCache({audioRoot,directory:openingDirectory});
    this.python = python;
    this.child = null;
    this.pending = new Map();
    this.buffer = '';
  }
  openingChoices(options) { return this.openingCache.choices(options); }
  start() {
    if (this.child) return;
    const source = path.resolve(__dirname, '../../Sources/EdgeTTS');
    const vendor = fs.existsSync(source) ? source : path.resolve(__dirname, '../../Resources/EdgeTTS');
    const worker = path.resolve(__dirname, '../workers/edge_worker.py');
    const child = spawn(this.python, [worker], { env: { ...process.env, PYTHONPATH: vendor }, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    this.buffer = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', text => {
      this.buffer += text;
      if (this.buffer.length > 1024 * 1024) { child.kill(); return; }
      let end;
      while ((end = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end + 1);
        try { this.onMessage(JSON.parse(line)); } catch { child.kill(); }
      }
    });
    child.stderr.on('data', () => {}); // Worker diagnostics never enter the protocol stream.
    child.stdin.on('error', error => { if (this.child === child) this.failAll(error); });
    child.on('error', error => { if (this.child === child) this.failAll(error); });
    child.on('exit', () => {
      if (this.child === child) { this.child = null; this.failAll(new Error('TTS worker stopped.')); }
    });
  }
  warmup() {
    this.start();
    if (this.child?.stdin.writable) this.child.stdin.write(JSON.stringify({ type: 'warmup', jobId: 'warmup' }) + '\n');
  }
  onMessage(message) {
    const job = this.pending.get(message.jobId);
    if (!job) return;
    if (message.type === 'cancelled') {
      clearTimeout(job.cancelTimer);
      this.pending.delete(message.jobId);
      return;
    }
    if (job.cancelled) {
      clearTimeout(job.cancelTimer);
      this.pending.delete(message.jobId);
      fs.unlink(job.output, () => {}); fs.unlink(job.metadata, () => {});
      return;
    }
    if (message.type === 'first_audio') {
      if (!job.firstAudio) { job.firstAudio = true; job.onFirstByte?.(); }
      return;
    }
    if (message.type === 'ready') {
      clearTimeout(job.timer);
      this.pending.delete(message.jobId);
      if (!fs.existsSync(job.output)) return job.reject(new Error('TTS audio is missing.'));
      const cleanup = setTimeout(() => { fs.unlink(job.output, () => {}); fs.unlink(job.metadata, () => {}); }, 10 * 60 * 1000);
      cleanup.unref();
      job.resolve({ audioId: job.audioId, ...message.timeline });
    } else if (message.type === 'error') {
      clearTimeout(job.timer);
      this.pending.delete(message.jobId);
      fs.unlink(job.output, () => {}); fs.unlink(job.metadata, () => {});
      job.reject(new Error(String(message.error || 'TTS failed.').slice(0, 500)));
    }
  }
  synthesize({ text, voice, rate = '+0%', pitch = '+0Hz', onFirstByte }) {
    if (typeof text !== 'string' || !text.trim() || text.length > 180) return Promise.reject(new Error('Invalid TTS job.'));
    const cached = this.openingCache.synthesize({text,voice,rate,pitch,onFirstByte});
    if (cached) return cached;
    if (this.pending.size && [...this.pending.values()].every(job => job.cancelled)) {
      const previous = this.child;
      this.child = null;
      previous?.kill('SIGTERM');
      this.failAll(new Error('Previous TTS job was cancelled.'));
    }
    if (this.pending.size) return Promise.reject(new Error('Overlapping TTS job.'));
    this.start();
    const jobId = randomUUID(), audioId = randomUUID();
    const output = path.join(this.audioRoot, `${audioId}.mp3`);
    const metadata = path.join(this.audioRoot, `${audioId}.json`);
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    const timer = setTimeout(() => this.cancel(jobId, new Error('TTS timed out.')), 10000);
    this.pending.set(jobId, { resolve, reject, timer, output, metadata, audioId, cancelled: false, onFirstByte });
    const command = { type: 'synthesize', jobId, text, voice, rate, pitch, audio: output, metadata };
    if (typeof onFirstByte === 'function') command.debugTiming = true;
    this.child.stdin.write(JSON.stringify(command) + '\n');
    return Object.assign(promise, { jobId });
  }
  cancel(jobId, reason = new Error('TTS cancelled.')) {
    const job = this.pending.get(jobId);
    if (!job || job.cancelled) return;
    job.cancelled = true;
    clearTimeout(job.timer);
    job.reject(reason);
    if (this.child?.stdin.writable) this.child.stdin.write(JSON.stringify({ type: 'cancel', jobId }) + '\n');
    job.cancelTimer = setTimeout(() => { this.child?.kill('SIGTERM'); this.pending.delete(jobId); }, 1000);
    job.cancelTimer.unref();
    fs.unlink(job.output, () => {}); fs.unlink(job.metadata, () => {});
  }
  failAll(error) {
    for (const [jobId, job] of this.pending) {
      clearTimeout(job.timer); clearTimeout(job.cancelTimer);
      if (!job.cancelled) job.reject(error);
      this.pending.delete(jobId);
    }
  }
  close() {
    for (const jobId of this.pending.keys()) this.cancel(jobId);
    this.child?.kill('SIGTERM');
    this.child = null;
    this.failAll(new Error('TTS worker closed.'));
  }
}

module.exports = { EdgeTTS };
