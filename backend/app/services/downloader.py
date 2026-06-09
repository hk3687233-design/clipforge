"""
Video downloader — YouTube via Invidious proxy (Railway IP bypassed),
TikTok/Instagram/Facebook via yt-dlp.
"""
import yt_dlp
import os
import re
import base64
import tempfile
import requests as _req
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.config import settings

SUPPORTED_DOMAINS = [
    "tiktok.com", "youtube.com", "youtu.be",
    "instagram.com", "facebook.com", "fb.watch"
]

# ── Invidious instances (tried in parallel) ────────────────────────────────
INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net",
    "https://invidious.fdn.fr",
    "https://invidious.projectsegfau.lt",
    "https://iv.ggtyler.dev",
    "https://invidious.lunar.icu",
    "https://invidious.privacyredirect.com",
    "https://yt.artemislena.eu",
    "https://invidious.nerdvpn.de",
    "https://invidious.io.lol",
    "https://inv.tux.pizza",
]

PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.darkness.services",
]

HDR = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "*/*",
}

# ── helpers ────────────────────────────────────────────────────────────────

def is_supported_url(url: str) -> bool:
    return any(d in url for d in SUPPORTED_DOMAINS)


def _extract_video_id(url: str) -> str | None:
    m = re.search(r"(?:v=|youtu\.be/|embed/|v/|shorts/)([a-zA-Z0-9_-]{11})", url)
    return m.group(1) if m else None


def _normalize_url(url: str) -> str:
    """youtu.be/ID?si=xxx  →  youtube.com/watch?v=ID"""
    vid = _extract_video_id(url)
    if vid and ("youtube.com" in url or "youtu.be" in url):
        return f"https://www.youtube.com/watch?v={vid}"
    return url


def _get_cookies_file(b64: str) -> str | None:
    if not b64:
        return None
    try:
        data = base64.b64decode(b64).decode("utf-8")
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False)
        tmp.write(data); tmp.close()
        return tmp.name
    except Exception:
        return None


def _stream_to_file(url: str, out_path: str, connect_timeout: int = 8,
                    read_timeout: int = 120) -> int:
    """Download streaming URL → file. Returns bytes written (0 on failure)."""
    try:
        r = _req.get(url, headers=HDR, stream=True,
                     timeout=(connect_timeout, read_timeout),
                     allow_redirects=True)
        if r.status_code != 200:
            return 0
        size = 0
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=512 * 1024):
                if chunk:
                    f.write(chunk)
                    size += len(chunk)
        return size
    except Exception:
        return 0


# ── Invidious parallel probe + download ───────────────────────────────────

def _probe_instance(instance: str, video_id: str) -> str | None:
    """
    Quick check: does this Invidious instance serve the video?
    Uses a Range request (first 32 KB) with a tight 8s timeout.
    Returns the working stream URL or None.
    """
    for itag in ("22", "18"):          # 720p, 360p — progressive MP4
        url = f"{instance}/latest_version?id={video_id}&itag={itag}&local=true"
        try:
            h = _req.head(url, headers=HDR, timeout=8, allow_redirects=True)
            ct = h.headers.get("content-type", "")
            cl = int(h.headers.get("content-length", 0))
            if h.status_code == 200 and "video" in ct and cl > 100_000:
                return url          # instance is alive and has the video
        except Exception:
            pass
    return None


def _download_from_invidious(video_id: str, out_dir: str) -> str | None:
    """
    Probe all instances in parallel (8 s each), then download from
    the first one that responds.  Total wait ≤ 8 s for probe phase.
    """
    # Optionally enrich with live healthy instances
    instances = list(INVIDIOUS_INSTANCES)
    try:
        r = _req.get("https://api.invidious.io/instances.json?sort_by=health",
                     timeout=5, headers=HDR)
        if r.status_code == 200:
            for item in r.json():
                if isinstance(item, list) and len(item) >= 2:
                    info = item[1]
                    if info.get("api") and info.get("type") == "https":
                        uri = info.get("uri", "").rstrip("/")
                        if uri and uri not in instances:
                            instances.append(uri)
                            if len(instances) >= 16:
                                break
    except Exception:
        pass

    print(f"[invidious] probing {len(instances)} instances in parallel…")

    working_url: str | None = None

    # Parallel probe — stop as soon as one responds
    with ThreadPoolExecutor(max_workers=len(instances)) as ex:
        futs = {ex.submit(_probe_instance, inst, video_id): inst
                for inst in instances}
        for fut in as_completed(futs):
            result = fut.result()
            if result:
                working_url = result
                print(f"[invidious] ✓ alive: {futs[fut]}")
                # Cancel remaining (best-effort)
                for f in futs:
                    f.cancel()
                break

    if not working_url:
        print("[invidious] all instances failed probe")
        return None

    # Full download from the winning instance
    out_path = os.path.join(out_dir, "source.mp4")
    print(f"[invidious] downloading: {working_url[:70]}…")
    size = _stream_to_file(working_url, out_path, connect_timeout=10, read_timeout=300)
    if size > 100_000:
        print(f"[invidious] ✓ downloaded {size // 1024} KB")
        return out_path
    if os.path.exists(out_path):
        os.unlink(out_path)
    print(f"[invidious] download too small ({size} B)")
    return None


# ── Piped fallback ─────────────────────────────────────────────────────────

def _download_from_piped(video_id: str, out_dir: str) -> str | None:
    for instance in PIPED_INSTANCES:
        try:
            r = _req.get(f"{instance}/streams/{video_id}", timeout=8, headers=HDR)
            if r.status_code != 200:
                continue
            data = r.json()
            streams = data.get("videoStreams", [])
            # Only non-video-only streams (progressive MP4 with audio)
            combined = [s for s in streams
                        if "mp4" in s.get("mimeType", "")
                        and not s.get("videoOnly", True)]
            if not combined:
                combined = [s for s in streams if "mp4" in s.get("mimeType", "")]
            if not combined:
                continue
            combined.sort(key=lambda s: s.get("quality", 0), reverse=True)
            stream_url = combined[0].get("url", "")
            if not stream_url:
                continue
            out_path = os.path.join(out_dir, "source.mp4")
            print(f"[piped] downloading from {instance}")
            size = _stream_to_file(stream_url, out_path)
            if size > 100_000:
                print(f"[piped] ✓ {size // 1024} KB")
                return out_path
            if os.path.exists(out_path):
                os.unlink(out_path)
        except Exception as e:
            print(f"[piped] {instance}: {str(e)[:60]}")
    return None


# ── Main entry point ───────────────────────────────────────────────────────

def download_video(url: str, job_id: str) -> str:
    url = _normalize_url(url)
    print(f"[downloader] url={url}")

    out_dir = os.path.join(settings.temp_dir, job_id)
    os.makedirs(out_dir, exist_ok=True)

    is_youtube   = "youtube.com" in url or "youtu.be" in url
    is_tiktok    = "tiktok.com" in url
    is_instagram = "instagram.com" in url
    is_facebook  = "facebook.com" in url or "fb.watch" in url

    proxy        = os.environ.get("YOUTUBE_PROXY", "")
    po_token     = os.environ.get("YOUTUBE_PO_TOKEN", "")
    visitor_data = os.environ.get("YOUTUBE_VISITOR_DATA", "")
    cookies_file = (_get_cookies_file(os.environ.get("YOUTUBE_COOKIES", ""))
                    if is_youtube else None)

    # ── YouTube ────────────────────────────────────────────────────────────
    if is_youtube:
        video_id = _extract_video_id(url)

        # 1. Invidious proxy (parallel probe → fast) ─────────────────────
        if video_id:
            path = _download_from_invidious(video_id, out_dir)
            if path:
                _cleanup(cookies_file)
                return path
            print("[youtube] Invidious failed → trying Piped")

        # 2. Piped.video ──────────────────────────────────────────────────
        if video_id:
            path = _download_from_piped(video_id, out_dir)
            if path:
                _cleanup(cookies_file)
                return path
            print("[youtube] Piped failed → trying yt-dlp")

        # 3. yt-dlp (works outside Railway, kept as safety net) ───────────
        out_tmpl = os.path.join(out_dir, "source.%(ext)s")
        base = {
            "outtmpl": out_tmpl, "merge_output_format": "mp4",
            "quiet": False, "socket_timeout": 30, "retries": 2,
            "geo_bypass": True, "geo_bypass_country": "US",
            "http_headers": {"User-Agent": HDR["User-Agent"],
                             "Accept-Language": "en-US,en;q=0.9"},
        }
        if proxy:       base["proxy"]      = proxy
        if cookies_file: base["cookiefile"] = cookies_file

        FMT  = "bestvideo[height<=1080]+bestaudio/22/18/best[ext=mp4]/best"
        attempts = [
            {**base, "format": FMT,
             "extractor_args": {"youtube": {"player_client": ["ios"]}}},
            {**base, "format": FMT,
             "extractor_args": {"youtube": {"player_client": ["tv_embedded"]}}},
            {**{k: v for k, v in base.items() if k != "cookiefile"},
             "format": FMT,
             "extractor_args": {"youtube": {"player_client": ["ios"]}}},
        ]
        last_err = None
        for i, opts in enumerate(attempts, 1):
            client = opts["extractor_args"]["youtube"]["player_client"][0]
            print(f"[yt-dlp] attempt {i}/{len(attempts)} client={client}")
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                print(f"[yt-dlp] ✓ attempt {i}")
                last_err = None
                break
            except Exception as e:
                print(f"[yt-dlp] ✗ {str(e)[:100]}")
                last_err = e

        if last_err:
            raise Exception(str(last_err))

    # ── TikTok / Instagram / Facebook ─────────────────────────────────────
    else:
        out_tmpl = os.path.join(out_dir, "source.%(ext)s")
        base = {
            "outtmpl": out_tmpl, "merge_output_format": "mp4",
            "quiet": False, "socket_timeout": 30, "retries": 2,
            "http_headers": {"User-Agent": HDR["User-Agent"]},
        }
        if is_tiktok:
            base["extractor_args"] = {
                "tiktok": {"api_hostname": "api22-normal-c-useast2a.tiktokv.com"}
            }
        ig_ck = _get_cookies_file(os.environ.get("INSTAGRAM_COOKIES", ""))
        fb_ck = _get_cookies_file(os.environ.get("FACEBOOK_COOKIES", ""))
        if is_instagram and ig_ck: base["cookiefile"] = ig_ck
        if is_facebook  and fb_ck: base["cookiefile"] = fb_ck

        attempts = [
            {**base, "format": "bestvideo[height<=1080]+bestaudio/best"},
            {**base, "format": "best[ext=mp4]/best"},
            {**base, "format": "best"},
        ]
        last_err = None
        plat = "tiktok" if is_tiktok else "instagram" if is_instagram else "facebook"
        for i, opts in enumerate(attempts, 1):
            print(f"[{plat}] attempt {i}/{len(attempts)}")
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                last_err = None
                break
            except Exception as e:
                print(f"[{plat}] ✗ {str(e)[:100]}")
                last_err = e

        if last_err:
            raise Exception(str(last_err))

    _cleanup(cookies_file)

    for f in os.listdir(out_dir):
        if f.startswith("source"):
            return os.path.join(out_dir, f)

    raise FileNotFoundError("Download complete but output file not found")


def _cleanup(cookies_file: str | None):
    if cookies_file and os.path.exists(cookies_file):
        try: os.unlink(cookies_file)
        except Exception: pass
