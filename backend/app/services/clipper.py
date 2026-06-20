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


def extract_clip(video_path: str, job_id: str, product: Dict, index: int) -> str:
    """
    Frame-accurate clip using two-pass seek:
      1. Input-side -ss seeks to keyframe ~2s before target (fast)
      2. Output-side -ss fine-tunes to exact frame (accurate)
    This eliminates previous-product bleed without the speed cost of
    pure output seeking on long videos.

    Quality:
      - Video : libx264, CRF 17, medium preset (better compression than veryfast)
      - Scale  : max 1920x1080, keep aspect ratio
      - Audio  : AAC 256 kbps
    """
    clips_dir = os.path.join(settings.temp_dir, job_id, "clips")
    os.makedirs(clips_dir, exist_ok=True)

    slug     = slugify(product.get("name", f"product_{index}"))
    out_path = os.path.join(clips_dir, f"{index:02d}_{slug}.mp4")

    start    = float(product["start"])
    duration = float(product["end"]) - start

    if duration <= 0:
        raise ValueError(f"Invalid duration for '{product['name']}': {duration:.1f}s")

    duration = min(duration, 600.0)

    # Two-pass seek: fast input seek to ~2s before, then exact output seek
    pre_seek  = max(0.0, start - 2.0)
    fine_seek = start - pre_seek

    cmd = [
        "ffmpeg",
        "-ss", f"{pre_seek:.3f}",   # Input seek — jump to keyframe near target
        "-i",  _p(video_path),
        "-ss", f"{fine_seek:.3f}",  # Output seek — frame-accurate trim
        "-t",  f"{duration:.3f}",
        "-c:v", "libx264",
        "-crf", "17",               # Slightly higher quality (was 18)
        "-preset", "medium",        # Better quality per bit than veryfast
        "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "256k",             # Higher audio bitrate (was 192k)
        "-movflags", "+faststart",
        _p(out_path),
        "-y",
        "-loglevel", "error",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        raise Exception(f"ffmpeg clip failed: {result.stderr[:300]}")

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
