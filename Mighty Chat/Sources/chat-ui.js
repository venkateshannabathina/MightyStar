/* Conversation state and native voice bridge. The presentation is owned by mightystar-ui.js. */
function readStored(key, fallback) { try { const v=JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } }
let contacts=readStored('mightyCharacters',[]); if(!Array.isArray(contacts))contacts=[];
const rosterContacts=window.MIGHTY_CHAT_PERSONAS.migrate(contacts,window.MIGHTY_ROSTER.appearances);
if(JSON.stringify(contacts)!==JSON.stringify(rosterContacts)){
 // Persist the backup first. A failed write must not destroy the only old roster.
 try{
  if(!localStorage.getItem('mightyChatRosterBackupV1'))localStorage.setItem('mightyChatRosterBackupV1',JSON.stringify(contacts));
  localStorage.setItem('mightyCharacters',JSON.stringify(rosterContacts));
 }catch{}
}
contacts=rosterContacts;
try{const last=localStorage.getItem('mightyLastCharacter');if(last&&!contacts.some(character=>character.id===last))localStorage.removeItem('mightyLastCharacter');}catch{}
let saved=readStored('mightyCharacterMessages',{});if(!saved||Array.isArray(saved)||typeof saved!=='object')saved={};
let selected=-1, filter='All', section='Chats', view='standard', preferred='overlay';
const pendingReplies=new Set(), drafts=readStored('mightyDrafts',{});
let liveCallState='idle',liveCallHolding=false,liveCallCharacterId=null,pointerHolding=false;
let attachment=null, timer;
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function characterAvatar(c){return c?.appearance?.portrait?`<img src="${escapeHTML(characterPortraitURL(c.appearance.portrait))}" alt="" referrerpolicy="no-referrer">`:escapeHTML(c?.name?.slice(0,1).toUpperCase()||'✦');}
function renderChats(){
 if(typeof renderSidebarRail==='function')renderSidebarRail();
 const query=document.getElementById('search').value.trim().toLowerCase();
 const matches=contacts.map((c,i)=>({c,i})).filter(({c})=>!query||c.name.toLowerCase().includes(query)||(saved[c.id]||[]).some(m=>String(m.text).toLowerCase().includes(query)));
 document.getElementById('chats').innerHTML=matches.map(({c,i})=>{const rows=saved[c.id]||[],last=rows.filter(m=>m.role!=='error').at(-1);return `<button class="chat ${i===selected&&!document.getElementById('shell').classList.contains('is-home')?'selected':''}" aria-current="${i===selected?'true':'false'}" onclick="selectChat(${i})">${c.unread?'<span class="unread-dot"></span>':''}<span class="avatar photo" style="background:${/^#[a-f\d]{3,8}$/i.test(c.color)?c.color:'#c2cad7'}">${characterAvatar(c)}</span><span class="chat-text"><span class="chat-top"><span class="chat-name">${escapeHTML(c.name)}</span><span class="time">${escapeHTML(last?.date?relativeDate(last.date):c.time||'')}</span></span><span class="preview">${escapeHTML(previewText(last?.text||c.preview||c.profile?.job||'Start a conversation'))}</span></span></button>`}).join('')||`<div class="empty">${contacts.length?'No conversations found.':'No saved characters.'}</div>`;
}
function previewText(text){return String(text).replace(/```[\s\S]*?```/g,'Code snippet').replace(/[*`#]/g,'').replace(/\s+/g,' ').trim();}
function relativeDate(value){const d=new Date(value),today=new Date();if(d.toDateString()===today.toDateString())return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});const yesterday=new Date();yesterday.setDate(today.getDate()-1);return d.toDateString()===yesterday.toDateString()?'Yesterday':d.toLocaleDateString([],{weekday:'long'});}
function saveDraft(){if(selected<0)return;drafts[contacts[selected].id]=document.getElementById('message').value;try{localStorage.setItem('mightyDrafts',JSON.stringify(drafts))}catch{}}
function selectChat(i){
 if(!contacts[i])return;saveDraft();if(selected!==i){endLiveCall();cancelCharacterSpeech();nativeCompanion({action:'close'});attachment=null;}
 closeCharacterSettings();closeCharacterMenu();closeInspector();selected=i;contacts[i].unread=0;section='Chats';
 document.getElementById('shell').classList.remove('is-home','is-suggestions');document.getElementById('homeView').hidden=true;
 const c=contacts[i];document.getElementById('contactName').textContent=c.name;document.getElementById('contactAvatar').innerHTML=characterAvatar(c);
 document.getElementById('message').value=drafts[c.id]||'';document.getElementById('message').placeholder=`Ask ${c.name}`;
 document.getElementById('conversation').classList.remove('siri-voice-mode');view='standard';companionMode=validAppearance(c.appearance)?'overlay':'standard';renderChats();renderMessages(true);renderCompanion();updateSend();renderAttachment();updateVoiceMode();
 nativeCompanion({action:'selection',character:c,mode:companionMode});showDefaultCompanion();syncModeLabel();downloadCharacter(c.appearance);localStorage.setItem('mightyLastCharacter',c.id);
 try{localStorage.setItem('mightyCharacters',JSON.stringify(contacts))}catch{}
}
function persistMessages(){try{localStorage.setItem('mightyCharacterMessages',JSON.stringify(saved))}catch{toast('Storage is unavailable; messages will last for this session.')}}
function inlineText(text){return escapeHTML(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');}
function richText(text){
 const blocks=String(text).split(/(```[\s\S]*?```)/g);
 return blocks.map(block=>{if(block.startsWith('```'))return '<pre><code>'+escapeHTML(block.replace(/^```[^\n]*\n?/, '').replace(/```$/, ''))+'</code></pre>';
 let html='',list=null,paragraph=[];const flush=()=>{if(paragraph.length){html+='<p>'+paragraph.map(inlineText).join('<br>')+'</p>';paragraph=[];}};
 for(const line of block.split('\n')){const numbered=line.match(/^\s*\d+[.)]\s+(.*)/),bulleted=line.match(/^\s*[-*]\s+(.*)/),heading=line.match(/^#{1,3}\s+(.*)/);const type=numbered?'ol':bulleted?'ul':null;if(type){flush();if(list!==type){if(list)html+=`</${list}>`;html+=`<${type}>`;list=type;}html+='<li>'+inlineText((numbered||bulleted)[1])+'</li>';}else{if(list){html+=`</${list}>`;list=null;}if(heading){flush();html+='<h3>'+inlineText(heading[1])+'</h3>';}else if(!line.trim())flush();else paragraph.push(line);}}
 flush();if(list)html+=`</${list}>`;return html;}).join('');
}
function renderMessages(force=false){
 if(selected<0)return;
 const character=contacts[selected],rows=saved[character.id]||[];
 const waitingForVoice=liveCallCharacterId===character.id&&liveCallState==='active'&&rows.at(-1)?.role==='user';
 renderTurnTranscript(document.getElementById('messages'),character,rows,force,pendingReplies.has(character.id)||waitingForVoice);
}
async function copyReply(index){const text=(saved[contacts[selected]?.id]||[])[index]?.text;if(!text)return;try{await navigator.clipboard.writeText(text);toast('Copied.')}catch{nativeCompanion({action:'copyText',text});}}
async function submitText(value,{retry=false}={}){
 if(selected<0)return;const character=contacts[selected],key=character.id;if(!value.trim()||pendingReplies.has(key))return;
 if(!retry){(saved[key]??=[]).push({role:'user',text:value,time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),date:new Date().toISOString()});persistMessages();}
 const faceIdentity=globalThis.mightyFaceEvent?.('text.submit',character);
 pendingReplies.add(key);setOrbState('thinking');renderMessages(true);renderChats();updateSend();
 let streamingRow,streamingFrame=0;
 const onEvent=event=>{if(event.type!=='assistant.delta')return;if(!streamingRow){streamingRow={role:'assistant',text:'',time:'',date:new Date().toISOString()};saved[key].push(streamingRow);}streamingRow.text+=event.text;if(!streamingFrame)streamingFrame=requestAnimationFrame(()=>{streamingFrame=0;if(contacts[selected]?.id===key)renderMessages();});};
 try{const result=await requestCharacterReply(character,saved[key],onEvent);globalThis.mightyFaceEvent?.('response.complete',character,{identity:faceIdentity});if(streamingRow)saved[key].splice(saved[key].indexOf(streamingRow),1);const expression=result.expression||{mood:result.mood||'neutral',intensity:Number(result.intensity)||0};saved[key].push({role:'assistant',text:result.reply,expression,...(result.sentenceEvents?{meta:{sentenceEvents:result.sentenceEvents}}:{}),time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),date:new Date().toISOString()});persistMessages();if(contacts[selected]?.id===key){renderMessages();speakCharacterReply(character,result.reply,expression,result.sentenceEvents,faceIdentity).catch(error=>{globalThis.mightyFaceEvent?.('error',character,{identity:faceIdentity});toast(error.message);});}else{character.unread=(character.unread||0)+1;localStorage.setItem('mightyCharacters',JSON.stringify(contacts));}}
 catch(error){globalThis.mightyFaceEvent?.('error',character,{identity:faceIdentity});if(streamingRow){const at=saved[key].indexOf(streamingRow);if(at>=0)saved[key].splice(at,1);}saved[key].push({role:'error',text:error.message,time:''});persistMessages();}
 finally{if(streamingFrame)cancelAnimationFrame(streamingFrame);pendingReplies.delete(key);if(contacts[selected]?.id===key){renderMessages();setOrbState('idle');}renderChats();updateSend();}
}
async function sendMessage(e){e?.preventDefault();if(selected<0)return;const input=document.getElementById('message');let value=input.value.trim();if(!value||pendingReplies.has(contacts[selected].id))return;if(attachment)value+='\n\nAttached file: '+attachment.name+'\n```\n'+attachment.text+'\n```';input.value='';attachment=null;renderAttachment();saveDraft();updateSend();if(liveCallState==='active'){nativeCompanion({action:'callText',text:value});return;}await submitText(value);}
function retryMessage(index){const rows=saved[contacts[selected]?.id]||[];const previous=rows.slice(0,index).reverse().find(m=>m.role==='user');if(previous){rows.splice(index,1);submitText(previous.text,{retry:true});}}
function updateSend(){const el=document.getElementById('message');document.getElementById('send').disabled=!el.value.trim()||selected<0||pendingReplies.has(contacts[selected]?.id)||liveCallState==='connecting';el.style.height='22px';el.style.height=Math.max(22,Math.min(112,el.scrollHeight))+'px';}
async function attachTextFile(file){if(!file)return;if(file.size>100000){toast('Choose a text file smaller than 100 KB.');return;}if(!/\.(txt|md|csv|json|log)$/i.test(file.name)){toast('Supported attachments: text, Markdown, CSV, JSON, and log files.');return;}attachment={name:file.name,text:await file.text()};renderAttachment();}
function renderAttachment(){document.getElementById('attachmentList').innerHTML=attachment?`<span class="attachment-chip">${escapeHTML(attachment.name)}<button aria-label="Remove attachment" onclick="attachment=null;renderAttachment()">×</button></span>`:'';}
function showTextMode(){if(selected<0){homeTalk();return;}endLiveCall();document.getElementById('conversation').classList.remove('siri-voice-mode');document.getElementById('conversation').classList.add('text-mode');syncSiriVoiceOrb();updateSend();document.getElementById('message').focus();}
function showVoiceMode(){if(selected<0)return;document.getElementById('conversation').classList.remove('text-mode');document.getElementById('conversation').classList.add('siri-voice-mode');syncSiriVoiceOrb();updateVoiceMode();}
function enterVoiceMode(){showVoiceMode();}
function exitVoiceMode(){endLiveCall();}
async function toggleLiveCall(){if(liveCallState!=='idle'&&liveCallState!=='error'){endLiveCall();return;}if(selected<0)return;cancelCharacterSpeech();const character=contacts[selected];liveCallCharacterId=character.id;if(window.mightyMemoryReady)await window.mightyMemoryReady;if(window.mightyMemoryV1){try{await ensureMemoryCharacter(character);}catch(error){liveCallStatus({state:'error',label:error.message});return;}}const history=window.mightyMemoryV1?[]:(saved[character.id]||[]).filter(m=>['user','assistant'].includes(m.role)).slice(-16).map(m=>({role:m.role,content:m.text}));liveCallStatus({state:'connecting',label:'Connecting…'});if(!nativeCompanion({action:'callStart',character,history}))liveCallStatus({state:'error',label:'Open the MightyStar app to use your microphone.'});}
window.startKeyboardCall=()=>{if(selected<0)return;showVoiceMode();if(liveCallState==='idle'||liveCallState==='error')toggleLiveCall();};
function endLiveCall(){pointerHolding=false;if(liveCallState==='idle')return;if(liveCallHolding)releaseLiveCallHold();nativeCompanion({action:'callEnd'});liveCallStatus({state:'idle',label:'Ready'});}
function beginLiveCallHold(e){e?.preventDefault();if(liveCallState!=='active'||liveCallHolding)return;liveCallHolding=true;nativeCompanion({action:'callHoldBegin'});syncSiriVoiceOrb();}
function releaseLiveCallHold(e){e?.preventDefault();if(!liveCallHolding)return;liveCallHolding=false;nativeCompanion({action:'callHoldEnd'});syncSiriVoiceOrb();}
window.liveCallStatus=({state,label})=>{liveCallState=state;document.getElementById('liveCallLabel').textContent=label||state;if(state==='active'&&pointerHolding&&!liveCallHolding)beginLiveCallHold();if(state==='idle'||state==='error'){liveCallHolding=false;pointerHolding=false;}document.getElementById('message').disabled=state==='connecting';updateVoiceMode(state,label);updateSend();if(selected>=0)renderMessages();if(state==='error')toast(label||'Voice connection failed.');};
function updateVoiceMode(state=liveCallState,label=''){
 const phase=state==='error'?'error':state==='connecting'?'thinking':/Listening/.test(label)?'listening':/Speaking/.test(label)?'speaking':/Replying/.test(label)?'thinking':'idle';
 setOrbState(phase);document.getElementById('holdTalk').dataset.state=phase;document.getElementById('siriVoiceOrb').dataset.state=phase;syncSiriVoiceOrb();
 document.getElementById('talkLabel').textContent=state==='connecting'?'Connecting…':phase==='listening'?'Listening…':phase==='speaking'?'Hold to interrupt':phase==='thinking'?'Thinking…':`Hold ${window.uiPreferences?.shortcut||'Control + Option'} to talk`;
 const mic=document.getElementById('holdTalk');mic.setAttribute('aria-label',document.getElementById('talkLabel').textContent);mic.title=document.getElementById('talkLabel').textContent;
 document.getElementById('voiceLabel').hidden=state!=='error';
 document.getElementById('voiceLabel').textContent=phase==='listening'?'Release to send':state==='error'?'Try again or check your settings':label||document.getElementById('talkLabel').textContent;
 document.getElementById('stopCall').hidden=['idle','error'].includes(state);
}
window.liveCallTurnMeta=meta=>{if(!meta?.characterId||!Array.isArray(meta.sentenceEvents))return;const row=(saved[meta.characterId]||[]).at(-1);if(row?.role!=='assistant'||!row.callChunk)return;row.meta??={};row.meta.turns??=[];if(!row.meta.turns.some(turn=>turn.turnId===meta.turnId))row.meta.turns.push({turnId:meta.turnId,sentenceEvents:meta.sentenceEvents});persistMessages();};
window.liveCallMessage=({role,text})=>{if(!text||!liveCallCharacterId)return;const c=contacts.find(c=>c.id===liveCallCharacterId);if(!c)return;const rows=saved[c.id]??=[],last=rows.at(-1);if(role==='assistant'&&last?.role==='assistant'&&last.callChunk){last.text+=' '+text;}else rows.push({role,text,time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),date:new Date().toISOString(),callChunk:role==='assistant'});persistMessages();if(contacts[selected]?.id===c.id)renderMessages();renderChats();};
window.liveCallSpeech=({kind,value})=>{if(kind==='performance'){activePerformance=value;activeSnapshot=null;}if(kind==='performance'||kind==='playback'||kind==='phase')sendSpeech(kind,value);if(kind==='playback'&&['ended','cancelled','error'].includes(value.state)&&activePerformance?.utteranceId===value.utteranceId)activePerformance=null;};
const holdButton=document.getElementById('holdTalk');
holdButton.addEventListener('click',()=>{if(selected<0)return;showVoiceMode();toggleDesktopTalk();});
document.getElementById('message').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage(e);}});
function filterChats(value){filter=value;renderChats();}
function setSection(value){section=value;renderChats();}
function setView(value){view='standard';renderCompanion();}
function toggleCamera(){cycleCameraMode();}
function toast(text){const t=document.getElementById('toast');t.textContent=text;t.classList.remove('hidden');clearTimeout(timer);timer=setTimeout(()=>t.classList.add('hidden'),4500);}
function showWelcome(){showHome();}

// Desktop Talk is click-to-record, then click again to send. Fn remains hold-to-talk.
window.toggleDesktopTalk=()=>{
 if(selected<0||liveCallState==='connecting')return;
 if(liveCallHolding){pointerHolding=false;releaseLiveCallHold();return;}
 pointerHolding=true;
 if(liveCallState==='active')beginLiveCallHold();else toggleLiveCall();
};

window.attachDesktopTextFile=({name,text})=>{if(selected<0)return;attachment={name,text};showTextMode();renderAttachment();};

// Input phase events carry no typed text or inferred emotion.
for(const type of ['focus','input'])document.getElementById('message').addEventListener(type,()=>{if(selected>=0 && !pendingReplies.has(contacts[selected]?.id))globalThis.mightyFaceEvent?.('input.begin',contacts[selected]);});
document.getElementById('message').addEventListener('blur',()=>{if(selected>=0 && !pendingReplies.has(contacts[selected]?.id))globalThis.mightyFaceEvent?.('cancel',contacts[selected]);});
