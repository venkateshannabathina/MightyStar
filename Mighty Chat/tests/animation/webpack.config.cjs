const path = require('node:path');
module.exports = {
  mode: 'development', target: 'node', context: __dirname, entry: './check-rig.js',
  output: { path: path.resolve(__dirname, '../../build/animation-tests'), filename: 'check-rig.cjs' },
  resolve: { modules: [path.resolve(__dirname, '../../../model-viewer-clean/node_modules')] },
  devtool: false, performance: { hints: false }
};
