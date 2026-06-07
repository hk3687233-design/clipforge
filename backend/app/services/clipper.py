import subprocess
import os
import re
from typing import List, Dict
from app.config import settings

def slugify(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower()

def extract_clip(video_path: str, job_id: str, product: Dict, index: int) -> str:
    """
    Cut a clip from video_path based on product start/end times.
    Returns path to the output clip.
    High quality: CRF 16, preset slow, AAC 192k.
    """
    clips_dir = os.path.join(settings.temp_dir, job_id, "clips")
    os.makedirs(clips_dir, exist_ok=True)

    slug = slugify(product.get("name", f"product_{index}"))
    out_path = os.path.join(clips_dir, f"{index:02d}_{slug}.mp4")

    start = product["start"]
    duration = product["end"] - product["start"]

    if duration <= 0:
        raise ValueError(f"Invalid segment duration for {product['name']}: {duration}s")

    def _p(p: str) -> str:
        return p.replace("\\", "/")

    cmd = [
        "ffmpeg",
        "-ss", str(start),
        "-i", _p(video_path),
        "-t", str(duration),
        "-c", "copy",          # Stream copy — instant, lossless, no re-encoding
        "-movflags", "+faststart",
        _p(out_path),
        "-y",
        "-loglevel", "error"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"ffmpeg clip failed: {result.stderr[:300]}")
    return out_path


def extract_all_clips(video_path: str, job_id: str, products: List[Dict]) -> List[Dict]:
    """Extract clips for all products. Returns products list with clip_path added."""
    results = []
    for i, product in enumerate(products):
        try:
            clip_path = extract_clip(video_path, job_id, product, i)
            results.append({**product, "clip_path": clip_path, "clip_filename": os.path.basename(clip_path)})
        except Exception as e:
            results.append({**product, "clip_path": None, "error": str(e)})
    return results
