#!/usr/bin/env python3
"""Record source/candidate hashes and retain only changed rerun receipts."""
import hashlib
import json
import platform
from pathlib import Path
import shutil
import subprocess

APP=Path(__file__).resolve().parents[2]
STAGE=Path('/private/tmp/mighty-wp9-workspace/Mighty Chat')
OUT=APP/'docs/wp9-evidence'

def sha(file):
    h=hashlib.sha256()
    with file.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):
            h.update(block)
    return h.hexdigest()

def main():
    sources=[]
    for directory in ['Backend','Native','Renderer','Shared','AnimationLab','Sources']:
        for file in sorted((APP/directory).rglob('*')):
            if not file.is_file() or '__pycache__' in file.parts: continue
            relative=file.relative_to(APP)
            if directory=='Sources' and relative.parts[1] in ['Companion','AnimationLab']: continue
            matching=(STAGE/relative).is_file() and sha(file)==sha(STAGE/relative)
            if not matching: raise ValueError('Source snapshot mismatch: '+str(relative))
            sources.append(dict(path=str(relative),sha256=sha(file)))
    receipt={'scope':'Isolated candidate; production snapshot verified. Installed artifact is an old-build candidate requiring administrator confirmation before the blind study.',
             'environment':{'macOS':subprocess.check_output(['sw_vers','-productVersion'],text=True).strip(),'architecture':platform.machine(),'node':subprocess.check_output(['node','--version'],text=True).strip()},'sources':sources,'artifacts':[]}
    for label,bundle in [('candidate',STAGE/'build/Mighty Chat.app'),('installed-old-build-candidate',APP.parent/'Mighty Chat.app')]:
        files=['Contents/MacOS/MightyChat','Contents/Resources/Companion/companion.js','Contents/Resources/companion-server.cjs','Contents/Resources/node','Contents/Resources/credential-agent']
        receipt['artifacts'].append(dict(label=label,path=str(bundle),files={f:sha(bundle/f) for f in files if (bundle/f).is_file()}))
    (OUT/'candidate-provenance.json').write_text(json.dumps(receipt,indent=2)+'\n')
    for wp in [3,4,5,6,7,8]:
        source=STAGE/f'docs/wp{wp}-evidence'
        for file in source.rglob('*'):
            if not file.is_file(): continue
            relative=file.relative_to(source)
            old=APP/f'docs/wp{wp}-evidence'/relative
            if old.is_file() and sha(file)==sha(old): continue
            target=OUT/f'rerun-wp{wp}'/relative
            target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(file,target)
    for name,source in [('memory-editor.png',STAGE/'build/wp9-memory-editor.png'),('energy-webkit.json',STAGE/'docs/wp9-evidence-webkit.json')]:
        if source.exists(): shutil.copy2(source,OUT/name)
    # Manifest is created last, after progress/QA/deviation notes are finalized.
    files={}
    for root in [OUT,APP/'tests/release',APP/'docs/wp9-blind-study']:
        for file in sorted(root.rglob('*')):
            if file.is_file() and file.name!='manifest.json' and '__pycache__' not in file.parts:
                files[str(file.relative_to(APP))]=sha(file)
    for relative in ['docs/V2-QA.md','docs/V2-PROGRESS.md','docs/SPEC-DEVIATIONS.md','tests/audio/check-multichunk.swift','tests/audio/check-energy-native.swift','tests/animation/check-gesture-native.swift','tests/face/check-director-native.swift','tests/performance/check-reply-latency-native.swift','tests/ui/check-character-editor.cjs','tests/ui/check-local-character.cjs','tests/ui/check-rendering-quality.cjs','scripts/test-release-queue.sh','scripts/test-performance-director-native.sh']:
        files[relative]=sha(APP/relative)
    (OUT/'manifest.json').write_text(json.dumps({'scope':'WP9 automated results and blank human-study kit; no participant data','files':files},indent=2)+'\n')
    print('Verified production snapshot and hashed',len(files),'review files; old WP evidence preserved.')

if __name__=='__main__': main()
