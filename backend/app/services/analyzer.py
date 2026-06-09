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

def _normalize_yt_url(url: str) -> str:
    """Strip ?si= and other tracking params from YouTube share links."""
    m = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
    if m:
        return f"https://www.youtube.com/watch?v={m.group(1)}"
    return url

def _get_yt_metadata(url: str) -> Optional[Dict]:
    """Fetch chapters + description from YouTube without downloading."""
    try:
        clean_url = _normalize_yt_url(url)
        ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(clean_url, download=False)
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


# ── Tier 3: faster-whisper fallback (replaces openai-whisper — 4x less RAM) ──

def _extract_audio(video_path: str, job_id: str) -> str:
    audio_path = os.path.join(settings.temp_dir, job_id, "audio.wav")
    result = subprocess.run([
        "ffmpeg", "-i", _p(video_path),
        "-ac", "1", "-ar", "16000", "-vn",
        "-t", "600",          # max 10 min to avoid OOM on Railway
        _p(audio_path), "-y", "-loglevel", "error"
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Audio extraction failed: {result.stderr}")
    return audio_path


def _transcribe_whisper(audio_path: str) -> List[Dict]:
    """
    faster-whisper: CTranslate2 backend — 4x faster, 4x less RAM than openai-whisper.
    Hard timeout: if transcription takes > 3 min, raise TimeoutError so caller
    falls back to silence-detection segmentation.
    """
    import threading
    from faster_whisper import WhisperModel

    result_holder: List = []
    error_holder: List = []

    def _run():
        try:
            model = WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")
            segments_iter, _ = model.transcribe(
                audio_path,
                language="en",
                beam_size=1,
                vad_filter=True,
                vad_parameters={"min_silence_duration_ms": 500},
            )
            words = []
            for seg in segments_iter:
                text = seg.text.strip()
                if text:
                    words.append({"word": text, "start": seg.start, "end": seg.end})
            del model
            result_holder.append(words)
        except Exception as e:
            error_holder.append(e)

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout=180)  # 3-minute hard limit

    if t.is_alive():
        raise TimeoutError("Whisper transcription exceeded 3-minute limit — falling back to silence detection")
    if error_holder:
        raise error_holder[0]
    return result_holder[0] if result_holder else []


def _silence_segments(video_path: str, duration: float) -> List[Dict]:
    """
    Fast fallback: split on silence points using ffmpeg (no ML, <10 sec).
    Used when Whisper times out or errors.
    """
    res = subprocess.run([
        "ffmpeg", "-i", _p(video_path),
        "-af", "silencedetect=noise=-35dB:d=0.8",
        "-f", "null", "-"
    ], capture_output=True, text=True, timeout=60)

    silence_pts = []
    for line in res.stderr.splitlines():
        m = re.search(r"silence_end:\s*([\d.]+)", line)
        if m:
            silence_pts.append(float(m.group(1)))

    # Target ~60s segments, max 12 clips
    target = max(30.0, min(90.0, duration / 10))
    cuts = [0.0]
    last = 0.0
    for pt in silence_pts:
        if pt - last >= target * 0.7:
            cuts.append(round(pt, 2))
            last = pt
            if len(cuts) >= 12:
                break
    cuts.append(round(duration, 2))

    products = []
    for i in range(len(cuts) - 1):
        start, end = cuts[i], cuts[i + 1]
        if end - start < 5:
            continue
        m_s, s_s = int(start // 60), int(start % 60)
        products.append({
            "name": f"Segment {i + 1}  ({m_s}:{s_s:02d})",
            "description": "",
            "start": start,
            "end": end,
            "affiliate_url": "",
        })
    return products or [{"name": "Full Video", "description": "", "start": 0.0, "end": round(duration, 2), "affiliate_url": ""}]


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

    # ── Tier 3: faster-whisper fallback ───────────────────────────────
    try:
        audio_path = _extract_audio(video_path, job_id)
        words = _transcribe_whisper(audio_path)
        # Clean up audio file to free disk
        try:
            os.remove(audio_path)
        except Exception:
            pass
        products = _whisper_to_products(words, video_path, duration)
        return products, duration
    except TimeoutError as e:
        print(f"[analyzer] {e}")
        print("[analyzer] falling back to silence-detection segmentation")
        products = _silence_segments(video_path, duration)
        return products, duration
    except Exception as e:
        print(f"[analyzer] Whisper failed: {e} — falling back to silence detection")
        products = _silence_segments(video_path, duration)
        return products, duration
