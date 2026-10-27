"""One reusable, bounded Edge connection for the serialized speech worker.

Uses the same framing, TLS validation, authentication and metadata parser as
our bundled edge_tts version. Each synthesis still owns its request/word clock.
"""
import asyncio
import json
from contextlib import asynccontextmanager

import aiohttp
from edge_tts.communicate import (
    Communicate, _SSL_CTX, connect_id, date_to_string, get_headers_and_data,
    mkssml, ssml_headers_plus_data,
)
from edge_tts.constants import WSS_URL, WSS_HEADERS, SEC_MS_GEC_VERSION
from edge_tts.drm import DRM
from edge_tts.exceptions import NoAudioReceived, UnexpectedResponse, WebSocketError


class EdgeConnection:
    def __init__(self, idle_seconds=20):
        self.session = None
        self.websocket = None
        self.lock = asyncio.Lock()
        self.idle_seconds = idle_seconds
        self.idle_timer = None

    async def _disconnect(self):
        if self.websocket is not None:
            await self.websocket.close()
            self.websocket = None

    async def _connect(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                trust_env=True,
                timeout=aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=10),
            )
        self.websocket = await self.session.ws_connect(
            f"{WSS_URL}&ConnectionId={connect_id()}"
            f"&Sec-MS-GEC={DRM.generate_sec_ms_gec()}"
            f"&Sec-MS-GEC-Version={SEC_MS_GEC_VERSION}",
            compress=15, headers=DRM.headers_with_muid(WSS_HEADERS), ssl=_SSL_CTX,
        )

    @asynccontextmanager
    async def lease(self):
        async with self.lock:
            if self.idle_timer is not None:
                self.idle_timer.cancel()
                self.idle_timer = None
            reused = self.websocket is not None and not self.websocket.closed
            try:
                if not reused:
                    await self._disconnect()
                    await self._connect()
                yield self.websocket, reused
            except BaseException:
                # Cancellation and protocol failures must not leave old audio
                # queued on a socket that another generation might read.
                await self._disconnect()
                raise
            finally:
                self.idle_timer = asyncio.get_running_loop().call_later(
                    self.idle_seconds, lambda: asyncio.create_task(self.close_if_idle())
                )

    async def warmup(self):
        async with self.lease():
            pass

    async def close_if_idle(self):
        if self.lock.locked():
            return
        await self.close()

    async def close(self):
        async with self.lock:
            if self.idle_timer is not None:
                self.idle_timer.cancel()
                self.idle_timer = None
            await self._disconnect()
            if self.session is not None:
                await self.session.close()
                self.session = None

    def communicate(self, *args, **kwargs):
        return ReusingCommunicate(*args, connection=self, **kwargs)


class ReusingCommunicate(Communicate):
    def __init__(self, *args, connection, **kwargs):
        super().__init__(*args, **kwargs)
        self.connection = connection

    async def stream(self):
        if self.state["stream_was_called"]:
            raise RuntimeError("stream can only be called once.")
        self.state["stream_was_called"] = True
        for self.state["partial_text"] in self.texts:
            for attempt in range(2):
                self.state["chunk_audio_bytes"] = 0
                source = self._Communicate__stream()
                try:
                    async for message in source:
                        yield message
                except aiohttp.ClientResponseError as error:
                    if attempt or error.status != 403:
                        raise
                    DRM.handle_client_response_error(error)
                else:
                    break
                finally:
                    # Close the leased generator immediately when its consumer
                    # is cancelled or closes early, rather than waiting for GC.
                    await source.aclose()

    async def _Communicate__stream(self):
        # Keep Communicate.stream's text bounds, escaping and 403 clock repair.
        # Only the transport lifetime differs from the bundled implementation.
        emitted = False
        for attempt in range(2):
            reused = False
            audio_received = False
            ended = False
            try:
                async with self.connection.lease() as (websocket, reused):
                    word_boundary = self.tts_config.boundary == "WordBoundary"
                    config = {"context": {"synthesis": {"audio": {
                        "metadataoptions": {
                            "sentenceBoundaryEnabled": "false" if word_boundary else "true",
                            "wordBoundaryEnabled": "true" if word_boundary else "false",
                        }, "outputFormat": "audio-24khz-48kbitrate-mono-mp3",
                    }}}}
                    await websocket.send_str(
                        f"X-Timestamp:{date_to_string()}\r\n"
                        "Content-Type:application/json; charset=utf-8\r\n"
                        "Path:speech.config\r\n\r\n" + json.dumps(config) + "\r\n"
                    )
                    await websocket.send_str(ssml_headers_plus_data(
                        connect_id(), date_to_string(), mkssml(self.tts_config, self.state["partial_text"])
                    ))
                    async for received in websocket:
                        if received.type == aiohttp.WSMsgType.TEXT:
                            data = received.data.encode("utf-8")
                            parameters, payload = get_headers_and_data(data, data.find(b"\r\n\r\n"))
                            path = parameters.get(b"Path")
                            if path == b"audio.metadata":
                                parsed = self._Communicate__parse_metadata(payload)
                                self.state["last_duration_offset"] = parsed["offset"] + parsed["duration"]
                                emitted = True
                                yield parsed
                            elif path == b"turn.end":
                                ended = True
                                self._Communicate__compensate_offset()
                                break
                            elif path not in (b"response", b"turn.start"):
                                raise UnexpectedResponse("Unexpected speech response path")
                        elif received.type == aiohttp.WSMsgType.BINARY:
                            if len(received.data) < 2:
                                raise UnexpectedResponse("Truncated audio header")
                            length = int.from_bytes(received.data[:2], "big")
                            if length > len(received.data):
                                raise UnexpectedResponse("Invalid audio header length")
                            parameters, payload = get_headers_and_data(received.data, length)
                            if parameters.get(b"Path") != b"audio":
                                raise UnexpectedResponse("Unexpected binary speech path")
                            content_type = parameters.get(b"Content-Type")
                            if content_type is None and not payload:
                                continue
                            if content_type != b"audio/mpeg" or not payload:
                                raise UnexpectedResponse("Invalid speech audio frame")
                            audio_received = emitted = True
                            self.state["chunk_audio_bytes"] += len(payload)
                            yield {"type": "audio", "data": payload}
                        elif received.type == aiohttp.WSMsgType.ERROR:
                            raise WebSocketError("Speech connection failed")
                    if not ended or not audio_received:
                        raise NoAudioReceived("Speech connection ended before a complete turn")
                return
            except (aiohttp.ClientError, ConnectionError, TimeoutError, NoAudioReceived):
                # A server may silently close an idle connection. Reconnect once
                # only before ANY output, so words/audio are never duplicated.
                if attempt != 0 or not reused or emitted:
                    raise

