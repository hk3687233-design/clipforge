"""
Smart product segment detector — 3-tier strategy:
  1. YouTube chapters  → instant, most accurate
  2. Description parse → timestamps + affiliate links
  3. faster-whisper    → AI transcription fallback (3-min timeout)
  Fallback: silence detection (if Whisper times out/errors)
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


def _normalize_yt_url(url: str) -> str:
    """Clean any YouTube URL → youtube.com/watch?v=ID (strips ?si= etc.)"""
    m = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
    if m:
        return f"https://www.youtube.com/watch?v={m.group(1)}"
    return url


def _get_duration(video_path: str) -> float:
    result = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json", _p(video_path)
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"ffprobe failed: {result.stderr}")
    return float(json.loads(result.stdout)["format"]["duration"])


# ─────────────────────────────────────────────────────────────────────────────
# Tier 1 helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_yt_metadata(url: str) -> Optional[Dict]:
    """
    Fetch chapters + description via yt-dlp (no download).
    Uses same cookies as downloader so Railway IP block is bypassed.
    """
    import base64, tempfile
    clean = _normalize_yt_url(url)
    print(f"[analyzer] fetching metadata for {clean}")

    # Build cookies file from env (same as downloader)
    cookies_file = None
    b64 = os.environ.get("YOUTUBE_COOKIES", "")
    if b64:
        try:
            data = base64.b64decode(b64).decode("utf-8")
            tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False)
            tmp.write(data); tmp.close()
            cookies_file = tmp.name
        except Exception as e:
            print(f"[analyzer] cookies parse error: {e}")

    base_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "socket_timeout": 30,
    }
    if cookies_file:
        base_opts["cookiefile"] = cookies_file

    attempts = [
        {**base_opts,
         "extractor_args": {"youtube": {"player_client": ["ios"]}}},
        {**base_opts,
         "extractor_args": {"youtube": {"player_client": ["tv_embedded"]}}},
        {**{k: v for k, v in base_opts.items() if k != "cookiefile"},
         "extractor_args": {"youtube": {"player_client": ["ios"]}}},
    ]

    try:
        for i, opts in enumerate(attempts, 1):
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(clean, download=False)
                    ch   = info.get("chapters") or []
                    desc = info.get("description") or ""
                    print(f"[analyzer] metadata ok (attempt {i}): chapters={len(ch)} desc_len={len(desc)}")
                    return info
            except Exception as e:
                print(f"[analyzer] metadata attempt {i} failed: {str(e)[:120]}")
    finally:
        if cookies_file and os.path.exists(cookies_file):
            os.unlink(cookies_file)

    return None


def _extract_all_links(description: str) -> Dict[str, str]:
    """
    Scrape every affiliate/product link from description into {label_lower: url}.
    Handles many formats:
      0:26 - Curved Sofa - https://geni.us/xxx
      0:26 Curved Sofa https://geni.us/xxx
      Curved Sofa — https://amzn.to/xxx
    """
    links: Dict[str, str] = {}
    for raw_line in description.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        m = re.search(r"(https?://\S+)", line)
        if not m:
            continue
        url = m.group(1).rstrip(".,)")
        label = line[:m.start()].strip()
        # strip leading timestamp
        label = re.sub(r"^\d{1,2}:\d{2}(?::\d{2})?\s*[-–:·•]?\s*", "", label)
        # strip trailing separator
        label = re.sub(r"\s*[-–:·•]\s*$", "", label).strip()
        if label and len(label) > 2:
            links[label.lower()] = url
    return links


def _match_link(name: str, links: Dict[str, str]) -> str:
    """Best-match affiliate link for a product name."""
    key = name.lower().strip()
    if key in links:
        return links[key]
    # Longest matching label wins
    best_url, best_len = "", 0
    for label, url in links.items():
        if (label in key or key in label) and len(label) > best_len:
            best_url, best_len = url, len(label)
    return best_url


def _chapters_to_products(chapters: List[Dict], description: str, duration: float) -> List[Dict]:
    aff = _extract_all_links(description)
    skip = {"intro", "outro", "introduction", "conclusion", "end", "opening", "sponsor", "ad"}
    products = []
    for ch in chapters:
        title = ch.get("title", "").strip()
        if title.lower() in skip:
            continue
        start = float(ch.get("start_time", 0))
        end   = float(ch.get("end_time", duration))
        products.append({
            "name": title, "description": "",
            "start": round(start, 2), "end": round(end, 2),
            "affiliate_url": _match_link(title, aff),
        })
    print(f"[analyzer] Tier1 chapters={len(products)}  links={sum(1 for p in products if p['affiliate_url'])}")
    return products


# ─────────────────────────────────────────────────────────────────────────────
# Tier 2 helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_description_timestamps(description: str, duration: float) -> List[Dict]:
    """
    Parse timestamp-based product list from description.
    Supports H:MM:SS and MM:SS, optional separators, optional inline link.
    """
    entries = []
    # Two-pass: first collect all timestamp lines
    TS_RE = re.compile(
        r"^(?:(\d+):)?(\d{1,2}):(\d{2})"   # H:MM:SS or MM:SS
        r"\s*[-–:·•]?\s*"                    # optional separator
        r"(.+?)$",                            # label (may contain link)
        re.MULTILINE
    )
    for m in TS_RE.finditer(description):
        hours = int(m.group(1) or 0)
        mins  = int(m.group(2))
        secs  = int(m.group(3))
        start = hours * 3600 + mins * 60 + secs
        rest  = m.group(4).strip()
        # split label from inline link
        lm = re.search(r"\s+(https?://\S+)$", rest)
        if lm:
            label = rest[:lm.start()].strip()
            link  = lm.group(1).rstrip(".,)")
        else:
            # trailing link after " - "
            parts = re.split(r"\s*[-–]\s*", rest, maxsplit=1)
            link_candidate = parts[-1].strip() if len(parts) > 1 else ""
            if link_candidate.startswith("http"):
                label = parts[0].strip()
                link  = link_candidate
            else:
                label = rest.strip(" -–")
                link  = ""
        entries.append({"name": label, "start": float(start), "link": link})

    if len(entries) < 2:
        return []

    # Get all description links for fuzzy matching
    aff = _extract_all_links(description)
    skip = {"intro", "outro", "introduction", "end", "opening", "sponsor"}
    products = []

    for i, entry in enumerate(entries):
        if entry["name"].lower().strip() in skip:
            continue
        end = entries[i + 1]["start"] if i + 1 < len(entries) else duration
        # prefer inline link, fallback to description link match
        link = entry["link"] or _match_link(entry["name"], aff)
        products.append({
            "name": entry["name"], "description": "",
            "start": round(entry["start"], 2),
            "end":   round(end, 2),
            "affiliate_url": link,
        })

    print(f"[analyzer] Tier2 segments={len(products)}  links={sum(1 for p in products if p['affiliate_url'])}")
    return products


# ─────────────────────────────────────────────────────────────────────────────
# Tier 3: faster-whisper with 3-min hard timeout
# ─────────────────────────────────────────────────────────────────────────────

def _extract_audio(video_path: str, job_id: str) -> str:
    audio_path = os.path.join(settings.temp_dir, job_id, "audio.wav")
    result = subprocess.run([
        "ffmpeg", "-i", _p(video_path),
        "-ac", "1", "-ar", "16000", "-vn",
        "-t", "600",
        _p(audio_path), "-y", "-loglevel", "error"
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Audio extraction failed: {result.stderr}")
    return audio_path


def _transcribe_whisper(audio_path: str) -> List[Dict]:
    """faster-whisper with 3-minute hard timeout."""
    import threading
    from faster_whisper import WhisperModel

    result_holder: List = []
    error_holder:  List = []

    def _run():
        try:
            model = WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")
            segs, _ = model.transcribe(
                audio_path, language="en", beam_size=1,
                vad_filter=True, vad_parameters={"min_silence_duration_ms": 500},
            )
            words = [{"word": s.text.strip(), "start": s.start, "end": s.end}
                     for s in segs if s.text.strip()]
            del model
            result_holder.append(words)
        except Exception as e:
            error_holder.append(e)

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout=180)   # 3-min hard limit

    if t.is_alive():
        raise TimeoutError("Whisper exceeded 3-min limit")
    if error_holder:
        raise error_holder[0]
    return result_holder[0] if result_holder else []


TRANSITION_RE = re.compile(
    r"\b(next up|next product|moving on|number\s+\d+|#\s*\d+"
    r"|first(?:ly)?|second(?:ly)?|third(?:ly)?|fourth|fifth"
    r"|up next|starting with|here we have|let'?s?\s+look)\b",
    re.IGNORECASE
)


def _whisper_to_products(words: List[Dict], video_path: str, duration: float) -> List[Dict]:
    """Convert Whisper segments into product blocks using transition detection."""
    # Silence points
    res = subprocess.run([
        "ffmpeg", "-i", _p(video_path),
        "-af", "silencedetect=noise=-35dB:d=1.0",
        "-f", "null", "-"
    ], capture_output=True, text=True)
    silence_ts = [float(m.group(1)) for m in
                  (re.search(r"silence_end:\s*([\d.]+)", l) for l in res.stderr.splitlines()) if m]

    trans_ts = [w["start"] for w in words if TRANSITION_RE.search(w["word"])]
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
        return [{"name": "Full Video", "description": "", "start": 0.0,
                 "end": round(duration, 2), "affiliate_url": ""}]

    products = []
    for i in range(len(filtered) - 1):
        start, end = filtered[i], filtered[i + 1]
        seg_words = [w["word"] for w in words if start <= w["start"] < start + 8]
        name = " ".join(seg_words)[:50].strip().title() or f"Product {i + 1}"
        products.append({"name": name, "description": "", "start": round(start, 2),
                         "end": round(end, 2), "affiliate_url": ""})
    return products


def _silence_segments(video_path: str, duration: float) -> List[Dict]:
    """Fast ffmpeg-only fallback (<10s). No ML."""
    res = subprocess.run([
        "ffmpeg", "-i", _p(video_path),
        "-af", "silencedetect=noise=-35dB:d=0.8",
        "-f", "null", "-"
    ], capture_output=True, text=True, timeout=60)

    pts = [float(m.group(1))
           for m in (re.search(r"silence_end:\s*([\d.]+)", l) for l in res.stderr.splitlines()) if m]

    target = max(30.0, min(90.0, duration / 10))
    cuts = [0.0]; last = 0.0
    for pt in pts:
        if pt - last >= target * 0.7:
            cuts.append(round(pt, 2)); last = pt
            if len(cuts) >= 12:
                break
    cuts.append(round(duration, 2))

    products = []
    for i in range(len(cuts) - 1):
        s, e = cuts[i], cuts[i + 1]
        if e - s < 5:
            continue
        mm, ss = int(s // 60), int(s % 60)
        products.append({"name": f"Segment {i + 1}  ({mm}:{ss:02d})", "description": "",
                         "start": s, "end": e, "affiliate_url": ""})
    return products or [{"name": "Full Video", "description": "",
                         "start": 0.0, "end": round(duration, 2), "affiliate_url": ""}]


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def analyze_video(video_path: str, job_id: str, source_url: str = None) -> Tuple[List[Dict], float]:
    """
    3-tier analysis → (products, duration).
    Each product: {name, description, start, end, affiliate_url}
    Clipper will cut a separate MP4 per product.
    """
    duration = _get_duration(video_path)
    print(f"[analyzer] duration={duration:.1f}s  url={source_url or 'upload'}")

    # ── Tier 1: YouTube chapters ──────────────────────────────────────
    if source_url:
        meta = _get_yt_metadata(source_url)
        if meta:
            chapters    = meta.get("chapters") or []
            description = meta.get("description") or ""

            if chapters:
                products = _chapters_to_products(chapters, description, duration)
                if products:
                    print(f"[analyzer] ✅ Tier1 → {len(products)} products")
                    return products, duration

            # ── Tier 2: Description timestamps ───────────────────────
            if description:
                products = _parse_description_timestamps(description, duration)
                if products:
                    print(f"[analyzer] ✅ Tier2 → {len(products)} products")
                    return products, duration
            else:
                print("[analyzer] description empty — skipping Tier2")

    # ── Tier 3: faster-whisper (3-min timeout) ────────────────────────
    print("[analyzer] Tier3: faster-whisper transcription")
    try:
        audio_path = _extract_audio(video_path, job_id)
        words = _transcribe_whisper(audio_path)
        try:
            os.remove(audio_path)
        except Exception:
            pass
        products = _whisper_to_products(words, video_path, duration)
        print(f"[analyzer] ✅ Tier3 → {len(products)} products")
        return products, duration
    except TimeoutError as e:
        print(f"[analyzer] ⚠️  {e} → silence fallback")
    except Exception as e:
        print(f"[analyzer] ⚠️  Whisper error: {e} → silence fallback")

    # ── Silence fallback ──────────────────────────────────────────────
    products = _silence_segments(video_path, duration)
    print(f"[analyzer] ✅ Silence fallback → {len(products)} products")
    return products, duration
