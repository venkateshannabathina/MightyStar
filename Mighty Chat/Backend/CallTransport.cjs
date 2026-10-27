'use strict';
const { turnTiming } = require('./performance/TurnTiming.cjs');
const { providerSettings } = require('./providers/ProviderSettings.cjs');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer } = require('./vendor/ws');
const { ConversationSession } = require('./call/ConversationSession.cjs');
const { MAX_PCM_BYTES, transcribeGroq } = require('./providers/GroqBatchSTT.cjs');
const sourceProtocol = path.join(__dirname, '..', 'Shared', 'CallProtocol.cjs');
const protocol = require(fs.existsSync(sourceProtocol) ? sourceProtocol : path.join(__dirname, '..', 'Resources', 'Shared', 'CallProtocol.cjs'));

function attachCallTransport(server, authorized, tts, memory = null, mind = null) {
  const defaultConfig = providerSettings();
  const sockets = new Set();
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: protocol.MAX_CONTROL_BYTES });

  server.on('upgrade', (request, socket, head) => {
    let pathname;
    try { pathname = new URL(request.url, 'http://127.0.0.1').pathname; } catch { socket.destroy(); return; }
    if (pathname !== '/api/call' || !authorized(request)) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws));
  });

  wss.on('connection', ws => {
    sockets.add(ws);
    let session = null;
    let incomingSequence = -1;
    let outgoingSequence = 0;
    const send = (type, identity, fields = {}) => {
      if (ws.readyState !== ws.OPEN) return;
      ws.send(JSON.stringify({ version: 2, type, eventId: randomUUID(), sequence: outgoingSequence++, identity, ...fields }));
    };
    async function commitInput(identity) {
      const input = session.input;
      session.input = null;
      const controller = new AbortController();
      session.stt?.abort();
      session.stt = controller;
      try {
        const text = await transcribeGroq({ pcm: Buffer.concat(input.chunks, input.size), sampleRate: input.sampleRate,
          language: input.language, apiKey: session.config.transcriptionKey, provider: session.config.transcriptionProvider, model: session.config.transcriptionModel, signal: controller.signal });
        if (controller.signal.aborted || session?.generation !== identity.generation) return;
        turnTiming.mark(identity, 'stt_done');
        if (!text) { send('transcript.empty', identity); return; }
        send('transcript.final', identity, { text });
        await session.conversation.turn(identity, text, input.history);
      } catch (error) {
        if (!controller.signal.aborted && session?.generation === identity.generation) send('response.error', identity, { error: error.message || 'Transcription failed.' });
      } finally {
        if (session?.stt === controller) session.stt = null;
      }
    }
    ws.on('message', (bytes, isBinary) => {
      if (isBinary) {
        const input = session?.input;
        if (!input || bytes.length === 0 || bytes.length > 32768 || input.generation !== session.generation || input.size + bytes.length > input.totalBytes) {
          ws.close(1008, 'Invalid audio frame'); return;
        }
        input.chunks.push(Buffer.from(bytes)); input.size += bytes.length;
        return;
      }
      if (bytes.length > protocol.MAX_CONTROL_BYTES) { ws.close(1009, 'Invalid control frame'); return; }
      let message;
      try { message = JSON.parse(bytes.toString('utf8')); } catch { ws.close(1007, 'Invalid JSON'); return; }
      if (!protocol.envelope(message) || message.sequence <= incomingSequence) { ws.close(1008, 'Invalid envelope'); return; }
      incomingSequence = message.sequence;
      const id = message.identity;
      if (message.type === 'session.open') {
        if (session || id.generation !== 0) { ws.close(1008, 'Session already opened'); return; }
        if(memory && message.character) { try { void memory.saveCharacter({...message.character,id:id.characterId},{compile:false}).catch(()=>{}); } catch { ws.close(1008,'Invalid character'); return; } }
        const storedCharacter = memory?.store.profile(id.characterId)?.character;
        const character = message.character || storedCharacter;
        const config = character?.profile ? providerSettings(process.env,character.profile) : defaultConfig;
        session = { config, sessionId: id.sessionId, characterId: id.characterId, generation: 0, input: null, stt: null,
          conversation: new ConversationSession({ character, send, memory, mind, apiKey: config.apiKey, model: config.model, provider: config.provider, tts }) };
        session.conversation.warmSpeech();
        send('session.ready', id);
        return;
      }
      if (!session || id.sessionId !== session.sessionId || id.characterId !== session.characterId) { ws.close(1008, 'Unknown session'); return; }
      if (message.type === 'generation.advance') {
        if (id.generation <= session.generation) { ws.close(1008, 'Stale generation'); return; }
        session.generation = id.generation;
        session.input = null;
        session.stt?.abort(); session.stt = null;
        session.conversation.advance(id.generation);
        session.conversation.warmSpeech();
        send('generation.accepted', id);
      } else if (message.type === 'input.begin') {
        if(memory && ((message.characterId && message.characterId!==id.characterId) || (message.clientTurnId && message.clientTurnId!==id.turnId))) {ws.close(1008,'Invalid turn identity');return;}
        if (id.generation !== session.generation || session.input || !Number.isInteger(message.sampleRate) || message.sampleRate < 8000 || message.sampleRate > 96000 ||
            !Number.isInteger(message.totalBytes) || message.totalBytes < 2 || message.totalBytes > MAX_PCM_BYTES || message.totalBytes % 2 ||
            message.totalBytes / (message.sampleRate * 2) > 30 || message.format !== 'pcm16le') { ws.close(1008, 'Invalid input'); return; }
        session.input = { identity: id, generation: id.generation, sampleRate: message.sampleRate, totalBytes: message.totalBytes,
          language: message.language, history: message.history, size: 0, chunks: [] };
      } else if (message.type === 'input.commit') {
        if (!session.input || id.generation !== session.generation || id.turnId !== session.input.identity.turnId || session.input.size !== session.input.totalBytes) {
          ws.close(1008, 'Incomplete input'); return;
        }
        turnTiming.mark(id, 'input_commit');
        void commitInput(id);
      } else if (message.type === 'turn.text') {
        const text = memory ? (message.userMessage ?? message.text) : message.text;
        if (memory && ((message.characterId && message.characterId !== id.characterId) || (message.clientTurnId && message.clientTurnId !== id.turnId))) { ws.close(1008,'Invalid turn identity'); return; }
        if (id.generation !== session.generation || typeof text !== 'string' || !text.trim() || text.length > 5000) { ws.close(1008, 'Invalid turn'); return; }
        turnTiming.mark(id, 'input_commit');
        void session.conversation.turn(id, text, message.history);
      } else if (message.type === 'playback.progress') {
        if (id.generation !== session.generation || !Number.isInteger(message.chunkIndex) || message.chunkIndex < 0) { ws.close(1008, 'Invalid playback progress'); return; }
        session.conversation.ackChunk(message.chunkIndex);
      } else if (message.type === 'session.close') {
        ws.close(1000, 'Call ended');
      } else {
        ws.close(1008, 'Unsupported call message');
      }
    });
    ws.on('close', () => { session?.stt?.abort(); session?.conversation.close(); sockets.delete(ws); session = null; });
    ws.on('error', () => { session?.stt?.abort(); session?.conversation.close(); sockets.delete(ws); session = null; });
  });
  server.on('close', () => { for (const ws of sockets) ws.terminate(); wss.close(); });
  return wss;
}

module.exports = { attachCallTransport };
