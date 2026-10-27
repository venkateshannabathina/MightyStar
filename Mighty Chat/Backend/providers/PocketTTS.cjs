'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { POCKET_VOICES, POCKET_PREVIEW_TEXT, pocketLanguage } = require('./PocketVoices.cjs');

const {tuneAudio,warmTuner,closeTuners}=require('./PocketAudioTuning.cjs');
const {PocketPacks}=require('./PocketPacks.cjs');
class PocketWorker {
  constructor({ audioRoot, resourceRoot, cacheRoot, fetchImpl = fetch, language = 'english', packs }) {
    this.audioRoot = audioRoot; this.language=language; this.packs=packs;
    const source = path.resolve(__dirname, '../../Sources/PocketTTS');
    this.resources = resourceRoot || (fs.existsSync(source) ? source : path.resolve(__dirname, '../../Resources/PocketTTS'));
    this.cacheRoot = cacheRoot || path.join(os.tmpdir(), 'mighty-pocket-model-v4');
    this.fetch = fetchImpl; this.jobs = new Map(); this.child = null; this.starting = null; this.closed = false;
  }
  warmup() { this.ready().catch(() => {}); }
  async ready() {
    if (this.closed) throw Error('Pocket TTS is closed.');
    if (this.starting) return this.starting;
    this.starting = this.start().catch(error => {
      this.child?.kill('SIGTERM'); this.child = null; this.starting = null; throw error;
    });
    return this.starting;
  }
  async start() {
    const binary = path.join(this.resources, 'pocket-tts');
    if (!fs.existsSync(binary)) throw Error('Pocket TTS is missing. Reinstall the app’s voice resources.');
    if(!this.packs.status().find(item=>item.language===this.language)?.installed) throw Error(`Download the ${pocketLanguage(this.language).name} language pack in Settings > Voice before speaking.`);
    await this.packs.ensure(this.language,pocketLanguage(this.language).defaultVoice);
    if (this.closed) throw Error('Pocket TTS is closed.');
    const port = await new Promise((resolve, reject) => {
      const probe = net.createServer(); probe.on('error', reject);
      probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(() => resolve(port)); });
    });
    if (this.closed) throw Error('Pocket TTS is closed.');
    const child = spawn(binary, ['serve', '--host', '127.0.0.1', '--port', String(port), '--language', this.language, '--default-voice', pocketLanguage(this.language).defaultVoice], {
      env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
        HF_HOME: this.cacheRoot, HF_HUB_OFFLINE: '1' }, stdio: ['ignore', 'ignore', 'pipe'],
    });
    this.child = child; this.origin = `http://127.0.0.1:${port}`;
    let failure;
    child.stderr.on('data', () => {});
    child.on('error', () => { failure = Error('Pocket TTS could not start.'); });
    child.on('exit', () => {
      failure ||= Error('Pocket TTS stopped. Try speaking again.');
      if (this.child === child) {
        this.child = null; this.starting = null;
        for (const job of this.jobs.values()) job.abort();
      }
    });
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (failure) throw failure;
      if (this.closed) throw Error('Pocket TTS is closed.');
      try {
        const response = await this.fetch(this.origin + '/health', { signal: AbortSignal.timeout(500) });
        if (response.ok) return;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw Error('Pocket TTS model did not become ready. Try again.');
  }
  synthesize({ text, voice = 'alba', onFirstByte, speed=1, tone=0, gain=1 }) {
    const jobId = randomUUID(), controller = new AbortController();
    this.jobs.set(jobId, controller);
    const promise = (async () => {
      if (typeof text !== 'string' || !text.trim() || text.length > 5000) throw Error('Invalid speech text.');
      if (!POCKET_VOICES.includes(voice)) throw Error('Choose an available Pocket voice.');
      const timer = setTimeout(() => controller.abort(), 360000);
      const audioId = randomUUID(), output = path.join(this.audioRoot, `${audioId}.wav`);
      try {
        const preview = path.join(this.resources, 'previews', this.language==='english'?voice+'.wav':this.language+'/'+voice+'.wav');
        if (text === pocketLanguage(this.language).previewText && fs.existsSync(preview)) {
          const original = await fs.promises.readFile(preview);
          const bytes = await tuneAudio(original,{speed,tone,gain},{resources:this.resources,audioRoot:this.audioRoot,signal:controller.signal});
          controller.signal.throwIfAborted();
          await fs.promises.writeFile(output, bytes, {mode:0o600});
          controller.signal.throwIfAborted();
          onFirstByte?.();
          setTimeout(() => fs.unlink(output, () => {}), 600000).unref();
          return {audioId,durationSeconds:(bytes.length-44)/48000,quality:'audio-only',words:[],mouthCues:[]};
        }
        await new Promise((resolve, reject) => {
          const abort = () => reject(Error('Speech cancelled.'));
          controller.signal.addEventListener('abort', abort, { once: true });
          this.ready().then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', abort));
          if (controller.signal.aborted) abort();
        });
        await this.packs.ensure(this.language,voice);
        controller.signal.throwIfAborted();
        const response = await this.fetch(this.origin + '/tts', {
          method: 'POST', body: new URLSearchParams({ text, voice_url: voice }), signal: controller.signal,
        });
        if (!response.ok) throw Error(`Pocket speech failed (HTTP ${response.status}).`);
        const reader = response.body.getReader(), chunks = []; let size = 0, first = false;
        try {
          while (true) {
            const { value, done } = await reader.read(); if (done) break;
            size += value.length;
            if (size > 8 * 1024 * 1024) throw Error('Pocket speech audio is too large.');
            chunks.push(Buffer.from(value));
            if (!first && size > 44) { first = true; onFirstByte?.(); }
          }
        } finally { await reader.cancel().catch(() => {}); }
        controller.signal.throwIfAborted();
        let bytes = Buffer.concat(chunks);
        // The native server sends an unseekable 44-byte PCM WAV header. Fix its
        // placeholder lengths before handing the file to AVAudioFile/browser audio.
        if (bytes.length <= 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE' ||
            bytes.toString('ascii', 36, 40) !== 'data' || bytes.readUInt16LE(20) !== 1 ||
            bytes.readUInt16LE(22) !== 1 || bytes.readUInt32LE(24) !== 24000 || bytes.readUInt16LE(34) !== 16 || (bytes.length - 44) % 2) throw Error('Invalid Pocket speech audio.');
        bytes.writeUInt32LE(bytes.length - 8, 4); bytes.writeUInt32LE(bytes.length - 44, 40);
        bytes = await tuneAudio(bytes,{speed,tone,gain},{resources:this.resources,audioRoot:this.audioRoot,signal:controller.signal});
        await fs.promises.writeFile(output, bytes, { mode: 0o600 });
        controller.signal.throwIfAborted();
        setTimeout(() => fs.unlink(output, () => {}), 600000).unref();
        // This model has no word alignment API. Do not invent word/viseme timings.
        return { audioId, durationSeconds: (bytes.length - 44) / 48000, quality: 'audio-only', words: [], mouthCues: [] };
      } catch (error) { await fs.promises.unlink(output).catch(() => {}); throw error; }
      finally { clearTimeout(timer); }
    })().finally(() => this.jobs.delete(jobId));
    return Object.assign(promise, { jobId });
  }
  cancel(jobId) { this.jobs.get(jobId)?.abort(); }
  close() {
    this.closed = true;
    for (const job of this.jobs.values()) job.abort();
    this.child?.kill('SIGTERM'); this.child = null;
  }
}
class PocketTTS {
 constructor(options){
  this.options=options;this.workers=new Map();this.jobs=new Map();this.closed=false;
  const source=path.resolve(__dirname,'../../Sources/PocketTTS');
  this.resources=options.resourceRoot||(fs.existsSync(source)?source:path.resolve(__dirname,'../../Resources/PocketTTS'));
  this.packs=new PocketPacks({resources:this.resources,cacheRoot:options.cacheRoot,fetchImpl:options.fetchImpl});
 }
 get child(){return [...this.workers.values()].find(w=>w.child)?.child||null;}
 worker(language='english'){
  if(this.closed)throw Error('Pocket TTS is closed.');
  if(!this.workers.has(language)){
   if(this.workers.size>=2){const key=[...this.workers.keys()].find(k=>k!=='english')||this.workers.keys().next().value;this.workers.get(key).close();this.workers.delete(key);}
   this.workers.set(language,new PocketWorker({...this.options,resourceRoot:this.resources,cacheRoot:this.packs.cacheRoot,language,packs:this.packs}));
  }
  return this.workers.get(language);
 }
 ready(language='english'){return this.worker(language).ready();}
 warmup(options={}){warmTuner(this.resources);const language=options.language||'english';if(this.packs.status().find(item=>item.language===language)?.installed)this.packs.ensure(language,options.voice||pocketLanguage(language).defaultVoice).then(()=>this.ready(language)).catch(()=>{});}
 synthesize(options){const worker=this.worker(options.language||'english');const job=worker.synthesize(options);this.jobs.set(job.jobId,worker);job.then(()=>this.jobs.delete(job.jobId),()=>this.jobs.delete(job.jobId));return job;}
 cancel(id){this.jobs.get(id)?.cancel(id);}
 close(){this.closed=true;for(const worker of this.workers.values())worker.close();this.packs.close();closeTuners();}
}
module.exports = { PocketTTS, PocketWorker };
