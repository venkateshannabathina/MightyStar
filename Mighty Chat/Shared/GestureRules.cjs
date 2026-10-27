'use strict';
const GESTURE_TAGS = [
 {id:'talking',label:'Talking',clips:['talking1','talking2','talking4']},
 {id:'arguing',label:'Arguing',clips:['talking5','talking6']},
 ...[['angry','Angry'],['defeated','Defeated'],['dismissing-gesture','Dismissing'],['rejected','Rejected'],['standing-greeting','Greeting'],['surprised','Surprised'],['thankful-2','Thankful'],['thoughtful-head-nod','Thoughtful nod'],['victory','Victory'],['thinking','Thinking']].map(([id,label])=>({id,label,clips:[id]}))
];
function chooseGestureClip(tag, previous, random=Math.random) {
 const candidates=tag.clips.filter(id=>id!==previous.get(tag.id));
 const pool=candidates.length?candidates:tag.clips;
 const value=random();const index=Math.min(pool.length-1,Math.floor(Math.max(0,Number.isFinite(value)?value:0)*pool.length));
 const id=pool[index];previous.set(tag.id,id);return id;
}
function gestureSpeed(pace=.5, offset=0) {return .7+.6*Math.max(0,Math.min(1,Number.isFinite(pace)?pace:.5))+offset;}
// Logical source names, after the existing retarget binder resolves the rig.
function upperBodyInfluence(name, property='rotationQuaternion') {
 if(property!=='rotationQuaternion')return 0;
 const bone=name.replace(/^.*:/,'');
 if(bone==='Spine')return .25;if(bone==='Spine1')return .6;if(bone==='Spine2')return 1;
 return /^(Neck|Head)/.test(bone)||/^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(bone)?1:0;
}
module.exports={GESTURE_TAGS,chooseGestureClip,gestureSpeed,upperBodyInfluence};
