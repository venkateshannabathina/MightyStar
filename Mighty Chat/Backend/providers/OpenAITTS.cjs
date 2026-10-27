'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
class OpenAITTS {
  constructor({ audioRoot, apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch }) {
    this.audioRoot = audioRoot; this.apiKey = apiKey; this.fetch = fetchImpl; this.jobs = new Map();
  }
  synthesize({ text, voice = 'marin', speed = 1, instructions = '', onFirstByte }) {
    const jobId = randomUUID(), controller = new AbortController();
    this.jobs.set(jobId, controller);
    const promise = (async () => {
      if (!this.apiKey) throw new Error('Add an OpenAI key in AI & Voice Settings to use this voice.');
      if (typeof text !== 'string' || !text.trim() || text.length > 4096) throw new Error('Invalid speech text.');
      const timer = setTimeout(() => controller.abort(), 30000);
      const audioId = randomUUID(), output = path.join(this.audioRoot, `${audioId}.mp3`);
      try {
        const response = await this.fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST', signal: controller.signal,
          headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini-tts', input: text, voice, speed, instructions, response_format: 'mp3' })
        });
        if (!response.ok) throw new Error(`OpenAI speech failed (HTTP ${response.status}). Check the key, billing, and model access.`);
        let bytes;
        if (typeof onFirstByte === 'function' && response.body?.getReader) {
          const reader = response.body.getReader(), chunks = []; let size = 0, first = true;
          try {
            while (true) {
              const { value, done } = await reader.read(); if (done) break;
              if (value?.length) {
                if (first) { first = false; onFirstByte(); }
                size += value.length; if (size > 8 * 1024 * 1024) throw new Error('Invalid speech audio.');
                chunks.push(Buffer.from(value));
              }
            }
          } finally { await reader.cancel().catch(() => {}); }
          bytes = Buffer.concat(chunks);
        } else bytes = Buffer.from(await response.arrayBuffer());
        if (controller.signal.aborted) throw new Error('Speech cancelled.');
        if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('Invalid speech audio.');
        await fs.promises.writeFile(output, bytes, { mode: 0o600 });
        if (controller.signal.aborted) { await fs.promises.unlink(output).catch(() => {}); throw new Error('Speech cancelled.'); }
        setTimeout(() => fs.unlink(output, () => {}), 600000).unref();
        // OpenAI does not return word timings here; do not fabricate synchronized visemes.
        return { audioId, durationSeconds: 0, quality: 'audio-only', mouthCues: [] };
      } finally { clearTimeout(timer); }
    })().finally(() => this.jobs.delete(jobId));
    return Object.assign(promise, { jobId });
  }
  cancel(jobId) { this.jobs.get(jobId)?.abort(); }
  close() { for (const controller of this.jobs.values()) controller.abort(); }
}
module.exports = { OpenAITTS };
