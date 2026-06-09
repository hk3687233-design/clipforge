import subprocess
import os
import re
from typing import List, Dict
from app.config import settings


def slugify(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower()


def _p(path: str) -> str:
    return path.replace("\\", "/")


def extract_clip(video_path: str, job_id: str, product: Dict, index: int) -> str:
    """
    Cut a precise clip from video_path.

    Uses input-side seeking (-ss before -i) + re-encode for frame-accurate cuts.
    This prevents the "previous product shows for a few seconds" keyframe issue
    that occurs with stream-copy (-c copy).

    Quality: 1080p max, CRF 18 (near-lossless), AAC 192k.
    """
    clips_dir = os.path.join(settings.temp_dir, job_id, "clips")
    os.makedirs(clips_dir, exist_ok=True)

    slug     = slugify(product.get("name", f"product_{index}"))
    out_path = os.path.join(clips_dir, f"{index:02d}_{slug}.mp4")

    start    = float(product["start"])
    duration = float(product["end"]) - start

    if duration <= 0:
        raise ValueError(f"Invalid duration for '{product['name']}': {duration}s")

    cmd = [
        "ffmpeg",
        "-ss", f"{start:.3f}",          # input seek (fast + accurate)
        "-i",  _p(video_path),
        "-t",  f"{duration:.3f}",
        # Video: re-encode for frame-accurate start, max 1080p, good quality
        "-c:v", "libx264",
        "-crf", "18",                    # near-lossless (0=lossless, 51=worst)
        "-preset", "veryfast",           # fast encode on Railway CPU
        "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        "-pix_fmt", "yuv420p",
        # Audio: AAC 192k
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        _p(out_path),
        "-y",
        "-loglevel", "error",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True,
                            timeout=300)   # 5-min max per clip
    if result.returncode != 0:
        raise Exception(f"ffmpeg clip failed: {result.stderr[:300]}")
    return out_path


def extract_all_clips(video_path: str, job_id: str, products: List[Dict]) -> List[Dict]:
    results = []
    for i, product in enumerate(products):
        try:
            clip_path = extract_clip(video_path, job_id, product, i)
            results.append({**product,
                            "clip_path":     clip_path,
                            "clip_filename": os.path.basename(clip_path)})
        except Exception as e:
            results.append({**product, "clip_path": None, "error": str(e)})
    return results
