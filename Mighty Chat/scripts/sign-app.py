#!/usr/bin/env python3
"""Keep local builds' Keychain identity stable without changing system trust."""
import hashlib
import os
from pathlib import Path
import secrets
import shlex
import subprocess
import sys
import tempfile


def run(args, env=None):
    result = subprocess.run(args, env=env, capture_output=True, text=True)
    if result.returncode:
        # Import/unlock commands contain passwords; never echo their arguments.
        raise RuntimeError(f"{Path(args[0]).name} {args[1]} failed (exit {result.returncode})")
    return result.stdout


def local_identity():
    directory = Path(os.environ.get("MIGHTY_SIGNING_HOME", str(
        Path.home() / "Library/Application Support/MightyStar/Signing")))
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    directory.chmod(0o700)
    keychain = directory / "local-signing.keychain-db"
    certificate = directory / "certificate.pem"
    password_file = directory / "keychain-password"
    if not keychain.exists():
        if certificate.exists() or password_file.exists():
            raise RuntimeError("Incomplete signing setup; preserve this directory and repair it before building")
        password = secrets.token_urlsafe(48)
        # Preserve the user's original search list; this keychain is for signing only.
        search_list = shlex.split(run(["/usr/bin/security", "list-keychains", "-d", "user"]))
        with tempfile.TemporaryDirectory(prefix="mightystar-signing-") as temporary:
            temp = Path(temporary)
            config = temp / "certificate.conf"
            config.write_text("[req]\ndistinguished_name=dn\nx509_extensions=extensions\n"
                              "[dn]\n[extensions]\nbasicConstraints=critical,CA:FALSE\n"
                              "keyUsage=critical,digitalSignature\n"
                              "extendedKeyUsage=critical,codeSigning\n")
            run(["/usr/bin/openssl", "req", "-new", "-x509", "-sha256", "-days", "3650",
                 "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=MightyStar Local Development/",
                 "-config", str(config), "-keyout", str(temp / "key.pem"),
                 "-out", str(temp / "certificate.pem")])
            env = dict(os.environ, MIGHTY_P12_PASSWORD=password)
            run(["/usr/bin/openssl", "pkcs12", "-export", "-inkey", str(temp / "key.pem"),
                 "-in", str(temp / "certificate.pem"), "-out", str(temp / "identity.p12"),
                 "-name", "MightyStar Local Development", "-passout", "env:MIGHTY_P12_PASSWORD"], env)
            # Retain the recovery password with user-only access from creation.
            fd = os.open(password_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            with os.fdopen(fd, "w") as file:
                file.write(password)
            certificate.write_bytes((temp / "certificate.pem").read_bytes())
            try:
                run(["/usr/bin/security", "create-keychain", "-p", password, str(keychain)])
                run(["/usr/bin/security", "unlock-keychain", "-p", password, str(keychain)])
                run(["/usr/bin/security", "import", str(temp / "identity.p12"), "-k", str(keychain),
                     "-P", password, "-T", "/usr/bin/codesign"])
                run(["/usr/bin/security", "set-key-partition-list", "-S", "apple-tool:,apple:,codesign:",
                     "-s", "-k", password, str(keychain)])
            finally:
                run(["/usr/bin/security", "list-keychains", "-d", "user", "-s", *search_list])
        print("Created persistent local MightyStar signing identity.")
    if not certificate.exists() or not password_file.exists():
        raise RuntimeError("Signing identity is incomplete; refusing to replace it with a new identity")
    password_file.chmod(0o600)
    keychain.chmod(0o600)
    password = password_file.read_text()
    run(["/usr/bin/security", "unlock-keychain", "-p", password, str(keychain)])
    der = subprocess.run(["/usr/bin/openssl", "x509", "-in", str(certificate), "-outform", "DER"],
                         capture_output=True, check=True).stdout
    return hashlib.sha1(der).hexdigest().upper(), str(keychain)


def main():
    if len(sys.argv) != 2:
        raise RuntimeError("Usage: sign-app.py APP_BUNDLE")
    bundle = Path(sys.argv[1]).resolve()
    if not (bundle / "Contents/MacOS/MightyChat").is_file():
        raise RuntimeError("Expected a MightyStar app bundle")
    identity = os.environ.get("MIGHTY_SIGNING_IDENTITY")
    keychain = os.environ.get("MIGHTY_SIGNING_KEYCHAIN")
    if not identity:
        identity, keychain = local_identity()
    if identity == "-":
        raise RuntimeError("Ad-hoc signing would reintroduce repeated Keychain prompts")
    options = ["--force", "--sign", identity, "--timestamp=none"]
    if keychain:
        options += ["--keychain", keychain]
    # The release includes a relocatable Python runtime; fresh Macs must not
    # require Xcode's Python for memory or Edge speech.
    python = bundle / "Contents/Resources/Python"
    if python.exists():
        binaries = set()
        for candidate in python.rglob("*"):
            if candidate.is_file() and not candidate.is_symlink():
                with candidate.open("rb") as file:
                    magic = file.read(4)
                if magic in (b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xca\xfe\xba\xbe"):
                    binaries.add(candidate)
        for binary in sorted(binaries):
            run(["/usr/bin/codesign", *options, str(binary)])
    # Memory is optional at runtime; every packaged native inference dependency
    # must share the app's persistent signer before the outer signature is made.
    inference = bundle / "Contents/Backend/vendor/memory/node_modules/onnxruntime-node/bin/napi-v6/darwin"
    if inference.exists():
        for suffix in ("*.dylib", "*.node"):
            for binary in sorted(inference.rglob(suffix)):
                run(["/usr/bin/codesign", *options, str(binary)])
    pocket = bundle / "Contents/Resources/PocketTTS/pocket-tts"
    if pocket.exists():
        run(["/usr/bin/codesign", *options, "--identifier", "local.mightystar.runtime.pockettts", str(pocket)])
    tuner = bundle / "Contents/Resources/PocketTTS/audio-tuner"
    if tuner.exists():
        run(["/usr/bin/codesign", *options, "--identifier", "local.mightystar.runtime.audiotuner", str(tuner)])
    node = bundle / "Contents/Resources/node"
    if node.exists():
        run(["/usr/bin/codesign", *options, "--identifier", "local.mightystar.runtime.node", str(node)])
    agent = bundle / "Contents/Resources/credential-agent"
    if agent.exists():
        run(["/usr/bin/codesign", *options, "--identifier", "local.mightystar.credentials", str(agent)])
    release_agent = bundle / "Contents/Resources/credential-agent-v01"
    if release_agent.exists():
        run(["/usr/bin/codesign", *options, "--identifier", "local.mightystar.credentials.v01", str(release_agent)])
    run(["/usr/bin/codesign", *options, str(bundle)])
    run(["/usr/bin/codesign", "--verify", "--deep", "--strict", str(bundle)])
    print("MightyStar signature verified with persistent identity.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Signing failed: {error}", file=sys.stderr)
        sys.exit(1)
