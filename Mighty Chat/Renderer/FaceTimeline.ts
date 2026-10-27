import { FACE } from "./FaceMotionConfig";

export type MouthPose = "rest"|"a"|"i"|"u"|"e"|"o"|"mbp"|"fv";
export type MouthCue = {start:number;end:number;pose:MouthPose;strength:number};
export type Timeline = {cues:MouthCue[];quality:"provider-visemes"|"word-estimate"|"energy-only"};
const finite = (v:unknown):v is number => typeof v==="number"&&Number.isFinite(v);
const poses = new Set(["rest","a","i","u","e","o","mbp","fv"]);
const phonemes:Record<string,MouthPose> = {sil:"rest",silence:"rest",x:"rest",pp:"mbp",ff:"fv",aa:"a",ih:"i",ee:"i",oh:"o",ou:"u",th:"i",dd:"i",ss:"i",nn:"i",rr:"u",kk:"a",ch:"u"};

/** Language-limited grapheme estimate, never presented as forced alignment. */
function sounds(text:string):MouthPose[] {
    const normalized=text.normalize("NFKC").toLowerCase();
    const common:Record<string,string>={hello:"eou",you:"u",your:"uo",the:"e",this:"i",that:"ae",i:"ai",my:"mbpai",me:"mbpi",we:"ui",love:"afv",have:"afv",good:"ua",what:"ua",how:"ao",are:"a",thank:"aei",thanks:"aei",no:"no",yes:"ie",please:"mbpii",okay:"oae"};
    const letters=common[normalized]??normalized;
    const result:MouthPose[]=[];
    for(let i=0;i<letters.length;i++) {
        if(letters.slice(i,i+3)==="mbp"){result.push("mbp");i+=2;continue;}
        if(letters.slice(i,i+2)==="fv"){result.push("fv");i++;continue;}
        const ch=letters[i];let pose:MouthPose|undefined;
        if(/[あかがさざただなはばぱまゃやらわぁアカガサザタダナハバパマャヤラワァaæɑ]/.test(ch))pose="a";
        else if(/[いきぎしじちぢにひびぴみりぃイキギシジチヂニヒビピミリィiy]/.test(ch))pose="i";
        else if(/[うくぐすずつづぬふぶぷむゅゆるぅウクグスズツヅヌフブプムュユルゥuw]/.test(ch))pose="u";
        else if(/[えけげせぜてでねへべぺめれぇエケゲセゼテデネヘベペメレェeɛ]/.test(ch))pose="e";
        else if(/[おこごそぞとどのほぼぽもょよろをぉオコゴソゾトドノホボポモョヨロヲォoɔ]/.test(ch))pose="o";
        else if(/[mbp]/.test(ch))pose="mbp";
        else if(/[fv]/.test(ch))pose="fv";
        else if(/[stzcdn]/.test(ch))pose="i";
        if(pose && result.at(-1)!==pose)result.push(pose);
    }
    return result;
}

export function buildFaceTimeline(value:unknown):Timeline {
    const input=value&&typeof value==="object"?value as Record<string,unknown>:{};
    const cues:MouthCue[]=[];
    for(const raw of (Array.isArray(input.mouthCues)?input.mouthCues:[]).slice(0,FACE.maxCues)){
        if(!raw||!finite(raw.start)||!finite(raw.end)||raw.start<0||raw.end<=raw.start||raw.end>FACE.maxDuration)continue;
        const name=String(raw.pose??raw.value??"").toLowerCase();
        const pose=(poses.has(name)?name:phonemes[name]) as MouthPose|undefined;
        if(pose)cues.push({start:raw.start,end:raw.end,pose,strength:finite(raw.strength)?Math.max(0,Math.min(1,raw.strength)):1});
    }
    if(cues.length)return {cues:cues.sort((a,b)=>a.start-b.start),quality:"provider-visemes"};
    for(const word of (Array.isArray(input.words)?input.words:[]).slice(0,FACE.maxWords)){
        if(!word||typeof word.text!=="string"||!finite(word.start)||!finite(word.end)||word.start<0||word.end<=word.start||word.end>FACE.maxDuration)continue;
        const sequence=sounds(word.text.slice(0,120));
        if(!sequence.length)continue;
        const step=(word.end-word.start)/sequence.length;
        sequence.forEach((pose,index)=>{if(cues.length<FACE.maxCues)cues.push({start:word.start+step*index,end:word.start+step*(index+1),pose,strength:pose==="mbp"?1:.8});});
    }
    return {cues:cues.sort((a,b)=>a.start-b.start),quality:cues.length?"word-estimate":"energy-only"};
}

export function sampleMouth(cues:readonly MouthCue[],time:number):Partial<Record<MouthPose,number>> {
    const weights:Partial<Record<MouthPose,number>>={};
    // Binary search bounds the work even for a long utterance.
    let low=0,high=cues.length;
    while(low<high){const mid=(low+high)>>>1;if(cues[mid].start<time+FACE.blend)low=mid+1;else high=mid;}
    for(let i=Math.max(0,low-8);i<low;i++){
        const cue=cues[i],ramp=FACE.blend;
        if(time<cue.start-ramp||time>cue.end+ramp)continue;
        const value=Math.max(0,Math.min(1,(time-cue.start+ramp)/ramp,(cue.end+ramp-time)/ramp))*cue.strength;
        weights[cue.pose]=Math.max(weights[cue.pose]??0,value);
    }
    const sum=Object.values(weights).reduce((a,b)=>a+b,0);
    if(sum>1)for(const key of Object.keys(weights) as MouthPose[])weights[key]!/=sum;
    return weights;
}
