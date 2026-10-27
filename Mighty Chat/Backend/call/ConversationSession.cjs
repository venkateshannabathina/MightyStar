'use strict';
const {get:chatPersona}=require('../history/ChatPersonas.cjs');
const { turnTiming } = require('../performance/TurnTiming.cjs');
const { buildMessages, clean } = require('../history/ContextBuilder.cjs');
const { streamGroq } = require('../providers/GroqLLM.cjs');
const { streamReply } = require('../providers/ReplyStream.cjs');
const { TagParser } = require('./TagParser.cjs');
const { taggedMessages } = require('./TaggedPrompt.cjs');
const { PhraseChunker } = require('./PhraseChunker.cjs');
const { openingPrompt, OpeningTextGate, VoiceOpeningChunker, normalize } = require('./VoiceOpenings.cjs');
const { voiceSettings } = require('../providers/ProviderSettings.cjs');
const { PhraseScheduler } = require('./PhraseScheduler.cjs');

class ConversationSession {
  constructor({ character, send, apiKey, model, tts, provider = 'groq', stream = streamGroq, memory = null, mind = null }) {
    this.memory = memory;
    this.mind = mind;
    this.character = character && typeof character === 'object' ? character : {};
    this.send = send;
    this.apiKey = apiKey;
    this.model = model; this.provider = provider;
    this.stream = stream;
    this.tts = tts;
    this.controller = null;
    this.scheduler = null;
    this.generation = 0;
    this.recentOpenings = [];
  }
  advance(generation) { if(this.memoryTurn) {this.memory?.fail(this.memoryTurn);this.memoryTurn=null;} this.controller?.abort(); this.controller = null; this.scheduler?.cancel(); this.scheduler = null; this.generation = generation; }
  warmSpeech() {
    try { this.tts?.warmup?.(voiceSettings(this.character?.profile)); } catch {}
  }
  close() { this.advance(this.generation + 1); }
  ackChunk(index) { this.scheduler?.ack(index); }

  async turn(identity, text, history) {
    if (identity.generation !== this.generation) return;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const input = clean(text, this.memory ? 7000 : 5000);
    if (!input) { this.send('response.error', identity, { error: 'A user message is required.' }); return; }
    let memoryTurn, messages;
    try {
      if(this.memory) {
        memoryTurn=await this.memory.prepare({characterId:identity.characterId,clientTurnId:identity.turnId,userMessage:input},'call');
        if(memoryTurn.cached) {if(process.env.MIGHTY_STREAM_CHAT==='1')for(const event of memoryTurn.cached.sentenceEvents||[])this.send('sentence.start',identity,event);this.send('assistant.delta',identity,{text:memoryTurn.cached.reply});this.send('response.complete',identity,{text:memoryTurn.cached.reply,...(memoryTurn.cached.expression?{expression:memoryTurn.cached.expression}:{})});this.send('speech.audio.complete',identity);return;}
        if(controller.signal.aborted || identity.generation!==this.generation){this.memory.fail(memoryTurn);return;}
        this.memoryTurn=memoryTurn;
        if(memoryTurn.retrievalTimedOut)turnTiming.mark(identity, 'memory_retrieval_timeout');
        messages=memoryTurn.messages;
      } else {messages=buildMessages(this.character,history,'call');messages.push({role:'user',content:input});}
    } catch(error) {this.send('response.error',identity,{error:error.status ? error.message : 'Memory context is unavailable.'});return;}

    const tagged = process.env.MIGHTY_STREAM_CHAT === '1';
    if(tagged && !this.memory) messages=taggedMessages(this.character,messages,'call');
    let mindTurn;
    if(this.mind) {
      try {
        mindTurn=await this.mind.prepare({character:memoryTurn?.character||this.character,messages,turnId:identity.turnId,mode:'call',signal:controller.signal,privateTurn:memoryTurn?.privateTurn});
        messages=mindTurn.messages;
        if(controller.signal.aborted || identity.generation!==this.generation){this.memory?.fail(memoryTurn);return;}
      } catch(error) {this.memory?.fail(memoryTurn);this.send('response.error',identity,{error:'Emotional context is unavailable. Please retry.'});return;}
    }
    const parser = tagged ? new TagParser() : null;
    const sentenceEvents = [];
    let phraseCursor=0;
    const speech = voiceSettings(this.character?.profile);
    const choices = chatPersona(this.character) ? [] : (this.tts?.openingChoices?.(speech) || []);
    const prior = messages.filter(m=>m.role==='assistant').flatMap(m=>choices.filter(c=>normalize(m.content).startsWith(normalize(c.text))).map(c=>c.text));
    const recent = [...new Set([...prior,...this.recentOpenings])].slice(-6);
    if(choices.length) messages=messages.map((m,index)=>index===0?{...m,content:m.content+'\n\n'+openingPrompt(choices,recent)}:m);
    const openingGate = choices.length ? new OpeningTextGate(choices) : null;
    const chunker = choices.length ? new VoiceOpeningChunker(choices) : new PhraseChunker(speech.provider === 'pocket' ? {timedAfterMs:Infinity} : {firstPhraseFast:true});
    const voice = speech.voice;
    let speechFailed = false;
    const scheduler = this.tts ? new PhraseScheduler({ tts: this.tts, voice, options: { ...speech, ...(turnTiming.enabled ? { onFirstByte: () => { if (!controller.signal.aborted && identity.generation === this.generation) turnTiming.mark(identity, 'tts_first_byte'); } } : {}) },
      onReady: chunk => { if (!controller.signal.aborted && identity.generation === this.generation) { turnTiming.mark(identity, 'tts_audio_ready'); this.send('speech.chunk.ready', identity, {...chunk,...(mindTurn?{expression:mindTurn.expression||{mood:mindTurn.nativeLabel,intensity:mindTurn.intensity}}:{})}); } },
      onError: error => {
        speechFailed = true;
        if (!controller.signal.aborted && identity.generation === this.generation) {
          this.send('response.error', identity, { stage: 'speech', error: 'Voice playback failed. Your reply is available in chat. ' + error.message });
          this.send('speech.audio.complete', identity);
        }
      },
      onDrained: () => { if (!controller.signal.aborted && identity.generation === this.generation) this.send('speech.audio.complete', identity); }
    }) : null;
    this.scheduler = scheduler;
    let fullText = '';
    let sentenceProbe = '';
    let sentenceMeasured = false;
    const emitPhrase = phrase => {
      turnTiming.mark(identity, 'first_phrase_emitted');
      this.send('speech.phrase', identity, phrase);
    };
    const cleanTokens = async function* (source) {
      for await(const token of source) {
        if(controller.signal.aborted || identity.generation!==this.generation)return;
        turnTiming.mark(identity, 'llm_first_token');
        if(!parser) {const visible=openingGate?openingGate.push(token):token;if(visible)yield visible;continue;}
        for(const raw of parser.push(token)) {const event=this.mind?.sentence(mindTurn,raw)||raw;if(event.type==='sentence.start'){sentenceEvents.push(event);this.send(event.type,identity,event);}else {const visible=openingGate?openingGate.push(event.text):event.text;if(visible)yield visible;}}
      }
      if(controller.signal.aborted || identity.generation!==this.generation)return;
      if(parser) for(const raw of parser.push('',true)) {const event=this.mind?.sentence(mindTurn,raw)||raw;if(event.type==='sentence.start'){sentenceEvents.push(event);this.send(event.type,identity,event);}else {const visible=openingGate?openingGate.push(event.text):event.text;if(visible)yield visible;}}
      if(openingGate) {const tail=openingGate.push('',true);if(tail)yield tail;}
    }.bind(this);
    try {
      for await (const token of cleanTokens(streamReply({ apiKey: this.apiKey, model: this.model, provider: this.provider, messages, signal: controller.signal, ...(turnTiming.enabled ? { onRequestSent: () => turnTiming.mark(identity, 'llm_request_sent') } : {}) }, {profile:memoryTurn?.character?.profile||this.character.profile,mode:'call',stream:this.stream}))) {
        if (controller.signal.aborted || identity.generation !== this.generation) return;
        turnTiming.mark(identity, 'llm_first_token');
        if (turnTiming.enabled && !sentenceMeasured) {
          sentenceProbe += token;
          // Reuse production sentence rules, excluding timed/clause flushes.
          const probe = new PhraseChunker({ timedAfterMs: Infinity, maxPhrase: 12001, maxPending: 24000 });
          if (probe.push(sentenceProbe).length) {
            turnTiming.mark(identity, 'first_sentence_end'); sentenceMeasured = true; sentenceProbe = '';
          }
        }
        fullText += token;
        if (fullText.length > 12000) throw new Error('Reply length limit exceeded.');
        this.send('assistant.delta', identity, { text: token });
        for (const phrase of chunker.push(token)) {
          emitPhrase(phrase);
          if (scheduler && !speechFailed && !await scheduler.enqueueWhenReady(phrase) && !speechFailed) return;
        }
      }
      if (controller.signal.aborted || identity.generation !== this.generation) return;
      if (turnTiming.enabled && !sentenceMeasured && sentenceProbe.trim()) {
        turnTiming.mark(identity, 'first_sentence_end');
      }
      for (const phrase of chunker.push('', Date.now(), true)) {
        emitPhrase(phrase);
        if (scheduler && !speechFailed && !await scheduler.enqueueWhenReady(phrase) && !speechFailed) return;
      }
      if (!fullText.trim()) throw new Error('The model returned an empty reply. Try another reply model in AI settings.');
      if(openingGate?.opening) this.recentOpenings=[...this.recentOpenings.filter(x=>x!==openingGate.opening.text),openingGate.opening.text].slice(-6);
      await this.mind?.finish(mindTurn);
      if(memoryTurn) this.memory.finish(memoryTurn,this.mind?.result(mindTurn,{reply:fullText,...(tagged?{sentenceEvents,tagStats:parser.stats}: {})})||{reply:fullText,...(tagged?{sentenceEvents,tagStats:parser.stats}: {})});
      turnTiming.mark(identity, 'response_complete');
      this.send('response.complete', identity, { text: fullText, ...(mindTurn?{expression:mindTurn.expression||{mood:mindTurn.nativeLabel,intensity:mindTurn.intensity}}:{}), ...(tagged?{sentenceEvents,tagStats:parser.stats}: {}) });
      if (scheduler && !speechFailed) scheduler.finish();
      else this.send('speech.audio.complete', identity);
      if(memoryTurn) this.memory.afterReply(memoryTurn,{reply:fullText});
    } catch (error) {
      scheduler?.cancel();
      if (!controller.signal.aborted && identity.generation === this.generation) {
        this.send('response.error', identity, { error: error.message || 'Reply failed.' });
      }
    } finally {
      if(memoryTurn) {this.memory.fail(memoryTurn);if(this.memoryTurn===memoryTurn)this.memoryTurn=null;}
      if (this.controller === controller) this.controller = null;
    }
  }
}

module.exports = { ConversationSession };
