import { FACE } from "./FaceMotionConfig";
import { buildFaceTimeline, sampleMouth } from "./FaceTimeline";
import type { Timeline, MouthPose } from "./FaceTimeline";
import type { FaceKey, FaceLibrary } from "./FacialExpressions";
import { normalizedFaceName } from "./FacialExpressions";

type Data = Record<string,any>;
const unit=(v:unknown,fallback=0):number=>typeof v==="number"&&Number.isFinite(v)?Math.max(0,Math.min(1,v)):fallback;
const ease=(a:number,b:number,dt:number,tau:number):number=>a+(b-a)*(1-Math.exp(-dt/tau));
const moodPreset:Record<string,string>={happy:"happy",amused:"happy",excited:"happy",sad:"sad",concerned:"sad",worried:"sad",angry:"angry",annoyed:"angry",surprised:"surprised",shy:"smiling",skeptical:"angry"};

/** One face compositor. No network, audio decoding, or model inference per frame. */
export class FaceMotion {
    private keys:readonly FaceKey[]=[];
    private library:FaceLibrary={version:1,presets:[]};
    private id="";private appearance="";
    private utterance:Data|undefined;private timeline:Timeline={cues:[],quality:"energy-only"};
    private snapshot:Data|undefined;private receivedAt=0;private terminal=false;
    private retired=new Set<string>();private generation=-1;private session="";
    private oldSessions=new Set<string>();
    private mood="neutral";private intensity=0;private phase="idle";private phaseAt=0;
    private ambientMood="neutral";private ambientIntensity=0;private reactionId="";private reactionMood="neutral";private reactionIntensity=0;private reactionUntil=0;private reactionDuration:number=FACE.reactionDuration;private reactionPlayed=false;
    private weights:Record<string,number>={};private previous=0;
    private nextBlink=0;private blinkStart=-Infinity;private doubleBlink=false;
    private nextMicro=0;private microStart=-Infinity;private microPreset="sad";
    private microKeys:string[]=[];
    private lookup=new Map<string,FaceKey>();
    public constructor(private readonly random:()=>number=Math.random) {}
    public bind(characterId:string,appearanceKey:string,keys:readonly FaceKey[],library:FaceLibrary,now:number):void {
        this.id=characterId;this.appearance=appearanceKey;this.keys=keys;this.library=library;
        this.lookup=new Map(keys.map(k=>[k.stableId,k]));this.utterance=undefined;this.snapshot=undefined;this.retired.clear();
        this.mood="neutral";this.intensity=0;this.weights={};this.previous=now;this.phase="idle";this.terminal=false;
        this.ambientMood="neutral";this.ambientIntensity=0;this.reactionId="";this.reactionUntil=0;this.reactionPlayed=false;this.microKeys=[];
        this.generation=-1;this.session="";this.oldSessions.clear();this.blinkStart=this.microStart=-Infinity;
        this.nextBlink=now/1000+this.range(FACE.blinkMin,FACE.blinkMax);this.nextMicro=now/1000+this.range(FACE.microMin,FACE.microMax);
    }
    public setLibrary(library:FaceLibrary):void {this.library=library;}
    private range(a:number,b:number):number{return a+(b-a)*unit(this.random());}
    private preset(name:string):Record<string,number>{return this.library.presets.find(p=>p.id===name)?.weights??{};}
    private isUpper(key:FaceKey):boolean{return key.group==="Eyes"||key.group==="Eyebrows";}
    private isCorner(key:FaceKey):boolean{return /mouth(smile|frown)(left|right)|口角|^にやり[12]?$|^smile$/.test(normalizedFaceName(key.name));}
    private expression(value:Data,now:number):void {
        if(!value||typeof value!=="object")return;
        const mood=typeof value.mood==="string"?value.mood:"neutral";
        if(value.ambient&&typeof value.ambient.mood==="string"&&typeof value.reactionId==="string"){
            this.ambientMood=value.ambient.mood;this.ambientIntensity=unit(value.ambient.intensity);
            if(value.reactionId!==this.reactionId){this.reactionId=value.reactionId;this.reactionMood=mood;this.reactionIntensity=unit(value.intensity);this.reactionDuration=Math.max(1,Math.min(6,Number(value.durationSeconds)||FACE.reactionDuration));this.reactionUntil=now+this.reactionDuration*1000;this.reactionPlayed=false;}
        }else{this.ambientMood=mood;this.ambientIntensity=unit(value.intensity);this.reactionUntil=0;this.reactionId="";}
    }
    private chooseMicro():string[] {
        const negative=["angry","annoyed","sad","worried","concerned"].includes(this.mood);
        const candidates=this.keys.filter(k=>k.group==="Eyebrows"&&
            (negative?/^(怒り|真面目|下)([lr左右])?$|browdown(left|right)/:/^(上|にこり)([lr左右])?$|brow(innerup|outerup(left|right))/).test(normalizedFaceName(k.name)));
        const sided=candidates.filter(k=>/[lr左右]$/.test(normalizedFaceName(k.name)));
        const choices=sided.length?sided:candidates;
        if(choices.length)return [choices[Math.min(choices.length-1,Math.floor(unit(this.random())*choices.length))].stableId];
        return Object.keys(this.preset(this.microPreset)).filter(id=>this.lookup.get(id)?.group==="Eyebrows").slice(0,1);
    }
    private retire():void {
        if(this.utterance){this.retired.add(this.utterance.utteranceId);if(this.retired.size>32)this.retired.delete(this.retired.values().next().value!);}
        this.utterance=undefined;this.snapshot=undefined;
    }
    public event(kind:string,value:unknown,now:number):boolean {
        if(!value||typeof value!=="object")return false;
        const data=value as Data;
        if(data.characterId!==this.id)return false;
        if(data.appearanceKey&&data.appearanceKey!==this.appearance)return false;
        if(data.identity?.sessionId&&this.oldSessions.has(data.identity.sessionId))return false;
        if(data.identity?.sessionId===this.session&&Number.isSafeInteger(data.identity.generation)&&data.identity.generation<this.generation)return false;
        if(kind==="phase"){
            const identity=data.identity;
            if(identity&&Number.isSafeInteger(identity.generation)){
                if(identity.sessionId===this.session&&identity.generation<this.generation)return false;
                if(this.session&&identity.sessionId!==this.session){this.oldSessions.add(this.session);if(this.oldSessions.size>16)this.oldSessions.delete(this.oldSessions.values().next().value!);}
                this.session=identity.sessionId;this.generation=identity.generation;
            }
            this.phase=String(data.type??"idle");this.phaseAt=now;
            if(["text.submit","input.commit","transcript.final"].includes(this.phase))this.phase="thinking";
            if(this.phase==="input.begin"&&!this.utterance)this.phase="listening";
            if(data.expression)this.expression(data.expression,now);
            if(["cancel","error","listening","thinking","text.submit","input.commit"].includes(this.phase))this.retire();
            return true;
        }
        if(kind==="performance"){
            if(typeof data.utteranceId!=="string"||!data.utteranceId||this.retired.has(data.utteranceId))return false;
            if(this.utterance?.utteranceId===data.utteranceId)return false;
            this.retire();this.utterance=data;this.timeline=buildFaceTimeline(data);this.terminal=false;this.phase="ready";
            if(data.expression)this.expression(data.expression,now);
            return true;
        }
        if(kind!=="playback"||!this.utterance||data.utteranceId!==this.utterance.utteranceId||this.terminal)return false;
        if(!Number.isSafeInteger(data.sequence)||data.sequence<0||(this.snapshot&&data.sequence<=this.snapshot.sequence))return false;
        if(typeof data.positionSeconds!=="number"||!Number.isFinite(data.positionSeconds)||data.positionSeconds<0)return false;
        if(!["speaking","ready","paused","buffering","ended","cancelled","error"].includes(data.state))return false;
        this.snapshot=data;this.receivedAt=now;this.phase=data.state;
        if(data.state==="speaking"&&this.reactionId&&!this.reactionPlayed){this.reactionUntil=now+this.reactionDuration*1000;this.reactionPlayed=true;}
        if(["ended","cancelled","error"].includes(data.state)){this.terminal=true;this.retire();}
        return true;
    }
    public sample(now:number,suspended=false):Record<string,number> {
        const dt=Math.max(0,Math.min(FACE.maxDt,(now-this.previous)/1000));this.previous=now;
        const neutral=this.preset("neutral"),target:Record<string,number>={...neutral};
        if(suspended){this.weights={...neutral};return this.weights;}
        const reacting=now<this.reactionUntil;
        this.mood=reacting?this.reactionMood:this.ambientMood;this.intensity=reacting?this.reactionIntensity:this.ambientIntensity;
        const age=(now-this.receivedAt)/1000;
        const speaking=this.snapshot?.state==="speaking"&&age>=0&&age<FACE.staleClock;
        const mouthOwned=!!this.utterance;
        const emotion={...this.preset(moodPreset[this.mood]??"neutral")};
        if(["happy","amused","excited"].includes(this.mood))for(const [id,weight] of Object.entries(this.preset("smiling"))){const key=this.lookup.get(id);if(key&&this.isCorner(key))emotion[id]=Math.max(emotion[id]??0,weight);}
        const add=(id:string,value:number):void=>{if(this.lookup.has(id))target[id]=Math.max(target[id]??0,unit(value));};
        for(const [id,weight] of Object.entries(emotion)){
            const key=this.lookup.get(id);if(!key)continue;
            const gain=this.isUpper(key)?(key.group==="Eyes"&&["happy","shy"].includes(this.mood)?FACE.happyEyes:1):this.isCorner(key)?(mouthOwned?FACE.speakingCorners:1):(mouthOwned?0:FACE.idleMouth);
            add(id,weight*this.intensity*gain);
        }
        // Broad/whole-face emotion morphs never enter the speech mouth layer.
        const seconds=now/1000;
        if(seconds>=this.nextMicro){this.microStart=seconds;this.nextMicro=seconds+this.range(FACE.microMin,FACE.microMax);this.microPreset=["angry","annoyed"].includes(this.mood)?"angry":"surprised";this.microKeys=this.chooseMicro();}
        const microTime=seconds-this.microStart;
        if(microTime>=0&&microTime<FACE.microDuration){
            const amount=Math.sin(Math.PI*microTime/FACE.microDuration)*FACE.microStrength;
            for(const id of this.microKeys)target[id]=unit((target[id]??0)+amount);
        }
        if(now-this.phaseAt<FACE.phaseTimeout*1000&&["thinking","text.submit","listening","input.begin"].includes(this.phase)){
            for(const [id,weight] of Object.entries(this.preset("surprised"))){if(this.lookup.get(id)?.group==="Eyebrows")add(id,weight*.12);}
        }
        const blink:Record<string,number>={};
        if(seconds>=this.nextBlink){this.blinkStart=seconds;this.doubleBlink=this.random()<FACE.doubleBlinkChance;this.nextBlink=seconds+this.range(FACE.blinkMin,FACE.blinkMax);}
        let blinkTime=seconds-this.blinkStart;
        if(this.doubleBlink&&blinkTime>FACE.blinkDuration+FACE.doubleBlinkGap)blinkTime-=FACE.blinkDuration+FACE.doubleBlinkGap;
        const closing=blinkTime>=0&&blinkTime<FACE.blinkDuration?Math.sin(Math.PI*blinkTime/FACE.blinkDuration)**2:0;
        for(const [id,weight] of Object.entries(this.preset("closed")))blink[id]=weight*closing;
        for(const key of this.keys)if(key.group==="Eyes")target[key.stableId]=(target[key.stableId]??0)*(1-closing);
        // Tiny gaze shifts use explicit eye-look shapes only, never head bones
        // or unrecognized author helper morphs.
        const gaze=Math.sin(seconds*.73)*.035*(speaking?.5:1);
        for(const key of this.keys){const name=normalizedFaceName(key.name);if(/eyelook(inleft|outright)$/.test(name))add(key.stableId,Math.max(0,gaze));else if(/eyelook(outleft|inright)$/.test(name))add(key.stableId,Math.max(0,-gaze));}

        const mouth:Record<string,number>={};
        if(speaking&&this.snapshot){
            const clock=this.snapshot.positionSeconds+Math.min(FACE.extrapolate,age)*Math.max(.25,Math.min(3,this.snapshot.playbackRate??1));
            const e=typeof this.snapshot.energy==="number"?unit(this.snapshot.energy):undefined;
            const samples=this.timeline.quality==="energy-only"?{a:e??0}:sampleMouth(this.timeline.cues,clock+FACE.anticipation);
            for(const [pose,weight] of Object.entries(samples) as [MouthPose,number][]){
                if(pose==="rest"||pose==="mbp")continue;
                const phoneme=this.preset(pose==="fv"?"i":pose);
                // Bilabials close the mouth; do not blend an opening across them.
                for(const [id,value] of Object.entries(phoneme)){
                    const key=this.lookup.get(id);if(key&&key.group==="Mouth")mouth[id]=(mouth[id]??0)+value*weight*(1-(samples.mbp??0))*(e===undefined?1:Math.min(1,e*2));
                }
            }
        }
        let mouthSum=Object.values(mouth).reduce((a,b)=>a+b,0);
        for(const key of this.keys){
            const id=key.stableId;
            if(key.group==="Mouth"&&!this.isCorner(key))target[id]=mouthOwned?(mouth[id]??0)*Math.min(1,FACE.maxMouth/Math.max(.001,mouthSum)):target[id]??0;
            // Silence/pause/cancel closes speech shapes; saved Neutral is restored.
            const desired=Math.max(target[id]??0,blink[id]??0);
            const old=this.weights[id]??neutral[id]??0;
            const tau=key.group==="Mouth"?(desired>old?FACE.attack:FACE.release):(Object.prototype.hasOwnProperty.call(blink,id)||closing>0&&key.group==="Eyes")?FACE.attack:reacting?FACE.reactionEase:FACE.emotionEase;
            this.weights[id]=unit(ease(old,desired,dt,tau));
        }
        if(mouthOwned){
            const speechKeys=this.keys.filter(k=>k.group==="Mouth"&&!this.isCorner(k));
            const sum=speechKeys.reduce((n,k)=>n+(this.weights[k.stableId]??0),0);
            if(sum>FACE.maxMouth)for(const key of speechKeys)this.weights[key.stableId]*=FACE.maxMouth/sum;
        }
        return this.weights;
    }
    public inspect(){return {characterId:this.id,appearanceKey:this.appearance,mood:this.mood,intensity:this.intensity,ambientMood:this.ambientMood,reactionId:this.reactionId,phase:this.phase,quality:this.timeline.quality,cues:this.timeline.cues.length,utteranceId:this.utterance?.utteranceId??null,capabilities:{mouth:["a","i","u","e","o"].some(p=>Object.keys(this.preset(p)).some(id=>this.lookup.get(id)?.group==="Mouth")),blink:Object.keys(this.preset("closed")).length>0,keys:this.keys.length},weights:{...this.weights}};}
}
