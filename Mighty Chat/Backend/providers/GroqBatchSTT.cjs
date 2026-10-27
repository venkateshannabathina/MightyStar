'use strict';

const MAX_PCM_BYTES = 2 * 1024 * 1024;

function pcm16ToWav(pcm, sampleRate) {
  if (!Buffer.isBuffer(pcm) || pcm.length === 0 || pcm.length > MAX_PCM_BYTES || pcm.length % 2 !== 0) throw new Error('Invalid PCM input.');
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 96000) throw new Error('Unsupported sample rate.');
  if (pcm.length / (sampleRate * 2) > 30) throw new Error('Utterance is too long.');
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function transcribeGroq({ pcm, sampleRate, apiKey, language, signal, provider = 'groq', model = 'whisper-large-v3-turbo', fetchImpl = fetch }) {
  const base = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.groq.com/openai/v1';
  if (!apiKey) throw new Error('The selected transcription provider needs an API key.');
  const wav = pcm16ToWav(pcm, sampleRate);
  const form = new FormData();
  form.append('file', new Blob([wav], { type: 'audio/wav' }), 'utterance.wav');
  form.append('model', model);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (typeof language === 'string' && /^[a-z]{2,3}$/.test(language)) form.append('language', language);
  const response = await fetchImpl(`${base}/audio/transcriptions`, {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal
  });
  if (!response.ok) throw new Error(`Transcription failed (${response.status}).`);
  const result = await response.json();
  return typeof result?.text === 'string' ? result.text.trim().slice(0, 5000) : '';
}

module.exports = { MAX_PCM_BYTES, pcm16ToWav, transcribeGroq };
