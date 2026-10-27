'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('../../../model-viewer-clean/node_modules/typescript');
const viewer=require('node:module').createRequire(path.resolve(__dirname,'../../../model-viewer-clean/package.json')),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file).exports;const box={exports:{}};cache.set(file,box);vm.runInNewContext('(function(require,module,exports){'+ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText+'})',{performance,console})(name=>name.startsWith('.')?(name.endsWith('.json')||name.endsWith('.cjs')?require(path.resolve(path.dirname(file),name)):load(path.resolve(path.dirname(file),name+'.ts'))):viewer(name),box,box.exports);return box.exports;}
module.exports={load,viewer};
