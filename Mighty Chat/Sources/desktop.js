/* Desktop input is owned by the native silhouette-aware panel. The renderer
   keeps preview camera controls only in the character editor. */
let frame=document.getElementById('viewer');
const recovery=document.getElementById('desktopRecovery');
const menu=document.getElementById('menu'),hint=document.getElementById('desktopHint');
const hintLabel=document.getElementById('hintLabel'),waveformBars=[...document.querySelectorAll('#hintWaveform i')];
const waveformShape=[.36,.6,.82,.96,1,.94,.84,.7,.5,.32];
let talkHintDismissed=false,talkHeld=false,levelTimeout=null;
let config,playing=true,characterHovered=false,speechPerformance=null,speechSnapshot=null,facePhase=null,phase='idle',callLabel='',showArea=false,submenu='',retryRegion=null,anchor={x:.52,y:.45};
const names={overlay:'Overlay',portrait:'Portrait',player:'Player View',screensaver:'Screensaver',holographic:'Holographic'};
const idleStyles={male:'Male',female:'Female',dwarf2:'Female 2'};
let gazePointer={x:0,y:0,valid:false};
function idleStyle(){const value=config?.character?.profile?.idleStyle;return typeof value==='string'&&Object.prototype.hasOwnProperty.call(idleStyles,value)?value:'female';}
const paths={talk:'M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4',ask:'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-8.5A8.5 8.5 0 1 1 21 11.5Z',area:'M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3',file:'m8 12 7-7a3 3 0 0 1 4 4L9 19a5 5 0 0 1-7-7L13 1',person:'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 21v-7H6l2-5h8l2 5h-2v7m-4-7v7',speaker:'m11 4-5 4H2v8h4l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',mute:'m11 4-5 4H2v8h4l5 4V4Zm5 5 6 6m0-6-6 6',pause:'M8 5v14M16 5v14',play:'m7 4 13 8-13 8V4Z',size:'M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M8 8h8v8H8Z',settings:'m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3H9Zm3 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',power:'M12 2v10m-6-7a9 9 0 1 0 12 0',chevron:'m9 5 7 7-7 7'};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.person}"/></svg>`;}
function escapeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function host(data){window.webkit?.messageHandlers?.companion.postMessage(data);}
function control(data){if(config)frame.contentWindow.postMessage({type:'mighty-companion-control',...data},config.origin);}
function sendPointer(){control({pointer:{...gazePointer,valid:gazePointer.valid&&menu.hidden&&playing}});}
window.setDesktopPointer=(x,y,valid)=>{
 gazePointer=Number.isFinite(x)&&Number.isFinite(y)&&valid===true?{x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y)),valid:true}:{x:0,y:0,valid:false};
 sendPointer();
};
function publishRegions(){
 const regions=[hint,...(config?.mode==='player'?[document.getElementById('playerToolbar'),document.getElementById('playerViewMenu'),document.getElementById('playerVolumePanel'),document.getElementById('playerSubtitles')]:[]),...(!menu.hidden?[menu]:[]),...(!document.getElementById('area').hidden&&['overlay','portrait'].includes(config?.mode)?document.querySelectorAll('.resize-corner'):[])].filter(el=>!el.hidden).map(el=>{const r=el.getBoundingClientRect();return {x:r.x/innerWidth,y:r.y/innerHeight,width:r.width/innerWidth,height:r.height/innerHeight};});
 if(retryRegion)regions.push(retryRegion);
 if(!recovery.hidden){const r=recovery.getBoundingClientRect();regions.push({x:r.x/innerWidth,y:r.y/innerHeight,width:r.width/innerWidth,height:r.height/innerHeight});}
 host({action:'interactionRegions',regions});
}
function drawInputLevel(level){
 waveformBars.forEach((bar,index)=>{bar.style.height=(2+10*level*waveformShape[index]).toFixed(2)+'px';});
}
function updateHint(){
 hint.dataset.state=phase;
 hint.dataset.mode=!talkHintDismissed?'instruction':talkHeld?'recording':'idle';
 const status=!talkHintDismissed?`Hold ${config?.shortcut||'Fn'} to talk`:phase==='error'?(callLabel||'Voice unavailable'):talkHeld?(phase==='thinking'&&callLabel?callLabel:'Listening…'):phase==='idle'?'Ready':callLabel||({speaking:'Speaking…',thinking:'Thinking…'}[phase]||'Ready');
 hint.setAttribute('aria-label',status+'. Open character controls');hint.title=status;
 publishRegions();
}
window.setDesktopTalkHintDismissed=value=>{
 // Native app memory owns this flag; delayed configuration must not restore the hint.
 talkHintDismissed=talkHintDismissed||!!value;updateHint();
};
window.setDesktopTalkHeld=value=>{
 talkHeld=!!value;
 if(talkHeld)talkHintDismissed=true;
 clearTimeout(levelTimeout);drawInputLevel(0);updateHint();renderMenu();
};
window.setDesktopInputLevel=value=>{
 if(!talkHeld)return;
 const level=Number(value);if(!Number.isFinite(level))return;
 clearTimeout(levelTimeout);drawInputLevel(Math.max(0,Math.min(1,level)));
 // A stopped or interrupted input stream must settle back to the quiet dots.
 levelTimeout=setTimeout(()=>drawInputLevel(0),180);
};
function send(){if(!config)return;frame.contentWindow.postMessage({type:'mighty-companion-load',appearance:config.character.appearance,idleStyle:idleStyle(),animationTuning:config.character.profile?.animationTuning,editorSettings:config.character.profile?.editorSettings,token:config.token,characterId:config.character.id},config.origin);control({playing,hovered:characterHovered,idleStyle:idleStyle(),desktopInteraction:true,framing:config.mode==='player'?'player':config.mode==='portrait'?'portrait':'full'});sendPointer();for(const kind of ['phase','performance','playback']){const value=faceSpeech[kind];if(value?.characterId===config.character.id)frame.contentWindow.postMessage({type:'mighty-companion-'+kind,value},config.origin);}}
// A loaded renderer can still lose its visible canvas (for example after a
// WebKit/GPU suspension). Recreate only that view, replaying its current session
// and speech clock. Bound automatic retries; never leave a silent blank forever.
let rendererReadyAt=null,lastVisibleAt=0,recoveryAttempts=0;
function mountRenderer(){
 rendererReadyAt=null;lastVisibleAt=0;retryRegion=null;recovery.hidden=true;
 const next=frame.cloneNode(false);next.src=config.origin+'/Companion/index.html';
 next.addEventListener('load',send);frame.replaceWith(next);frame=next;publishRegions();
}
function checkRendererHealth(){
 if(!config||rendererReadyAt===null||performance.now()-lastVisibleAt<3000)return;
 if(recoveryAttempts<2){recoveryAttempts++;mountRenderer();}
 else {rendererReadyAt=null;recovery.hidden=false;publishRegions();}
}
setInterval(checkRendererHealth,500);
document.getElementById('retryDesktop').onclick=()=>{recoveryAttempts=0;mountRenderer();};
window.configureDesktop=value=>{
 const firstConfiguration=!config;
 const newSession=config?.origin!==value.origin||config?.token!==value.token;
 if(config?.character?.appearance?.key!==value.character?.appearance?.key||config?.character?.id!==value.character?.id){characterHovered=false;gazePointer={x:0,y:0,valid:false};}
 const changed=config?.character?.id!==value.character?.id||config?.character?.appearance?.key!==value.character?.appearance?.key;
 if(changed){speechPerformance=null;speechSnapshot=null;facePhase=null;}
 if(changed||newSession){recoveryAttempts=0;rendererReadyAt=null;lastVisibleAt=0;recovery.hidden=true;}
 if(changed)for(const key of Object.keys(faceSpeech))delete faceSpeech[key];
 config=value;playing=value.playing!==false;
 talkHintDismissed=talkHintDismissed||!!value.talkHintDismissed||!!value.talkHeld;
 talkHeld=!!value.talkHeld;
 if(!talkHeld){clearTimeout(levelTimeout);drawInputLevel(0);}
 document.body.className=value.mode+(document.body.classList.contains('resizing')?' resizing':'');
 hintLabel.innerHTML=`Hold ${escapeText(value.shortcut||'Fn')} <span>to talk</span>`;
 hint.hidden=value.mode==='player';window.configurePlayerView?.(value,changed);hint.style.setProperty('--instruction-width',Math.ceil(hintLabel.scrollWidth+26)+'px');
 const url=value.origin+'/Companion/index.html';if(newSession||frame.src!==url)mountRenderer();else send();updateHint();renderMenu();
 // Recreated views open directly in their current state, without flashing the hint.
 if(firstConfiguration)requestAnimationFrame(()=>requestAnimationFrame(()=>hint.classList.add('animate')));
};
window.setDesktopCallStatus=(state,label)=>{callLabel=label;phase=state==='idle'?'idle':state==='error'?'error':/Listening/.test(label)?'listening':/Speaking/.test(label)?'speaking':/Replying|Starting|Connecting/.test(label)?'thinking':'idle';updateHint();renderMenu();};
window.setDesktopMotion=value=>{playing=value;control({playing,hovered:characterHovered});sendPointer();renderMenu();};
window.setDesktopHover=value=>{const next=!!value;if(next===characterHovered)return;characterHovered=next;control({hovered:next});};
const faceSpeech={};
window.setDesktopSpeech=(kind,value)=>{
 if(kind==='output'){window.setPlayerOutput?.(value);return;}
 if(['phase','performance','playback'].includes(kind)&&value?.characterId===config?.character?.id){
  faceSpeech[kind]=value;frame.contentWindow?.postMessage({type:'mighty-companion-'+kind,value},config.origin);
 }
 window.setPlayerSpeech?.(kind,value);if(kind==='orb'){phase=value.state;updateHint();renderMenu();}
};
frame.addEventListener('load',send);
window.addEventListener('message',event=>{
 if(!config||event.source!==frame.contentWindow||event.origin!==config.origin)return;
 const data=event.data;
 if(data?.type==='mighty-companion-canvas-pointer')window.dismissPlayerHover?.();
 if(data?.type==='mighty-companion-retry-region'){retryRegion=data.region;publishRegions();}
 if(data?.type==='mighty-companion-hit-mask'&&typeof data.data==='string'&&data.data.length<=100000&&/^[A-Za-z0-9+/]*={0,2}$/.test(data.data)&&/[^A=]/.test(data.data)){lastVisibleAt=performance.now();recovery.hidden=true;}
 if(data?.type==='mighty-companion-hit-mask')host({action:'hitMask',width:data.width,height:data.height,data:data.data,viewportWidth:data.viewportWidth,viewportHeight:data.viewportHeight});
 if(data?.type==='mighty-companion-escape')dismissDesktopControls();
 if(data?.type==='mighty-companion-menu')openDesktopMenu(Number.isFinite(data.x)?data.x:.5,Number.isFinite(data.y)?data.y:.45);
 if(data?.type==='mighty-companion-state'&&data.state==='ready'&&data.key===config.character.appearance?.key){rendererReadyAt=performance.now();lastVisibleAt=rendererReadyAt;}
 if(data?.type==='mighty-companion-state'&&data.state==='error')rendererReadyAt=null;
 if(data?.state==='booted'||data?.state==='ready')send();
});
function positionMenu(){if(menu.hidden)return;menu.style.left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,anchor.x*innerWidth+10))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-menu.offsetHeight-8,anchor.y*innerHeight-18))+'px';publishRegions();}
window.openDesktopMenu=(x=.5,y=.45)=>{showArea=config?.mode!=='player';document.getElementById('area').hidden=!showArea;anchor={x,y};submenu='';menu.hidden=false;hint.setAttribute('aria-expanded','true');sendPointer();renderMenu();menu.focus({preventScroll:true});};
window.dismissDesktopMenu=()=>{menu.hidden=true;submenu='';hint.setAttribute('aria-expanded','false');sendPointer();publishRegions();};
window.dismissDesktopControls=()=>{window.dismissPlayerControls?.();showArea=false;document.getElementById('area').hidden=true;dismissDesktopMenu();};
hint.onclick=()=>menu.hidden?openDesktopMenu(.5,.18):dismissDesktopControls();
function renderMenu(){
 if(!config)return;
 const character=config.character,muted=character.profile?.speak===false;
 let portrait='';const src=character.appearance?.portrait;
 if(src==='local/chars/hailey/portrait.jpeg'&&config.token){portrait=`<img src="${escapeText(config.origin+'/assets/'+config.token+'/'+src)}" alt="">`;}
 else if(src){try{const url=new URL(src);if(url.origin==='https://phoshco.github.io'&&config.token){portrait=`<img src="${escapeText(config.origin+'/assets/'+config.token+url.pathname)}" alt="">`;}else if(url.protocol==='https:')portrait=`<img src="${escapeText(url.href)}" alt="" referrerpolicy="no-referrer">`;}catch{}}
 const row=(action,symbol,label,tail='')=>`<button class="menu-row" role="menuitem" data-action="${action}">${icon(symbol)}<span class="label">${label}</span>${tail}</button>`;
 const round=(action,symbol,label,pressed)=>`<button class="round ${action==='hide'?'power':''}" role="menuitem" data-action="${action}" aria-label="${label}" title="${label}" ${pressed===undefined?'':`aria-pressed="${pressed}"`}>${icon(symbol)}</button>`;
 menu.innerHTML=`<div class="identity"><span class="portrait">${portrait||escapeText(character.name.slice(0,1))}</span><strong>${escapeText(character.name)}</strong></div>${row('talk','talk',(talkHeld||phase==='listening')?'Send recording':'Talk',`<span class="shortcut">${(talkHeld||phase==='listening')?'Click to send':`Hold <kbd>${escapeText(config.shortcut||'Fn')}</kbd>`}</span>`)}${row('ask','ask','Ask')}${row('area','area',showArea?'Hide area':'Show area')}${row('file','file','Send file')}<div class="divider"></div><button class="menu-row" role="menuitem" data-action="idle" aria-expanded="${submenu==='idle'}">${icon('person')}<span class="label">Idle style</span><span class="current-mode">${idleStyles[idleStyle()]}</span>${icon('chevron')}</button>${submenu==='idle'?`<div class="sub-menu" role="group" aria-label="Idle base pose">${Object.entries(idleStyles).map(([id,label])=>`<button role="menuitemradio" aria-checked="${idleStyle()===id}" data-idle-style="${id}" title="${id==='dwarf2'?'Dwarf Idle-2':label+' idle'}">${label}<span>${idleStyle()===id?'✓':''}</span></button>`).join('')}</div>`:''}<button class="menu-row" role="menuitem" data-action="modes" aria-expanded="${submenu==='modes'}">${icon('person')}<span class="label">View Mode</span><span class="current-mode">${names[config.mode]||'Overlay'}</span>${icon('chevron')}</button>${submenu==='modes'?`<div class="sub-menu">${Object.entries(names).map(([id,label])=>`<button role="menuitemradio" aria-checked="${config.mode===id}" data-mode="${id}">${label}<span>${config.mode===id?'✓':''}</span></button>`).join('')}</div>`:''}<div class="footer">${round('mute',muted?'mute':'speaker',muted?'Unmute voice':'Mute voice',muted)}${round('motion',playing?'pause':'play',playing?'Pause animation':'Resume animation',!playing)}${round('size','size','Character size',showArea)}${round('settings','settings','Character settings')}${round('hide','power','Dismiss character')}</div>`;
 positionMenu();
}
menu.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.idleStyle){host({action:'desktopIdleStyle',characterId:config.character.id,idleStyle:button.dataset.idleStyle});return;}
 if(button.dataset.mode){dismissDesktopControls();host({action:'desktopMode',mode:button.dataset.mode});return;}
 const action=button.dataset.action;
 if(action==='size'){showArea=true;document.getElementById('area').hidden=false;dismissDesktopMenu();document.querySelector('.resize-corner').focus();return;}
 if(action==='modes'||action==='idle'){submenu=submenu===action?'':action;renderMenu();return;}
 if(action==='area'){showArea=!showArea;document.getElementById('area').hidden=!showArea;renderMenu();if(showArea)dismissDesktopMenu();publishRegions();return;}
 if(action==='motion'){host({action:'desktopMotion'});return;}
 if(action==='mute'){host({action:'desktopMute'});return;}
 if(action==='talk'){host({action:'desktopTalk'});return;}
 if(action==='hide'){host({action:'desktopHide'});return;}
 if(['ask','settings','file'].includes(action)){dismissDesktopControls();host({action});}
});
document.addEventListener('contextmenu',event=>event.preventDefault());
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#menu,#desktopHint,.resize-corner,#playerToolbar,#playerViewMenu,#playerVolumePanel'))dismissDesktopControls();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){dismissDesktopControls();hint.focus();}if(!menu.hidden&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}});
new ResizeObserver(()=>{positionMenu();publishRegions();}).observe(document.body);
// Width/height animate each frame; native click-through must follow the visible pill.
new ResizeObserver(publishRegions).observe(hint);

// Capture the pointer on the bracket, including when it crosses transparent
// space or leaves the window. Native resizing uses the original frame each time.
for(const handle of document.querySelectorAll('.resize-corner')){
 let pointer=null;
 const finish=()=>{if(pointer===null)return;pointer=null;document.body.classList.remove('resizing');document.body.style.cursor='';host({action:'resizeCorner',phase:'end'});publishRegions();};
 handle.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;event.preventDefault();event.stopPropagation();
  pointer=event.pointerId;document.body.classList.add('resizing');document.body.style.cursor=getComputedStyle(handle).cursor;handle.setPointerCapture(pointer);
  dismissDesktopMenu();
  host({action:'resizeCorner',phase:'begin',corner:handle.dataset.corner,x:event.screenX,y:event.screenY});
 });
 handle.addEventListener('pointermove',event=>{if(pointer!==event.pointerId)return;host({action:'resizeCorner',phase:'move',x:event.screenX,y:event.screenY});});
 handle.addEventListener('pointerup',event=>{if(pointer===event.pointerId){host({action:'resizeCorner',phase:'move',x:event.screenX,y:event.screenY});finish();}});
 window.addEventListener('blur',finish);
 handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);
 handle.addEventListener('keydown',event=>{
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();event.stopPropagation();
  const outward=event.key==='ArrowUp'||event.key==='ArrowRight',sign=outward?1:-1;
  const left=handle.dataset.corner.endsWith('Left'),top=handle.dataset.corner.startsWith('top');
  host({action:'resizeCorner',phase:'begin',corner:handle.dataset.corner,x:0,y:0});
  host({action:'resizeCorner',phase:'move',x:sign*(left?-12:12),y:sign*(top?-12:12)});
  host({action:'resizeCorner',phase:'end'});
 });
}
window.addEventListener('blur',()=>host({action:'resizeCorner',phase:'end'}));
