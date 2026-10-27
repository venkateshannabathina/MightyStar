/* Player presentation shares the desktop renderer and the host's audio clock. */
(() => {
 const toolbar=document.getElementById('playerToolbar'),modes=document.getElementById('playerViewMenu'),volumePanel=document.getElementById('playerVolumePanel');
 const captions=document.getElementById('playerCaptions'),modeButton=document.getElementById('playerModes'),speaker=document.getElementById('playerSpeaker');
 const slider=document.getElementById('playerVolume');
 let volumeHoverTimer=null,volumeLeaveTimer=null,volumePinned=false;
 const subtitles=document.getElementById('playerSubtitles'),subtitleText=subtitles.querySelector('p'),vignette=document.getElementById('playerVignette');
 let enabled=false,subtitlesOn=true,output={volume:1,muted:false},performance=null,snapshot=null,cues=[],characterId='';
 const viewNames={standard:'Chat',player:'Player View',overlay:'Overlay',portrait:'Portrait',screensaver:'Screensaver',holographic:'Holographic'};
 speaker.innerHTML='<svg viewBox="0 0 28 28" aria-hidden="true"><path class="speaker-body" d="M3 10h5l7-6v20l-7-6H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z"/><path class="speaker-waves" d="M19 9a8 8 0 0 1 0 10m4-14a14 14 0 0 1 0 18"/><path class="speaker-cross" d="m20 10 7 8m0-8-7 8"/></svg>';
 function post(value){window.webkit?.messageHandlers?.companion.postMessage(value);}
 function regions(){if(typeof publishRegions==='function')publishRegions();}
 function closePanels(){
  clearTimeout(volumeHoverTimer);clearTimeout(volumeLeaveTimer);
  modes.hidden=true;volumePanel.hidden=true;volumePinned=false;toolbar.classList.remove('volume-open');
  modeButton.setAttribute('aria-expanded','false');speaker.setAttribute('aria-expanded','false');
  drawOutput();regions();
 }
 window.dismissPlayerControls=closePanels;
 function drawOutput(){
  const percent=Math.round(output.volume*100),quiet=output.muted||percent===0;
  slider.value=String(percent);slider.setAttribute('aria-valuetext',percent+' percent'+(output.muted?', muted':''));
  slider.style.setProperty('--volume-fill',(output.muted?0:percent)+'%');
  speaker.dataset.muted=String(quiet);
  const label=volumePanel.hidden?'Voice volume':output.muted?'Unmute voice':'Mute voice';
  speaker.setAttribute('aria-label',label);speaker.title=volumePanel.hidden?'Voice volume':label+' · '+percent+'%';
 }
 function openVolume(focus=false){
  closePanels();volumePinned=focus;volumePanel.hidden=false;toolbar.classList.add('volume-open');
  speaker.setAttribute('aria-expanded','true');drawOutput();
  if(focus)slider.focus();regions();
 }
 window.setPlayerOutput=value=>{
  if(Number.isFinite(value?.volume))output.volume=Math.max(0,Math.min(1,value.volume));
  if(typeof value?.muted==='boolean')output.muted=value.muted;
  drawOutput();
 };
 function makeCues(value){
  const words=(Array.isArray(value.words)?value.words:[]).filter(w=>typeof w.text==='string'&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.start>=0&&w.end>=w.start).slice(0,1000);
  const result=[];let group=null;
  for(const word of words){
   if(!group||group.text.length+word.text.length>64||word.start-group.start>4.5){group={start:word.start,end:word.end,text:word.text};result.push(group);}
   else{group.text+=' '+word.text;group.end=word.end;}
   if(/[.!?。！？]$/.test(word.text))group=null;
  }
  return result;
 }
 function drawSubtitles(){
  let text='';
  if(enabled&&subtitlesOn&&performance?.characterId===characterId&&snapshot?.utteranceId===performance.utteranceId&&snapshot.state==='speaking'){
   const position=Number(snapshot.positionSeconds)||0;
   if(cues.length){const cue=cues.find((c,i)=>position>=c.start&&position<(cues[i+1]?.start??c.end+.35));text=cue?.text||'';}
   else text=typeof performance.text==='string'?performance.text:'';
  }
  if(subtitleText.textContent!==text){subtitleText.textContent=text;subtitles.scrollTop=0;}
  subtitles.hidden=!text;vignette.hidden=!text;regions();
 }
 window.configurePlayerView=(value,changed)=>{
  enabled=value.mode==='player';characterId=value.character?.id||'';
  if(changed){performance=null;snapshot=null;cues=[];}
  subtitlesOn=value.subtitles!==false;captions.setAttribute('aria-pressed',String(subtitlesOn));
  toolbar.hidden=!enabled||value.nativeChrome===true;vignette.hidden=true;
  document.body.classList.toggle('native-player-chrome',value.nativeChrome===true);
  window.setPlayerOutput({volume:value.volume??output.volume,muted:value.muted??output.muted});
  closePanels();drawSubtitles();
 };
 window.setPlayerSpeech=(kind,value)=>{
  if(kind==='performance'){
   if(value.characterId!==characterId)return;
   performance=value;snapshot=null;cues=makeCues(value);
  }else if(kind==='playback'){
   if(value.characterId!==characterId||value.utteranceId!==performance?.utteranceId)return;
   if(snapshot?.utteranceId===value.utteranceId&&value.sequence<=snapshot.sequence)return;
   snapshot=value;
   if(['ended','cancelled','error'].includes(value.state)){performance=null;cues=[];}
  }else return;
  drawSubtitles();
 };
 captions.onclick=()=>{
  subtitlesOn=!subtitlesOn;captions.setAttribute('aria-pressed',String(subtitlesOn));
  post({action:'playerSubtitles',enabled:subtitlesOn});drawSubtitles();
 };
 modeButton.onclick=()=>{
  const open=modes.hidden;closePanels();if(!open)return;
  modes.replaceChildren(...Object.entries(viewNames).map(([id,label])=>{
   const button=document.createElement('button');button.type='button';button.role='menuitemradio';
   button.setAttribute('aria-label',label);button.setAttribute('aria-checked',String(id==='player'));button.textContent=label;
   if(id==='player'){const check=document.createElement('span');check.textContent='✓';button.append(check);}
   button.onclick=()=>{closePanels();if(id!=='player')post({action:'desktopMode',mode:id});};return button;
  }));
  modes.hidden=false;modeButton.setAttribute('aria-expanded','true');modes.querySelector('button').focus();regions();
 };
 speaker.onclick=()=>{
  clearTimeout(volumeHoverTimer);clearTimeout(volumeLeaveTimer);
  if(volumePanel.hidden){openVolume(true);return;}
  output.muted=!output.muted;drawOutput();post({action:'playerOutput',...output});
 };
 function scheduleVolumeHover(){
  if(volumePanel.hidden&&modes.hidden){clearTimeout(volumeHoverTimer);volumeHoverTimer=setTimeout(()=>openVolume(),180);}
 }
 speaker.addEventListener('mouseenter',scheduleVolumeHover);
 speaker.addEventListener('mousemove',scheduleVolumeHover);
 speaker.addEventListener('mouseleave',()=>clearTimeout(volumeHoverTimer));
 toolbar.addEventListener('mouseenter',()=>clearTimeout(volumeLeaveTimer));
 window.dismissPlayerHover=()=>{
  clearTimeout(volumeHoverTimer);
  if(!volumePanel.hidden&&!volumePinned){clearTimeout(volumeLeaveTimer);volumeLeaveTimer=setTimeout(closePanels,200);}
 };
 toolbar.addEventListener('mouseleave',window.dismissPlayerHover);
 slider.addEventListener('pointerdown',()=>{volumePinned=true;clearTimeout(volumeLeaveTimer);});
 slider.oninput=()=>{output.volume=Number(slider.value)/100;output.muted=false;drawOutput();post({action:'playerOutput',...output});};
 // Native click-through geometry follows the changing glass pill, including animation.
 new ResizeObserver(regions).observe(toolbar);
 document.addEventListener('keydown',event=>{
  if(!enabled)return;
  if(event.key==='Escape'){
   const volumeOpen=!volumePanel.hidden,menuOpen=!modes.hidden;
   if(volumeOpen||menuOpen){event.preventDefault();event.stopImmediatePropagation();closePanels();(volumeOpen?speaker:modeButton).focus();}
   else{event.preventDefault();post({action:'desktopMode',mode:'standard'});}
  }
  if(!modes.hidden&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();const buttons=[...modes.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
   buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  }
 });
 drawOutput();
})();
