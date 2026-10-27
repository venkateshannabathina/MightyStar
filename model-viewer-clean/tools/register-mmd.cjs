const {registerHooks}=require('node:module');
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&(specifier.startsWith('.')||specifier.startsWith('@babylonjs/')||specifier.startsWith('babylon-mmd/')))return next(specifier+'.js',context);throw error;}}});
