"""Connection lifetime, boundaries, retry and cancellation without a provider."""
import asyncio
import json
import sys
from pathlib import Path
from types import SimpleNamespace

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'Sources' / 'EdgeTTS'))
sys.path.insert(0, str(root / 'Backend' / 'workers'))
import aiohttp
from edge_connection import EdgeConnection


def control(path, body=''):
    return SimpleNamespace(type=aiohttp.WSMsgType.TEXT, data=f'Path:{path}\r\n\r\n{body}')


def audio():
    header = b'X-RequestId:fixture\r\nPath:audio\r\nContent-Type:audio/mpeg'
    return SimpleNamespace(type=aiohttp.WSMsgType.BINARY, data=(len(header)+2).to_bytes(2,'big')+header+b'\r\n'+b'valid-fixture-audio')


class Socket:
    def __init__(self, stale=False, partial=False):
        self.closed = False
        self.stale = stale
        self.partial = partial
        self.frames = []
        self.requests = []

    async def send_str(self, value):
        if 'Path:ssml' not in value:
            return
        if self.stale:
            raise aiohttp.ClientConnectionError('stale fixture')
        self.requests.append(value)
        metadata = json.dumps({'Metadata':[{'Type':'WordBoundary','Data':{'Offset':0,'Duration':1000000,'text':{'Text':'Hello'}}}]})
        self.frames = [control('audio.metadata', metadata), audio()]
        self.frames += [aiohttp.ClientConnectionError('partial fixture')] if self.partial else [control('turn.end')]

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self.frames:
            raise StopAsyncIteration
        result = self.frames.pop(0)
        if isinstance(result, Exception):
            raise result
        return result

    async def close(self):
        self.closed = True


class Pool(EdgeConnection):
    def __init__(self):
        super().__init__(idle_seconds=100)
        self.opened = []

    async def _connect(self):
        self.websocket = Socket()
        self.opened.append(self.websocket)


def communicate(pool):
    return pool.communicate('Hello', 'en-US-AvaMultilingualNeural', boundary='WordBoundary')


async def collect(pool):
    return [item async for item in communicate(pool).stream()]


async def main():
    pool = Pool()
    await pool.warmup()
    first, second = await collect(pool), await collect(pool)
    assert len(pool.opened) == 1, 'multiple phrases reuse one warmed connection'
    assert [item['type'] for item in first] == ['WordBoundary','audio']
    assert first == second, 'word/sample clock resets for every request'
    assert len(pool.websocket.requests) == 2
    assert pool.websocket.requests[0] != pool.websocket.requests[1], 'each phrase has an independent request ID'

    stale = pool.websocket
    stale.stale = True
    result = await collect(pool)
    assert stale.closed and len(pool.opened) == 2
    assert [item['type'] for item in result] == ['WordBoundary','audio'], 'stale idle socket reconnects once before output'

    failed = pool.websocket
    failed.partial = True
    try:
        await collect(pool)
        raise AssertionError('partial failure was swallowed')
    except aiohttp.ClientConnectionError:
        pass
    assert failed.closed and len(pool.opened) == 2, 'no retry/repeated words after any output'

    stream = communicate(pool).stream()
    await stream.__anext__()
    cancelled = pool.websocket
    await stream.aclose()
    assert cancelled.closed, 'closing a partial generation discards its socket'
    await collect(pool)
    assert len(pool.opened) == 4

    pool.idle_seconds = .01
    await pool.warmup()
    idle = pool.websocket
    await asyncio.sleep(.03)
    assert idle.closed and pool.websocket is None, 'unused connection closes after its idle budget'
    await pool.close()
    print('Edge connection: warmed reuse, independent request/word clocks, stale retry, no retry after output, cancellation and idle cleanup passed.')


asyncio.run(main())
