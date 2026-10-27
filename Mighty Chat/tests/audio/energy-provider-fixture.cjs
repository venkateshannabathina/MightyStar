'use strict';
// Real provider adapters and local transports, recorded audio in place of remote TTS.
require('../face/native-provider-fixture.cjs');
const fs=require('node:fs'),path=require('node:path'),previous=globalThis.fetch;
globalThis.fetch=(url,options)=>{
 if(String(url)==='https://api.openai.com/v1/audio/speech'){
  const body=JSON.parse(options.body);
  if(body.response_format!=='mp3')throw Error('Expected the existing MP3 provider contract.');
  return Promise.resolve(new Response(fs.readFileSync(path.resolve(__dirname,'../fixtures/hello-there.mp3')),{status:200,headers:{'Content-Type':'audio/mpeg'}}));
 }
 return previous(url,options);
};
