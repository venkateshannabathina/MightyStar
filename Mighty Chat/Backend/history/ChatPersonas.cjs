'use strict';
const fs=require('node:fs'),path=require('node:path');
// The build copies Sources into Contents/Resources; both layouts share one file.
const source=path.resolve(__dirname,'../../Sources/chat-personas.js');
module.exports=require(fs.existsSync(source)?source:path.resolve(__dirname,'../../Resources/chat-personas.js'));
