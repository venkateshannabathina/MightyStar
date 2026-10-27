#!/usr/bin/env python3
"""Exercise real Keychain ACLs without reading or changing saved user keys."""
import os
from pathlib import Path
import plistlib
import shlex
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]


def run(args, env=None, timeout=60):
    result = subprocess.run([str(arg) for arg in args], env=env, capture_output=True,
                            text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f"{Path(args[0]).name} failed: {result.stdout}\n{result.stderr}")
    return result.stdout


with tempfile.TemporaryDirectory(prefix="mightystar-keychain-test-") as temporary:
    directory = Path(temporary)
    search_list = shlex.split(run(["/usr/bin/security", "list-keychains", "-d", "user"]))
    keychain = directory / "scratch.keychain-db"
    try:
        run(["/usr/bin/security", "create-keychain", "-p", "synthetic-test-password", keychain])
        run(["/usr/bin/security", "unlock-keychain", "-p", "synthetic-test-password", keychain])
        env = dict(os.environ, MIGHTY_SIGNING_HOME=str(directory / "Signing"))
        # Never inherit a developer's real signing configuration in this scratch test.
        env.pop("MIGHTY_SIGNING_IDENTITY", None)
        env.pop("MIGHTY_SIGNING_KEYCHAIN", None)
        binaries = []
        for version in ["original", "rebuilt"]:
            bundle = directory / f"{version}.app"
            executable = bundle / "Contents/MacOS/MightyChat"
            executable.parent.mkdir(parents=True)
            info = {"CFBundleIdentifier": "local.mightystar.chat",
                    "CFBundleExecutable": "MightyChat", "CFBundlePackageType": "APPL"}
            (bundle / "Contents/Info.plist").write_bytes(plistlib.dumps(info))
            agent = bundle / "Contents/Resources/credential-agent"
            agent.parent.mkdir(parents=True)
            agent.write_bytes((ROOT / "Sources/credential-agent").read_bytes())
            agent.chmod(0o700)
            command = ["/usr/bin/xcrun", "swiftc", "-module-cache-path", "/private/tmp/mightychat-swift-cache",
                       ROOT / "Native/Settings/CredentialStore.swift", ROOT / "tests/keychain/check-agent.swift",
                       "-o", executable]
            if version == "rebuilt":
                command += ["-D", "SECOND_BUILD"]
            run(command)
            print(run(["/usr/bin/python3", ROOT / "scripts/sign-app.py", bundle], env).strip())
            binaries.append(executable)
        print(run([binaries[0], "create", keychain, binaries[0].parents[1] / "Resources/credential-agent"], timeout=8).strip())
        print(run([binaries[1], "trusted", keychain, binaries[1].parents[1] / "Resources/credential-agent"], timeout=8).strip())
        untrusted = directory / "untrusted"
        untrusted.write_bytes(binaries[1].read_bytes())
        untrusted.chmod(0o700)
        run(["/usr/bin/codesign", "--force", "--sign", "-", "--identifier", "local.mightystar.other", untrusted])
        print(run([untrusted, "denied", keychain, binaries[1].parents[1] / "Resources/credential-agent"], timeout=8).strip())
        run(["/usr/bin/security", "lock-keychain", keychain])
        print(run([binaries[1], "locked", keychain, binaries[1].parents[1] / "Resources/credential-agent"], timeout=8).strip())
    finally:
        run(["/usr/bin/security", "list-keychains", "-d", "user", "-s", *search_list])
        if keychain.exists():
            run(["/usr/bin/security", "delete-keychain", keychain])
        signing_keychain = directory / "Signing/local-signing.keychain-db"
        if signing_keychain.exists():
            run(["/usr/bin/security", "delete-keychain", signing_keychain])
print("Stable credential broker: readback, replacement, rebuilt native callers, untrusted callers, and locked keychains passed.")
