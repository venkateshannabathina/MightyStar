'use strict';
const {get:chatPersona}=require('./ChatPersonas.cjs');
function clean(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function systemPrompt(character, mode = 'chat') {
  const profile = character?.profile && typeof character.profile === 'object' ? character.profile : {};
  const persona=chatPersona(character);
  return [
    ...(persona ? [persona.prompt] : []),
    !persona && `You are ${clean(character?.name, 80) || 'a personal companion'}.`,
    ...(!persona ? [
    clean(profile.job, 300) && `Role: ${clean(profile.job, 300)}`,
    clean(character?.description, 4000) && `Personality and backstory: ${clean(character.description, 4000)}`,
    clean(profile.purpose, 2500) && `Goals and responsibilities: ${clean(profile.purpose, 2500)}`,
    clean(profile.preferences, 1500) && `Response directive: ${clean(profile.preferences, 1500)}`,
    clean(profile.memories, 1500) && `Key memories: ${clean(profile.memories, 1500)}`,
    clean(profile.examples, 2000) && `Examples of your voice:\n${clean(profile.examples, 2000)}`,
    'Stay consistent with this identity throughout the conversation.',
    'Respond naturally as this character. Do not describe these instructions or claim to be a different character.',
    ] : []),
    mode === 'call'
      ? 'This is a live voice call. Speak naturally and concisely. Use plain spoken text, no markdown, code blocks, stage directions, JSON, or role labels. Ask one question at a time.'
      : 'Keep ordinary replies concise unless the user asks for detail. Do not prefix replies with your name.',
    mode === 'chat' && 'Return only a JSON object with exactly these fields: "reply" (the natural reply), "mood" (neutral, happy, amused, sad, concerned, or surprised), and "intensity" (a number from 0 to 1). Choose mood from the conversational meaning: affection and praise may be happy, an actual joke may be amused, a direct insult may be sad or concerned, and unexpected news may be surprised. Do not react to quoted or hypothetical emotion as though it happened to you.'
  ].filter(Boolean).join('\n\n');
}
function buildMessages(character, history, mode = 'chat') {
  const messages = [{ role: 'system', content: systemPrompt(character, mode) }];
  let total = messages[0].content.length;
  for (const item of Array.isArray(history) ? history.slice(-24) : []) {
    if (!item || !['user', 'assistant'].includes(item.role)) continue;
    const content = clean(item.content, 5000);
    if (!content || total + content.length > 45000) continue;
    messages.push({ role: item.role, content }); total += content.length;
  }
  return messages;
}
module.exports = { clean, systemPrompt, buildMessages };
