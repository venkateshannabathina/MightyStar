/* Home-only image selection. Native storage owns imported files and preferences. */
(() => {
 const storageKey='mightyHomeBackgroundState';
 const presets=window.MIGHTY_BACKGROUNDS||[];
 const defaultId='bundled-1';
 const customPattern=/^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
 let importing=false;
 function normalize(value){
  const custom=[];
  for(const item of Array.isArray(value?.custom)?value.custom:[]){
   if(!item||!customPattern.test(item.id)||custom.some(existing=>existing.id===item.id))continue;
   const url=`mighty-background://image/${item.id}.jpg`;
   const thumbnail=`mighty-background://image/${item.id}-thumb.jpg`;
   if(item.url!==url||item.thumbnail!==thumbnail)continue;
   custom.push({id:item.id,name:String(item.name||'My background').slice(0,80),url,thumbnail});
  }
  const selectedId=value?.selectedId;
  return {selectedId:selectedId==='none'||presets.some(item=>item.id===selectedId)||custom.some(item=>item.id===selectedId)?selectedId:defaultId,custom};
 }
 let state=normalize(readStored(storageKey,{}));
 function remember(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
 function selectedBackground(){return [...presets,...state.custom].find(item=>item.id===state.selectedId);}
 window.applyHomeBackground=()=>{
  const image=document.getElementById('homeBackground');
  const item=selectedBackground();
  image.hidden=!item;
  image.dataset.backgroundId=state.selectedId;
  if(!item){image.removeAttribute('src');return;}
  if(image.getAttribute('src')!==item.url)image.src=item.url;
  image.onerror=()=>{
   const fallback=presets.find(preset=>preset.id===defaultId);
   if(fallback&&image.getAttribute('src')!==fallback.url)image.src=fallback.url;
   else image.hidden=true;
  };
 };
 function choice(item,custom=false){
  const active=state.selectedId===item.id;
  return `<div class="background-item"><button class="background-choice ${active?'selected':''}" data-background-id="${item.id}" aria-label="${escapeHTML(item.name)}" aria-pressed="${active}" onclick="selectHomeBackground('${item.id}')"><span class="background-thumbnail"><img src="${escapeHTML(item.thumbnail)}" alt="" loading="lazy" draggable="false">${active?`<span class="background-check">${symbol('checkmark')}</span>`:''}</span><span class="background-name">${escapeHTML(item.name)}</span></button>${custom?`<button class="background-remove icon" aria-label="Remove ${escapeHTML(item.name)}" onclick="removeHomeBackground('${item.id}')">${symbol('xmark')}</button>`:''}</div>`;
 }
 window.renderBackgroundSettings=()=>pageTitle('Background','Choose a background for your home page.')+
  `<section class="settings-section background-section"><div class="background-section-header"><h2 class="section-label">BACKGROUNDS</h2>${gloss(symbol('plus')+' Add background','addHomeBackground()','white',`id="addBackground" ${importing?'disabled aria-busy="true"':''}`)}</div><div class="background-grid" aria-label="Backgrounds">${presets.map(item=>choice(item)).join('')}</div></section>`+
  (state.custom.length?`<section class="settings-section background-section"><div class="background-section-header"><h2 class="section-label">YOUR BACKGROUNDS</h2></div><div class="background-grid" aria-label="Your backgrounds">${state.custom.map(item=>choice(item,true)).join('')}</div></section>`:'');
 function refresh(){
  applyHomeBackground();
  if(typeof settingsPage==='undefined'||settingsPage!=='Background'||document.getElementById('settingsShell').hidden)return;
  const focused=document.activeElement;
  const focusedId=focused?.dataset.backgroundId;
  const wasAdd=focused?.id==='addBackground';
  document.getElementById('settingsContent').innerHTML=renderBackgroundSettings();
  if(focusedId)document.querySelector(`[data-background-id="${focusedId}"]`)?.focus({preventScroll:true});
  else if(wasAdd)document.getElementById('addBackground')?.focus({preventScroll:true});
 }
 window.selectHomeBackground=id=>{
  if(id!=='none'&&![...presets,...state.custom].some(item=>item.id===id))return;
  state.selectedId=id;remember();refresh();
  nativeCompanion({action:'selectHomeBackground',id});
 };
 window.addHomeBackground=()=>{
  if(importing)return;
  importing=true;refresh();
  if(!nativeCompanion({action:'importHomeBackground'})){
   importing=false;refresh();toast('Open MightyStar to add a background from your Mac.');
  }
 };
 window.removeHomeBackground=id=>{
  if(!state.custom.some(item=>item.id===id))return;
  if(!nativeCompanion({action:'removeHomeBackground',id})){
   state.custom=state.custom.filter(item=>item.id!==id);
   if(state.selectedId===id)state.selectedId=defaultId;
   remember();refresh();
  }
 };
 window.mightyBackgroundState=value=>{
  if(!value||typeof value!=='object')return;
  importing=false;state=normalize(value);remember();refresh();
  if(typeof value.error==='string'&&value.error)toast(value.error);
 };
 window.initializeHomeBackground=()=>{applyHomeBackground();nativeCompanion({action:'homeBackgroundState'});};
})();
