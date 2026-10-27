'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
module.exports=async()=>{
 const app=path.resolve(__dirname,'../..'),stage=path.join(app,'build/wp5-energy-check'),resources=path.join(stage,'Resources');
 await fs.mkdir(resources,{recursive:true});await fs.mkdir(path.join(app,'docs/wp5-evidence'),{recursive:true});
 await fs.copyFile(path.join(app,'Sources/companion-server.cjs'),path.join(resources,'companion-server.cjs'));
 for(const [target,link]of [[path.join(app,'Backend'),path.join(stage,'Backend')],[path.join(app,'Sources/Characters'),path.join(resources,'Characters')],['/private/tmp/mighty-wp5-renderer',path.join(resources,'Companion')]])await fs.symlink(target,link).catch(e=>{if(e.code!=='EEXIST')throw e;});
 return {app,stage,resources,output:path.join(app,'docs/wp5-evidence')};
};
