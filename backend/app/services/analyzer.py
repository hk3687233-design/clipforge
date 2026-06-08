"""
Smart product segment detector — 3-tier strategy:
  1. YouTube chapters  → instant, 100% accurate (best)
  2. Description parse → timestamps + affiliate links from text
  3. Equal-time split  → fast fallback, no Whisper/torch needed (saves RAM)
"""
import subprocess
import os
import json
import re
import yt_dlp
from typing import List, Dict, Tuple, Optional
from app.config import settings


def _p(path: str) -> str:
    return path.replace("\\", "/")


def _get_duration(video_path: str) -> float:
    result = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json", _p(video_path)
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"ffprobe failed: {result.stderr}")
    return float(json.loads(result.stdout)["format"]["duration"])


# ── Tier 1: YouTube chapters ───────────────────────────────────────────────

def _get_yt_metadata(url: str) -> Optional[Dict]:
    """Fetch chapters + description from YouTube without downloading."""
    try:
        ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(url, download=False)
    except Exception:
        return None


def _chapters_to_products(chapters: List[Dict], description: str, duration: float) -> List[Dict]:
    aff_links: Dict[str, str] = {}
    for line in (description or "").splitlines():
        m = re.search(
            r"\d+:\d+\s*[-–]\s*(.+?)\s*[-–]\s*(https?://\S+)",
            line.strip()
        )
        if m:
            aff_links[m.group(1).strip().lower()] = m.group(2).strip()

    skip_titles = {"intro", "outro", "introduction", "conclusion", "end", "opening"}
    products = []

    for ch in chapters:
        title = ch.get("title", "").strip()
        if title.lower() in skip_titles:
            continue

        start = float(ch.get("start_time", 0))
        end = float(ch.get("end_time", duration))

        aff_url = aff_links.get(title.lower(), "")
        if not aff_url:
            for key, link in aff_links.items():
                if key in title.lower() or title.lower() in key:
                    aff_url = link
                    break

        products.append({
            "name": title,
            "description": "",
            "start": round(start, 2),
            "end": round(end, 2),
            "affiliate_url": aff_url,
        })

    return products


# ── Tier 2: Description timestamp parse ───────────────────────────────────

def _parse_description_timestamps(description: str, duration: float) -> List[Dict]:
    products = []
    entries = []

    for line in description.splitlines():
        m = re.match(
            r"(\d+):(\d+)\s*[-–]?\s*(.+?)(?:\s*[-–]\s*(https?://\S+))?$",
            line.strip()
        )
        if m:
            mins, secs = int(m.group(1)), int(m.group(2))
            start = mins * 60 + secs
            name = m.group(3).strip()
            link = m.group(4) or ""
            entries.append({"name": name, "start": float(start), "link": link})

    skip = {"intro", "outro", "introduction", "end", "opening"}

    for i, entry in enumerate(entries):
        if entry["name"].lower() in skip:
            continue
        end = entries[i + 1]["start"] if i + 1 < len(entries) else duration
        products.append({
            "name": entry["name"],
            "description": "",
            "start": round(entry["start"], 2),
            "end": round(end, 2),
            "affiliate_url": entry["link"],
        })

    return products


# ── Tier 3: Equal-time segments (no Whisper/torch — saves RAM) ────────────

def _equal_time_segments(video_path: str, duration: float) -> List[Dict]:
    """
    Split video into equal segments of ~60s each.
    Fast, zero memory overhead, works for any platform.
    Target: 6-12 clips max regardless of video length.
    """
    # Detect silence points using ffmpeg (lightweight, no ML)
    silence_pts = []
    try:
        res = subprocess.run([
            "ffmpeg", "-i", _p(video_path),
            "-af", "silencedetect=noise=-35dB:d=0.8",
            "-f", "null", "-"
        ], capture_output=True, text=True, timeout=60)
        for line in res.stderr.splitlines():
            m = re.search(r"silence_end:\s*([\d.]+)", line)
            if m:
                silence_pts.append(float(m.group(1)))
    except Exception:
        pass

    # Target segment length based on video duration
    if duration <= 120:
        target_len = 30.0
    elif duration <= 300:
        target_len = 45.0
    elif duration <= 600:
        target_len = 60.0
    else:
        target_len = 90.0

    max_clips = 12

    # Build cut points: prefer silence points near target boundaries
    cuts = [0.0]
    last_cut = 0.0

    while last_cut + target_len * 0.6 < duration:
        ideal = last_cut + target_len
        if ideal >= duration:
            break

        # Find nearest silence point within ±15s of ideal
        best = ideal
        for pt in silence_pts:
            if abs(pt - ideal) < abs(best - ideal) and abs(pt - ideal) <= 15:
                best = pt

        if best <= last_cut + 5:
            best = ideal

        cuts.append(round(best, 2))
        last_cut = best

        if len(cuts) >= max_clips:
            break

    cuts.append(round(duration, 2))

    # Build products
    products = []
    for i in range(len(cuts) - 1):
        start, end = cuts[i], cuts[i + 1]
        if end - start < 5:
            continue

        # Name based on position
        pct = start / duration
        if pct < 0.1:
            name = "Intro / Overview"
        elif pct > 0.85:
            name = "Final Thoughts"
        else:
            m = int(start // 60)
            s = int(start % 60)
            name = f"Segment {i + 1}  ({m}:{s:02d})"

        products.append({
            "name": name,
            "description": "",
            "start": start,
            "end": end,
            "affiliate_url": "",
        })

    return products if products else [
        {"name": "Full Video", "description": "",
         "start": 0.0, "end": round(duration, 2), "affiliate_url": ""}
    ]


# ── Public API ─────────────────────────────────────────────────────────────

def analyze_video(video_path: str, job_id: str, source_url: str = None) -> Tuple[List[Dict], float]:
    """
    Smart 3-tier analysis. Returns (products, duration).
    Tier 1: YouTube chapters (instant)
    Tier 2: Description timestamps (instant)
    Tier 3: Equal-time segments with silence detection (fast, no ML/RAM)
    """
    duration = _get_duration(video_path)
    print(f"[analyzer] video duration={duration:.1f}s source={source_url or 'upload'}")

    # ── Tier 1: YouTube chapters ───────────────────────────────────────
    if source_url:
        print("[analyzer] Tier 1: fetching YouTube metadata")
        meta = _get_yt_metadata(source_url)
        if meta:
            chapters = meta.get("chapters") or []
            description = meta.get("description", "")
            if chapters:
                products = _chapters_to_products(chapters, description, duration)
                if products:
                    print(f"[analyzer] Tier 1 ✓ found {len(products)} chapters")
                    return products, duration

            # ── Tier 2: Description timestamps ────────────────────────
            if description:
                print("[analyzer] Tier 2: parsing description timestamps")
                products = _parse_description_timestamps(description, duration)
                if products:
                    print(f"[analyzer] Tier 2 ✓ found {len(products)} timestamp segments")
                    return products, duration

    # ── Tier 3: Equal-time split (fast, no Whisper) ────────────────────
    print("[analyzer] Tier 3: equal-time segments with silence detection")
    products = _equal_time_segments(video_path, duration)
    print(f"[analyzer] Tier 3 ✓ created {len(products)} segments")
    return products, duration
