export type GestureTag = {id:string;label:string;clips:string[];fullBody?:boolean;staticPose?:boolean};
export const GESTURE_TAGS: GestureTag[];
export function chooseGestureClip(tag:GestureTag,previous:Map<string,string>,random?:()=>number):string;
export function gestureSpeed(pace?:number,offset?:number):number;
export function upperBodyInfluence(name:string,property?:string):number;
