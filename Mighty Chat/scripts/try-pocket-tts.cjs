// Isolated localhost trial. Does not change application preferences or send user data.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const output = path.resolve(__dirname, '../build/pocket-tts-trial');
const cases = [
  ['greeting', "Hey! It's good to hear from you. How's your day going?"],
  ['answer', "You're right, I missed your point. The delay comes from waiting for the voice service to start sending audio."],
  ['casual', "Honestly, I'd start with the simpler option. We can try it together and see how it feels."],
];

function wavInfo(b) {
  if (b.length < 12) return null;
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw Error('Expected WAV');
  let fmt;
  for (let p = 12; p + 8 <= b.length;) {
    const id = b.toString('ascii', p, p + 4), n = b.readUInt32LE(p + 4);
    if (id === 'fmt ' && p + 8 + n <= b.length) fmt = {
      format: b.readUInt16LE(p + 8), channels: b.readUInt16LE(p + 10),
      sampleRate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22),
    };
    if (id === 'data' && fmt) return { ...fmt, dataOffset: p + 8, sizeOffset: p + 4 };
    p += 8 + n + n % 2;
  }
  return null;
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const results = [];
  for (const [id, text] of cases) {
    const start = performance.now();
    const response = await fetch('http://127.0.0.1:18793/tts', {
      method: 'POST', body: new URLSearchParams({ text }), signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw Error(`TTS ${response.status}: ${await response.text()}`);
    const reader = response.body.getReader();
    let bytes = Buffer.alloc(0), info, scanned = 0, firstPCMms, firstSignalMs, signalSample;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes = Buffer.concat([bytes, Buffer.from(value)]);
      info ||= wavInfo(bytes);
      if (!info) continue;
      const stride = info.bits / 8;
      if (!((info.format === 1 && info.bits === 16) || (info.format === 3 && info.bits === 32))) throw Error(`Unsupported PCM ${JSON.stringify(info)}`);
      const samples = Math.floor((bytes.length - info.dataOffset) / stride);
      if (samples && firstPCMms === undefined) firstPCMms = performance.now() - start;
      for (; scanned < samples; scanned++) {
        const p = info.dataOffset + scanned * stride;
        const v = info.format === 3 ? bytes.readFloatLE(p) : bytes.readInt16LE(p) / 32768;
        if (!Number.isFinite(v)) throw Error('Non-finite sample');
        if (Math.abs(v) > 0.01 && firstSignalMs === undefined) {
          firstSignalMs = performance.now() - start;
          signalSample = scanned;
        }
      }
    }
    if (!info || firstSignalMs === undefined) throw Error('No usable speech waveform');
    const totalMs = performance.now() - start;
    bytes.writeUInt32LE(bytes.length - 8, 4);
    bytes.writeUInt32LE(bytes.length - info.dataOffset, info.sizeOffset);
    const seconds = (bytes.length - info.dataOffset) / (info.bits / 8) / info.channels / info.sampleRate;
    fs.writeFileSync(path.join(output, `${id}.wav`), bytes);
    const result = { id, text, firstPCMms: +firstPCMms.toFixed(1), firstSignalMs: +firstSignalMs.toFixed(1),
      leadingSignalOffsetMs: +(signalSample / info.channels / info.sampleRate * 1000).toFixed(1),
      totalMs: +totalMs.toFixed(1), audioSeconds: +seconds.toFixed(3), realtimeFactor: +(totalMs / 1000 / seconds).toFixed(3), wav: info };
    results.push(result);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(result));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
