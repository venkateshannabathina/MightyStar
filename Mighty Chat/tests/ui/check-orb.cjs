const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../../Sources');
const context2d={setTransform(){},clearRect(){},createRadialGradient(){return {addColorStop(){}}},fillRect(){},beginPath(){},arc(){},fill(){}};
function element(){return {dataset:{},hidden:true,style:{},attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v},append(...c){this.children.push(...c)},appendChild(c){this.append(c)},replaceChildren(...c){this.children=c},getContext(){return context2d},querySelector(k){return this.parts[k]??=element()},parts:{},addEventListener(k,fn){this.events??={};this.events[k]=fn},setPointerCapture(){},focus(){},contentWindow:{postMessage(){}}}}
const els=Object.fromEntries(['orb','viewer','menu','resize','desktopHint'].map(k=>[k,element()]));els.orb.id='orb';
const sent=[],listeners={};const document={hidden:false,body:{},createElement:element,createElementNS:element,getElementById:k=>els[k],addEventListener(k,fn){listeners[k]=fn}};
const scope={document,Math,devicePixelRatio:1,matchMedia:()=>({matches:false}),IntersectionObserver:class {observe(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},console};scope.window=scope;scope.addEventListener=()=>{};scope.webkit={messageHandlers:{companion:{postMessage:v=>sent.push(v)}}};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'particle-orb.js'),'utf8'),scope);
const orb=new scope.ParticleOrb(els.orb);
assert.equal(els.orb.children.length,2);assert.equal(els.orb.children[0].className,'orb-ring');
assert.equal(orb.expand(),true);assert.equal(orb.expand(),false);orb.collapse();assert.equal(els.orb.dataset.open,'false');
for(const state of ['listening','thinking','idle']){orb.speech('orb',{state});assert.equal(els.orb.dataset.state,state)}
orb.speech('playback',{state:'speaking'});assert.equal(els.orb.dataset.state,'speaking');
orb.speech('playback',{state:'cancelled'});assert.equal(els.orb.dataset.state,'idle');
orb.speech('orb',{state:'error'});assert.equal(els.orb.dataset.state,'error');
els.orb.events.pointerdown({button:0});assert.equal(els.orb.dataset.held,'true');
els.orb.events.pointercancel();assert.equal(els.orb.dataset.held,'false');
console.log('Legacy ring expansion, hold/cancel appearance, speech and error states passed');
