'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {DatabaseSync}=require('node:sqlite');
const {cosine}=require('./LocalEmbeddings.cjs');
const {recalledAssertion,lexicalRecall}=require('./FactGrounding.cjs');
function validId(value){return typeof value==='string'&&value.length>0&&value.length<=100&&!/[\x00-\x1f]/.test(value);}
function vector(bytes){if(!bytes||bytes.length!==1536)return new Float32Array();const copy=Uint8Array.from(bytes);return new Float32Array(copy.buffer);}
class MemoryStore {
 constructor({root=process.env.MIGHTY_MEMORY_ROOT||path.join(os.homedir(),'Library/Application Support/Mighty Chat/Memory')}={}){
  fs.mkdirSync(root,{recursive:true,mode:0o700});if(fs.lstatSync(root).isSymbolicLink())throw Error('Invalid memory directory.');fs.chmodSync(root,0o700);
  const file=path.join(root,'memory.sqlite');if(fs.lstatSync(file,{throwIfNoEntry:false})?.isSymbolicLink())throw Error('Invalid memory database.');
  this.db=new DatabaseSync(file);fs.chmodSync(file,0o600);
  this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON; PRAGMA busy_timeout=2000;
   CREATE TABLE IF NOT EXISTS turns(id INTEGER PRIMARY KEY, character_id TEXT, role TEXT, content TEXT, ts REAL, meta TEXT);
   CREATE TABLE IF NOT EXISTS facts(id INTEGER PRIMARY KEY, character_id TEXT, text TEXT, importance REAL, last_seen REAL, created REAL, emb BLOB, source_turn INTEGER, deleted INTEGER DEFAULT 0);
   CREATE TABLE IF NOT EXISTS state(character_id TEXT PRIMARY KEY, summary TEXT DEFAULT '', mood TEXT DEFAULT 'neutral', turns INTEGER DEFAULT 0, summarized_upto INTEGER DEFAULT 0);
   CREATE INDEX IF NOT EXISTS ix_turns ON turns(character_id,id); CREATE INDEX IF NOT EXISTS ix_facts ON facts(character_id,deleted);
   CREATE TABLE IF NOT EXISTS profiles(character_id TEXT PRIMARY KEY, data TEXT, source_hash TEXT, card TEXT DEFAULT '', card_hash TEXT DEFAULT '');
   CREATE TABLE IF NOT EXISTS requests(character_id TEXT, client_id TEXT, input_hash TEXT, user_turn INTEGER, status TEXT, result TEXT, PRIMARY KEY(character_id,client_id));
   CREATE TABLE IF NOT EXISTS revisions(character_id TEXT PRIMARY KEY, epoch INTEGER DEFAULT 0);
   UPDATE requests SET status='failed' WHERE status='pending';`);
  const stateColumns=this.db.prepare('PRAGMA table_info(state)').all().map(c=>c.name);
  if(!stateColumns.includes('context_floor'))this.db.exec('ALTER TABLE state ADD COLUMN context_floor INTEGER DEFAULT 0');
  const factColumns=this.db.prepare('PRAGMA table_info(facts)').all().map(c=>c.name);
  if(!factColumns.includes('provenance'))this.db.exec("ALTER TABLE facts ADD COLUMN provenance TEXT DEFAULT '{}'");
 }
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 epoch(id){return this.db.prepare('SELECT epoch FROM revisions WHERE character_id=?').get(id)?.epoch||0;}
 bump(id){this.db.prepare('INSERT INTO revisions VALUES(?,1) ON CONFLICT(character_id) DO UPDATE SET epoch=epoch+1').run(id);}
 profile(id){const row=this.db.prepare('SELECT * FROM profiles WHERE character_id=?').get(id);return row?{...row,character:JSON.parse(row.data)}:null;}
 saveProfile(id,character,hash){this.db.prepare("INSERT INTO profiles(character_id,data,source_hash) VALUES(?,?,?) ON CONFLICT(character_id) DO UPDATE SET data=excluded.data,source_hash=excluded.source_hash,card=CASE WHEN source_hash=excluded.source_hash THEN card ELSE '' END,card_hash=CASE WHEN source_hash=excluded.source_hash THEN card_hash ELSE '' END").run(id,JSON.stringify(character),hash);}
 saveCard(id,hash,card){this.db.prepare('UPDATE profiles SET card=?,card_hash=? WHERE character_id=? AND source_hash=?').run(card,hash,id,hash);}
 begin(id,clientId,hash,content,privateTurn=false){return this.transaction(()=>{
  const old=this.db.prepare('SELECT * FROM requests WHERE character_id=? AND client_id=?').get(id,clientId);
  if(old){if(old.input_hash!==hash)throw Object.assign(Error('This turn identifier was already used for another message.'),{status:409});if(old.status==='complete')return{cached:JSON.parse(old.result)};this.db.prepare("UPDATE requests SET status='pending' WHERE character_id=? AND client_id=?").run(id,clientId);return{userTurn:old.user_turn,userCount:this.db.prepare("SELECT COUNT(*) n FROM turns WHERE character_id=? AND role='user' AND id<=?").get(id,old.user_turn).n};}
  const ts=Date.now()/1000;
  const result=this.db.prepare('INSERT INTO turns(character_id,role,content,ts,meta) VALUES(?,?,?,?,?)').run(id,'user',privateTurn?'[Private turn omitted]':content,ts,JSON.stringify({clientTurnId:clientId,private:privateTurn}));
  const userTurn=Number(result.lastInsertRowid);
  this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,'pending',NULL)").run(id,clientId,hash,userTurn);
  this.db.prepare('INSERT INTO state(character_id,turns) VALUES(?,1) ON CONFLICT(character_id) DO UPDATE SET turns=turns+1').run(id);
  return{userTurn,userCount:this.state(id).turns};
 });}
 finish(id,clientId,result,privateTurn=false){return this.transaction(()=>{
  const added=this.db.prepare('INSERT INTO turns(character_id,role,content,ts,meta) VALUES(?,?,?,?,?)').run(id,'assistant',privateTurn?'[Private turn omitted]':result.reply,Date.now()/1000,JSON.stringify({clientTurnId:clientId,private:privateTurn,...(!privateTurn && Array.isArray(result.sentenceEvents)?{sentenceEvents:result.sentenceEvents}: {})}));
  // A private response is never retained in the retry cache either.
  this.db.prepare("UPDATE requests SET status=?,result=? WHERE character_id=? AND client_id=?").run(privateTurn?'private':'complete',privateTurn?null:JSON.stringify(result),id,clientId);
  return Number(added.lastInsertRowid);
 });}
 fail(id,clientId){this.db.prepare("UPDATE requests SET status='failed' WHERE character_id=? AND client_id=? AND status='pending'").run(id,clientId);}
 recent(id,limit=10){return this.db.prepare('SELECT * FROM turns WHERE character_id=? AND id>? ORDER BY id DESC LIMIT ?').all(id,this.state(id).context_floor||0,limit).reverse();}
 state(id){return this.db.prepare('SELECT * FROM state WHERE character_id=?').get(id)||{summary:'',mood:'neutral',turns:0,summarized_upto:0};}
 facts(id){return this.db.prepare('SELECT id,text,importance,last_seen,created,source_turn,emb,provenance FROM facts WHERE character_id=? AND deleted=0 ORDER BY id').all(id);}
 publicFacts(id){return this.facts(id).map(({emb,provenance,...fact})=>({...fact,provenance:JSON.parse(provenance||'{}')}));}
 recallFacts(id){return this.db.prepare('SELECT f.*,t.content AS source_input,t.role AS source_role FROM facts f LEFT JOIN turns t ON t.id=f.source_turn AND t.character_id=f.character_id WHERE f.character_id=? AND f.deleted=0 ORDER BY f.id').all(id).filter(f=>f.source_role!=='assistant'&&recalledAssertion(f.text,f.source_input)).map(({source_input,source_role,...f})=>f);}
 lexicalRecall(id,input){return lexicalRecall(this.recallFacts(id),input).map(({emb,...fact})=>fact);}
 insertFact(id,text,importance,emb,sourceTurn,evidence=""){
  if(emb.length!==384||emb.some(n=>!Number.isFinite(n)))throw Error('Invalid embedding.');
  const old=this.facts(id).find(fact=>fact.text.trim().toLocaleLowerCase()===text.trim().toLocaleLowerCase()),now=Date.now()/1000;
  if(old){this.db.prepare('UPDATE facts SET last_seen=?,importance=MAX(importance,?) WHERE id=?').run(now,importance,old.id);return old.id;}
  return Number(this.db.prepare('INSERT INTO facts(character_id,text,importance,last_seen,created,emb,source_turn,provenance) VALUES(?,?,?,?,?,?,?,?)').run(id,text,importance,now,now,Buffer.from(emb.buffer,emb.byteOffset,emb.byteLength),sourceTurn,JSON.stringify({kind:sourceTurn==null?'imported':'user_statement',sourceTurn,evidence,recordedAt:now})).lastInsertRowid);
 }
 retrieve(id,query){const now=Date.now()/1000;return this.recallFacts(id).map(fact=>{const similarity=cosine(query,vector(fact.emb)),age=Math.max(0,(now-fact.last_seen)/86400);return{...fact,similarity,score:similarity*(0.5+0.5*fact.importance/5)*(0.6+0.4*Math.exp(-age/30))};}).filter(fact=>fact.similarity>0.35).sort((a,b)=>b.score-a.score||a.id-b.id).slice(0,4).map(({emb,...fact})=>fact);}
 editFact(id,factId,text,emb){return this.transaction(()=>{
  const original=this.facts(id).find(f=>f.id===factId);if(!original)return false;
  this.bump(id);this.clearSummary(id);
  const provenance=JSON.stringify({kind:'user_edit',evidence:text,recordedAt:Date.now()/1000,originalSourceTurn:original.source_turn??JSON.parse(original.provenance||'{}').originalSourceTurn??null});
  return Number(this.db.prepare('UPDATE facts SET text=?,emb=?,last_seen=?,source_turn=NULL,provenance=? WHERE character_id=? AND id=? AND deleted=0').run(text,Buffer.from(emb.buffer,emb.byteOffset,emb.byteLength),Date.now()/1000,provenance,id,factId).changes)>0;
 });}
 deleteFact(id,factId){return this.transaction(()=>{
  const changed=this.db.prepare("UPDATE facts SET deleted=1,text='',emb=NULL,source_turn=NULL,provenance='{}' WHERE character_id=? AND id=? AND deleted=0").run(id,factId).changes;
  if(changed){this.bump(id);this.clearSummary(id);}return Number(changed)>0;
 });}
 clearSummary(id){const last=this.db.prepare('SELECT MAX(id) id FROM turns WHERE character_id=?').get(id)?.id||0;this.db.prepare("UPDATE state SET summary='',summarized_upto=?,context_floor=? WHERE character_id=?").run(last,last,id);}
 forget(id){this.transaction(()=>{this.bump(id);for(const table of ['turns','facts','state','requests'])this.db.prepare(`DELETE FROM ${table} WHERE character_id=?`).run(id);});}
 summaryRows(id,through=Number.MAX_SAFE_INTEGER){const state=this.state(id);return this.db.prepare('SELECT * FROM turns WHERE character_id=? AND id>? AND id<=? ORDER BY id LIMIT 100').all(id,Math.max(state.summarized_upto,state.context_floor||0),through);}
 setSummary(id,summary,upto,mood){this.db.prepare('UPDATE state SET summary=?,summarized_upto=?,mood=? WHERE character_id=?').run(summary,upto,mood,id);}
 close(){this.db.close();}
}
module.exports={MemoryStore,validId};
