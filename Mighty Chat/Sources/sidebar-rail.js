/* The compact avatar rail is the permanent sidebar presentation. */
function renderSidebarRail(){
 const query=document.getElementById('search').value.trim().toLowerCase();
 const home=document.getElementById('shell').classList.contains('is-home');
 const matches=contacts.map((character,index)=>({character,index})).filter(({character})=>!query||character.name.toLowerCase().includes(query)||(saved[character.id]||[]).some(message=>String(message.text).toLowerCase().includes(query)));
 document.getElementById('railChats').innerHTML=matches.map(({character,index})=>`<button class="rail-character ${index===selected&&!home?'selected':''}" aria-label="${escapeHTML(character.name)}" data-tooltip="${escapeHTML(character.name)}" aria-current="${index===selected&&!home?'true':'false'}" onclick="selectChat(${index})"><span class="avatar photo" style="background:${/^#[a-f\d]{3,8}$/i.test(character.color)?character.color:'#d0dec9'}">${characterAvatar(character)}</span>${character.unread?'<span class="rail-unread" aria-label="Unread messages"></span>':''}</button>`).join('');
}
function initializeSidebar(){
 const expanded=document.getElementById('sidebarExpanded');
 const rail=document.getElementById('sidebarRail');
 document.getElementById('shell').classList.add('sidebar-collapsed');
 expanded.hidden=true;expanded.inert=true;expanded.setAttribute('aria-hidden','true');
 rail.inert=false;rail.setAttribute('aria-hidden','false');
 document.getElementById('search').value='';
 try{localStorage.setItem('mightySidebarCollapsed','true');}catch{}
 renderSidebarRail();
}
