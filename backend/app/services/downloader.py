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
    "https://anontube.lvkaszus.pl",
    "https://invidious.privacyredirect.com",
    "https://yt.artemislena.eu",
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

def _try_invidious(video_id: str, out_dir: str) -> str | None:
    """Try downloading via Invidious public instances (bypasses Railway IP block).

    Strategy:
    1. Try /latest_version?id=&itag= (direct stream, no JSON parsing)
    2. Try /api/v1/videos/ JSON → extract stream URL → download
    Both methods tried across multiple instances.
    """
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
    }
    # itag 22 = 720p MP4, 18 = 360p MP4 (progressive, no merge needed)
    ITAGS = ["22", "18", "17"]

    # Also try to get fresh instances from the official API
    extra_instances: list[str] = []
    try:
        resp = _req.get("https://api.invidious.io/instances.json?sort_by=health&pretty=1",
                        timeout=8, headers=HEADERS)
        if resp.status_code == 200:
            for item in resp.json():
                if isinstance(item, list) and len(item) >= 2:
                    info = item[1]
                    if info.get("api") and info.get("type") == "https":
                        uri = info.get("uri", "").rstrip("/")
                        if uri and uri not in INVIDIOUS_INSTANCES:
                            extra_instances.append(uri)
                            if len(extra_instances) >= 5:
                                break
    except Exception as e:
        print(f"[invidious] could not fetch live instance list: {e}")

    all_instances = INVIDIOUS_INSTANCES + extra_instances
    print(f"[invidious] will try {len(all_instances)} instances: {all_instances[:4]}...")

    for instance in all_instances:
        # ── Method 1: /latest_version direct stream ──────────────────────
        for itag in ITAGS:
            try:
                stream_url = f"{instance}/latest_version?id={video_id}&itag={itag}"
                print(f"[invidious] latest_version itag={itag} @ {instance}")
                dl = _req.get(stream_url, timeout=30, stream=True, headers=HEADERS,
                              allow_redirects=True)
                ct = dl.headers.get("content-type", "")
                if dl.status_code == 200 and "video" in ct:
                    ext = "mp4"
                    out_path = os.path.join(out_dir, f"source.{ext}")
                    size = 0
                    with open(out_path, "wb") as f:
                        for chunk in dl.iter_content(chunk_size=512 * 1024):
                            if chunk:
                                f.write(chunk)
                                size += len(chunk)
                    if size > 100_000:
                        print(f"[invidious] ✓ latest_version itag={itag} {size//1024}KB")
                        return out_path
                    else:
                        print(f"[invidious] too small ({size}B), skipping")
                        if os.path.exists(out_path):
                            os.unlink(out_path)
                else:
                    print(f"[invidious] latest_version {dl.status_code} ct={ct[:30]}")
            except Exception as e:
                print(f"[invidious] latest_version failed: {str(e)[:100]}")

        # ── Method 2: API JSON → stream URL ──────────────────────────────
        try:
            api_url = f"{instance}/api/v1/videos/{video_id}"
            r = _req.get(api_url, timeout=15, headers=HEADERS)
            if r.status_code != 200:
                print(f"[invidious] {instance} API={r.status_code}, skip")
                continue
            data = r.json()
            streams = data.get("formatStreams", [])
            quality_order = {"hd720": 0, "large": 1, "medium": 2, "small": 3}
            streams.sort(key=lambda s: quality_order.get(s.get("quality", ""), 99))
            for stream in streams:
                stream_url = stream.get("url", "")
                if not stream_url:
                    continue
                ext = stream.get("container", "mp4")
                out_path = os.path.join(out_dir, f"source.{ext}")
                print(f"[invidious] API stream quality={stream.get('quality')} @ {instance}")
                dl = _req.get(stream_url, timeout=120, stream=True, headers=HEADERS)
                if dl.status_code != 200:
                    continue
                size = 0
                with open(out_path, "wb") as f:
                    for chunk in dl.iter_content(chunk_size=512 * 1024):
                        if chunk:
                            f.write(chunk)
                            size += len(chunk)
                if size > 100_000:
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
        def _yt_args(clients: list, skip_js: bool = False) -> dict:
            args: dict = {"player_client": clients}
            if po_token and visitor_data:
                args["po_token"] = [f"web+{po_token}"]
                args["visitor_data"] = [visitor_data]
            if skip_js:
                args["player_skip"] = ["js", "configs"]
            return {"youtube": args}

        def _nc(d: dict) -> dict:  # no cookies
            return {k: v for k, v in d.items() if k != "cookiefile"}

        # Full HD first, fallback to 720p/480p progressive
        PROG = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/22/18/17/best[ext=mp4]/best"
        DASH = "bestvideo[height<=1080]+bestaudio/bestvideo[height<=720]+bestaudio/best"

        yt_attempts = [
            {**base_opts, "format": PROG, "extractor_args": _yt_args(["ios"])},
            {**base_opts, "format": PROG, "extractor_args": _yt_args(["tv_embedded"])},
            {**base_opts, "format": PROG, "extractor_args": _yt_args(["android_testsuite"])},
            {**base_opts, "format": PROG, "extractor_args": _yt_args(["android_vr"])},
            {**_nc(base_opts), "format": PROG, "extractor_args": _yt_args(["ios"])},
            {**_nc(base_opts), "format": PROG, "extractor_args": _yt_args(["tv_embedded"])},
            {**_nc(base_opts), "format": DASH, "check_formats": False,
             "extractor_args": _yt_args(["ios"])},
            {**_nc(base_opts), "check_formats": False,
             "extractor_args": _yt_args(["ios", "tv_embedded"])},
        ]

        # Try yt-dlp first
        last_error = None
        for i, opts in enumerate(yt_attempts):
            client = opts.get("extractor_args", {}).get("youtube", {}).get("player_client", ["?"])[0]
            fmt = opts.get("format", "default")[:20]
            has_c = "cookiefile" in opts
            print(f"[yt-dlp] attempt {i+1}/{len(yt_attempts)}: client={client} fmt={fmt} cookies={has_c}")
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
                last_error = None
                print(f"[yt-dlp] ✓ success on attempt {i+1}")
                break
            except Exception as e:
                err_str = str(e)[:150]
                print(f"[yt-dlp] ✗ attempt {i+1}: {err_str}")
                last_error = e
                continue

        # ── Invidious fallback (bypasses Railway IP block completely) ─────
        if last_error:
            video_id = _extract_video_id(url)
            if video_id:
                print(f"[invidious] yt-dlp failed, trying Invidious for video {video_id}")
                inv_path = _try_invidious(video_id, out_dir)
                if inv_path:
                    if cookies_file and os.path.exists(cookies_file):
                        os.unlink(cookies_file)
                    return inv_path
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
