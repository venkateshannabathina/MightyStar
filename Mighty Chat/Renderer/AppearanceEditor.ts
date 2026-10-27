import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import type { Material } from "@babylonjs/core/Materials/material";
import { defaultFaceLibrary, faceKeyGroup, sanitizeFaceLibrary, sanitizeFaceWeights } from "./FacialExpressions";
import type { FaceKey, FaceLibrary } from "./FacialExpressions";

export type EditorSettings = {version:1;appearanceKey:string;face:Record<string,number>;hiddenParts:string[];expressionLibrary?:FaceLibrary};
type Part = {id:string;name:string;visible:(value:boolean)=>void;restore:()=>void};
type Expression = FaceKey & {set:(value:number)=>void};

/** Edits the loaded character's real morphs and mesh/material visibility. */
export class AppearanceEditor {
    private parts:Part[]=[];
    private expressions:Expression[]=[];
    private clones:Material[]=[];
    private key="";
    private preview:Record<string,number>|null=null;
    private motion:Record<string,number>|null=null;
    private applied=new Map<string,number>();
    private settings:EditorSettings={version:1,appearanceKey:"",face:{},hiddenParts:[]};

    public bind(container:AssetContainer,model:MmdModel|undefined,key:string):void {
        this.clear(); this.key=key;
        container.meshes.filter(mesh=>mesh.getTotalVertices()>0).forEach((mesh,index)=>{
            const multi=mesh.material as Material & {subMaterials?:Array<Material|null>};
            if (multi?.subMaterials) {
                multi.subMaterials.forEach((material,slot)=>{
                    if(!material) return;
                    const copy=material.clone(material.name+" editor visibility");
                    if(!copy) return;
                    this.clones.push(copy); multi.subMaterials![slot]=copy;
                    const alpha=copy.alpha,mode=copy.transparencyMode,depth=copy.disableDepthWrite;
                    const outlined=copy as Material & {renderOutline?:boolean};
                    const outline=outlined.renderOutline;
                    this.parts.push({id:`part:${index}:${slot}`,name:material.name||`Part ${slot+1}`,
                        visible:visible=>{copy.alpha=visible?alpha:0;copy.transparencyMode=visible?mode:2;copy.disableDepthWrite=visible?depth:true;outlined.renderOutline=visible?outline:false;},
                        restore:()=>{multi.subMaterials![slot]=material;}});
                });
            } else {
                const visible=mesh.isVisible;
                this.parts.push({id:`mesh:${index}`,name:mesh.name||`Mesh ${index+1}`,visible:value=>{mesh.isVisible=visible&&value;},restore:()=>{mesh.isVisible=visible;}});
            }
        });
        const occurrences=new Map<string,number>();
        const descriptor=(name:string,index:number,englishName="",category?:number):FaceKey=>{
            const count=occurrences.get(name)??0;occurrences.set(name,count+1);
            return {id:`morph:${index}`,stableId:`key:${encodeURIComponent(name)}:${count}`,name,englishName,group:faceKeyGroup(name+" "+englishName,category)};
        };
        if(model) {
            model.morph.morphs.forEach((morph,index)=>{
                const metadata=model.mesh.metadata as {morphs?:Array<{category?:number;englishName?:string;type?:number}>};
                const info=metadata.morphs?.[index];
                // Keep author-specific helpers accessible in Other model keys.
                // Impulse morphs drive physics rather than facial geometry.
                if(info?.type!==10)this.expressions.push({...descriptor(morph.name,index,info?.englishName,info?.category),set:value=>model.morph.setMorphWeightFromIndex(index,value)});
            });
        } else {
            const targets=new Map<string,Array<{influence:number}>>();
            container.meshes.forEach(mesh=>{const manager=mesh.morphTargetManager;if(!manager)return;
                for(let i=0;i<manager.numTargets;i++){const target=manager.getTarget(i);const list=targets.get(target.name)??[];if(!list.includes(target))list.push(target);targets.set(target.name,list);}
            });
            [...targets].forEach(([name,list],index)=>this.expressions.push({...descriptor(name,index),set:value=>list.forEach(target=>{target.influence=value;})}));
        }
    }
    public apply(value:unknown):void {
        const data=value&&typeof value==="object"?value as Partial<EditorSettings>:{};
        const matches=data.appearanceKey===this.key;
        const hidden=new Set(matches&&Array.isArray(data.hiddenParts)?data.hiddenParts.filter(id=>typeof id==="string"):[]);
        const face:Record<string,number>={};
        for(const expression of this.expressions){const raw=matches?data.face?.[expression.id]:0;const weight=typeof raw==="number"&&Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):0;face[expression.id]=weight;}
        this.parts.forEach(part=>part.visible(!hidden.has(part.id)));
        const defaults=defaultFaceLibrary(this.expressions,this.key,face);
        const library=matches&&data.expressionLibrary?sanitizeFaceLibrary(data.expressionLibrary,this.expressions,defaults):undefined;
        this.settings={version:1,appearanceKey:this.key,face,hiddenParts:this.parts.filter(part=>hidden.has(part.id)).map(part=>part.id),...(library?{expressionLibrary:library}:{})};
        this.applyFace();
    }
    public previewFace(value:unknown):void {this.preview=value===null?null:sanitizeFaceWeights(value,this.expressions);this.applyFace();}
    private applyFace():void {
        const weights=this.preview??this.motion??this.settings.expressionLibrary?.presets.find(p=>p.id==="neutral")?.weights;
        for(const expression of this.expressions){const weight=weights?weights[expression.stableId]??0:this.settings.face[expression.id]??0;if(Math.abs((this.applied.get(expression.stableId)??-1)-weight)>.0001){expression.set(weight);this.applied.set(expression.stableId,weight);}}
    }
    public inspect(){return {parts:this.parts.map(({id,name})=>({id,name})),expressions:this.expressions.map(({set,...key})=>key),settings:this.settings,
        expressionLibrary:this.settings.expressionLibrary??defaultFaceLibrary(this.expressions,this.key,this.settings.face),
        defaultExpressions:defaultFaceLibrary(this.expressions,this.key),preview:this.preview};}
    /** The only runtime writer; authoring previews always have priority. */
    public animateFace(weights:Record<string,number>|null):void {this.motion=weights;this.applyFace();}
    public isPreviewing():boolean{return this.preview!==null;}
    public clear():void {
        this.expressions.forEach(expression=>expression.set(0));this.parts.forEach(part=>part.restore());this.clones.forEach(material=>material.dispose());
        this.parts=[];this.expressions=[];this.clones=[];this.key="";this.preview=null;this.motion=null;this.applied.clear();
    }
}
