'use strict';
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const path = require('node:path');
async function run() {
  const env = {...process.env};
  for (const key of ['GROQ_API_KEY','OPENAI_API_KEY','ANTHROPIC_API_KEY']) delete env[key];
  const child = spawn(process.execPath,[path.join(__dirname,'../../Sources/companion-server.cjs')],{env,stdio:['pipe','pipe','pipe']});
  try {
    const {port,token} = await new Promise((resolve,reject) => {
      let output = ''; const timer = setTimeout(() => reject(new Error('Backend startup timed out')),10000);
      child.once('error',error => {clearTimeout(timer);reject(error)});
      child.once('exit',code => {clearTimeout(timer);reject(new Error('Backend exited: '+code))});
      child.stdout.on('data',data => { output += data; if (output.includes('\n')) {clearTimeout(timer);resolve(JSON.parse(output.split('\n')[0]))} });
    });
    const origin = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(origin+'/api/animation-chat',{method:'POST'})).status,401);
    const missing = await fetch(origin+'/api/animation-chat',{method:'POST',headers:{'X-Mighty-Token':token,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Hello'}]})});
    assert.equal(missing.status,503); assert.equal((await missing.json()).code,'missing_api_key');
    const lab = await fetch(origin+'/AnimationLab/index.html'); assert.equal(lab.status,200); assert.match(await lab.text(),/id="composer"/);
    assert.equal((await fetch(origin+'/AnimationLab/assets/tagged-character.glb',{method:'HEAD'})).status,200);
    assert.equal((await fetch(origin+'/companion-server.cjs')).status,403);
    console.log('Animation route checks passed: authenticated API, missing-key guidance, bundled rig delivery, protected backend sources.');
  } finally {child.stdin.end(); child.kill('SIGTERM');}
}
run().catch(error => {console.error(error);process.exitCode=1});
