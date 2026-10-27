'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('../../../model-viewer-clean/node_modules/typescript');
function loadEngine(file=path.resolve(__dirname,'../../Renderer/face/ExpressiveFace.ts'),random=()=>0.5){
 const cache=new Map();const math=Object.create(Math);math.random=random;
 const context=vm.createContext({Math:math});
 function load(source){
  if(cache.has(source))return cache.get(source).exports;
  const module={exports:{}};cache.set(source,module);
  const compiled=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInContext('(function(require,module,exports){'+compiled+'\n})',context)(name=>load(path.resolve(path.dirname(source),name+'.ts')),module,module.exports);
  return module.exports;
 }
 return load(file);
}
function seeded(seed=42){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
module.exports={loadEngine,seeded};
