import importlib.util
from pathlib import Path
import sys
import asyncio
import argparse
import json
import os
import tempfile
from unittest.mock import patch
root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'Sources/EdgeTTS'))
spec = importlib.util.spec_from_file_location('edge_helper', root / 'Sources/edge-tts-performance.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
def poses(text, enhanced=True):
    return [c['pose'] for c in helper.word_cues([{'text':text,'start':1,'end':2}], enhanced)]
assert poses('o') == ['o'] and poses('o', False) == ['u']
assert poses('th') == ['e'] and poses('sh') == ['u'] and poses('ch') == ['i']
assert poses('ee') == ['i'] and poses('oo') == ['u']
assert helper.cue_units('cake') == ['c','a','k']
assert helper.cue_units('hope') == ['h','o','p']
assert helper.cue_units('see') == ['s','ee']
assert helper.cue_units('the') == ['th','e']
assert poses('box') == ['closed','o','e']
assert poses('box', False) == ['closed','u','e']
for word in ['church','sheep','shampoo','thought','moon','smile','你好','ありがとう','', 'abcdefghijklmno'*100]:
    cues = helper.word_cues([{'text':word,'start':1,'end':2}], True)
    assert 1 <= len(cues) <= 8
    assert cues[0]['start']==1 and cues[-1]['end']==2
    assert all(c['start'] < c['end'] and c['pose'] in ['closed','fv','a','i','u','e','o'] for c in cues)
assert len(helper.word_cues([{'text':'box','start':n,'end':n+1} for n in range(5000)],True)) == 4000
class FakeCommunicator:
    def __init__(self, *args, **kwargs): pass
    async def stream(self):
        yield {'type':'audio','data':b'fixture'}
        yield {'type':'WordBoundary','offset':0,'duration':10000000,'text':'o'}
async def generation_flags():
    with tempfile.TemporaryDirectory() as directory:
        args=argparse.Namespace(text='o',voice='fixture',rate='+0%',pitch='+0Hz',audio=directory+'/audio.mp3',metadata=directory+'/metadata.json')
        for flag,expected in [('0','u'),('1','o')]:
            with patch.dict(os.environ,{'MIGHTY_ENERGY_JAW':flag}),patch.object(helper.edge_tts,'Communicate',FakeCommunicator),patch.object(helper.subprocess,'run',side_effect=OSError):
                await helper.generate(args)
            result=json.loads(Path(args.metadata).read_text())
            assert result['mouthCues'][0]['pose']==expected and result['words'][0]['text']=='o'
            assert result['quality']=='heuristic-word-cues' and result['durationSeconds']==1
asyncio.run(generation_flags())
print('Edge cues: flag-off o mapping preserved; o/digraph/silent-e hints, closures, non-Latin fallback, bounded timing and cue caps pass.')
