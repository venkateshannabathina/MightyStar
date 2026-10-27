// Bundled Python must never write bytecode into the signed app.
process.env.PYTHONDONTWRITEBYTECODE = '1';
const http = require('node:http');
const { turnTiming } = require('../Backend/performance/TurnTiming.cjs');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { attachCallTransport } = require('../Backend/CallTransport.cjs');
const { clean, buildMessages } = require('../Backend/history/ContextBuilder.cjs');
const { PocketTTS } = require('../Backend/providers/PocketTTS.cjs');
const { EdgeTTS } = require('../Backend/providers/EdgeTTS.cjs');
const { OpenAITTS } = require('../Backend/providers/OpenAITTS.cjs');
const { providerSettings, voiceSettings } = require('../Backend/providers/ProviderSettings.cjs');
// One-way migration from an older running app's in-memory connection. The
// signed broker authenticates both the Node parent and native app grandparent.
// No API key is returned to JavaScript, written to disk, or put in arguments.
const agentPath = path.join(__dirname, 'credential-agent');
if (fs.existsSync(agentPath)) {
  const keys = Object.fromEntries(['groq','openai','anthropic','gemini'].map(p=>[p,process.env[p.toUpperCase()+'_API_KEY']]).filter(([,key])=>key));
  if (Object.keys(keys).length) {
    const migrated = spawnSync(agentPath, [], {input:JSON.stringify({operation:'import',keys}),encoding:'utf8',timeout:5000,maxBuffer:32768});
    if (!migrated.error && migrated.status === 0) {
      try {
        const receipt = JSON.parse(migrated.stdout);
        fs.writeFileSync(path.join(os.tmpdir(),'mighty-credential-migration-status.json'),JSON.stringify({status:receipt.status,providers:receipt.providers||{},time:Date.now()}),{mode:0o600});
      } catch {}
    }
  }
}
const mind = new (require('../Backend/mind/MindService.cjs').MindService)();
const memory = process.env.MIGHTY_MEMORY_V1 !== '0' ? new (require('../Backend/memory/MemoryService.cjs').MemoryService)() : null;
const streamChat = process.env.MIGHTY_STREAM_CHAT === '1';
const {TagParser} = require('../Backend/call/TagParser.cjs');
const {taggedMessages} = require('../Backend/call/TaggedPrompt.cjs');
const {streamReply} = require('../Backend/providers/ReplyStream.cjs');
const aiConfig = providerSettings();
const {replyRequest,replyText} = require('../Backend/providers/ReplyRequest.cjs');
const {sanitizeExpression} = require('../Backend/mind/Reaction.cjs');

const { CharacterCache, assetPath } = require('../Backend/assets/CharacterCache.cjs');
const root = __dirname;
const characterCache = new CharacterCache({bundledRoot:path.join(root,'Characters')});
const apiToken = crypto.randomBytes(32).toString('base64url');
const audioRoot = path.join(os.tmpdir(), 'mighty-chat-audio');
fs.mkdirSync(audioRoot, { recursive: true, mode: 0o700 });
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.mp3':'audio/mpeg'};
const publicFiles = new Set([
  'index.html','companion.css','companion-ui.js','catalog.js','chat-personas.js','video.svg','studio.css','studio.js',
  'chat-layout.css','chat-ui.js','particle-orb.css','particle-orb.js','design-tokens.css',
  'mightystar-ui.css','mightystar-ui.js','pocket-catalog.js','character-editor.css','kit-polish.css','symbol-assets.js',
  'background-assets.js','home-backgrounds.js','home-backgrounds.css','sidebar-rail.js','sidebar-rail.css','siri-chat.css','siri-chat.js','orb-reference.js',
  'desktop.html','desktop.css','desktop.js'
]);
for(const name of fs.readdirSync(path.join(root,'OrbAssets'))) {
  if(/^atlas-\d+\.webp$/.test(name))publicFiles.add(`OrbAssets/${name}`);
}
for (let index = 1; index <= 6; index++) {
  publicFiles.add(`Backgrounds/bundled-${index}.jpg`);
  publicFiles.add(`Backgrounds/bundled-${index}-thumb.jpg`);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'null');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Mighty-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Vary', 'Origin');
}
function json(res, status, value) {
  setCors(res);
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(body);
}
function authorized(req) {
  const supplied = req.headers['x-mighty-token'];
  if (typeof supplied !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(supplied)) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(apiToken));
}
function readJson(req, limit = 128 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0, text = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { size += Buffer.byteLength(chunk); if (size > limit) { reject(Object.assign(new Error('Request is too large.'), {status:413})); req.destroy(); } else text += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(text || '{}')); } catch { reject(Object.assign(new Error('Invalid JSON.'), {status:400})); } });
    req.on('error', reject);
  });
}
const moods = new Set(['neutral','happy','amused','sad','concerned','surprised','angry','annoyed','excited']);
function parseAssistant(content) {
  const raw = clean(content, 12000);
  let parsed;
  try { parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/gi,'')); } catch {}
  if (!parsed || typeof parsed !== 'object') return {reply:raw,mood:'neutral',intensity:0};
  const reply = clean(parsed.reply, 12000);
  const mood = moods.has(parsed.mood) ? parsed.mood : 'neutral';
  const intensity = Number.isFinite(Number(parsed.intensity)) ? Math.max(0,Math.min(1,Number(parsed.intensity))) : 0.45;
  return {reply,mood,intensity};
}
async function chat(req, res) {
  const body = await readJson(req, memory ? 8192 : 128 * 1024);
  let memoryTurn;
  if (memory) {
    try { memoryTurn = await memory.prepare(body, 'chat'); if (memoryTurn.cached) return json(res,200,memoryTurn.cached); }
    catch(error) { return json(res,error.status||500,{error:error.status ? error.message : 'Memory context is unavailable.'}); }
  }
  const character = memoryTurn?.character || (body.character && typeof body.character === 'object' ? body.character : {});
  const aiConfig = providerSettings(process.env,character.profile);
  if (!aiConfig.apiKey) { memory?.fail(memoryTurn); return json(res,503,{error:'The selected provider needs a key. Open Agent settings.',code:'missing_api_key'}); }
  let messages = memoryTurn?.messages || buildMessages(character, body.messages, 'chat');
  if (!messages.some(message => message.role === 'user')) return json(res, 400, {error:'A user message is required.'});
  const controller = new AbortController();
  const cancel = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', cancel);
  const timeout = setTimeout(() => controller.abort(), 45000);
  let mindTurn;
  try {
    // Transform the legacy prompt before appending mood, otherwise the legacy
    // taggedMessages replacement would discard the emotional context.
    if(streamChat && !memoryTurn)messages=taggedMessages(character,messages,'chat');
    mindTurn=await mind.prepare({character,messages,turnId:body.clientTurnId||crypto.randomUUID(),mode:'chat',signal:controller.signal,privateTurn:memoryTurn?.privateTurn});
    messages=mindTurn.messages;
    if(streamChat) {
      setCors(res);
      res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.flushHeaders();
      const emit=event=>{if(!controller.signal.aborted)res.write(JSON.stringify(event)+'\n');};
      const parser=new TagParser(),sentenceEvents=[];let reply='',selectedAI=aiConfig;
      const parsed=events=>{for(const raw of events){const event=mind.sentence(mindTurn,raw);if(event.type==='sentence.start'){sentenceEvents.push(event);}else reply+=event.text;emit(event);}};
      try {
        for await(const token of streamReply({...aiConfig,messages,signal:controller.signal,onProviderSelected:config=>{selectedAI=config;}},{profile:character.profile,mode:'chat'})) {
          if(controller.signal.aborted) return;
          parsed(parser.push(token));
          if(reply.length>12000)throw Error('Reply length limit exceeded.');
        }
        if(controller.signal.aborted)return;
        parsed(parser.push('',true));
        if(!reply.trim())throw Error('The model returned an empty reply.');
        let result={reply,mood:sentenceEvents[0]?.e||'neutral',intensity:sentenceEvents[0]?.i||0,model:selectedAI.model,sentenceEvents,tagStats:parser.stats};
        result=mind.result(mindTurn,result);await mind.finish(mindTurn);
        if(memoryTurn)result=memory.finish(memoryTurn,result)||result;
        emit({type:'response.complete',...result});res.end();
        if(memoryTurn)memory.afterReply(memoryTurn,result);
      } catch(error) {emit({type:'response.error',error:controller.signal.aborted?'The AI request timed out.':'The streamed reply failed. Please try again.'});res.end();}
      return;
    }
    const request = replyRequest({...aiConfig,messages},{json:true});
    const response = await fetch(request.url,{...request.options,signal:controller.signal});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json(res, response.status === 401 ? 401 : 502, {error:`${aiConfig.label} could not generate a response (HTTP ${response.status}). Check the key, model, and billing.`, code:'provider_error'});
    let assistant;
    try { assistant = parseAssistant(replyText(data,aiConfig.provider)); }
    catch (error) { return json(res,502,{error:error.message,code:'invalid_response'}); }
    if (!assistant.reply) return json(res, 502, {error:'The provider returned an empty response.', code:'empty_response'});
    let result={...assistant, model:data.model || aiConfig.model};
    result=mind.result(mindTurn,result);await mind.finish(mindTurn);
    if(memoryTurn) result=memory.finish(memoryTurn,result)||result;
    json(res,200,result);
    if(memoryTurn) memory.afterReply(memoryTurn,result);
    return;
  } catch (error) {
    return json(res, 502, {error:error?.name === 'AbortError' ? 'The AI request timed out.' : 'Could not connect to the selected provider.', code:'network_error'});
  } finally { clearTimeout(timeout); res.off('close', cancel); if(memoryTurn) memory.fail(memoryTurn); }
}
let voiceCatalogPromise;
function edgeVoices() {
  if (voiceCatalogPromise) return voiceCatalogPromise;
  voiceCatalogPromise = new Promise((resolve,reject) => {
    const script = 'import asyncio,json,edge_tts; print(json.dumps(asyncio.run(edge_tts.list_voices())))';
    const child = spawn(process.env.MIGHTY_PYTHON || '/usr/bin/python3',['-c',script],{env:{...process.env,PYTHONPATH:path.join(root,'EdgeTTS')},stdio:['ignore','pipe','ignore']});
    let output=''; const timer=setTimeout(()=>{child.kill();reject(new Error('Voice catalog timed out.'));},25000);
    child.stdout.on('data',chunk=>{output+=chunk;if(output.length>2000000)child.kill();});
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('exit',code=>{clearTimeout(timer);try {
      if(code!==0)throw new Error('Voice catalog is unavailable.');
      resolve(JSON.parse(output).map(v=>({id:v.ShortName,locale:v.Locale,name:v.ShortName.slice(v.Locale.length+1).replace(/Neural$/,'').replace(/Multilingual$/,' · Multilingual')})).filter(v=>v.id&&v.locale));
    } catch(error){reject(error);}});
  }).catch(error=>{voiceCatalogPromise=null;throw error;});
  return voiceCatalogPromise;
}
function runEdgeTts({text, voice, rate, pitch}, output, metadata) {
  return new Promise((resolve, reject) => {
    const args = [path.join(root,'edge-tts-performance.py'),'--text',text,'--voice',voice,`--rate=${rate}`,`--pitch=${pitch}`,'--audio',output,'--metadata',metadata];
    const child = spawn(process.env.MIGHTY_PYTHON || '/usr/bin/python3', args, {env:{...process.env,PYTHONPATH:path.join(root,'EdgeTTS')},stdio:['ignore','ignore','pipe']});
    let error = '';
    child.stderr.setEncoding('utf8'); child.stderr.on('data', chunk => { if (error.length < 4000) error += chunk; });
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('Speech generation timed out.')); }, 45000);
    child.on('error', err => { clearTimeout(timer); reject(err); });
    child.on('exit', code => { clearTimeout(timer); code === 0 && fs.existsSync(output) && fs.existsSync(metadata) ? resolve() : reject(new Error(error.trim() || 'Speech generation failed.')); });
  });
}
async function tts(req, res) {
  const body = await readJson(req, 32 * 1024);
  const text = clean(body.text, 5000);
  if (!text) return json(res, 400, {error:'Text is required.'});
  const speech = voiceSettings(body.profile || {voice:body.voice});
  const { voice, rate, pitch } = speech;
  const expression = sanitizeExpression(body.expression);
  if (speech.provider === 'openai' || speech.provider === 'pocket') {
    try { return json(res, 200, { ...(await (speech.provider === 'pocket' ? pocketTts : openaiTts).synthesize({ ...speech, text })), voice, expression }); }
    catch (error) { return json(res, 502, {error:error.message || 'Speech generation failed.', code:'tts_error'}); }
  }
  const id = crypto.randomUUID();
  const output = path.join(audioRoot, `${id}.mp3`);
  const metadata = path.join(audioRoot, `${id}.json`);
  try {
    await runEdgeTts({text,voice,rate,pitch}, output, metadata);
    const timeline = JSON.parse(await fs.promises.readFile(metadata,'utf8'));
    setTimeout(() => fs.unlink(output, () => {}), 10 * 60 * 1000).unref();
    setTimeout(() => fs.unlink(metadata, () => {}), 10 * 60 * 1000).unref();
    return json(res, 200, {audioId:id, voice,...timeline,expression});
  } catch (error) {
    fs.unlink(output, () => {});
    fs.unlink(metadata, () => {});
    return json(res, 502, {error:error.message || 'Could not generate speech.', code:'tts_error'});
  }
}
function serveAudio(req, res, pathname) {
  const match = pathname.match(/^\/api\/audio\/([0-9a-f-]{36})\.mp3$/i);
  if (!match) return json(res, 404, {error:'Audio not found.'});
  const wav = path.join(audioRoot, `${match[1]}.wav`);
  const file = fs.existsSync(wav) ? wav : path.join(audioRoot, `${match[1]}.mp3`);
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) return json(res, 404, {error:'Audio expired or was not found.'});
    setCors(res); res.writeHead(200, {'Content-Type':file.endsWith('.wav')?'audio/wav':'audio/mpeg','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
}
function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root,relative);
  if (!file.startsWith(root+path.sep) || (!publicFiles.has(relative) && !relative.startsWith('Companion/'))) { res.writeHead(403); return res.end(); }
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);return res.end();}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')return res.end();fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
  });
}
const server = http.createServer(async (req,res) => {
  let pathname; try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { return json(res,400,{error:'Invalid URL.'}); }
  if (req.method === 'OPTIONS') { setCors(res); res.writeHead(204); return res.end(); }
  if (pathname.startsWith('/assets/')) {
    const parts=pathname.split('/');
    const token=parts[2] || '';
    if(!/^[A-Za-z0-9_-]{43}$/.test(token) || !crypto.timingSafeEqual(Buffer.from(token),Buffer.from(apiToken)))return json(res,401,{error:'Unauthorized.'});
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed.'});
    try {
      const relative=assetPath(parts.slice(3).join('/'));
      const {file}=await characterCache.get(relative);
      const stat=await fs.promises.stat(file);
      setCors(res);res.writeHead(200,{'Content-Type':types[path.extname(relative).toLowerCase()]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'private, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
      if(req.method==='HEAD')return res.end();
      return fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    }catch(error){return json(res,502,{error:error.message});}
  }
  if (pathname.startsWith('/api/')) {
    if (!authorized(req)) return json(res,401,{error:'Unauthorized.'});
    try {
      if (pathname.startsWith('/api/memory/')) {
        if (!memory) return json(res,404,{error:'API route not found.'});
        const id = new URL(req.url,'http://127.0.0.1').searchParams.get('characterId');
        const {validId} = require('../Backend/memory/MemoryStore.cjs');
        if(req.method==='GET') {
          if(!validId(id)) return json(res,400,{error:'A character is required.'});
          if(pathname==='/api/memory/facts' || pathname==='/api/memory/export') { const state=memory.store.state(id); return json(res,200,{characterId:id,facts:memory.store.publicFacts(id),...(pathname.endsWith('/export')?{summary:{text:state.summary,throughTurnId:state.summarized_upto,contextFloor:state.context_floor||0,revision:memory.store.epoch(id)}}:{})}); }
          if(pathname==='/api/memory/card') {const profile=memory.store.profile(id);return json(res,200,{card:profile?.card||'',sourceHash:profile?.source_hash||'',compiled:!!profile&&profile.card_hash===profile.source_hash});}
        }
        if(req.method==='POST') {
          const body=await readJson(req,pathname==='/api/memory/characters'?65536:8192);
          if(pathname==='/api/memory/characters') return json(res,200,await memory.saveCharacter(body.character));
          if(!validId(body.characterId)) return json(res,400,{error:'A character is required.'});
          if(pathname==='/api/memory/edit') {await memory.editFact(body.characterId,body.factId,body.text);return json(res,200,{ok:true});}
          if(pathname==='/api/memory/delete') {memory.deleteFact(body.characterId,body.factId);return json(res,200,{ok:true});}
          if(pathname==='/api/memory/forget') {memory.forget(body.characterId);return json(res,200,{ok:true});}
        }
        return json(res,404,{error:'API route not found.'});
      }
      if (pathname.startsWith('/api/debug/perf')) {
        if (!turnTiming.enabled) return json(res,404,{error:'API route not found.'});
        if (req.method === 'POST' && pathname === '/api/debug/perf/clock') {
          const receivedMs = turnTiming.now();
          return json(res,200,{receivedMs, sentMs:turnTiming.now()});
        }
        if (req.method === 'POST' && pathname === '/api/debug/perf/sample') {
          const body = await readJson(req,8192);
          return json(res,turnTiming.importSample(body) ? 200 : 400,{});
        }
        if (req.method === 'GET' && pathname === '/api/debug/perf/export') {
          const body = Buffer.from(turnTiming.jsonLines());
          res.writeHead(200,{'Content-Type':'application/x-ndjson','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
          return res.end(body);
        }
        return json(res,404,{error:'API route not found.'});
      }
      if (req.method === 'GET' && pathname === '/api/status') return json(res,200,{anthropicConfigured:!!process.env.ANTHROPIC_API_KEY,groqConfigured:!!process.env.GROQ_API_KEY,openaiConfigured:!!process.env.OPENAI_API_KEY,provider:aiConfig.provider,ttsConfigured:true,model:aiConfig.model,memoryV1:!!memory,streamChat,idleOnly:true});
      if (req.method === 'POST' && pathname === '/api/appearance/cache') { const body=await readJson(req,8192); return json(res,200,await characterCache.prepare(body.appearance)); }
      if (req.method === 'GET' && pathname === '/api/pocket/status') return json(res,200,{packs:pocketTts.packs.status()});
      if (req.method === 'POST' && pathname === '/api/pocket/prepare') {const body=await readJson(req,2048);const speech=voiceSettings({...body.profile,ttsProvider:'pocket'});await pocketTts.packs.ensure(speech.language,speech.voice);return json(res,200,{packs:pocketTts.packs.status()});}
      if (req.method === 'GET' && pathname === '/api/voices') return json(res,200,{voices:await edgeVoices()});
      if (req.method === 'POST' && pathname === '/api/chat') return await chat(req,res);
      if (req.method === 'POST' && pathname === '/api/tts') return await tts(req,res);
      if (req.method === 'GET' && pathname.startsWith('/api/audio/')) return serveAudio(req,res,pathname);
      return json(res,404,{error:'API route not found.'});
    } catch (error) { return json(res,error.status||500,{error:error.message||'Unexpected backend error.'}); }
  }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  serveStatic(req,res,pathname);
});
const edgeTts = new EdgeTTS({audioRoot});
const openaiTts = new OpenAITTS({audioRoot});
const pocketTts = new PocketTTS({audioRoot});
const liveTts = {
  openingChoices: options => options.provider === 'edge' ? edgeTts.openingChoices(options) : [],
  warmup: options => { if (options.provider === 'pocket') pocketTts.warmup(options); else if (options.provider !== 'openai') edgeTts.warmup(); },
  synthesize: options => (options.provider === 'pocket' ? pocketTts : options.provider === 'openai' ? openaiTts : edgeTts).synthesize(options),
  cancel: id => { edgeTts.cancel(id); openaiTts.cancel(id); pocketTts.cancel(id); },
  close: () => { edgeTts.close(); openaiTts.close(); pocketTts.close(); }
};
const callTransport = attachCallTransport(server, authorized, liveTts, memory, mind);
const port = process.argv.includes('--preview') ? 20312 : 0;
server.listen(port,'127.0.0.1',()=>process.stdout.write(JSON.stringify({port:server.address().port,token:apiToken})+'\n'));
process.stdin.resume();
let closing=false;
async function shutdown() {
  if(closing)return;closing=true;
  liveTts.close();
  for (const client of callTransport.clients) client.terminate();
  // ONNX must release native work before process exit, including cold startup.
  const stopped=new Promise(resolve=>server.close(resolve));
  server.closeIdleConnections();
  await Promise.allSettled([stopped,memory?.close()]);
  process.exit(0);
}
if(!process.argv.includes('--preview'))process.stdin.on('end',shutdown);
process.on('SIGTERM',shutdown);
