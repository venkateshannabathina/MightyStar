#!/usr/bin/env python3
"""WP8 compatibility entry: reuse the authoritative exact-name Section 4 parser."""
import json, pathlib, subprocess, sys
here = pathlib.Path(__file__).resolve().parent
subprocess.run(['node', str(here / 'build-inventory-fixtures.cjs'), '--check'], check=True)
data = json.loads((here / 'fixtures/inventory.json').read_text())
assert len(data['models']) == 50
assert sum(len(model['morphs']) for model in data['models']) == 4789
for model in data['models']:
    model['excluded'] = all(m['category'] in ('Other', 'System') for m in model['morphs'])
output = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
target = here / 'fixtures/model-keys.json'
if '--check' in sys.argv:
    assert target.read_text() == output, 'Regenerate model-keys.json from the verified inventory'
else:
    target.write_text(output)
print('WP8 key fixture: 50 models, 4,789 rows, opaque exclusions verified')
