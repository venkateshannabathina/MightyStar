import asyncio
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from unittest.mock import patch
root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'Sources/EdgeTTS'))
spec = importlib.util.spec_from_file_location('edge_helper', root / 'Sources/edge-tts-performance.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
class FakeCommunicator:
    def __init__(self, *args, **kwargs): pass
    async def stream(self):
        yield {'type': 'audio', 'data': b''}
        yield {'type': 'audio', 'data': b'first'}
        yield {'type': 'audio', 'data': b'second'}
async def main():
    with tempfile.TemporaryDirectory() as directory:
        audio = Path(directory) / 'audio.mp3'
        metadata = Path(directory) / 'metadata.json'
        args = argparse.Namespace(text='fixture', voice='fixture', rate='+0%', pitch='+0Hz', audio=str(audio), metadata=str(metadata))
        observed = []
        with patch.object(helper.edge_tts, 'Communicate', FakeCommunicator):
            await helper.generate(args, on_first_audio=lambda: observed.append(audio.stat().st_size))
        assert observed == [0]
        assert audio.read_bytes() == b'firstsecond'
        assert json.loads(metadata.read_text())['quality'] == 'audio-only'
        with patch.object(helper.edge_tts, 'Communicate', FakeCommunicator):
            await helper.generate(args)
    print('Edge helper first nonempty byte, once-only callback and legacy mode passed')
asyncio.run(main())
