let settingsCharacterID = null;
const replyModels = {groq:'openai/gpt-oss-20b',openai:'gpt-4.1-mini',anthropic:'claude-sonnet-4-20250514'};
function closeCharacterSettings(){document.getElementById('characterSettings')?.remove();settingsCharacterID=null;nativeCompanion({action:'settingsVisibility',visible:false});}
async function openCharacterSettings(){
  if(selected<0)return;
  endLiveCall();exitVoiceMode();closeCharacterSettings();
  const c=contacts[selected],p=c.profile||{};settingsCharacterID=c.id;
  const panel=document.createElement('form');panel.id='characterSettings';panel.className='settings-panel';panel.setAttribute('aria-label','Character settings');
  panel.innerHTML=`<header class="settings-header"><span class="avatar photo">${characterAvatar(c)}</span><div><small>CHARACTER SETTINGS</small><h2>${escapeHTML(c.name)}</h2></div><button type="button" class="icon" aria-label="Close settings" onclick="closeCharacterSettings()">×</button></header><div class="settings-body"><section><h3>CHARACTER</h3><p>${escapeHTML(c.profile?.job||'Companion')} · ${escapeHTML(c.appearance?.name||'No appearance')}</p><p>${escapeHTML(c.description||'No personality yet.')}</p><details><summary>Details</summary><p>${escapeHTML([p.purpose,p.memories,p.greeting,p.preferences,p.examples].filter(Boolean).join('\n\n')||'No details yet.')}</p></details><button type="button" class="subtle" onclick="editCharacter()">Edit character</button></section><section><h3>VOICE</h3><div class="settings-grid"><label>Voice engine<select id="studioEngine"><option value="edge">Edge</option><option value="pocket">Pocket TTS · local</option><option value="openai">OpenAI</option></select></label><label>Voice<select id="studioVoice"></select></label><label>Speed<select id="studioSpeed">${[.75,.9,1,1.1,1.25,1.5].map(v=>`<option value="${v}">${v}×</option>`).join('')}</select></label><label>Pitch · Edge only<select id="studioPitch">${[-20,-10,0,10,20].map(v=>`<option value="${v}">${v===0?'Natural':v+' Hz'}</option>`).join('')}</select></label></div><label style="margin-top:16px">Delivery · OpenAI only<input id="studioDelivery" maxlength="500" placeholder="Warm, relaxed, conversational"></label><label style="margin-top:16px"><input id="studioSpeak" type="checkbox"> Speak replies</label><button type="button" class="subtle" id="studioPreview">Preview voice</button></section><section><h3>AI CONNECTIONS</h3><p>Shared connections. Leave keys blank to keep them.</p><div class="settings-grid"><label>Reply provider<select id="studioProvider"><option value="groq">Groq</option><option value="openai">OpenAI</option><option value="anthropic">Claude · Anthropic</option></select></label><label>Reply model<input id="studioModel" maxlength="100" required></label>${['groq','openai','anthropic'].map(id=>`<label>${id==='anthropic'?'Claude / Anthropic':id==='openai'?'OpenAI':'Groq'} API key<input type="password" id="key-${id}" autocomplete="off" placeholder="Loading status…"><small id="key-status-${id}"></small></label>`).join('')}</div><p>Claude voice needs a Groq or OpenAI key.</p></section><section><h3>VOICE SHORTCUT</h3><label>Hold to talk<select id="studioShortcut">${['Right Command','Fn','Control','Option','Shift'].map(v=>`<option>${v}</option>`).join('')}</select></label><p>Hold to speak. Release to send.</p></section></div><footer class="settings-footer"><span id="studioStatus" role="status">Loading connections…</span><button type="submit" id="studioSave" disabled>Save settings</button></footer>`;
  document.querySelector('.conversation').append(panel);nativeCompanion({action:'settingsVisibility',visible:true});
  const field=id=>document.getElementById(id);
  field('studioEngine').value=p.ttsProvider||'pocket';field('studioSpeed').value=p.voiceSpeed||1;field('studioPitch').value=p.voicePitch||0;field('studioDelivery').value=p.voiceInstructions||'';field('studioSpeak').checked=p.speak!==false;
  function voices(){const ai=field('studioEngine').value==='openai',pocket=field('studioEngine').value==='pocket';field('studioVoice').innerHTML=pocket?pocketVoices.map(([id,,,,name])=>`<option value="${id}">${name}</option>`).join(''):ai?['marin','cedar','alloy','ash','ballad','coral','echo','fable','nova','onyx','sage','shimmer','verse'].map(v=>`<option>${v}</option>`).join(''):document.getElementById('characterVoice').innerHTML;field('studioVoice').value=pocket?(p.pocketVoice||'alba'):(ai?p.openaiVoice:p.voice)||(ai?'marin':'en-US-AvaMultilingualNeural');field('studioPitch').disabled=ai||pocket;field('studioSpeed').disabled=pocket;field('studioDelivery').disabled=!ai;}
  field('studioEngine').onchange=voices;voices();
  field('studioProvider').onchange=()=>field('studioModel').value=replyModels[field('studioProvider').value];
  const profile=()=>({...p,ttsProvider:field('studioEngine').value,[field('studioEngine').value==='pocket'?'pocketVoice':field('studioEngine').value==='openai'?'openaiVoice':'voice']:field('studioVoice').value,voiceSpeed:Number(field('studioSpeed').value),voicePitch:Number(field('studioPitch').value),voiceInstructions:field('studioDelivery').value,speak:field('studioSpeak').checked});
  field('studioPreview').onclick=async()=>{field('studioStatus').textContent='Preparing voice…';try{await speakCharacterReply({...c,profile:{...profile(),speak:true}},'Hello. This is how my voice sounds.');if(field('studioStatus'))field('studioStatus').textContent='Playing preview.';}catch(e){if(field('studioStatus'))field('studioStatus').textContent=e.message;}};
  panel.onsubmit=e=>{e.preventDefault();const keys={};for(const id of ['groq','openai','anthropic']){const input=field('key-'+id);keys[id]=input.value.trim();input.value='';}field('studioSave').disabled=true;field('studioStatus').textContent='Saving…';if(!nativeCompanion({action:'saveStudioSettings',characterId:c.id,profile:profile(),provider:field('studioProvider').value,model:field('studioModel').value.trim(),shortcut:field('studioShortcut').value,keys})){field('studioStatus').textContent='Open Mighty Chat to save secure settings.';field('studioSave').disabled=false;}};
  if(!nativeCompanion({action:'studioSettingsStatus'})){field('studioStatus').textContent='Open Mighty Chat to manage secure connections.';field('studioModel').value=replyModels.groq;}
  panel.querySelector('[aria-label="Close settings"]').focus({preventScroll:true});
}
window.studioSettingsStatus=({provider,model,shortcut,keys})=>{if(!document.getElementById('characterSettings'))return;document.getElementById('studioProvider').value=provider;document.getElementById('studioModel').value=model;document.getElementById('studioShortcut').value=shortcut;for(const id of ['groq','openai','anthropic']){document.getElementById('key-'+id).placeholder=keys[id]?'Saved key':'Paste API key';document.getElementById('key-status-'+id).textContent=keys[id]?'Saved':'Not set';}document.getElementById('studioStatus').textContent='Ready';document.getElementById('studioSave').disabled=false;};
window.studioSettingsSaved=({ok,message})=>{if(!document.getElementById('characterSettings'))return;document.getElementById('studioStatus').textContent=message;document.getElementById('studioSave').disabled=false;if(ok)for(const id of ['groq','openai','anthropic'])document.getElementById('key-'+id).value='';};
function showVoiceMode(){
  if(selected<0)return;
  closeCharacterSettings();
  document.querySelector('.conversation').classList.add('voice-active');
  document.getElementById('message').tabIndex=-1;
  document.getElementById('voiceOrb').tabIndex=0;
  document.getElementById('voiceLabel').textContent='Connecting…';
}
function enterVoiceMode(){showVoiceMode();if(liveCallState==='idle'||liveCallState==='error')toggleLiveCall();else updateVoiceMode(liveCallState,document.getElementById('liveCallLabel').textContent);}
function exitVoiceMode(){
  if(!document.querySelector('.conversation').classList.contains('voice-active'))return;
  endLiveCall();document.querySelector('.conversation').classList.remove('voice-active');
  document.getElementById('message').tabIndex=0;document.getElementById('voiceOrb').tabIndex=-1;
}
function updateVoiceMode(state,label){
  const orb=document.getElementById('voiceOrb');if(!orb)return;
  document.getElementById('voiceLabel').textContent=state==='error'?(label||'Voice unavailable'):'';
  orb.setAttribute('aria-label',label||'Hold to talk');orb.disabled=state!=='active';
  orb.dataset.state=state==='error'?'error':label?.startsWith('Listening')?'listening':label?.startsWith('Speaking')?'speaking':state==='connecting'||label?.startsWith('Replying')?'thinking':'idle';
}
const voiceCircle=document.getElementById('voiceOrb');
voiceCircle.onpointerdown=e=>{voiceCircle.setPointerCapture(e.pointerId);beginLiveCallHold(e);};
voiceCircle.onpointerup=releaseLiveCallHold;voiceCircle.onpointercancel=releaseLiveCallHold;voiceCircle.onlostpointercapture=releaseLiveCallHold;
voiceCircle.onkeydown=e=>{if([' ','Enter'].includes(e.key)&&!e.repeat)beginLiveCallHold(e);};
voiceCircle.onkeyup=e=>{if([' ','Enter'].includes(e.key))releaseLiveCallHold(e);};
updateSend();
