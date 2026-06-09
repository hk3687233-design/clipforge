import yt_dlp
import os
import re
import base64
import tempfile
import requests as _req
from app.config import settings

SUPPORTED_DOMAINS = ["tiktok.com", "youtube.com", "youtu.be", "instagram.com", "facebook.com", "fb.watch"]

# Public Invidious instances — used as YouTube proxy to bypass datacenter IP blocks
# Updated list of known-working instances (June 2025)
INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net",
    "https://invidious.fdn.fr",
    "https://invidious.projectsegfau.lt",
    "https://iv.ggtyler.dev",
    "https://invidious.lunar.icu",
    "https://invidious.privacyredirect.com",
    "https://yt.artemislena.eu",
    "https://invidious.nerdvpn.de",
    "https://invidious.incogniweb.net",
    "https://inv.tux.pizza",
    "https://invidious.io.lol",
    "https://invidious.reallyaweso.me",
    "https://invidious.perennialte.ch",
]

# Piped.video instances — additional fallback (different infra from Invidious)
PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.darkness.services",
    "https://piped-api.garudalinux.org",
]

def is_supported_url(url: str) -> bool:
    return any(domain in url for domain in SUPPORTED_DOMAINS)

def _normalize_url(url: str) -> str:
    """
    Normalize YouTube URLs — strip tracking params like ?si= that cause
    cookie-verification errors on share links (youtu.be/ID?si=...).
    Always returns clean https://www.youtube.com/watch?v=ID form for YouTube.
    """
    video_id = _extract_video_id(url)
    if video_id and ("youtube.com" in url or "youtu.be" in url):
        return f"https://www.youtube.com/watch?v={video_id}"
    return url

def _extract_video_id(url: str) -> str | None:
    """Extract YouTube video ID from URL."""
    patterns = [
        r"(?:v=|youtu\.be/|embed/|v/|shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None

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

def _download_stream(url: str, out_path: str, headers: dict, timeout: int = 120) -> int:
    """Download a stream URL to file. Returns size in bytes."""
    dl = _req.get(url, timeout=timeout, stream=True, headers=headers, allow_redirects=True)
    if dl.status_code != 200:
        return 0
    size = 0
    with open(out_path, "wb") as f:
        for chunk in dl.iter_content(chunk_size=512 * 1024):
            if chunk:
                f.write(chunk)
                size += len(chunk)
    return size


def _try_piped(video_id: str, out_dir: str) -> str | None:
    """Piped.video API fallback — completely separate infrastructure from Invidious."""
    HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

    for instance in PIPED_INSTANCES:
        try:
            r = _req.get(f"{instance}/streams/{video_id}", timeout=10, headers=HEADERS)
            if r.status_code != 200:
                print(f"[piped] {instance} → {r.status_code}")
                continue
            data = r.json()
            # Piped returns audioStreams + videoStreams separately — find best combined mp4
            streams = data.get("videoStreams", [])
            # Prefer mimeType video/mp4, sort by quality desc
            mp4 = [s for s in streams if "mp4" in s.get("mimeType", "") and s.get("videoOnly") == False]
            if not mp4:
                mp4 = [s for s in streams if "mp4" in s.get("mimeType", "")]
            if not mp4:
                print(f"[piped] {instance} no mp4 streams")
                continue
            mp4.sort(key=lambda s: s.get("quality", 0), reverse=True)
            stream_url = mp4[0].get("url", "")
            if not stream_url:
                continue
            out_path = os.path.join(out_dir, "source.mp4")
            print(f"[piped] downloading q={mp4[0].get('quality')} @ {instance}")
            size = _download_stream(stream_url, out_path, HEADERS)
            if size > 100_000:
                print(f"[piped] ✓ {size//1024}KB")
                return out_path
            if os.path.exists(out_path):
                os.unlink(out_path)
        except Exception as e:
            print(f"[piped] {instance} error: {str(e)[:80]}")
    return None


def _try_invidious(video_id: str, out_dir: str) -> str | None:
    """
    Download via Invidious public instances (bypasses Railway IP block).

    Method 1: /latest_version?id=&itag=&local=true
      - local=true forces Invidious to proxy through itself (critical!)
      - Without local=true, stream URL may point directly to YouTube CDN
        which is also blocked from Railway datacenters

    Method 2: /api/v1/videos/ JSON → proxied stream URL
    """
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
    }
    ITAGS = ["22", "18", "17"]   # 720p MP4, 360p MP4, 240p MP4

    # Fetch fresh healthy instances
    extra: list[str] = []
    try:
        resp = _req.get("https://api.invidious.io/instances.json?sort_by=health",
                        timeout=6, headers=HEADERS)
        if resp.status_code == 200:
            for item in resp.json():
                if isinstance(item, list) and len(item) >= 2:
                    info = item[1]
                    if info.get("api") and info.get("type") == "https":
                        uri = info.get("uri", "").rstrip("/")
                        if uri and uri not in INVIDIOUS_INSTANCES:
                            extra.append(uri)
                            if len(extra) >= 6:
                                break
    except Exception as e:
        print(f"[invidious] instance list fetch failed: {e}")

    all_instances = INVIDIOUS_INSTANCES + extra
    print(f"[invidious] trying {len(all_instances)} instances for {video_id}")

    for instance in all_instances:
        # ── Method 1: /latest_version with local=true (proxied) ──────────
        for itag in ITAGS:
            try:
                # local=true = Invidious proxies through itself, not direct YT CDN
                stream_url = f"{instance}/latest_version?id={video_id}&itag={itag}&local=true"
                print(f"[invidious] latest_version itag={itag} local=true @ {instance}")
                out_path = os.path.join(out_dir, "source.mp4")
                size = _download_stream(stream_url, out_path, HEADERS, timeout=90)
                if size > 100_000:
                    print(f"[invidious] ✓ itag={itag} {size//1024}KB")
                    return out_path
                if size > 0:
                    print(f"[invidious] too small {size}B, skip")
                if os.path.exists(out_path) and size < 100_000:
                    os.unlink(out_path)
            except Exception as e:
                print(f"[invidious] latest_version failed: {str(e)[:80]}")

        # ── Method 2: API → proxied stream URL ───────────────────────────
        try:
            r = _req.get(f"{instance}/api/v1/videos/{video_id}", timeout=10, headers=HEADERS)
            if r.status_code != 200:
                print(f"[invidious] {instance} API {r.status_code}, skip")
                continue
            data = r.json()
            streams = data.get("formatStreams", [])
            q_order = {"hd720": 0, "large": 1, "medium": 2, "small": 3}
            streams.sort(key=lambda s: q_order.get(s.get("quality", ""), 99))
            for stream in streams:
                # Use proxied URL (replace direct CDN with instance proxy)
                raw_url = stream.get("url", "")
                if not raw_url:
                    continue
                # Force proxy through Invidious instance
                proxied = f"{instance}/latest_version?id={video_id}&itag={stream.get('itag','18')}&local=true"
                ext = stream.get("container", "mp4")
                out_path = os.path.join(out_dir, f"source.{ext}")
                print(f"[invidious] API proxied q={stream.get('quality')} @ {instance}")
                size = _download_stream(proxied, out_path, HEADERS, timeout=120)
                if size > 100_000:
                    print(f"[invidious] ✓ API {size//1024}KB")
                    return out_path
                if os.path.exists(out_path) and size < 100_000:
                    os.unlink(out_path)
        except Exception as e:
            print(f"[invidious] {instance} API failed: {str(e)[:80]}")

    return None
                    print(f"[invidious] ✓ API stream {size//1024}KB")
                    return out_path
                if os.path.exists(out_path):
                    os.unlink(out_path)
        except Exception as e:
            print(f"[invidious] {instance} API method failed: {str(e)[:100]}")
            continue

    return None

def download_video(url: str, job_id: str) -> str:
    """Download video from URL using yt-dlp + Invidious fallback."""
    url = _normalize_url(url)   # fix share links: youtu.be?si= → youtube.com/watch?v=
    print(f"[downloader] normalized url={url}")

    out_dir = os.path.join(settings.temp_dir, job_id)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "source.%(ext)s")

    is_youtube = "youtube.com" in url or "youtu.be" in url
    is_tiktok = "tiktok.com" in url
    is_instagram = "instagram.com" in url
    is_facebook = "facebook.com" in url or "fb.watch" in url

    # Read proxy from env (YOUTUBE_PROXY=http://user:pass@host:port)
    proxy = os.environ.get("YOUTUBE_PROXY", "")
    po_token = os.environ.get("YOUTUBE_PO_TOKEN", "")
    visitor_data = os.environ.get("YOUTUBE_VISITOR_DATA", "")

    cookies_file = _get_cookies_file(os.environ.get("YOUTUBE_COOKIES", "")) if is_youtube else None

    base_opts = {
        "outtmpl": out_path,
        "merge_output_format": "mp4",
        "quiet": False,
        "no_warnings": False,
        "socket_timeout": 60,
        "retries": 3,
        "fragment_retries": 3,
        "geo_bypass": True,
        "geo_bypass_country": "US",
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    }

    if proxy:
        base_opts["proxy"] = proxy
    if cookies_file:
        base_opts["cookiefile"] = cookies_file

    if is_tiktok:
        base_opts["extractor_args"] = {
            "tiktok": {"api_hostname": "api22-normal-c-useast2a.tiktokv.com"}
        }

    if is_youtube:
        video_id = _extract_video_id(url)

        # ── Step 1: Invidious FIRST (Railway datacenter IP blocked) ─────
        if video_id:
            print(f"[youtube] Invidious proxy (id={video_id})")
            inv_path = _try_invidious(video_id, out_dir)
            if inv_path:
                if cookies_file and os.path.exists(cookies_file):
                    os.unlink(cookies_file)
                return inv_path
            print("[youtube] Invidious failed — trying Piped.video")

        # ── Step 1b: Piped.video fallback ─────────────────────────────
        if video_id:
            piped_path = _try_piped(video_id, out_dir)
            if piped_path:
                if cookies_file and os.path.exists(cookies_file):
                    os.unlink(cookies_file)
                return piped_path
            print("[youtube] Piped failed — falling back to yt-dlp")

        # ── Step 2: yt-dlp fallback (works on non-Railway / future) ──────
        def _yt_args(clients: list, skip_js: bool = False) -> dict:
            args: dict = {"player_client": clients}
            if po_token and visitor_data:
                args["po_token"] = [f"web+{po_token}"]
                args["visitor_data"] = [visitor_data]
            if skip_js:
                args["player_skip"] = ["js", "configs"]
            return {"youtube": args}

        def _nc(d: dict) -> dict:
            return {k: v for k, v in d.items() if k != "cookiefile"}

        # 2K (1440p) → 1080p → 720p fallback chain
        PROG = "bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/bestvideo[height<=1080]+bestaudio/22/18/best[ext=mp4]/best"
        DASH = "bestvideo[height<=1440]+bestaudio/bestvideo[height<=1080]+bestaudio/best"

        yt_attempts = [
            {**base_opts, "format": PROG, "extractor_args": _yt_args(["ios"])},
            {**base_opts, "format": PROG, "extractor_args": _yt_args(["tv_embedded"])},
            {**base_opts, "format": PROG, "extractor_args": _yt_args(["android_testsuite"])},
            {**_nc(base_opts), "format": PROG, "extractor_args": _yt_args(["ios"])},
            {**_nc(base_opts), "format": DASH, "check_formats": False,
             "extractor_args": _yt_args(["ios"])},
        ]

        last_error = None
        for i, opts in enumerate(yt_attempts):
            client = opts.get("extractor_args", {}).get("youtube", {}).get("player_client", ["?"])[0]
            print(f"[yt-dlp] attempt {i+1}/{len(yt_attempts)}: client={client}")
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                last_error = None
                print(f"[yt-dlp] ✓ success on attempt {i+1}")
                break
            except Exception as e:
                print(f"[yt-dlp] ✗ {str(e)[:120]}")
                last_error = e

        if last_error:
            raise Exception(str(last_error))

    else:
        # TikTok / Instagram / Facebook
        social_opts = {**base_opts}

        ig_cookies = _get_cookies_file(os.environ.get("INSTAGRAM_COOKIES", ""))
        if is_instagram and ig_cookies:
            social_opts["cookiefile"] = ig_cookies

        fb_cookies = _get_cookies_file(os.environ.get("FACEBOOK_COOKIES", ""))
        if is_facebook and fb_cookies:
            social_opts["cookiefile"] = fb_cookies

        social_attempts = [
            {**social_opts, "format": "bestvideo[height<=1080]+bestaudio/best",
             "merge_output_format": "mp4"},
            {**social_opts, "format": "best[ext=mp4]/best",
             "merge_output_format": "mp4"},
            {**social_opts, "format": "best"},
            {**{k: v for k, v in base_opts.items() if k != "cookiefile"}},
        ]

        last_error = None
        for i, opts in enumerate(social_attempts):
            platform = "tiktok" if is_tiktok else "instagram" if is_instagram else "facebook"
            print(f"[{platform}] attempt {i+1}/{len(social_attempts)}")
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                last_error = None
                print(f"[{platform}] ✓ success on attempt {i+1}")
                break
            except Exception as e:
                print(f"[{platform}] ✗ attempt {i+1}: {str(e)[:150]}")
                last_error = e
                continue

        if last_error:
            raise Exception(str(last_error))

    # Clean up temp cookies
    if cookies_file and os.path.exists(cookies_file):
        os.unlink(cookies_file)

    # Find the downloaded file
    for f in os.listdir(out_dir):
        if f.startswith("source"):
            return os.path.join(out_dir, f)

    raise FileNotFoundError("Download failed — no output file found")
