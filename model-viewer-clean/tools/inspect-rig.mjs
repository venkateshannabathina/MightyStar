import fs from 'node:fs';
import { PmxReader } from 'babylon-mmd/esm/Loader/Parser/pmxReader.js';
const data=fs.readFileSync('/private/tmp/hutao-idle-test.pmx');
const pmx=await PmxReader.ParseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
fs.writeFileSync('/private/tmp/hutao-bones.json',JSON.stringify(pmx.bones,null,2));
for(const b of pmx.bones) if(/上半身|下半身|センター|グルーブ|左(肩$|腕$|ひじ$|手首$|足$|ひざ$|足首$|つま先$|.*ＩＫ$|.*IK$|親指|中指)|右腕$/.test(b.name)) console.log(JSON.stringify({name:b.name,pos:b.position,parent:pmx.bones[b.parentBoneIndex]?.name,tail:b.tailPosition,append:b.appendTransform,ik:b.ik}));
