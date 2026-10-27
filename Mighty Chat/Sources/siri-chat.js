/* Each question and its answer occupy a viewport. Scrolling preserves history;
   a submitted question advances that viewport to the top, as in the reference. */
const turnScrolls=new WeakMap();
function transcriptRow(message,index){
 if(message.role==='error')return `<div class="message-error">${escapeHTML(message.text)} <button onclick="retryMessage(${index})">Retry</button></div>`;
 if(message.role==='assistant')return `<article class="message-row" data-message="${index}"><div class="assistant-bubble">${richText(message.text)}</div><div class="message-meta"><button class="icon" aria-label="Copy reply" onclick="copyReply(${index})">${symbol('doc.on.doc')}</button><button class="icon" aria-label="Read reply aloud" onclick="speakSavedMessage(${index})">${symbol('speaker.wave.2.fill')}</button></div></article>`;
 return `<div class="user-bubble" data-message="${index}">${escapeHTML(message.text)}</div>`;
}
function stopTurnScroll(area){const scroll=turnScrolls.get(area);if(scroll)cancelAnimationFrame(scroll.frame);turnScrolls.delete(area);}
function scrollToTurn(area,turn,animate){
 stopTurnScroll(area);
 const target=Math.max(0,turn.getBoundingClientRect().top-area.getBoundingClientRect().top+area.scrollTop-parseFloat(getComputedStyle(area).paddingTop));
 if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){area.scrollTop=target;return;}
 const from=area.scrollTop,start=performance.now(),state={frame:0};
 const tick=now=>{const progress=Math.min(1,(now-start)/560);area.scrollTop=from+(target-from)*(1-Math.pow(1-progress,3));if(progress<1)state.frame=requestAnimationFrame(tick);else turnScrolls.delete(area);};
 turnScrolls.set(area,state);state.frame=requestAnimationFrame(tick);
}
function sizeTurnTranscript(area){
 const top=parseFloat(getComputedStyle(area).paddingTop)||0;
 area.style.setProperty('--chat-turn-height',`${Math.max(0,area.clientHeight-top)}px`);
}
function renderTurnTranscript(area,character,rows,force,pending){
 const changedCharacter=area.dataset.character!==character.id;
 const oldCount=Number(area.dataset.turnCount)||0;
 const wasFollowing=area.scrollHeight-area.clientHeight-area.scrollTop<90;
 const previousScroll=area.scrollTop;
 if(changedCharacter){stopTurnScroll(area);area.replaceChildren();area.dataset.character=character.id;}
 sizeTurnTranscript(area);
 if(!rows.length){area.innerHTML=`<div class="conversation-empty"><h2>${escapeHTML(character.name)}</h2><p>${escapeHTML(character.profile?.job||'What would you like to work on?')}</p></div>`;area.dataset.turnCount='0';return;}
 const turns=[];
 rows.forEach((message,index)=>{
  if(message.role==='user'||!turns.length)turns.push({start:index,rows:[]});
  turns.at(-1).rows.push({message,index});
 });
 const existing=new Map([...area.querySelectorAll(':scope > .chat-turn')].map(turn=>[turn.dataset.start,turn]));
 if(!existing.size)area.replaceChildren();
 turns.forEach((data,index)=>{
  let turn=existing.get(String(data.start));
  if(!turn){turn=document.createElement('section');turn.className='chat-turn';turn.dataset.start=data.start;turn.setAttribute('aria-label',`Conversation turn ${index+1}`);area.append(turn);}
  existing.delete(String(data.start));
  const nodes=data.rows.map(({message,index})=>({key:String(index),html:transcriptRow(message,index)}));
  if(index===turns.length-1&&pending&&!data.rows.some(row=>row.message.role==='assistant'))nodes.push({key:'loading',html:'<div class="typing" role="status" aria-label="Thinking"><span class="chat-spinner" aria-hidden="true"></span></div>'});
  const children=new Map([...turn.children].map(child=>[child.dataset.row,child]));
  for(const node of nodes){
   let element=children.get(node.key);
   if(!element){element=document.createElement('div');element.className='chat-row';element.dataset.row=node.key;if(!changedCharacter&&node.html.startsWith('<article'))element.classList.add('is-new-reply');turn.append(element);}
   if(element._transcriptHTML!==node.html){element.innerHTML=node.html;element._transcriptHTML=node.html;}
   children.delete(node.key);
  }
  children.forEach(child=>child.remove());
 });
 existing.forEach(turn=>turn.remove());
 const newTurn=!changedCharacter&&turns.length>oldCount&&oldCount>0;
 area.dataset.turnCount=turns.length;
 const last=area.lastElementChild;
 if(changedCharacter||force||newTurn)scrollToTurn(area,last,newTurn);
 else if(!turnScrolls.has(area))area.scrollTop=wasFollowing?area.scrollHeight:previousScroll;
}
const turnArea=document.getElementById('messages');
for(const event of ['wheel','touchstart','pointerdown'])turnArea.addEventListener(event,()=>stopTurnScroll(turnArea),{passive:true});
turnArea.addEventListener('keydown',event=>{if(['PageUp','PageDown','Home','End','ArrowUp','ArrowDown'].includes(event.key))stopTurnScroll(turnArea);});
new ResizeObserver(()=>{
 const following=turnArea.scrollHeight-turnArea.clientHeight-turnArea.scrollTop<90;
 sizeTurnTranscript(turnArea);
 if(following&&turnArea.lastElementChild?.classList.contains('chat-turn'))scrollToTurn(turnArea,turnArea.lastElementChild,false);
}).observe(turnArea);

// Reference frames retain the filmed refraction, rim and moving light band.
// Morph geometry follows the original frame timestamps, including the spring
// overshoot. The field width is adapted to the current app layout.
const siriOrb={frame:0,desired:false,phase:'text',started:0,seek:0,painted:'',state:'idle',stateStarted:0,fieldWidth:0,fieldHeight:32,pages:new Map()};
function orbPage(index){
 let entry=siriOrb.pages.get(index);
 if(entry){entry.used=performance.now();return entry;}
 const image=new Image();entry={image,ready:false,used:performance.now()};
 image.onload=()=>{entry.ready=true;};image.src=MIGHTY_ORB_REFERENCE.pages[index];siriOrb.pages.set(index,entry);
 // Decode a small working set rather than retaining every atlas in memory.
 if(siriOrb.pages.size>3){const oldest=[...siriOrb.pages].filter(([key])=>key!==index&&key!==0).sort((a,b)=>a[1].used-b[1].used)[0];if(oldest)siriOrb.pages.delete(oldest[0]);}
 return entry;
}
function orbFrameAt(sequence,time){
 let lo=0,hi=sequence.frames.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(sequence.frames[mid].t<=time)lo=mid;else hi=mid-1;}
 return sequence.frames[lo];
}
function setOrbPhase(phase){
 siriOrb.phase=phase;document.getElementById('conversation').dataset.orbPhase=phase;
 const button=document.getElementById('siriVoiceOrb');button.tabIndex=phase==='voice'?0:-1;button.setAttribute('aria-hidden',String(phase==='text'));
}
function syncSiriVoiceOrb(){
 const conversation=document.getElementById('conversation'),button=document.getElementById('siriVoiceOrb');
 const desired=conversation.classList.contains('siri-voice-mode'),now=performance.now();
 const visible=!document.hidden&&document.getElementById('homeView').hidden&&document.getElementById('settingsShell').hidden;
 const recording=typeof liveCallHolding!=='undefined'&&liveCallHolding;
 const controls=document.querySelector('.siri-voice-controls');controls.inert=!desired;controls.setAttribute('aria-hidden',String(!desired));
 button.setAttribute('aria-label',recording?'Send recording':'Start recording');
 if(desired!==siriOrb.desired){
  const previous=siriOrb.phase;siriOrb.desired=desired;
  const field=document.querySelector('.siri-composer .text-field').getBoundingClientRect();
  siriOrb.fieldWidth=field.width;siriOrb.fieldHeight=field.height;
  const next=desired?'enter':'exit',sequence=MIGHTY_ORB_REFERENCE.sequences[next];
  const previousSeek=siriOrb.seek;siriOrb.seek=0;
  // Reversing mid-morph starts from the closest matching silhouette.
  if(previous==='enter'||previous==='exit'){
   const current=orbFrameAt(MIGHTY_ORB_REFERENCE.sequences[previous],now-siriOrb.started+previousSeek);
   const nearest=sequence.frames.reduce((best,frame)=>Math.abs(frame.w-current.w)+Math.abs(frame.h-current.h)<Math.abs(best.w-current.w)+Math.abs(best.h-current.h)?frame:best);
   siriOrb.seek=nearest.t;
  }
  const input=document.getElementById('message');button.querySelector('.siri-orb-label').textContent=input.value||input.placeholder;
  siriOrb.started=now;siriOrb.painted='';setOrbPhase(next);orbPage(MIGHTY_ORB_REFERENCE.sequences.idle.frames[0].atlas);
  document.querySelector('.siri-composer').inert=desired;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)setOrbPhase(desired?'voice':'text');
 }
 if(!visible||siriOrb.phase==='text'){cancelAnimationFrame(siriOrb.frame);siriOrb.frame=0;return;}
 if(!siriOrb.frame)siriOrb.frame=requestAnimationFrame(paintSiriOrb);
}
function paintSiriOrb(now){
 const button=document.getElementById('siriVoiceOrb'),canvas=button.querySelector('canvas'),reference=MIGHTY_ORB_REFERENCE;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let sequence,time;
 if(siriOrb.phase==='enter'||siriOrb.phase==='exit'){
  sequence=reference.sequences[siriOrb.phase];time=now-siriOrb.started+siriOrb.seek;
  if(time>=sequence.duration){siriOrb.stateStarted=now;setOrbPhase(siriOrb.desired?'voice':'text');siriOrb.painted='';if(siriOrb.phase==='text'){siriOrb.frame=0;return;}}
 }
 if(siriOrb.phase==='voice'){
  const state=button.dataset.state==='speaking'?'speech':'idle';
  if(state!==siriOrb.state){siriOrb.state=state;siriOrb.stateStarted=now;}
  sequence=reference.sequences[state];
  const cycle=(now-siriOrb.stateStarted)%(sequence.duration*2);
  time=reduced?0:Math.min(cycle,sequence.duration*2-cycle);
 }
 const frame=orbFrameAt(sequence,time),page=orbPage(frame.atlas);
 const next=sequence.frames.find(item=>item.t>time+100);if(next&&next.atlas!==frame.atlas)orbPage(next.atlas);
 const key=`${siriOrb.phase}:${frame.atlas}:${frame.rect.join(',')}`;
 if(page.ready&&key!==siriOrb.painted){
  const [x,y,w,h]=frame.rect;
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  const context=canvas.getContext('2d');context.clearRect(0,0,w,h);context.drawImage(page.image,x,y,w,h,0,0,w,h);
  let width,height;
  if(siriOrb.phase==='voice'){width=height=112;}
  else{
   width=frame.w>=reference.referenceOrbSize?104+(siriOrb.fieldWidth-104)*(frame.w-reference.referenceOrbSize)/(reference.referenceFieldWidth-reference.referenceOrbSize):104*frame.w/reference.referenceOrbSize;
   height=siriOrb.fieldHeight+(104-siriOrb.fieldHeight)*(frame.h-67)/(208-67);
  }
  button.querySelector('.siri-orb-label').style.opacity=siriOrb.phase==='voice'?'0':siriOrb.phase==='enter'?String(Math.max(0,1-time/280)):String(Math.min(1,time/180));
  button.style.width=`${width}px`;button.style.height=`${height}px`;button.style.bottom=siriOrb.phase==='voice'?'-4px':'0px';
  siriOrb.painted=key;
 }
 siriOrb.frame=reduced&&siriOrb.phase==='voice'&&page.ready?0:requestAnimationFrame(paintSiriOrb);
}
orbPage(MIGHTY_ORB_REFERENCE.sequences.enter.frames[0].atlas);
document.addEventListener('visibilitychange',syncSiriVoiceOrb);
new ResizeObserver(()=>{const field=document.querySelector('.siri-composer .text-field').getBoundingClientRect();siriOrb.fieldWidth=field.width;siriOrb.fieldHeight=field.height;}).observe(document.getElementById('composerZone'));
function toggleSiriVoiceMute(){
 const output={...companionOutput,muted:!companionOutput.muted};
 window.setCompanionOutput(output);
 nativeCompanion({action:'playerOutput',...output});
 const button=document.getElementById('siriVoiceMute');
 button.setAttribute('aria-pressed',String(output.muted));
 button.setAttribute('aria-label',output.muted?'Unmute voice':'Mute voice');
 button.innerHTML=symbol(output.muted?'speaker.slash.fill':'speaker.wave.2.fill');
}

const siriVisibilityObserver=new MutationObserver(syncSiriVoiceOrb);
siriVisibilityObserver.observe(document.getElementById('shell'),{attributes:true,attributeFilter:['class']});
siriVisibilityObserver.observe(document.getElementById('settingsShell'),{attributes:true,attributeFilter:['hidden']});
