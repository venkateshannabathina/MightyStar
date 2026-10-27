#!/usr/bin/python3
"""Generate Edge TTS audio and a compact, validated mouth-cue timeline."""

import argparse
import asyncio
import json
import re
import subprocess
from pathlib import Path

import edge_tts


def pose_for(token: str) -> str:
    value = token.lower()
    if any(char in value for char in "mbp"):
        return "closed"
    if any(char in value for char in "fv"):
        return "fv"
    if any(char in value for char in "ouqw"):
        return "u"
    if "a" in value:
        return "a"
    if any(char in value for char in "iy"):
        return "i"
    if "e" in value:
        return "e"
    return "e"


def word_cues(words: list[dict]) -> list[dict]:
    cues: list[dict] = []
    for word in words:
        start = max(0.0, float(word["start"]))
        end = max(start + 0.04, float(word["end"]))
        units = re.findall(r"[A-Za-z]+|[^\W\d_]", word["text"], re.UNICODE)
        letters = list("".join(units)) or [word["text"]]
        # Avoid noisy per-letter flapping while preserving lip closures.
        groups: list[str] = []
        for letter in letters:
            pose = pose_for(letter)
            if not groups or groups[-1] != pose:
                groups.append(pose)
        groups = groups[:8] or ["e"]
        span = (end - start) / len(groups)
        for index, pose in enumerate(groups):
            cue_start = start + span * index
            cue_end = start + span * (index + 1)
            cues.append({"start": round(cue_start, 4), "end": round(cue_end, 4), "pose": pose})
    return cues[:4000]


async def generate(args: argparse.Namespace) -> None:
    communicator = edge_tts.Communicate(
        args.text,
        args.voice,
        rate=args.rate,
        pitch=args.pitch,
        boundary="WordBoundary",
    )
    words: list[dict] = []
    with Path(args.audio).open("wb") as audio:
        async for message in communicator.stream():
            if message["type"] == "audio":
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
        "quality": "heuristic-word-cues" if words else "audio-only",
        "words": words[:1000],
        "mouthCues": word_cues(words),
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
