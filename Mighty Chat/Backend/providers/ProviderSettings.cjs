'use strict';
function providerSettings(env = process.env, profile = {}) {
  if (['groq','openai','gemini','anthropic'].includes(profile?.aiProvider)) {
    env = {...env, MIGHTY_AI_PROVIDER:profile.aiProvider, MIGHTY_AI_MODEL:typeof profile.aiModel === 'string' ? profile.aiModel.trim().slice(0,200) : ''};
  }
  const provider = ['openai','anthropic','gemini'].includes(env.MIGHTY_AI_PROVIDER) ? env.MIGHTY_AI_PROVIDER : 'groq';
  const transcriptionProvider = ['anthropic','gemini'].includes(provider) ? (env.GROQ_API_KEY ? 'groq' : 'openai') : provider;
  const defaults = {gemini:['Gemini','https://generativelanguage.googleapis.com/v1beta/openai','gemini-2.5-flash'],groq:['Groq','https://api.groq.com/openai/v1',env.GROQ_MODEL || 'openai/gpt-oss-20b'],openai:['OpenAI','https://api.openai.com/v1','gpt-4.1-mini'],anthropic:['Claude','https://api.anthropic.com/v1','claude-sonnet-4-20250514']};
  const [label,baseURL,model] = defaults[provider];
  return {provider,label,baseURL,apiKey:env[provider.toUpperCase()+'_API_KEY'],model:env.MIGHTY_AI_MODEL || model,
    transcriptionProvider, transcriptionKey:env[transcriptionProvider.toUpperCase()+'_API_KEY'],
    transcriptionModel:transcriptionProvider === 'openai' ? 'gpt-4o-mini-transcribe' : 'whisper-large-v3-turbo'};
}
const voices = new Set(['marin','cedar','alloy','ash','ballad','coral','echo','fable','nova','onyx','sage','shimmer','verse']);
const { POCKET_VOICES, POCKET_LANGUAGES, pocketLanguage } = require('./PocketVoices.cjs');
function voiceSettings(profile = {}) {
  const provider = ['openai','pocket','edge'].includes(profile.ttsProvider) ? profile.ttsProvider : 'pocket';
  const bounded=(v,f,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
  const language=POCKET_LANGUAGES.includes(profile.pocketLanguage)?profile.pocketLanguage:'english';
  const speed = provider === 'pocket' ? bounded(profile.pocketSpeed,1,.75,1.25) : Number.isFinite(profile.voiceSpeed) ? Math.max(0.5, Math.min(1.5, profile.voiceSpeed)) : 1;
  const pitch = Number.isFinite(profile.voicePitch) ? Math.max(-20, Math.min(20, Math.round(profile.voicePitch))) : 0;
  const rate = Math.round((speed - 1) * 100);
  return { provider, speed, language, tone:bounded(profile.pocketPitch,0,-3,3), gain:bounded(profile.pocketVolume,1,.5,1.25), rate: `${rate >= 0 ? '+' : ''}${rate}%`, pitch: `${pitch >= 0 ? '+' : ''}${pitch}Hz`,
    voice: provider === 'pocket' ? (POCKET_VOICES.includes(profile.pocketVoice) ? profile.pocketVoice : pocketLanguage(language).defaultVoice) : provider === 'openai' ? (voices.has(profile.openaiVoice) ? profile.openaiVoice : 'marin') : (/^[a-z]{2,3}-(?:[A-Za-z0-9]{2,20}-){1,3}[A-Za-z0-9]{1,60}Neural$/.test(profile.voice || '') ? profile.voice : 'en-US-AvaMultilingualNeural'),
    instructions: typeof profile.voiceInstructions === 'string' ? profile.voiceInstructions.slice(0,500) : '' };
}
module.exports = { providerSettings, voiceSettings };
