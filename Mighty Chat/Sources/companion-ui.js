const dockOrb=new ParticleOrb(document.getElementById('dockOrb'));
function setOrbState(state){dockOrb.setState(state);nativeCompanion({action:'speech',kind:'orb',value:{state}})}
/* UI and persistence boundary. Rendering lives in the isolated Companion frame. */
const idleStyles = {male:'Male',female:'Female',dwarf2:'Female 2'};
function validIdleStyle(value) { return typeof value === 'string' && Object.prototype.hasOwnProperty.call(idleStyles,value); }
function characterIdleStyle(character) { return validIdleStyle(character?.profile?.idleStyle) ? character.profile.idleStyle : 'female'; }
let appearances = window.MIGHTY_APPEARANCES || [];
let dockFrame = null, previewFrame = null;
function validAppearance(value) {
  return window.MIGHTY_ROSTER.validAppearance(value);
}
function companionOrigin() {
  if (window.mightyCompanionOrigin) return window.mightyCompanionOrigin;
  return /^https?:$/.test(location.protocol) ? location.origin : null;
}
function detachFrame(frame) { if (frame) { frame.src = 'about:blank'; frame.remove(); } }
function mountFrame(container, appearance, title) {
  const origin = companionOrigin();
  if (!origin) {
    container.innerHTML = '<div class="companion-empty"><div class="symbol">✦</div><p>Viewer unavailable. Reopen Mighty Chat.</p></div>';
    return null;
  }
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.dataset.appearanceKey = appearance.key;
  frame._appearance = appearance;
  frame.src = origin + '/Companion/index.html';
  frame.setAttribute('referrerpolicy','no-referrer');
  frame.addEventListener('load', () => sendAppearance(frame));
  container.replaceChildren(frame);
  return frame;
}
function sendAppearance(frame) {
  const origin = companionOrigin();
  if (frame?.contentWindow && origin && validAppearance(frame._appearance)) {
    const character = contacts[selected];
    frame.contentWindow.postMessage({type:'mighty-companion-load',appearance:frame._appearance,idleStyle:characterIdleStyle(character),animationTuning:character?.profile?.animationTuning,editorSettings:character?.profile?.editorSettings,token:window.mightyBackendToken,characterId:character?.id},origin);
    if (frame === previewFrame) frame.contentWindow.postMessage({type:'mighty-companion-control',framing:'selection',reset:true},origin);
  }
}
function renderCompanion() {
  // The chat composer no longer hosts a 3D character.
  detachFrame(dockFrame); dockFrame = null;
}
function showDefaultCompanion() {
  if (companionMode !== 'overlay' || !window.mightyCompanionOrigin || selected < 0) return;
  const character = contacts[selected];
  if (validAppearance(character.appearance)) nativeCompanion({action:'view',mode:'overlay',character,playing:liveMotion,keepChatVisible:true});
}
function openCharacterEditor(index) {
  if (index < 0 || !contacts[index]) return;
  closeCharacterSettings();
  nativeCompanion({action:'editCharacter',character:contacts[index],catalog:appearances});
}
// Native drafts are committed by identity, preserving chat history and unrelated fields.
window.applyNativeCharacterEditor = draft => {
  const index = contacts.findIndex(item => item.id === draft?.id);
  if (index < 0) return {error:'This character is no longer available.'};
  if (typeof draft.name !== 'string' || !draft.name.trim() || !validAppearance(draft.appearance)) return {error:'Choose a name and a valid character.'};
  const current = contacts[index];
  const character = {...current,name:draft.name.trim().slice(0,80),description:typeof draft.description === 'string' ? draft.description : current.description,
    appearance:{...draft.appearance},series:draft.appearance.group,
    profile:{...(current.profile || {}),...(draft.profile || {})}};
  character.profile.idleStyle = characterIdleStyle(character);
  const next = [...contacts]; next[index] = character;
  try { localStorage.setItem('mightyCharacters',JSON.stringify(next)); }
  catch { return {error:'Storage is full or unavailable. Please try again.'}; }
  contacts = next; renderChats();
  if (selected === index) selectChat(index);
  return {ok:true};
};
function editCharacter() { if (selected >= 0) openCharacterEditor(selected); }
function openAISettings() {
  if (selected < 0) return;
  if (!nativeCompanion({action:'aiSettings'})) toast('AI settings are available in the Mighty Chat app.');
}
window.applyVoiceSettings = ({characterId, profile}) => {
  const index = contacts.findIndex(item => item.id === characterId);
  if (index < 0 || !profile || typeof profile !== 'object' || Array.isArray(profile)) return;
  const current = contacts[index];
  // Voice settings can remain open while the desktop idle preset changes.
  // Their older profile snapshot must not undo the current base pose.
  const character = {...current,profile:{...(current.profile || {}),...profile,animationTuning:current.profile?.animationTuning,editorSettings:current.profile?.editorSettings,idleStyle:characterIdleStyle(current)}};
  const next = [...contacts]; next[index] = character;
  try { localStorage.setItem('mightyCharacters', JSON.stringify(next)); }
  catch { toast('Could not save voice settings.'); return {error:'Could not save voice settings.'}; }
  contacts = next;
  if (contacts[selected]?.id === characterId) nativeCompanion({action:'selection',character,mode:companionMode});
  toast('Voice settings saved.');
  return {ok:true};
};
window.applyIdleStyle = ({characterId, idleStyle}) => {
  const index = contacts.findIndex(item => item.id === characterId);
  if (index < 0 || !validIdleStyle(idleStyle)) return {error:'Choose an available idle style.'};
  const character = {...contacts[index],profile:{...(contacts[index].profile || {}),idleStyle}};
  const next = [...contacts]; next[index] = character;
  try { localStorage.setItem('mightyCharacters',JSON.stringify(next)); }
  catch { toast('Could not save idle style. Please try again.'); return {error:'Could not save idle style.'}; }
  contacts = next;
  if (selected === index) {
    rendererControl({idleStyle});
    nativeCompanion({action:'selection',character,mode:companionMode});
    renderCharacterMenu();
  }
  return {ok:true};
};
function chooseIdleStyle(idleStyle) {
  if (selected >= 0) window.applyIdleStyle({characterId:contacts[selected].id,idleStyle});
}
window.previewVoiceSettings = ({profile}) => {
  const character = {...(contacts[selected] || {id:'preview'}), profile:{...profile, speak:true}};
  speakCharacterReply(character, profile.ttsProvider==='pocket'?(window.MIGHTY_POCKET_CATALOG.languages.find(l=>l.id===profile.pocketLanguage)||window.MIGHTY_POCKET_CATALOG.languages[0]).previewText:'Hello! This is a preview of my voice. How does this sound?').then(() => nativeCompanion({action:'voicePreviewStatus',text:'Playing voice preview.'})).catch(error => nativeCompanion({action:'voicePreviewStatus',text:error.message}));
};
window.configureCompanion = (origin, token) => {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')) return;
  // A backend restart changes its port and authentication token. Recreate both
  // views before sending the new session, so an old iframe cannot stay stranded.
  if (window.mightyCompanionOrigin !== origin || window.mightyBackendToken !== token) {
    detachFrame(dockFrame); dockFrame = null;
    detachFrame(previewFrame); previewFrame = null;
  }
  window.mightyCompanionOrigin = origin;
  memoryRegistered.clear();
  if (/^[A-Za-z0-9_-]{40,}$/.test(token || '')) window.mightyBackendToken = token;
  window.mightyMemoryV1=false;window.mightyStreamChat=false;
  window.mightyMemoryReady=backendRequest('/api/status').then(status=>{if(window.mightyCompanionOrigin===origin&&window.mightyBackendToken===token){window.mightyMemoryV1=status.memoryV1===true;window.mightyStreamChat=status.streamChat===true;}}).catch(()=>{if(window.mightyCompanionOrigin===origin&&window.mightyBackendToken===token){window.mightyMemoryV1=false;window.mightyStreamChat=false;}});
  renderCompanion();
  showDefaultCompanion();
  renderChats();
  if(selected>=0){document.getElementById('contactAvatar').innerHTML=characterAvatar(contacts[selected]);downloadCharacter(contacts[selected].appearance);}
  if(dockFrame)sendAppearance(dockFrame);
};

async function backendRequest(path, options = {}) {
  const origin = companionOrigin();
  if (!origin || !window.mightyBackendToken) throw new Error('The local AI backend is starting. Try again in a moment.');
  const response = await fetch(origin + path, {
    ...options,
    headers:{'Content-Type':'application/json','X-Mighty-Token':window.mightyBackendToken,...(options.headers || {})}
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The local AI backend could not complete the request.');
  return data;
}
const memoryRegistered=new Map();
window.mightyMemoryV1=false;window.mightyStreamChat=false;
function memoryProfileKey(character) {
 return JSON.stringify({id:character.id,name:character.name,description:character.description,profile:Object.fromEntries(['personaId','personaVersion','job','purpose','preferences','memories','examples','aiProvider','aiModel','aiFallbackProviders','callMaxTokens','chatMaxTokens'].map(key=>[key,character.profile?.[key]||'']))});
}
async function ensureMemoryCharacter(character) {
 const key=memoryProfileKey(character);
 if(memoryRegistered.get(character.id)===key)return;
 const result=await backendRequest('/api/memory/characters',{method:'POST',body:JSON.stringify({character})});
 character.profile={...character.profile,compiledPersonaCard:result.card,personaSourceHash:result.sourceHash};
 memoryRegistered.set(character.id,key);
}
async function streamCharacterReply(options,onEvent) {
 const response=await fetch(companionOrigin()+'/api/chat',{...options,headers:{'Content-Type':'application/json','X-Mighty-Token':window.mightyBackendToken}});
 if(!response.ok) {const data=await response.json().catch(()=>({}));throw Error(data.error||'The local AI backend could not complete the request.');}
 if(!response.headers.get('Content-Type')?.includes('application/x-ndjson')) return response.json();
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',result;
 try {
  while(true) {
   const {done,value}=await reader.read();pending+=done?decoder.decode():decoder.decode(value,{stream:true});
   if(pending.length>131072)throw Error('Reply stream limit exceeded.');
   let end;
   while((end=pending.indexOf('\n'))>=0) {
    const line=pending.slice(0,end);pending=pending.slice(end+1);if(!line)continue;
    const event=JSON.parse(line);
    if(event.type==='response.error')throw Error(event.error||'Reply failed.');
    if(event.type==='response.complete')result=event;
    else if(event.type==='assistant.delta'||event.type==='sentence.start')onEvent?.(event);
   }
   if(done)break;
  }
  if(!result||pending.trim())throw Error('The reply stream ended early. Please retry.');
  return result;
 } finally {await reader.cancel().catch(()=>{});}
}
async function requestCharacterReply(character, rows, onEvent) {
 await window.mightyMemoryReady;
 const request=options=>window.mightyStreamChat?streamCharacterReply(options,onEvent):backendRequest('/api/chat',options);
 if(window.mightyMemoryV1) {
  await ensureMemoryCharacter(character);
  const row=[...rows].reverse().find(row=>row.role==='user');
  if(!row)throw new Error('A message is required.');
  row.clientTurnId ||= globalThis.crypto?.randomUUID?.() || ('turn-'+Date.now().toString(36)+Math.random().toString(36).slice(2));
  const body=JSON.stringify({characterId:character.id,userMessage:row.text,clientTurnId:row.clientTurnId});
  if(new TextEncoder().encode(body).length>8192)throw new Error('Please shorten this message or attachment.');
  return request({method:'POST',body});
 }
 const messages = rows.filter(row => ['user','assistant'].includes(row.role)).slice(-24).map(row => ({role:row.role,content:row.text}));
 return request({method:'POST',body:JSON.stringify({character,messages})});
}
let companionOutput={volume:1,muted:false};
window.setCompanionOutput=value=>{
  if(Number.isFinite(value?.volume))companionOutput.volume=Math.max(0,Math.min(1,value.volume));
  if(typeof value?.muted==='boolean')companionOutput.muted=value.muted;
  if(characterAudio){characterAudio.volume=companionOutput.volume;characterAudio.muted=companionOutput.muted;}
};
let characterAudio = null, characterAudioUrl = null, activePerformance = null, activeSnapshot = null, speechSequence = 0, speechFrame = 0, speechGeneration = 0, lastSpeechBroadcast = 0;
let faceEnergyGraph=null;
const faceSession=globalThis.crypto?.randomUUID?.()||String(Date.now());let faceGeneration=0;
window.mightyFaceEvent=(type,character,extra={})=>{
  if(!character?.id)return;
  if(type==='text.submit'){cancelCharacterSpeech();faceGeneration++;}
  const identity=extra.identity||{sessionId:faceSession,generation:faceGeneration};
  sendSpeech('phase',{type,characterId:character.id,appearanceKey:character.appearance?.key,...extra,identity});
  return identity;
};
function sendSpeech(type, value) {
  dockOrb.speech(type,value);
  if(type==='playback')activeSnapshot=value;
  const message = {type,value};
  for(const frame of [dockFrame,previewFrame])if(frame?.contentWindow)frame.contentWindow.postMessage({type:'mighty-companion-'+type,value},companionOrigin());
  nativeCompanion({action:'speech',kind:type,value});
}
async function createSpeechEnergy(audio) {
  const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return null;
  const context=createSpeechEnergy.context??=new Context();
  // A blocked AudioContext must never silence the normal HTML audio route.
  try{await context.resume();}catch{return null;}if(context.state!=='running')return null;
  const source=context.createMediaElementSource(audio),analyser=context.createAnalyser();
  analyser.fftSize=1024;const samples=new Float32Array(analyser.fftSize);
  source.connect(analyser);analyser.connect(context.destination);let closed=false;
  return {read(){if(closed)return 0;analyser.getFloatTimeDomainData(samples);let sum=0;for(const x of samples)if(Number.isFinite(x))sum+=x*x;return Math.min(1,Math.sqrt(Math.max(0,(Math.sqrt(sum/samples.length)-.008)*6)));},close(){if(closed)return;closed=true;source.disconnect();analyser.disconnect();}};
}
function playbackSnapshot(state) {
  if (!activePerformance) return;
  let energy;
  if(faceEnergyGraph)energy=state==='speaking'?faceEnergyGraph.read():0;
  sendSpeech('playback',{utteranceId:activePerformance.utteranceId,characterId:activePerformance.characterId,sequence:++speechSequence,positionSeconds:characterAudio?.currentTime||0,playbackRate:characterAudio?.playbackRate||1,state,...(energy===undefined?{}:{energy})});
}
function speechTick(now) {
  if (!characterAudio || !activePerformance || characterAudio.paused || characterAudio.ended) return;
  if (now-lastSpeechBroadcast >= 50) {lastSpeechBroadcast=now;playbackSnapshot('speaking');}
}
function cancelCharacterSpeech(state='cancelled') {
  speechGeneration++;
  clearInterval(speechFrame);
  if (activePerformance) {playbackSnapshot(state);if(activePerformance.identity)sendSpeech('phase',{type:state==='error'?'error':'cancel',characterId:activePerformance.characterId,identity:activePerformance.identity});}
  const audio=characterAudio,url=characterAudioUrl;
  characterAudio=null;characterAudioUrl=null;activePerformance=null;
  faceEnergyGraph?.close();faceEnergyGraph=null;
  if(audio){audio.pause();audio.src='';}
  if(url)URL.revokeObjectURL(url);
}
async function speakCharacterReply(character, text, expression={mood:'neutral',intensity:0}, sentenceEvents=[], faceIdentity, onEnded) {
  window.mightyFaceEvent?.('response.complete',character,{identity:faceIdentity,expression});
  if (character?.profile?.speak === false || !text) {window.mightyFaceEvent?.('audio.complete',character,{identity:faceIdentity});return;}
  cancelCharacterSpeech();
  const generation=++speechGeneration;
  const data = await backendRequest('/api/tts',{method:'POST',body:JSON.stringify({text,profile:character?.profile || {},expression})});
  if(generation!==speechGeneration)return;
  const response = await fetch(companionOrigin() + `/api/audio/${data.audioId}.mp3`,{headers:{'X-Mighty-Token':window.mightyBackendToken}});
  if (!response.ok) throw new Error('The generated voice could not be loaded.');
  const blob = await response.blob();
  if(generation!==speechGeneration)return;
  const url=URL.createObjectURL(blob),audio=new Audio(url),utteranceId=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;

  characterAudioUrl=url;characterAudio=audio;audio.volume=companionOutput.volume;audio.muted=companionOutput.muted;
  // Analysing audio happens during playback, never as a synthesis prerequisite.
  void createSpeechEnergy(audio).then(graph=>{if(characterAudio!==audio)graph?.close();else faceEnergyGraph=graph;}).catch(()=>{});
  activePerformance={version:1,utteranceId,characterId:character.id,appearanceKey:character.appearance?.key||'',identity:faceIdentity,durationSeconds:Number(data.durationSeconds)||0,quality:data.quality||'audio-only',text,words:Array.isArray(data.words)?data.words:[],mouthCues:Array.isArray(data.mouthCues)?data.mouthCues:[],expression:data.expression||expression};
  sendSpeech('performance',activePerformance);playbackSnapshot('ready');
  audio.addEventListener('play',()=>{playbackSnapshot('speaking');clearInterval(speechFrame);speechFrame=setInterval(()=>speechTick(performance.now()),50)});
  audio.addEventListener('pause',()=>{if(!audio.ended)playbackSnapshot('paused')});
  audio.addEventListener('ended',()=>{onEnded?.();playbackSnapshot('ended');clearInterval(speechFrame);if(characterAudio===audio){faceEnergyGraph?.close();faceEnergyGraph=null;characterAudio=null;characterAudioUrl=null;activePerformance=null}URL.revokeObjectURL(url)},{once:true});
  audio.addEventListener('error',()=>{playbackSnapshot('error');cancelCharacterSpeech('error')},{once:true});
  try{await audio.play();}catch(error){cancelCharacterSpeech('error');throw error;}
}
window.speakSavedMessage = index => {
  if (selected < 0) return;
  const row = (saved[contacts[selected].id] || [])[index];
  if (row?.role === 'assistant') speakCharacterReply(contacts[selected],row.text,row.expression,row.meta?.sentenceEvents).catch(error=>{window.mightyFaceEvent?.('error',contacts[selected]);toast(error.message);});
};
window.cancelCharacterSpeech=cancelCharacterSpeech;
window.addEventListener('message', event => {
  if (event.origin !== companionOrigin()) return;
  const frame = [dockFrame,previewFrame].find(item => item && event.source === item.contentWindow);
  if (!frame) return;
  if(event.data?.type!=='mighty-companion-state')return;
  if (event.data.state === 'booted') sendAppearance(frame);
  frame.dataset.state = event.data.state;
});
const viewNames = {standard:'Chat',overlay:'Overlay',portrait:'Portrait',player:'Player View',screensaver:'Screensaver',holographic:'Holographic'};
const cameraModes = ['overlay','portrait','player','screensaver','holographic'];
let companionMode = 'overlay', liveMotion = true;
function cycleCameraMode() {
  if (selected < 0) return;
  if (!validAppearance(contacts[selected].appearance)) { editCharacter(); return; }
  const current = cameraModes.indexOf(companionMode);
  const next = cameraModes[(current + 1) % cameraModes.length];
  chooseViewMode(next);
  toast(`${viewNames[next]} companion view`);
}
function toggleCharacterMenu() {
  if(selected < 0) return;
  const menu = document.getElementById('characterMenu');
  const open = menu.classList.contains('hidden');
  menu.classList.toggle('hidden',!open);
  document.getElementById('modeTrigger').setAttribute('aria-expanded',String(open));
  document.getElementById('dockOrb').setAttribute('aria-expanded',String(open));
  if(open) renderCharacterMenu();
}
function closeCharacterMenu() { document.getElementById('dockOrb').setAttribute('aria-expanded','false'); document.getElementById('characterMenu').classList.add('hidden'); document.getElementById('modeTrigger').setAttribute('aria-expanded','false'); }
function rendererControl(data) { if(dockFrame?.contentWindow) dockFrame.contentWindow.postMessage({type:'mighty-companion-control',...data},companionOrigin()); }
function renderCharacterMenu() {
  const character = contacts[selected]; if(!character) return;
  const idleStyle = characterIdleStyle(character);
  document.getElementById('characterMenu').innerHTML = `<strong>${escapeHTML(character.name)}</strong><small>${liveMotion?'Idle animation':'Motion paused'} · ${viewNames[companionMode]}</small><button onclick="askCharacter()">Ask <span>Open chat</span></button><button onclick="toggleLiveMotion()">Live action <span>${liveMotion?'Pause idle':'Resume idle'}</span></button><div class="menu-label" id="idleStyleLabel">IDLE BASE POSE</div><div class="idle-style-options" role="group" aria-labelledby="idleStyleLabel">${Object.entries(idleStyles).map(([id,label])=>`<button aria-pressed="${idleStyle===id}" title="${id==='dwarf2'?'Dwarf Idle-2':label+' idle'}" onclick="chooseIdleStyle('${id}')">${label}</button>`).join('')}</div><small class="idle-style-note">Looping idle animation.</small><div class="menu-label">VIEW MODE</div><div class="view-options">${Object.entries(viewNames).map(([key,label])=>`<button aria-pressed="${companionMode===key}" onclick="chooseViewMode('${key}')">${label}</button>`).join('')}</div><button onclick="rendererControl({reset:true});closeCharacterMenu()">Reset character view</button><button onclick="closeCharacterMenu();editCharacter()">Character settings</button><p>Drag to rotate · Shift-drag to move<br>Scroll to zoom · Double-click to reset</p>`;
}
function syncModeLabel() { nativeCompanion({action:'modeStatus',mode:companionMode}); document.getElementById('modeTrigger').innerHTML = `${viewNames[companionMode]} · ${liveMotion?'Idle':'Paused'} <span>⌄</span>`; }
function toggleLiveMotion() { liveMotion=!liveMotion;rendererControl({playing:liveMotion});nativeCompanion({action:'motion',playing:liveMotion});syncModeLabel();renderCharacterMenu(); }
function nativeCompanion(payload) { if(window.webkit?.messageHandlers?.companion) {window.webkit.messageHandlers.companion.postMessage(payload);return true;} return false; }
function chooseViewMode(mode) {
  if(mode==='docked')mode='overlay';
  if(!(mode in viewNames)||selected<0)return;
  if(mode==='standard') {nativeCompanion({action:'close'});companionMode=mode;setView(mode);}
  else {
    if(!validAppearance(contacts[selected].appearance)){closeCharacterMenu();editCharacter();return;}
    if(!nativeCompanion({action:'view',mode,character:contacts[selected],playing:liveMotion})){toast('Desktop views are available in the Mighty Chat app.');return;}
    setView('standard');companionMode=mode;
    document.getElementById('camera').classList.add('on');
    document.getElementById('camera').setAttribute('aria-pressed','true');
  }
  syncModeLabel();closeCharacterMenu();
}
function askCharacter() {chooseViewMode('standard');document.getElementById('message').focus();}
window.companionDidClose = () => {companionMode='standard';syncModeLabel();};
window.companionHostAction = action => { if(action==='settings') {editCharacter();} else if(action==='docked'){chooseViewMode('overlay');} else {askCharacter();showTextMode();if(action==='file')document.getElementById('attachmentInput').click();} };
window.addEventListener('message',event=>{if(event.origin===companionOrigin()&&event.source===dockFrame?.contentWindow&&event.data?.type==='mighty-companion-menu')toggleCharacterMenu();if(event.origin===companionOrigin()&&event.source===dockFrame?.contentWindow&&event.data?.state==='ready')rendererControl({playing:liveMotion,idleStyle:characterIdleStyle(contacts[selected])});});
document.addEventListener('click',event=>{if(!event.target.closest('#characterMenu,#modeTrigger,#contactAvatar,#dockOrb,#camera,button[aria-label="Companion view modes"]'))closeCharacterMenu();});

window.setCompanionMotion = value => {liveMotion=value;rendererControl({playing:value});syncModeLabel();};

// One download per appearance per backend session; the backend owns durable files.
const characterDownloads = new Map();
function downloadCharacter(appearance) {
  if(!validAppearance(appearance)||!window.mightyBackendToken)return;
  const key=window.mightyCompanionOrigin+'|'+appearance.key;
  
  const targetKey=appearance.key;
  function status(text){
    if(contacts[selected]?.appearance?.key===targetKey){const label=document.getElementById('characterDownload');if(label)label.textContent=text;}
  }
  if(characterDownloads.has(key))return characterDownloads.get(key).then(ok=>{if(ok)status('Saved on this Mac');return ok;});
  status(appearance.directory.startsWith('local/') ? 'Preparing…' : 'Downloading…');
  const work=backendRequest('/api/appearance/cache',{method:'POST',body:JSON.stringify({appearance})})
    .then(()=>{status('Saved on this Mac');return true;})
    .catch(()=>{status('Download failed · select to retry');characterDownloads.delete(key);return false;});
  characterDownloads.set(key,work);return work;
}

function characterPortraitURL(url) {
  if(url === 'local/chars/hailey/portrait.jpeg') {
    return window.mightyBackendToken && companionOrigin() ? companionOrigin()+'/assets/'+window.mightyBackendToken+'/'+url : 'Characters/hailey/portrait.jpeg';
  }
  if(!window.mightyBackendToken||!companionOrigin())return url;
  try{const parsed=new URL(url);if(parsed.origin!=='https://phoshco.github.io')return url;return companionOrigin()+'/assets/'+window.mightyBackendToken+parsed.pathname;}catch{return url;}
}

window.companionModeChanged=({mode})=>{if(mode in viewNames){companionMode=mode;syncModeLabel();}};


// Native v0.1 startup selects an existing identity; secrets never enter this bridge.
window.mightyLaunchOnboardedCharacter = ({character,provider,model}) => {
  if (!window.mightyCompanionOrigin || !['evelyn','lynae','lucy','rover'].includes(character) || !['groq','openai','anthropic','gemini'].includes(provider)) return false;
  const index=contacts.findIndex(c=>c.profile?.personaId===character);
  if(index<0)return false;
  contacts[index].profile={...contacts[index].profile,aiProvider:provider,aiModel:model};
  try{localStorage.setItem('mightyCharacters',JSON.stringify(contacts));}catch{return false;}
  selectChat(index);chooseViewMode('overlay');return true;
};
