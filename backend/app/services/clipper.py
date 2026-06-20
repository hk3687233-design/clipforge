import subprocess
import os
import re
import json
from typing import List, Dict
from app.config import settings


def slugify(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower()


def _p(path: str) -> str:
    return path.replace("\\", "/")


def _get_video_resolution(video_path: str) -> str:
    """Return resolution string like '1920x1080' from source video."""
    try:
        r = subprocess.run([
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "json", _p(video_path)
        ], capture_output=True, text=True)
        data = json.loads(r.stdout)
        s = data["streams"][0]
        return f"{s['width']}x{s['height']}"
    except Exception:
        return "unknown"


# Quality presets for on-demand transcoding
QUALITY_MAP: Dict[str, tuple] = {
    "480p":  (854,  480),
    "720p":  (1280, 720),
    "1080p": (1920, 1080),
    "2k":    (2560, 1440),
}

# How many seconds to trim from clip start to skip transition overlap.
# Description timestamps mark when creator MENTIONS a product, not when
# the visual transition to that product happens (~0.8s later on average).
_TRANSITION_TRIM = 0.8


def extract_clip(video_path: str, job_id: str, product: Dict, index: int) -> str:
    """
    Frame-accurate clip extraction.
    - Single input-side seek (accurate with re-encode in FFmpeg 4+)
    - 0.8s start trim to eliminate previous-product transition bleed
    - libx264 CRF 17, medium preset, AAC 256 kbps
    """
    clips_dir = os.path.join(settings.temp_dir, job_id, "clips")
    os.makedirs(clips_dir, exist_ok=True)

    slug     = slugify(product.get("name", f"product_{index}"))
    out_path = os.path.join(clips_dir, f"{index:02d}_{slug}.mp4")

    raw_start = float(product["start"])
    raw_end   = float(product["end"])

    # Trim clip start to skip transition overlap from previous product
    start    = raw_start + _TRANSITION_TRIM if raw_start > _TRANSITION_TRIM else raw_start
    duration = raw_end - start

    if duration <= 0:
        raise ValueError(f"Invalid duration for '{product['name']}': {duration:.1f}s")
    duration = min(duration, 600.0)

    cmd = [
        "ffmpeg",
        "-ss", f"{start:.3f}",      # Input-side seek — fast + accurate with re-encode
        "-i",  _p(video_path),
        "-t",  f"{duration:.3f}",
        "-c:v", "libx264",
        "-crf", "17",
        "-preset", "medium",
        "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,setsar=1",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "256k",
        "-movflags", "+faststart",
        _p(out_path),
        "-y", "-loglevel", "error",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise Exception(f"ffmpeg clip failed: {result.stderr[:300]}")

    return out_path


def transcode_clip(src_path: str, quality: str) -> str:
    """
    Re-encode an existing clip at the requested quality preset.
    Result is cached alongside the source clip (e.g. 00_foo_720p.mp4).
    Returns path to the transcoded file.
    """
    if quality not in QUALITY_MAP:
        return src_path  # unknown quality → serve original

    w, h = QUALITY_MAP[quality]
    base, ext = os.path.splitext(src_path)
    out_path = f"{base}_{quality}{ext}"

    if os.path.exists(out_path):
        return out_path  # already cached

    cmd = [
        "ffmpeg",
        "-i", _p(src_path),
        "-vf", f"scale='min({w},iw)':'min({h},ih)':force_original_aspect_ratio=decrease,setsar=1",
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        _p(out_path),
        "-y", "-loglevel", "error",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode != 0:
        raise Exception(f"ffmpeg transcode failed: {result.stderr[:300]}")
    return out_path


def extract_all_clips(video_path: str, job_id: str, products: List[Dict]) -> List[Dict]:
    src_res = _get_video_resolution(video_path)
    results = []
    for i, product in enumerate(products):
        try:
            clip_path = extract_clip(video_path, job_id, product, i)
            clip_res  = _get_video_resolution(clip_path)
            results.append({
                **product,
                "clip_path":     clip_path,
                "clip_filename": os.path.basename(clip_path),
                "resolution":    clip_res,
            })
        except Exception as e:
            results.append({**product, "clip_path": None, "error": str(e)})
    return results
