#!/usr/bin/env python3
"""Build tiny REAL waveform files once per publish; never ship/duplicate the MP3."""
import array
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "recordings"
OUTPUT = ROOT / "data" / "waveforms"
SAMPLE_RATE = 4000
PEAK_COUNT = 512
MAX_SECONDS = 900


def allowed_source(raw):
    if not isinstance(raw, str):
        return False
    parsed = urlparse(raw.strip())
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and (
        host.endswith(".r2.dev") or host == "audio.stoneprism.music"
    )


def envelope(pcm, count=PEAK_COUNT):
    """Return max-absolute peaks per equally spaced slice of mono 16-bit PCM."""
    if not pcm:
        return []
    steps = count
    result = []
    n = len(pcm)
    for i in range(steps):
        start = (i * n) // steps
        end = max(start + 1, ((i + 1) * n) // steps)
        peak = max(abs(sample) for sample in pcm[start:end]) / 32768
        result.append(round(min(1.0, peak), 4))
    return result


def decode(url):
    args = [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
        "-user_agent", "StonePrismWaveforms/1.0",
        "-i", url,
        "-map", "0:a:0", "-vn", "-t", str(MAX_SECONDS),
        "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "s16le", "pipe:1"
    ]
    response = subprocess.run(args, capture_output=True, timeout=90, check=True)
    pcm = array.array("h")
    pcm.frombytes(response.stdout[:len(response.stdout) // 2 * 2])
    if sys.byteorder != "little":
        pcm.byteswap()
    return pcm


def build():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if not shutil.which("ffmpeg"):
        print("WAVEFORMS: ffmpeg missing; native seeking will remain available.")
        return
    count = 0
    for file in sorted(CONTENT.glob("*.json")):
        record = json.loads(file.read_text(encoding="utf-8"))
        if record.get("status") != "published":
            continue
        slug = str(record.get("slug", ""))
        if not slug or not all(ch.isalnum() or ch == "-" for ch in slug):
            continue
        for i, track in enumerate(record.get("tracks") or []):
            source = track.get("audio_url", "")
            if not allowed_source(source):
                continue
            try:
                samples = decode(source)
                if not samples:
                    raise ValueError("Decoded audio contained no samples")
                payload = {
                    "source": source,
                    "duration": round(len(samples) / SAMPLE_RATE, 4),
                    "peaks": envelope(samples),
                }
                output = OUTPUT / f"{slug}-{i}.json"
                output.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
                count += 1
                print(f"WAVEFORMS: generated {output.name}, {payload['duration']:.1f}s, {len(payload['peaks'])} bars.")
            except (subprocess.SubprocessError, OSError, ValueError) as exc:
                # A temporary audio-host failure must not block the website publish.
                print(f"WAVEFORMS: unable to generate {slug} track {i}: {str(exc)[:250]}")
    print(f"WAVEFORMS: generated {count} file(s).")


if __name__ == "__main__":
    build()
