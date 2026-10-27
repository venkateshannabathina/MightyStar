#!/usr/bin/env python3
"""Supplement the WP suites with current packaged/UI/native checks after build."""
import json
import os
from pathlib import Path
import subprocess
import time

APP=Path(__file__).resolve().parents[2]
STAGE=Path('/private/tmp/mighty-wp9-workspace/Mighty Chat')
OUT=APP/'docs/wp9-evidence'

def main():
    env=dict(os.environ,NODE_PATH='<home>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')
    for flag in ['MIGHTY_MEMORY_V1','MIGHTY_STREAM_CHAT','MIGHTY_EXPR_V2','MIGHTY_ENERGY_JAW','MIGHTY_GESTURES_V2','MIGHTY_FACE_LAB','MIGHTY_DEBUG_PERF']:
        env.pop(flag,None)
    jobs=[('network-audio',['bash','scripts/test-network.sh']),
          ('live-voice',['bash','scripts/test-live-voice.sh',str(STAGE/'build/Mighty Chat.app')])]
    for name in ['check-local-character','check-rendering-quality','check-player-view','check-desktop','check-desktop-talk']:
        jobs.append((name,['node',f'tests/ui/{name}.cjs']+(['release'] if name=='check-rendering-quality' else [])))
    # These historical harnesses use fixed temp paths; bind each to this build.
    for wp in [4,5,6]:
        destination=Path(f'/private/tmp/mighty-wp{wp}-renderer')
        if destination.is_symlink(): destination.unlink()
        elif destination.exists():
            import shutil
            shutil.rmtree(destination)
        destination.symlink_to(STAGE/'Sources/Companion',target_is_directory=True)
    jobs.extend([
        ('director-rendered',['node','tests/face/check-director-rendering.cjs']),
        ('energy-browser',['node','tests/audio/check-energy-browser.cjs']),
        ('energy-rendered',['node','tests/audio/check-energy-renderer.cjs']),
        ('gestures-rendered',['node','tests/animation/check-gesture-rendering.cjs']),
    ])
    for name in ['check-mask','check-gaze-pointer','check-hover']:
        output=str(STAGE/'build'/name)
        jobs.append((name+'-compile',['xcrun','swiftc','-module-cache-path','/private/tmp/mightychat-swift-cache','-framework','Cocoa','Native/Companion/CompanionInteraction.swift',f'tests/companion/{name}.swift','-o',output]))
        jobs.append((name,[output]))
    results=[]
    for name,args in jobs:
        print('START',name,flush=True);started=time.monotonic()
        with (OUT/(name+'.log')).open('w') as log:
            try: code=subprocess.run(args,cwd=STAGE,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=900).returncode
            except subprocess.TimeoutExpired: code=124
        results.append(dict(name=name,command=args,exitCode=code,seconds=round(time.monotonic()-started,2)))
        (OUT/'candidate-checks.json').write_text(json.dumps(results,indent=2)+'\n')
        print('END',name,code,flush=True)
    raise SystemExit(int(any(r['exitCode'] for r in results)))

if __name__=='__main__': main()
