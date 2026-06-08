"""
Smart product segment detector — 3-tier strategy:
  1. YouTube chapters  → instant, 100% accurate (best)
  2. Description parse → timestamps + affiliate links from text
  3. faster-whisper    → AI transcription; affiliate links matched from description
"""
import subprocess
import os
import json
import re
import yt_dlp
from typing import List, Dict, Tuple, Optional
from app.config import settings

# Max audio seconds to transcribe — prevents OOM on Railway for very long videos
WHISPER_MAX_SECONDS = 600  # 10 min cap


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


def _extract_desc_links(description: str) -> Dict[str, str]:
    """
    Pull ALL affiliate/product links from description.
    Returns dict of {lowercased_label: url} by scanning:
      - "Product Name — https://..."
      - "Product Name: https://..."
      - "MM:SS Product Name https://..."
      - bare https:// links with surrounding text as label
    """
    links: Dict[str, str] = {}
    for line in (description or "").splitlines():
        line = line.strip()
        if not line:
            continue
        # Pattern: any text — URL  or  timestamp text URL
        m = re.search(r"(https?://\S+)", line)
        if not m:
            continue
        url = m.group(1).rstrip(".,)")
        # Label = everything before the URL, minus leading timestamp
        label = line[:m.start()].strip()
        label = re.sub(r"^\d+:\d+\s*[-–]?\s*", "", label)  # strip timestamp
        label = re.sub(r"[-–:•·]\s*$", "", label).strip()  # strip trailing sep
        if label:
            links[label.lower()] = url
    return links


def _chapters_to_products(chapters: List[Dict], description: str, duration: float) -> List[Dict]:
    aff_links = _extract_desc_links(description)
    skip_titles = {"intro", "outro", "introduction", "conclusion", "end", "opening", "sponsor", "ad"}
    products = []

    for ch in chapters:
        title = ch.get("title", "").strip()
        if title.lower() in skip_titles:
            continue

        start = float(ch.get("start_time", 0))
        end = float(ch.get("end_time", duration))

        # Match affiliate link: exact, then substring
        aff_url = aff_links.get(title.lower(), "")
        if not aff_url:
            for label, link in aff_links.items():
                if label in title.lower() or title.lower() in label:
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
        # MM:SS or H:MM:SS optionally followed by label and optional URL
        m = re.match(
            r"(?:(\d+):)?(\d+):(\d+)\s*[-–]?\s*(.+?)(?:\s+(https?://\S+))?$",
            line.strip()
        )
        if not m:
            continue
        hours = int(m.group(1) or 0)
        mins = int(m.group(2))
        secs = int(m.group(3))
        start = hours * 3600 + mins * 60 + secs
        name = m.group(4).strip()
        link = (m.group(5) or "").strip()
        entries.append({"name": name, "start": float(start), "link": link})

    if len(entries) < 2:
        return []

    skip = {"intro", "outro", "introduction", "end", "opening", "sponsor"}
    aff_links = _extract_desc_links(description)
    products = []

    for i, entry in enumerate(entries):
        if entry["name"].lower().strip() in skip:
            continue
        end = entries[i + 1]["start"] if i + 1 < len(entries) else duration

        # Link from the timestamp line itself, else match from description
        link = entry["link"]
        if not link:
            for label, url in aff_links.items():
                if label in entry["name"].lower() or entry["name"].lower() in label:
                    link = url
                    break

        products.append({
            "name": entry["name"],
            "description": "",
            "start": round(entry["start"], 2),
            "end": round(end, 2),
            "affiliate_url": link,
        })

    return products


# ── Tier 3: faster-whisper + description link matching ────────────────────

def _extract_audio(video_path: str, out_dir: str, max_seconds: int = None) -> str:
    """Extract mono 16kHz WAV for Whisper. Optionally truncate to save RAM."""
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


def _best_product_name(text: str, fallback: str) -> str:
    """
    Extract the most likely product name from a transcript block.
    Tries several NLP-free heuristics.
    """
    # 1. "this is the <name>" / "here's the <name>" / "introducing the <name>"
    m = re.search(
        r"(?:this is|here'?s?|introducing|presenting|it'?s?(?:\s+(?:the|a|an))?)\s+(?:the\s+)?([A-Z][^,.!?\n]{2,50})",
        text, re.IGNORECASE
    )
    if m:
        name = m.group(1).strip().rstrip(".,!?")
        if 3 < len(name) < 60:
            return name

    # 2. CapWords brand + model (e.g. "Sony WH-1000XM5", "Anker 737")
    m = re.search(r"\b([A-Z][a-z]+(?:\s+[A-Z0-9][a-zA-Z0-9\-]{1,15}){1,3})\b", text)
    if m:
        name = m.group(1).strip()
        if 3 < len(name) < 60:
            return name

    # 3. ALL-CAPS model code (RTX 4090, IPHONE 15)
    m = re.search(r"\b([A-Z]{2,}(?:\s+[A-Z0-9]+){0,3})\b", text)
    if m:
        name = m.group(1).strip()
        if 3 < len(name) < 40:
            return name

    # 4. First meaningful phrase (first 6 words)
    words = re.sub(r"[^\w\s]", "", text).split()[:7]
    name = " ".join(words).strip()
    return name if name else fallback


def _match_link(name: str, aff_links: Dict[str, str]) -> str:
    """Find best matching affiliate link for a product name."""
    name_lower = name.lower()
    # Exact match
    if name_lower in aff_links:
        return aff_links[name_lower]
    # Substring match (name contains label or label contains name)
    best = ""
    best_len = 0
    for label, url in aff_links.items():
        if label in name_lower or name_lower in label:
            if len(label) > best_len:
                best = url
                best_len = len(label)
    return best


def _transcribe_whisper(video_path: str, job_id: str, duration: float, aff_links: Dict[str, str]) -> List[Dict]:
    """
    Transcribe with faster-whisper (CTranslate2 — 4x less RAM, 4x faster).
    aff_links: description affiliate links {label: url} for matching.
    """
    from faster_whisper import WhisperModel

    out_dir = os.path.dirname(video_path)
    cap = WHISPER_MAX_SECONDS if duration > WHISPER_MAX_SECONDS else None
    print(f"[whisper] extracting audio (cap={cap}s)")
    audio_path = _extract_audio(video_path, out_dir, max_seconds=cap)

    model_size = getattr(settings, "whisper_model", "tiny")
    print(f"[whisper] loading faster-whisper model={model_size} compute=int8")
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
    print(f"[whisper] {len(segments)} raw segments, lang={info.language}")

    # Free audio immediately
    try:
        os.remove(audio_path)
    except Exception:
        pass

    if not segments:
        return []

    # ── Detect product transitions ───────────────────────────────────
    TRANSITION_RE = re.compile(
        r"\b(next up|next product|moving on|number \d+|#\s*\d+|no\.?\s*\d+"
        r"|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth"
        r"|alright|okay so|now let'?s|here we have|up next|let me show you"
        r"|this one|check this out)\b",
        re.IGNORECASE
    )

    PRODUCT_RE = re.compile(
        r"\b(product|item|device|gadget|phone|laptop|camera|headphone|speaker"
        r"|watch|keyboard|mouse|charger|cable|bag|case|tablet|monitor|printer"
        r"|brand|model|version|series|edition|pro|plus|max|ultra|mini)\b",
        re.IGNORECASE
    )

    # Group segments into blocks; new block = transition phrase detected
    blocks: List[Dict] = []
    cur: Optional[Dict] = None

    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue

        is_transition = bool(TRANSITION_RE.search(text))

        if is_transition and cur:
            blocks.append(cur)
            cur = {"texts": [text], "start": seg.start, "end": seg.end}
        elif cur is None:
            cur = {"texts": [text], "start": seg.start, "end": seg.end}
        else:
            cur["texts"].append(text)
            cur["end"] = seg.end

    if cur:
        blocks.append(cur)

    if not blocks:
        return []

    # ── Convert blocks → products ────────────────────────────────────
    products = []
    for i, block in enumerate(blocks):
        full_text = " ".join(block["texts"])
        start = round(block["start"], 2)
        end = round(block["end"], 2)

        if end - start < 3:
            continue

        name = _best_product_name(full_text, f"Product {i + 1}")

        # Affiliate link: match from description links first, then spoken URL
        aff_url = _match_link(name, aff_links)
        if not aff_url:
            spoken_url = re.search(r"https?://\S+", full_text)
            if spoken_url:
                aff_url = spoken_url.group(0)

        products.append({
            "name": name,
            "description": full_text[:300],
            "start": start,
            "end": end,
            "affiliate_url": aff_url,
        })

    print(f"[whisper] extracted {len(products)} products")
    return products


# ── Public API ─────────────────────────────────────────────────────────────

def analyze_video(video_path: str, job_id: str, source_url: str = None) -> Tuple[List[Dict], float]:
    """
    3-tier smart analysis.  Returns (products, duration).
    Every product has: name, start, end, affiliate_url, description.
    The clipper then cuts a separate MP4 for each.
    """
    duration = _get_duration(video_path)
    print(f"[analyzer] duration={duration:.1f}s  url={source_url or 'upload'}")

    description = ""
    aff_links: Dict[str, str] = {}

    # ── Tier 1: YouTube chapters ───────────────────────────────────────
    if source_url:
        print("[analyzer] Tier 1: fetching YouTube metadata")
        meta = _get_yt_metadata(source_url)
        if meta:
            description = meta.get("description") or ""
            aff_links = _extract_desc_links(description)
            chapters = meta.get("chapters") or []

            if chapters:
                products = _chapters_to_products(chapters, description, duration)
                if products:
                    print(f"[analyzer] Tier 1 ✓  {len(products)} chapters  "
                          f"({sum(1 for p in products if p['affiliate_url'])} with links)")
                    return products, duration

            # ── Tier 2: Description timestamps ────────────────────────
            if description:
                print("[analyzer] Tier 2: parsing description timestamps")
                products = _parse_description_timestamps(description, duration)
                if products:
                    print(f"[analyzer] Tier 2 ✓  {len(products)} segments  "
                          f"({sum(1 for p in products if p['affiliate_url'])} with links)")
                    return products, duration

    # ── Tier 3: faster-whisper AI transcription ────────────────────────
    print("[analyzer] Tier 3: faster-whisper AI transcription")
    try:
        products = _transcribe_whisper(video_path, job_id, duration, aff_links)
        if products:
            print(f"[analyzer] Tier 3 ✓  {len(products)} products  "
                  f"({sum(1 for p in products if p['affiliate_url'])} with links)")
            return products, duration
        print("[analyzer] Tier 3: no products detected")
    except Exception as e:
        print(f"[analyzer] Tier 3 error: {e}")

    # ── Final fallback ─────────────────────────────────────────────────
    print("[analyzer] fallback: returning full video as single segment")
    return [{
        "name": "Full Video",
        "description": "No distinct product segments found. Full video clip.",
        "start": 0.0,
        "end": round(duration, 2),
        "affiliate_url": "",
    }], duration
