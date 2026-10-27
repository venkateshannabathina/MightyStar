/** Model-owned keys are the source of truth; aliases only suggest starter poses. */
export type FaceKey = {id:string;stableId:string;name:string;englishName:string;group:string};
export type FacePreset = {id:string;name:string;kind:"builtin"|"custom";weights:Record<string,number>};
export type FaceLibrary = {version:1;presets:FacePreset[]};
export const facePresetNames = [
    ["neutral","Neutral"],["smiling","Smiling"],["sad","Sad"],["angry","Angry"],
    ["happy","Happy"],["surprised","Surprised"],["closed","Closed"],
    ["closedRight","Closed (Right)"],["closedLeft","Closed (Left)"],
    ["a","A"],["i","I"],["u","U"],["e","E"],["o","O"]
];
export const normalizedFaceName = (name:string):string => name.normalize("NFKC").toLowerCase().replace(/[\s_.:\-()[\]]/g,"");
export function faceKeyGroup(name:string,category?:number):string {
    name=name.trim();
    if (/tooth|teeth|tongue|歯|齒|舌/i.test(name)) return "Mouth inside & teeth";
    if (category===1 || /brow|眉/i.test(name)) return "Eyebrows";
    if (category===2 || /eye|iris|pupil|blink|wink|まばたき|ウィンク|ｳｨﾝｸ|瞳|目|眼/i.test(name)) return "Eyes";
    if (category===3 || /mouth|mth|jaw|lip|viseme|smile|frown|口/i.test(name) || /^[あいうえおアイウエオ]$/.test(name)) return "Mouth";
    return "Other model keys";
}
export function sanitizeFaceWeights(value:unknown,keys:readonly FaceKey[]):Record<string,number> {
    const input=value && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
    const weights:Record<string,number>={};
    for (const key of keys) {
        const raw=Object.prototype.hasOwnProperty.call(input,key.stableId)?input[key.stableId]:undefined;
        if(typeof raw==="number" && Number.isFinite(raw) && raw>0) weights[key.stableId]=Math.min(1,raw);
    }
    return weights;
}
export function defaultFaceLibrary(keys:readonly FaceKey[],appearanceKey:string,legacyFace?:Record<string,number>):FaceLibrary {
    const presets:FacePreset[]=facePresetNames.map(([id,name])=>({id,name,kind:"builtin",weights:{}}));
    const byId=new Map(presets.map(p=>[p.id,p]));
    const add=(preset:string,aliases:string[],weight:number,group?:string,all=false):boolean=>{
        for(const alias of aliases){
            const matches=keys.filter(key=>(!group||key.group===group) && [key.name,key.englishName].some(name=>normalizedFaceName(name)===normalizedFaceName(alias)));
            if(matches.length){for(const key of all?matches:matches.slice(0,1))byId.get(preset)!.weights[key.stableId]=weight;return true;}
        }
        return false;
    };
    if(legacyFace)for(const key of keys){const value=legacyFace[key.id];if(typeof value==="number"&&Number.isFinite(value)&&value>0)byId.get("neutral")!.weights[key.stableId]=Math.min(1,value);}
    // This is the current character. Exact Japanese keys avoid the author's
    // duplicated English aliases (e.g. several Fac_Eye_Close shapes).
    if(appearanceKey==="zzz/chars/Evelyn Chevalier/Evelyn.pmx") {
        const poses:Record<string,Record<string,number>>={
            smiling:{"にやり":.55,"口角上げ":.8,"笑い":.18},
            sad:{"悲しい":.65,"悲しむ":.3,"口角下げ":.35},
            angry:{"怒り":.65,"怒り目":.4,"口角下げ":.25},
            happy:{"笑い":1,"い２":.6,"ワ":.5},
            surprised:{"びっくり右":.7,"びっくり左":.7,"上":.45,"お２":.5},
            closed:{"まばたき":1},closedRight:{"ｳｨﾝｸ２右":1},closedLeft:{"ウィンク２":1},
            a:{"あ":.8},i:{"い":.8},u:{"う":.8},e:{"え":.8},o:{"お２":.8}
        };
        for(const [preset,pose] of Object.entries(poses))for(const [name,weight] of Object.entries(pose))add(preset,[name],weight);
        return {version:1,presets};
    }
    const smile=["にやり","口角上げ","mouthSmile","smile","Fcl_MTH_Joy"];
    const smileEyes=["笑い","eyeSmile","Fcl_EYE_Joy"];
    for(const id of ["smiling","happy"]){
        const weight=id==="happy"?.75:.45;
        if(!add(id,smile,weight,"Mouth")){
            add(id,["mouthSmileLeft"],weight);add(id,["mouthSmileRight"],weight);
        }
        add(id,smileEyes,id==="happy"?.8:.15,"Eyes");
    }
    add("happy",["ワ","あ","jawOpen"],.25,"Mouth");
    add("sad",["悲しい","困る","browInnerUp"],.55,"Eyebrows");
    if(!add("sad",["口角下げ","Fcl_MTH_Sorrow"],.4,"Mouth")){
        add("sad",["mouthFrownLeft"],.4);add("sad",["mouthFrownRight"],.4);
    }
    add("angry",["怒り","真面目","Fcl_BRW_Angry"],.6,"Eyebrows");
    add("angry",["browDownLeft"],.55);add("angry",["browDownRight"],.55);
    add("angry",["怒り目","Fcl_EYE_Angry"],.35,"Eyes");
    add("surprised",["びっくり","見開き","Fcl_EYE_Surprised"],.65,"Eyes");
    for(const side of ["Left","Right"]){add("surprised",["eyeWide"+side],.65);add("surprised",["browOuterUp"+side],.45);}
    add("surprised",["上","眉上","browInnerUp"],.4,"Eyebrows");
    add("surprised",["お","お２","jawOpen","Fcl_MTH_Surprised"],.5,"Mouth");
    if(!add("closed",["まばたき","blink","Fcl_EYE_Close"],1,"Eyes")){
        add("closed",["eyeBlinkLeft"],1);add("closed",["eyeBlinkRight"],1);
    }
    add("closedRight",["ウィンク右","ｳｨﾝｸ２右","eyeBlinkRight","blinkRight","Fcl_EYE_Close_R"],1,"Eyes");
    add("closedLeft",["ウィンク","ウィンク２","eyeBlinkLeft","blinkLeft","Fcl_EYE_Close_L"],1,"Eyes");
    const vowels:Record<string,string[]>={a:["あ","A","aa","viseme_aa","Fcl_MTH_A","jawOpen"],i:["い","I","ih","viseme_ih","Fcl_MTH_I"],u:["う","U","ou","viseme_ou","Fcl_MTH_U","mouthPucker"],e:["え","E","ee","viseme_E","Fcl_MTH_E"],o:["お","O","oh","viseme_oh","Fcl_MTH_O","mouthFunnel"]};
    for(const [id,aliases] of Object.entries(vowels))add(id,aliases,.8);
    return {version:1,presets};
}
export function sanitizeFaceLibrary(value:unknown,keys:readonly FaceKey[],defaults:FaceLibrary):FaceLibrary {
    const input=value && typeof value==="object" ? (value as {presets?:unknown}).presets : undefined;
    if(!Array.isArray(input))return defaults;
    const ids=new Set<string>();const presets:FacePreset[]=[];
    const builtin=new Map(facePresetNames.map(([id,name])=>[id,name]));
    for(const raw of input.slice(0,128)){
        if(!raw||typeof raw!=="object"||typeof raw.id!=="string"||!raw.id||raw.id.length>100||ids.has(raw.id))continue;
        const name=builtin.get(raw.id)??(typeof raw.name==="string"?raw.name.trim().slice(0,60):"");
        if(!name)continue;
        ids.add(raw.id);presets.push({id:raw.id,name,kind:builtin.has(raw.id)?"builtin":"custom",weights:sanitizeFaceWeights(raw.weights,keys)});
    }
    for(const preset of defaults.presets)if(!ids.has(preset.id))presets.push(preset);
    return {version:1,presets};
}
