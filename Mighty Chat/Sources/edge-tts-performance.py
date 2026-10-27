#!/usr/bin/python3
"""Generate Edge TTS audio and word timestamps for captions."""

import argparse
import asyncio
import json
import re
import subprocess
from pathlib import Path

import edge_tts


async def generate(args: argparse.Namespace, on_first_audio=None, connection_pool=None) -> None:
    factory = connection_pool.communicate if connection_pool is not None else edge_tts.Communicate
    communicator = factory(
        args.text,
        args.voice,
        rate=args.rate,
        pitch=args.pitch,
        boundary="WordBoundary",
    )
    words: list[dict] = []
    first_audio = True
    with Path(args.audio).open("wb") as audio:
        async for message in communicator.stream():
            if message["type"] == "audio":
                if first_audio and message["data"]:
                    first_audio = False
                    if on_first_audio is not None:
                        on_first_audio()
                audio.write(message["data"])
            elif message["type"] == "WordBoundary":
                start = message["offset"] / 10_000_000
                end = (message["offset"] + message["duration"]) / 10_000_000
                words.append({"start": round(start, 4), "end": round(end, 4), "text": str(message["text"])[:120]})
    if not Path(args.audio).stat().st_size:
        raise RuntimeError("Edge TTS returned no audio")
    word_end = max((word["end"] for word in words), default=0.0)
    duration = word_end
    try:
        info = subprocess.run(["/usr/bin/afinfo", args.audio], capture_output=True, text=True, timeout=3, check=True)
        match = re.search(r"estimated duration:\s*([0-9.]+) sec", info.stdout)
        if match:
            duration = max(word_end, float(match.group(1)))
    except (OSError, subprocess.SubprocessError, ValueError):
        pass
    result = {
        "durationSeconds": round(duration, 4),
        "lastWordEndSeconds": round(word_end, 4),
        "quality": "word-boundaries" if words else "audio-only",
        "words": words[:1000],
        "mouthCues": [],
    }
    Path(args.metadata).write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", required=True)
    parser.add_argument("--rate", default="+0%")
    parser.add_argument("--pitch", default="+0Hz")
    parser.add_argument("--audio", required=True)
    parser.add_argument("--metadata", required=True)
    asyncio.run(generate(parser.parse_args()))


if __name__ == "__main__":
    main()
