"""
Smart product segment detector — 3-tier strategy:
  1. YouTube chapters  → instant, 100% accurate (best)
  2. Description parse → timestamps + affiliate links from text
  3. Whisper fallback  → for videos with no metadata
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
    """
    Convert YouTube chapter data into product list.
    Skips intro/outro chapters and matches affiliate links from description.
    """
    # Parse affiliate links from description
    # Pattern: timestamp - Product Name - https://...
    aff_links: Dict[str, str] = {}
    for line in (description or "").splitlines():
        m = re.search(
            r"\d+:\d+\s*[-–]\s*(.+?)\s*[-–]\s*(https?://\S+)",
            line.strip()
        )
        if m:
            name_key = m.group(1).strip().lower()
            aff_links[name_key] = m.group(2).strip()

    skip_titles = {"intro", "outro", "introduction", "conclusion", "end", "opening"}
    products = []

    for ch in chapters:
        title = ch.get("title", "").strip()
        if title.lower() in skip_titles:
            continue

        start = float(ch.get("start_time", 0))
        end = float(ch.get("end_time", duration))

        # Match affiliate link by product name
        aff_url = aff_links.get(title.lower(), "")
        if not aff_url:
            # Fuzzy match — try partial
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
    """
    Parse timestamps from description text.
    Handles: 0:22 - Product Name - https://link
             0:22 Product Name https://link
    """
    products = []
    lines = description.splitlines()
    entries = []

    for line in lines:
        # Match: timestamp - name (- optional link)
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


# ── Tier 3: Whisper fallback ───────────────────────────────────────────────

def _extract_audio(video_path: str, job_id: str) -> str:
    audio_path = os.path.join(settings.temp_dir, job_id, "audio.wav")
    result = subprocess.run([
        "ffmpeg", "-i", _p(video_path),
        "-ac", "1", "-ar", "16000", "-vn",
        _p(audio_path), "-y", "-loglevel", "error"
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Audio extraction failed: {result.stderr}")
    return audio_path


def _transcribe_whisper(audio_path: str) -> List[Dict]:
    import whisper
    model = whisper.load_model(settings.whisper_model, device="cpu")
    result = model.transcribe(
        audio_path,
        word_timestamps=False,
        verbose=False,
        fp16=False,
        beam_size=1,
        best_of=1,
        temperature=0.0,
        condition_on_previous_text=False,
    )
    del model
    words = []
    for seg in result.get("segments", []):
        text = seg.get("text", "").strip()
        if text:
            words.append({"word": text, "start": seg["start"], "end": seg["end"]})
    return words


TRANSITION_PATTERNS = [
    r"\bnext\b", r"\bmoving on\b", r"\bnumber\s+\d+\b", r"\bproduct\s+\d+\b",
    r"\bfirst(?:ly)?\b", r"\bsecond(?:ly)?\b", r"\bthird(?:ly)?\b",
    r"\bnext up\b", r"\bup next\b", r"\bstarting with\b",
]
_COMPILED = [re.compile(p, re.IGNORECASE) for p in TRANSITION_PATTERNS]


def _whisper_to_products(words: List[Dict], video_path: str, duration: float) -> List[Dict]:
    # Silence breaks
    res = subprocess.run([
        "ffmpeg", "-i", _p(video_path),
        "-af", "silencedetect=noise=-35dB:d=1.0",
        "-f", "null", "-"
    ], capture_output=True, text=True)
    silence_ts = [float(m.group(1)) for m in
                  (re.search(r"silence_end:\s*([\d.]+)", line) for line in res.stderr.splitlines())
                  if m]

    # Transition timestamps
    trans_ts = []
    for w in words:
        chunk = w["word"]
        for pat in _COMPILED:
            if pat.search(chunk):
                trans_ts.append(w["start"])
                break

    raw = sorted(set(trans_ts + silence_ts))
    merged = []
    for t in raw:
        if not merged or t - merged[-1] > 3.0:
            merged.append(t)

    min_seg = max(8.0, duration / 20)
    filtered = [0.0]
    for t in merged:
        if t - filtered[-1] >= min_seg:
            filtered.append(t)
    if filtered[-1] < duration - min_seg:
        filtered.append(duration)
    else:
        filtered[-1] = duration

    if len(filtered) < 2:
        return [{"name": "Full Video", "description": "", "start": 0.0, "end": round(duration, 2), "affiliate_url": ""}]

    products = []
    for i in range(len(filtered) - 1):
        start, end = filtered[i], filtered[i + 1]
        seg_words = [w["word"] for w in words if start <= w["start"] < start + 8]
        name = " ".join(seg_words)[:50].strip().title() or f"Product {i + 1}"
        products.append({
            "name": name, "description": "", "start": round(start, 2),
            "end": round(end, 2), "affiliate_url": "",
        })
    return products


# ── Public API ─────────────────────────────────────────────────────────────

def analyze_video(video_path: str, job_id: str, source_url: str = None) -> Tuple[List[Dict], float]:
    """
    Smart 3-tier analysis. Returns (products, duration).
    Each product: {name, description, start, end, affiliate_url}
    """
    duration = _get_duration(video_path)

    # ── Tier 1: YouTube chapters (fastest, most accurate) ──────────────
    if source_url:
        meta = _get_yt_metadata(source_url)
        if meta:
            chapters = meta.get("chapters") or []
            description = meta.get("description", "")
            if chapters:
                products = _chapters_to_products(chapters, description, duration)
                if products:
                    return products, duration

            # ── Tier 2: Parse description timestamps ───────────────────
            if description:
                products = _parse_description_timestamps(description, duration)
                if products:
                    return products, duration

    # ── Tier 3: Whisper fallback ───────────────────────────────────────
    audio_path = _extract_audio(video_path, job_id)
    words = _transcribe_whisper(audio_path)
    products = _whisper_to_products(words, video_path, duration)
    return products, duration
