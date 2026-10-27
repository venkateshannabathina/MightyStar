#!/usr/bin/env python3
import copy
import importlib.util
from pathlib import Path

spec=importlib.util.spec_from_file_location('study',Path(__file__).with_name('blind-study.py'))
study=importlib.util.module_from_spec(spec);spec.loader.exec_module(study)
rows,key=study.design()
assert len(rows)==100 and len({r['sample'] for r in rows})==100
for q in range(1,6):
    first={r['sample'] for r in rows if r['prompt']==str(q) and r['position']=='1'}
    assert sum(k['condition']=='v2' for k in key if k['sample'] in first)==5
def rejects(data, allocation=key):
    try: study.score(data,allocation)
    except ValueError: return
    raise AssertionError('Invalid study accepted')
rejects(rows)
conditions={r['sample']:r['condition'] for r in key}
synthetic=copy.deepcopy(rows)
for r in synthetic:
    r['alive']='4' if conditions[r['sample']]=='v2' else '2'
    r['natural']='3'
report=study.score(synthetic,key)
assert report['alive']['pairedMeanDelta']==2 and report['natural']['pairedMeanDelta']==0
rejects(synthetic[:-1]);rejects([synthetic[0]]*100)
bad=copy.deepcopy(synthetic);bad[0]['alive']='6';rejects(bad)
bad=copy.deepcopy(synthetic);bad[0]['participant']='P99';rejects(bad)
badkey=copy.deepcopy(key);badkey[0]['condition']='unknown';rejects(synthetic,badkey)
print('Blind study: balanced allocation, blank/incomplete/duplicate/range/mismatched rejection and paired scoring passed; synthetic values are test-only.')
