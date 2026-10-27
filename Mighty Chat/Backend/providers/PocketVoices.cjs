
'use strict';
const fs=require('node:fs'),path=require('node:path');
const source=path.resolve(__dirname,'../../Sources/PocketTTS/catalog.json');
const catalog=JSON.parse(fs.readFileSync(fs.existsSync(source)?source:path.resolve(__dirname,'../../Resources/PocketTTS/catalog.json'),'utf8'));
const POCKET_VOICES=catalog.voices.map(v=>v.id);
const POCKET_LANGUAGES=catalog.languages.map(v=>v.id);
const POCKET_PREVIEW_TEXT=catalog.languages.find(v=>v.id==='english').previewText;
function pocketLanguage(id){return catalog.languages.find(v=>v.id===id)||catalog.languages[0];}
module.exports={POCKET_VOICES,POCKET_LANGUAGES,POCKET_PREVIEW_TEXT,catalog,pocketLanguage};
