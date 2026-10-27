#!/bin/bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$app_root/tests/face/build-key-fixture.py" --check
node "$app_root/tests/face/check-face-lab-api.cjs"
bash "$app_root/scripts/test-performance-director.sh"
if [[ "${1:-}" == "--render" ]]; then
 node - "$app_root" <<'JS'
const app=process.argv[2],path=require('node:path');
const config=require(path.join(app,'Renderer/webpack.config.cjs'));config.output.path='/private/tmp/mighty-wp8-renderer';
require(path.join(app,'../model-viewer-clean/node_modules/webpack'))(config,(err,stats)=>{if(err||stats.hasErrors()){console.error(err||stats.toString({all:false,errors:true}));process.exitCode=1;}else console.log(stats.toString({all:false,timings:true,warnings:true}));});
JS
 node "$app_root/tests/face/check-face-lab-rendered.cjs"
 node "$app_root/tests/face/review-face-lab.cjs"
fi
