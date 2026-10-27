const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mighty-profile-'));
const modulePath = path.resolve(__dirname, '../../Backend/memory/MemoryStore.cjs');
function run(profile, write) {
 const source = `const {MemoryStore}=require(${JSON.stringify(modulePath)});const s=new MemoryStore();${write ? "s.db.prepare('INSERT INTO turns(character_id,role,content,ts) VALUES(?,?,?,?)').run('test','user','development-only-sentinel',1);" : ''}console.log(s.db.prepare('SELECT count(*) AS n FROM turns').get().n);s.db.close();`;
 const child = spawnSync(process.execPath, ['-e', source], {env:{...process.env,MIGHTY_MEMORY_ROOT:path.join(root,profile,'Memory')},encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);return Number(child.stdout.trim());
}
try {
 assert.equal(run('development',true),1);
 assert.equal(run('release',false),0);
 assert.equal(run('release',true),1);
 assert.equal(run('release',false),1); // Updates/relaunches retain release history.
 assert.equal(run('development',false),1);
 console.log('Actual SQLite stores isolate development and release and persist release history');
} finally {fs.rmSync(root,{recursive:true,force:true});}
