"""
Smart product segment detector — 3-tier strategy:
  1. YouTube chapters  → instant, 100% accurate (best)
  2. Description parse → timestamps + affiliate links from text
  3. faster-whisper    → AI transcription, 4x faster & 4x less RAM than openai-whisper
"""
import subprocess
import os
import json
import re
import yt_dlp
from typing import List, Dict, Tuple, Optional
from app.config import settings

# Max audio seconds to transcribe (prevents OOM on Railway for very long videos)
WHISPER_MAX_SECONDS = 600  # 10 minutes


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
    products = []

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


# ── Tier 3: faster-whisper transcription ─────────────────────────────────

def _extract_audio(video_path: str, out_dir: str, max_seconds: int = None) -> str:
    """Extract mono 16kHz WAV audio for Whisper. Optionally truncate."""
    audio_path = os.path.join(out_dir, "audio.wav")
    cmd = [
        "ffmpeg", "-y", "-i", _p(video_path),
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
    ]
    if max_seconds:
        cmd += ["-t", str(max_seconds)]
    cmd.append(_p(audio_path))
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        raise Exception(f"ffmpeg audio extract failed: {result.stderr[:300]}")
    return audio_path


def _transcribe_whisper(video_path: str, job_id: str, duration: float) -> List[Dict]:
    """
    Transcribe audio with faster-whisper (CTranslate2 backend).
    4x faster & 4x less RAM than openai-whisper on CPU.
    """
    from faster_whisper import WhisperModel

    out_dir = os.path.dirname(video_path)

    # Cap audio to first WHISPER_MAX_SECONDS to prevent OOM on long videos
    cap = WHISPER_MAX_SECONDS if duration > WHISPER_MAX_SECONDS else None
    effective_duration = min(duration, WHISPER_MAX_SECONDS)
    print(f"[whisper] extracting audio (cap={cap}s)")
    audio_path = _extract_audio(video_path, out_dir, max_seconds=cap)

    # tiny INT8 model — ~150MB RAM, fast on CPU
    model_size = getattr(settings, "whisper_model", "tiny")
    print(f"[whisper] loading faster-whisper model={model_size}")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    print("[whisper] transcribing...")
    segments_iter, info = model.transcribe(
        audio_path,
        language="en",
        beam_size=1,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
    )
    segments = list(segments_iter)
    print(f"[whisper] got {len(segments)} raw segments")

    # Clean up audio file immediately to free disk space
    if os.path.exists(audio_path):
        os.remove(audio_path)

    if not segments:
        return []

    # Product keyword patterns
    PRODUCT_PATTERNS = [
        r"\b(this is|introducing|here'?s?|let me show you|check out|we have|i have|presenting)\b.{3,60}",
        r"\b(product|item|device|gadget|tool|phone|laptop|camera|headphone|speaker|watch|keyboard|mouse|charger|cable|bag|case)\b",
        r"\b(brand|model|version|series|edition|pro|plus|max|ultra|mini)\b",
        r"\b(price|cost|buy|purchase|available|amazon|link|affiliate)\b",
        r"\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b",  # CapWords product names
    ]
    PRODUCT_RE = re.compile("|".join(PRODUCT_PATTERNS), re.IGNORECASE)

    TRANSITION_PATTERNS = [
        r"\b(next up|next product|moving on|now let'?s?|number \d|#\d|\bno\.?\s*\d)\b",
        r"\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b",
        r"\b(alright|okay|so|now|moving|next|another)\b.{0,30}\b(product|item|look|check)\b",
    ]
    TRANSITION_RE = re.compile("|".join(TRANSITION_PATTERNS), re.IGNORECASE)

    # Group consecutive segments into product blocks
    # A new product block starts when a transition phrase is detected
    blocks: List[Dict] = []
    current_block: Optional[Dict] = None

    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue

        is_transition = bool(TRANSITION_RE.search(text))
        is_product_mention = bool(PRODUCT_RE.search(text))

        if is_transition or (is_product_mention and current_block is None):
            # Save previous block
            if current_block:
                blocks.append(current_block)
            current_block = {
                "texts": [text],
                "start": seg.start,
                "end": seg.end,
            }
        elif current_block:
            current_block["texts"].append(text)
            current_block["end"] = seg.end
        else:
            # No block started yet, start one from first segment
            current_block = {
                "texts": [text],
                "start": seg.start,
                "end": seg.end,
            }

    if current_block:
        blocks.append(current_block)

    if not blocks:
        return []

    # Convert blocks to products
    products = []
    for i, block in enumerate(blocks):
        full_text = " ".join(block["texts"])

        # Extract product name: try to find the most prominent noun phrase
        name = _extract_product_name(full_text, i + 1)

        # Extract affiliate URL if mentioned in text
        link_m = re.search(r"https?://\S+", full_text)
        aff_url = link_m.group(0) if link_m else ""

        start = round(block["start"], 2)
        end = round(block["end"], 2)

        # Skip very short segments (< 3s)
        if end - start < 3:
            continue

        products.append({
            "name": name,
            "description": full_text[:200],
            "start": start,
            "end": end,
            "affiliate_url": aff_url,
        })

    return products


def _extract_product_name(text: str, fallback_num: int) -> str:
    """Attempt to extract a product name from transcript text."""
    # Try: "the X [Pro/Max/Plus]" or "this is the X"
    patterns = [
        r"(?:this is|here'?s?|introducing|check out|it'?s? (?:the|a|an))\s+(?:the\s+)?([A-Z][^,.!?]{3,40})",
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z0-9]+){1,3})\b",  # CapWords brand/model names
        r"\b([A-Z][A-Z0-9]+(?:\s+[A-Z0-9]+)?)\b",  # ALL CAPS model codes (e.g. RTX 4090)
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            name = m.group(1).strip()
            if 3 < len(name) < 60:
                return name

    # Fallback: first 6 words of text
    words = text.split()[:6]
    name = " ".join(words).rstrip(".,!?")
    return name if name else f"Product {fallback_num}"


# ── Public API ─────────────────────────────────────────────────────────────

def analyze_video(video_path: str, job_id: str, source_url: str = None) -> Tuple[List[Dict], float]:
    """
    Smart 3-tier analysis. Returns (products, duration).
    Tier 1: YouTube chapters (instant)
    Tier 2: Description timestamps (instant)
    Tier 3: faster-whisper AI transcription (fast + low RAM fallback)
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

    # ── Tier 3: faster-whisper AI transcription ────────────────────────
    print("[analyzer] Tier 3: faster-whisper transcription")
    try:
        products = _transcribe_whisper(video_path, job_id, duration)
        if products:
            print(f"[analyzer] Tier 3 ✓ found {len(products)} products via Whisper")
            return products, duration
        print("[analyzer] Tier 3: no products detected in transcript")
    except Exception as e:
        print(f"[analyzer] Tier 3 failed: {e}")

    # Final fallback: return the whole video as one segment
    return [{
        "name": "Full Video",
        "description": "No specific products detected. Download the full clip.",
        "start": 0.0,
        "end": round(duration, 2),
        "affiliate_url": "",
    }], duration
