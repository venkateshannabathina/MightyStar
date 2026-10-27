'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {MemoryStore}=require('../../Backend/memory/MemoryStore.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'mighty-memory-migration-'));
let store;
try{
 const db=new DatabaseSync(path.join(root,'memory.sqlite'));
 db.exec(`CREATE TABLE facts(id INTEGER PRIMARY KEY,character_id TEXT,text TEXT,importance REAL,last_seen REAL,created REAL,emb BLOB,source_turn INTEGER,deleted INTEGER DEFAULT 0);
 CREATE TABLE state(character_id TEXT PRIMARY KEY,summary TEXT DEFAULT '',mood TEXT DEFAULT 'neutral',turns INTEGER DEFAULT 0,summarized_upto INTEGER DEFAULT 0);
 INSERT INTO state VALUES('legacy','A previous summary.','neutral',10,20);
 INSERT INTO facts(id,character_id,text,importance,last_seen,created,deleted) VALUES(1,'legacy','The user likes tea.',3,0,0,0);`);
 db.close();store=new MemoryStore({root});
 assert.equal(store.state('legacy').summary,'A previous summary.');assert.equal(store.state('legacy').context_floor,0);
 assert.equal(store.publicFacts('legacy')[0].text,'The user likes tea.');assert.deepEqual(store.publicFacts('legacy')[0].provenance,{});
 store.close();store=new MemoryStore({root});assert.equal(store.publicFacts('legacy').length,1,'schema migration is restart-safe');
 assert.equal(store.publicFacts('mighty-chat-v1-lynae').length,0,'new roster cannot inherit legacy facts');
 console.log('PASS: additive legacy SQLite migration preserves old facts, summaries and scopes; repeated startup remains safe');
}finally{store?.close();fs.rmSync(root,{recursive:true,force:true});}
