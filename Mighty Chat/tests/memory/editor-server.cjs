'use strict';
const http=require('node:http');let facts=[{id:1,text:'The user enjoys green tea.',importance:4}];const token='x'.repeat(43);
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://127.0.0.1').pathname;
 if(route.startsWith('/api/')&&req.headers['x-mighty-token']!==token){res.writeHead(401);res.end('{}');return;}
 let data='';req.on('data',chunk=>data+=chunk);req.on('end',()=>{
  const body=JSON.parse(data||'{}');let value={};
  if(route==='/api/memory/facts'||route==='/api/memory/export')value={facts};
  if(route==='/api/memory/card')value={card:'Mira is a thoughtful friend.',compiled:true};
  if(route==='/api/voices')value={voices:[]};
  if(route==='/api/memory/edit'){facts[0].text=body.text;value={ok:true};}
  if(route==='/api/memory/delete'||route==='/api/memory/forget'){facts=[];value={ok:true};}
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(value));
 });
});server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({port:server.address().port,token})+'\n'));process.stdin.resume();process.stdin.on('end',()=>server.close(()=>process.exit(0)));
