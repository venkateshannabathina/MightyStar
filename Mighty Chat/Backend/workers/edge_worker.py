#!/usr/bin/env python3
"""Persistent Edge TTS worker. JSON lines on stdin/stdout; diagnostics on stderr."""

import argparse
import asyncio
import importlib.util
import json
import os
import sys
from pathlib import Path

parent = Path(__file__).resolve().parents[2]
helper_path = next(path for path in (parent / "Sources" / "edge-tts-performance.py", parent / "Resources" / "edge-tts-performance.py") if path.exists())
spec = importlib.util.spec_from_file_location("mighty_edge_performance", helper_path)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def emit(value):
    sys.stdout.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
    sys.stdout.flush()


async def main():
    from edge_connection import EdgeConnection
    pool = EdgeConnection() if os.environ.get("MIGHTY_EDGE_REUSE", "1") != "0" else None
    jobs = {}
    warming = None

    async def warmup():
        try:
            await pool.warmup()
        except Exception:
            pass  # Optional preparation never fails a user turn.


    async def synthesize(command):
        job_id = command["jobId"]
        output = Path(command["audio"])
        metadata = Path(command["metadata"])
        cancelled = False
        try:
            args = argparse.Namespace(text=command["text"], voice=command["voice"], rate=command["rate"], pitch=command["pitch"], audio=str(output), metadata=str(metadata))
            if command.get("debugTiming") is True:
                await helper.generate(args, on_first_audio=lambda: emit({"type": "first_audio", "jobId": job_id}), connection_pool=pool)
            else:
                await helper.generate(args, connection_pool=pool)
            result = json.loads(metadata.read_text(encoding="utf-8"))
            emit({"type": "ready", "jobId": job_id, "timeline": result})
        except asyncio.CancelledError:
            cancelled = True
            emit({"type": "cancelled", "jobId": job_id})
            raise
        except Exception as exc:
            emit({"type": "error", "jobId": job_id, "error": str(exc)[:500]})
        finally:
            jobs.pop(job_id, None)
            if cancelled or not output.exists() or not metadata.exists():
                output.unlink(missing_ok=True)
                metadata.unlink(missing_ok=True)

    while True:
        line = await asyncio.to_thread(sys.stdin.readline)
        if not line:
            break
        try:
            command = json.loads(line)
            action = command.get("type")
            job_id = command.get("jobId")
            if not isinstance(job_id, str) or len(job_id) > 100:
                continue
            if action == "warmup":
                if pool is not None and (warming is None or warming.done()):
                    warming = asyncio.create_task(warmup())
            elif action == "synthesize":
                if job_id in jobs or len(jobs) >= 1 or not isinstance(command.get("text"), str) or len(command["text"]) > 180:
                    emit({"type": "error", "jobId": job_id, "error": "Worker is busy or job is invalid."})
                    continue
                jobs[job_id] = asyncio.create_task(synthesize(command))
            elif action == "cancel":
                task = jobs.get(job_id)
                if task:
                    task.cancel()
                else:
                    emit({"type": "cancelled", "jobId": job_id})
        except (ValueError, TypeError, KeyError) as exc:
            print(f"Invalid worker message: {exc}", file=sys.stderr)

    pending = list(jobs.values()) + ([warming] if warming is not None else [])
    for task in pending:
        task.cancel()
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)
    if pool is not None:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
