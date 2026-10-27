#!/usr/bin/env python3
"""Run release checks in a disposable source snapshot; preserve old WP receipts."""
import json
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import time

APP = Path(__file__).resolve().parents[2]
STAGE = Path('/private/tmp/mighty-wp9-workspace')
OUT = APP / 'docs/wp9-evidence'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    STAGE.mkdir(exist_ok=True)
    app = STAGE / 'Mighty Chat'
    if app.exists():
        shutil.rmtree(app)
    def ignore(directory, names):
        skipped = {'.git', '__pycache__', 'wp9-evidence'} & set(names)
        if Path(directory) == APP:
            skipped.add('build')
        return skipped
    shutil.copytree(APP, app, symlinks=True, ignore=ignore)
    for name in ['model-viewer-clean', 'Mighty Chat.app', 'face-reference']:
        link = STAGE / name
        if not link.exists():
            link.symlink_to(APP.parent / name, target_is_directory=True)
    for name in ['PMX-FACE-KEYS.md', 'AI-COMPANION-ARCHITECTURE.md']:
        shutil.copy2(APP.parent / name, STAGE / name)
    (app / 'build').mkdir()
    # Network fixtures inspect this packaged server, independently of the installed app.
    package = app / 'build/Mighty Chat.app/Contents'
    (package / 'Resources').mkdir(parents=True)
    shutil.copy2(app / 'Sources/companion-server.cjs', package / 'Resources')
    for name in ['Backend']:
        (package / name).symlink_to(app / name, target_is_directory=True)
    (package / 'Resources/Shared').symlink_to(app / 'Shared', target_is_directory=True)
    env = dict(os.environ, NODE_PATH='<home>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')
    for key in ['MIGHTY_MEMORY_V1','MIGHTY_STREAM_CHAT','MIGHTY_EXPR_V2','MIGHTY_ENERGY_JAW','MIGHTY_GESTURES_V2','MIGHTY_FACE_LAB','MIGHTY_DEBUG_PERF']:
        env.pop(key, None)
    jobs = [
        ('rollout', ['node','tests/release/check-rollout.cjs']),
        ('blind-study', ['python3','tests/release/check-blind-study.py']),
        ('latency-memory-stream', ['bash','scripts/test-reply-latency.sh']),
        ('file-origin-stream', ['bash','scripts/test-stream-webkit.sh']),
        ('gestures-energy-director-face-idle', ['bash','scripts/test-production-gestures.sh']),
        ('face-lab-rendered', ['bash','scripts/test-face-lab.sh','--render']),
        ('native-energy', ['bash','scripts/test-speech-energy-native.sh']),
        ('native-multichunk', ['bash','scripts/test-release-queue.sh']),
        ('native-gestures', ['bash','scripts/test-production-gestures-native.sh']),
        ('native-director', ['bash','scripts/test-performance-director-native.sh']),
        ('native-latency', ['bash','scripts/test-reply-latency-native.sh']),
        ('memory-package', ['bash','scripts/test-memory-package.sh']),
        ('credentials', ['python3','tests/keychain/check-agent.py']),
        ('historical-latency-gates', ['node','scripts/check-latency-report.cjs','docs/wp7-evidence/report.json']),
    ]
    for name in ['check-character-cache','check-character-routes','check-static-resources','check-animation-reply','check-animation-route','check-call-transport','check-edge-worker']:
        jobs.append((name,['node',f'tests/backend/{name}.cjs']))
    for name in ['check-native-editor-bridge','check-edge-defaults','check-player-speech','check-face-mixer','check-hit-mask']:
        folder = 'companion' if name in ['check-face-mixer','check-hit-mask'] else 'ui'
        jobs.append((name,['node',f'tests/{folder}/{name}.cjs']))
    results = []
    for name, args in jobs:
        print('START', name, flush=True)
        started = time.monotonic()
        with (OUT / (name+'.log')).open('w') as log:
            try:
                p = subprocess.run(args, cwd=app, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=900)
                code = p.returncode
            except subprocess.TimeoutExpired:
                code = 124
        results.append(dict(name=name, command=args, exitCode=code, seconds=round(time.monotonic()-started,2)))
        (OUT / 'regression.json').write_text(json.dumps(results, indent=2)+'\n')
        print('END', name, code, flush=True)
    # All new native/rendered receipts are in the snapshot, not prior WP directories.
    for wp in [3,5,6,7,8]:
        source = app / f'docs/wp{wp}-evidence'
        for file in source.rglob('*'):
            if not file.is_file():
                continue
            relative = file.relative_to(source)
            old = APP / f'docs/wp{wp}-evidence' / relative
            if old.exists() and hashlib.sha256(file.read_bytes()).digest() == hashlib.sha256(old.read_bytes()).digest():
                continue
            target = OUT / f'rerun-wp{wp}' / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file, target)
    raise SystemExit(int(any(r['exitCode'] for r in results)))

if __name__ == '__main__':
    main()
