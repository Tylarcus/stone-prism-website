#!/usr/bin/env python3
"""Build tiny REAL waveform files once per publish; never ship/duplicate the MP3."""
import array
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import urlparse, quote
import re
from urllib.request import Request, urlopen

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


def track_audio_source(track):
    """Resolve the same R2 URL as tools/build.mjs for a Pages CMS audio_file."""
    upload = track.get("audio_file")
    if not upload:
        return track.get("audio_url", "")
    match = re.fullmatch(r"/?media/audio/([a-z0-9][a-z0-9._-]*\.mp3)", str(upload), re.I)
    if not match:
        return ""
    config = json.loads((ROOT / "content/audio-host.json").read_text(encoding="utf-8"))
    base = str(config["public_base_url"]).rstrip("/")
    prefix = str(config["object_prefix"])
    if not re.fullmatch(r"[a-z0-9-]+", prefix):
        return ""
    return f"{base}/{prefix}/{quote(match.group(1))}"


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


def ffmpeg_executable():
    command = shutil.which("ffmpeg")
    if command:
        return command
    # Linux GitHub runners do not always ship FFmpeg. A pinned self-contained
    # wheel avoids a full apt-get update on every CMS or layout edit.
    sys.path.insert(0, str(ROOT / ".wave-tools"))
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError, OSError):
        return None


def recover_previous(slug, track_index, source):
    """Preserve last published waveform during a tool/network outage."""
    target = OUTPUT / f"{slug}-{track_index}.json"
    if target.exists():
        try:
            prev = json.loads(target.read_text(encoding="utf-8"))
            if prev.get("source") == source and len(prev.get("peaks", [])) >= 20:
                return True
        except (OSError, ValueError, TypeError):
            pass
    try:
        public_url = f"https://stoneprism.music/data/waveforms/{slug}-{track_index}.json"
        with urlopen(Request(public_url, headers={"User-Agent": "StonePrismWaveforms/1.0"}), timeout=6) as f:
            if f.status != 200:
                return False
            payload = json.loads(f.read(100000).decode("utf-8"))
        if payload.get("source") == source and isinstance(payload.get("peaks"), list) and len(payload["peaks"]) >= 20:
            target.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
            print(f"WAVEFORMS: reused last published peaks for {slug}-{track_index}.")
            return True
    except (OSError, ValueError, TypeError):
        pass
    return False


def decode(url, executable):
    args = [
        executable, "-nostdin", "-hide_banner", "-loglevel", "error",
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
    executable = ffmpeg_executable()
    if not executable:
        print("WAVEFORMS: binary unavailable; preserving previously published peaks where possible.")
    count = 0
    for file in sorted(CONTENT.glob("*.json")):
        record = json.loads(file.read_text(encoding="utf-8"))
        if record.get("status") != "published":
            continue
        slug = str(record.get("slug", ""))
        if not slug or not all(ch.isalnum() or ch == "-" for ch in slug):
            continue
        for i, track in enumerate(record.get("tracks") or []):
            source = track_audio_source(track)
            if not allowed_source(source):
                continue
            try:
                if not executable:
                    if recover_previous(slug, i, source):
                        count += 1
                    continue
                samples = decode(source, executable)
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
                if recover_previous(slug, i, source):
                    count += 1
    print(f"WAVEFORMS: generated {count} file(s).")


if __name__ == "__main__":
    build()
