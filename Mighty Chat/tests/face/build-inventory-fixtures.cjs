'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const source=path.resolve(__dirname,'../../../PMX-FACE-KEYS.md');
const text=fs.readFileSync(source,'utf8');
const models=[];
for(const match of text.matchAll(/^### (\d{2})\. (.+)\n([\s\S]*?)(?=^### \d{2}\. |$(?![\s\S]))/gm)){
 const section=match[3];const morphs=[];
 for(const row of section.matchAll(/^\| (\d+) \| `([^`]+)` \| (.*?) \| (Eyebrow|Eye|Lip|Other|System) \| ([^|]+) \|/gm))morphs.push({index:Number(row[1]),name:row[2],category:row[4],type:row[5].trim()});
 const total=Number(section.match(/total: (\d+)\./)?.[1]);
 assert.equal(morphs.length,total,`All morph entries for model ${match[1]} must be retained.`);
 models.push({id:match[1],name:`Morph fixture ${match[1]}`,format:section.match(/^- Format: (PMX|BPMX)/m)?.[1],assetPath:null,morphs});
}
assert.equal(models.length,50);assert.equal(models.reduce((sum,m)=>sum+m.morphs.length,0),4789);
const result={source:'PMX-FACE-KEYS.md',sha256:crypto.createHash('sha256').update(text).digest('hex'),note:'Exact original names and categories only. English names are intentionally not aliases. Morph names establish availability, not visual correctness.',models};
const output=path.join(__dirname,'fixtures/inventory.json');
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(output,'utf8'),JSON.stringify(result,null,2)+'\n','Regenerate inventory fixture after source changes.');
else fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log('Inventory fixture: 50 models, 4,789 exact original-name entries, source checksum verified.');
