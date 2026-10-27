`ws` version 8.18.0 is vendored from the installed Model Viewer dependency tree.
Its MIT license and package manifest are included in `ws/`. The regular app build copies
this exact version; it does not resolve packages or reach the npm registry. Replace it
through an explicit dependency update with transport tests, rather than implicitly
using a transitive copy at runtime.

WP1 optional memory dependencies live under `memory/` with a pinned npm lockfile.
`onnxruntime-node@1.23.2` (MIT) supplies macOS arm64/x64 CPU bindings;
non-macOS binaries are omitted from this macOS product. `js-tiktoken@1.0.21`
(MIT) counts the o200k content vocabulary for supported OpenAI/Groq GPT-OSS
models. Runtime packages retain their licenses. No dependency install scripts
run while building the app. The signed-app packager signs ONNX dylibs and .node
bindings before the outer app. No runtime downloads are permitted by the BGE
worker; model assets are pinned and hash-inventoried in its models directory.
