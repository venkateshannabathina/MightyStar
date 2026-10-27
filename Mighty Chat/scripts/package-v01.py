#!/usr/bin/env python3
"""Create a release-only app and DMG, excluding developer and personal data."""
from pathlib import Path
import hashlib
import json
import os
import plistlib
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / 'build' / 'release-v0.1.1'
STAGE = RELEASE / 'dmg'
APP = STAGE / 'MightyStar.app'
SOURCE = Path(os.environ.get('MIGHTY_RELEASE_SOURCE', ROOT / 'build' / 'clean-release-validation' / 'Mighty Chat.app'))

def run(*args):
    subprocess.run([str(value) for value in args], check=True)

def main():
    if APP.exists():
        shutil.rmtree(APP)
    STAGE.mkdir(parents=True, exist_ok=True)
    run('/usr/bin/ditto', SOURCE, APP)
    # No user profiles, signing keys, caches from development, or test harnesses.
    blocked_dirs = {'WebKit', 'WebsiteData', 'LocalStorage', 'IndexedDB', 'Memory', 'Mind', 'Profiles', '.git', '.github', '__pycache__', 'tests', 'test', 'backups', '.pytest_cache', '.mypy_cache', '.cache'}
    blocked_names = {'.DS_Store', '.npmrc', '.netrc', '.env', '.env.local', '.env.production', 'keychain-password', 'certificate.pem'}
    for directory, subdirs, files in os.walk(APP, topdown=True):
        for name in list(subdirs):
            if name in blocked_dirs:
                shutil.rmtree(Path(directory) / name)
                subdirs.remove(name)
        for name in files:
            if name in blocked_names or name.endswith(('.pyc', '.log', '.keychain-db', '.p12', '.pfx', '.sqlite', '.sqlite3', '.db', '-wal', '-shm')):
                (Path(directory) / name).unlink()
    resources = APP / 'Contents/Resources'
    shutil.copy2(ROOT / 'Sources/companion-server.cjs', resources / 'companion-server.cjs')
    node_license = Path(shutil.which('node')).resolve().parents[1] / 'LICENSE'
    if node_license.exists():
        shutil.copy2(node_license, resources / 'LICENSE-Node.txt')
    for relative in ['Characters/hailey', 'Python/include', 'Python/lib/pkgconfig', 'Python/share']:
        target = resources / relative
        if target.exists():
            shutil.rmtree(target)
    (resources / 'credential-agent').unlink(missing_ok=True)
    # Stable public identity isolates WebKit, preferences and state from development.
    run('xcrun', 'swiftc', '-O', '-target', 'arm64-apple-macosx13.5', '-module-cache-path', '/private/tmp/mightychat-swift-cache', ROOT / 'Native/Onboarding/ReleaseCredentialAgent.swift', '-o', resources / 'credential-agent-v01')
    plist = APP / 'Contents/Info.plist'
    info = plistlib.loads(plist.read_bytes())
    info.update(CFBundleName='MightyStar', CFBundleDisplayName='MightyStar', CFBundleIdentifier='org.mightystar.app', CFBundleVersion='2', CFBundleShortVersionString='0.1.1', LSMinimumSystemVersion='13.5')
    plist.write_bytes(plistlib.dumps(info))
    run(sys.executable, ROOT / 'scripts/sign-app.py', APP)
    run('/usr/bin/codesign', '--verify', '--deep', '--strict', APP)
    run(resources / 'Python/bin/python3', '-I', '-B', '-c', 'import ssl,sqlite3,json; print("Bundled Python runtime ready")')
    applications = STAGE / 'Applications'
    if not applications.exists():
        applications.symlink_to('/Applications')
    (STAGE / 'Read Me.txt').write_text('''MightyStar 0.1.1 — Apple Silicon Mac

Requires macOS 13.5 or later. Intel Macs are not supported by this build.

1. Drag MightyStar.app into Applications.
2. Eject this disk, then open MightyStar from Applications.
3. Choose Get started, select a companion, then press Enter.
4. Add your Groq or OpenAI API key once. The key stays in macOS Keychain.
5. Your companion opens in Overlay mode. Right-click for chat and view options.

This independent build is locally signed, not Apple-notarized. macOS may block
its first launch. After trying to open it, use System Settings > Privacy &
Security > Open Anyway if you trust this download. Do not disable Gatekeeper.

Internet is required for AI replies and first-use character downloads.
English speech resources are included; other language packs download on demand.
Your provider may charge for API usage. Chats and memory stay on this Mac;
conversation context is sent to your chosen AI provider when you ask for a reply.

Website: https://mightystar.org
''')
    dmg = RELEASE / 'MightyStar-0.1.1-macOS-arm64.dmg'
    run('/usr/bin/hdiutil', 'create', '-volname', 'MightyStar 0.1.1', '-srcfolder', STAGE, '-ov', '-format', 'UDZO', '-imagekey', 'zlib-level=6', dmg)
    digest = hashlib.sha256(dmg.read_bytes()).hexdigest()
    (RELEASE / 'SHA256SUMS.txt').write_text(f'{digest}  {dmg.name}\n')
    (RELEASE / 'release.json').write_text(json.dumps({'version': '0.1.1', 'architecture': 'arm64', 'minimum_macos': '13.5', 'file': dmg.name, 'bytes': dmg.stat().st_size, 'sha256': digest, 'notarized': False}, indent=2) + '\n')
    print(f'Release ready: {dmg} ({dmg.stat().st_size:,} bytes)')

if __name__ == '__main__':
    main()
