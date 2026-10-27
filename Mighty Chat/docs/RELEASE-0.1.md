# MightyStar 0.1

Apple Silicon only. macOS 13.5 or newer. This is a locally signed, unnotarized independent build.

The native app owns first launch: Get started → Evelyn / Lynae / Lucy / Rover → Enter → native secure API setup → Overlay. Groq and OpenAI are offered during first setup. The provider checks the key over HTTPS before it is saved in macOS Keychain. Secrets never enter WebKit, localStorage, release metadata, or the website. Returning launches reuse the saved connection and last selected identity.

Google account sign-in is not implemented in this version. The welcome action is Get started. No MightyStar account is created.

The original development credential broker is untouched. A separate release broker, `credential-agent-v01`, targets macOS 13.5 and uses `local.mightystar.connections.release.v01`. Its code identity is `local.mightystar.credentials.v01`. Development keys remain intact; the release asks for its own one-time connection. Keep this broker binary and signing identity stable for later releases or provide an explicit migration.

The DMG includes the app, an Applications shortcut and an installation guide. It excludes development backups, tests, logs, personal data, signing material and Hailey assets. Node, Python, Pocket speech and English voice weights are bundled. Character models and additional speech languages download on demand. Provider usage may incur charges.

Build with `scripts/build.sh`, then `scripts/package-v01.py`. Signing uses the existing local identity; never add its private key or password to the release. Release artifacts live under `build/release-v0.1`. The website repository is `venkateshannabathina/mighty_star_web`.

Validation includes the existing build checks and `tests/ui/check-onboarding.cjs`. The release must also pass signature verification, dependency/minimum-OS audit, bundled runtime startup, local backend health, DMG verification, and website download-link verification before publication.
