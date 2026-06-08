import yt_dlp
import os
import base64
import tempfile
from app.config import settings

SUPPORTED_DOMAINS = ["tiktok.com", "youtube.com", "youtu.be", "instagram.com", "facebook.com", "fb.watch"]

def is_supported_url(url: str) -> bool:
    return any(domain in url for domain in SUPPORTED_DOMAINS)

def _get_cookies_file() -> str | None:
    """Write YOUTUBE_COOKIES env var (base64 cookies.txt) to a temp file."""
    cookies_b64 = os.environ.get("YOUTUBE_COOKIES", "")
    if not cookies_b64:
        return None
    try:
        cookies_data = base64.b64decode(cookies_b64).decode("utf-8")
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False)
        tmp.write(cookies_data)
        tmp.close()
        return tmp.name
    except Exception:
        return None

def download_video(url: str, job_id: str) -> str:
    """Download video from URL using yt-dlp. Returns local file path."""
    out_dir = os.path.join(settings.temp_dir, job_id)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "source.%(ext)s")

    is_youtube = "youtube.com" in url or "youtu.be" in url
    is_tiktok = "tiktok.com" in url

    cookies_file = _get_cookies_file() if is_youtube else None

    # Optional env vars for advanced YouTube bypass
    proxy = os.environ.get("YOUTUBE_PROXY", "")           # e.g. socks5://user:pass@host:port
    po_token = os.environ.get("YOUTUBE_PO_TOKEN", "")     # po_token for datacenter bypass
    visitor_data = os.environ.get("YOUTUBE_VISITOR_DATA", "")

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
        def _yt_args(client: list, skip_js: bool = False) -> dict:
            args: dict = {"player_client": client}
            if po_token and visitor_data:
                args["po_token"] = [f"web+{po_token}"]
                args["visitor_data"] = [visitor_data]
            if skip_js:
                args["player_skip"] = ["js", "configs"]
            return {"youtube": args}

        def _no_cookies(d: dict) -> dict:
            return {k: v for k, v in d.items() if k != "cookiefile"}

        # Progressive MP4: format 18 = 360p, 22 = 720p. No merge needed.
        PROG = "18/22/17/36/best[ext=mp4]/best"
        DASH = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best"
        ANY  = "bestvideo*+bestaudio*/best*"

        attempts = [
            # 1. ios + progressive + cookies — best chance on datacenter
            {**base_opts, "format": PROG,
             "extractor_args": _yt_args(["ios"])},
            # 2. tv_embedded + progressive + cookies
            {**base_opts, "format": PROG,
             "extractor_args": _yt_args(["tv_embedded"])},
            # 3. android_testsuite (newer, often bypasses blocks)
            {**base_opts, "format": PROG,
             "extractor_args": _yt_args(["android_testsuite"])},
            # 4. ios + no format restriction + check_formats=False
            {**base_opts, "format": DASH, "check_formats": False,
             "extractor_args": _yt_args(["ios"])},
            # 5. ios without cookies (cookies can sometimes hurt)
            {**_no_cookies(base_opts), "format": PROG,
             "extractor_args": _yt_args(["ios"])},
            # 6. tv_embedded without cookies
            {**_no_cookies(base_opts), "format": PROG,
             "extractor_args": _yt_args(["tv_embedded"])},
            # 7. android without cookies
            {**_no_cookies(base_opts), "format": PROG,
             "extractor_args": _yt_args(["android"])},
            # 8. android_vr + check_formats=False
            {**base_opts, "format": ANY, "check_formats": False,
             "extractor_args": _yt_args(["android_vr"])},
            # 9. web_embedded, skip JS player (InnerTube API only)
            {**base_opts, "format": DASH, "check_formats": False,
             "extractor_args": _yt_args(["web_embedded"], skip_js=True)},
            # 10. No format, no cookies, no extractor args — pure fallback
            {**_no_cookies(base_opts), "check_formats": False},
        ]
    else:
        attempts = [
            {**base_opts, "format": "bestvideo[height<=1080]+bestaudio/best"},
            {**base_opts, "format": "best"},
            {**base_opts},
        ]

    last_error = None
    for i, attempt_opts in enumerate(attempts):
        try:
            client = (attempt_opts.get("extractor_args", {})
                      .get("youtube", {}).get("player_client", ["default"])[0])
            fmt = attempt_opts.get("format", "none")
            has_cookies = "cookiefile" in attempt_opts
            cf = attempt_opts.get("check_formats", True)
            print(f"[yt-dlp] attempt {i+1}/{len(attempts)}: "
                  f"client={client} fmt={fmt[:20]} cookies={has_cookies} check_fmt={cf}")
            with yt_dlp.YoutubeDL(attempt_opts) as ydl:
                ydl.download([url])
            last_error = None
            print(f"[yt-dlp] ✓ success on attempt {i+1}")
            break
        except Exception as e:
            err_str = str(e)
            print(f"[yt-dlp] ✗ attempt {i+1} failed: {err_str[:200]}")
            last_error = e
            continue

    # Clean up temp cookies file
    if cookies_file and os.path.exists(cookies_file):
        os.unlink(cookies_file)

    if last_error:
        raise Exception(str(last_error))

    # Find the downloaded file
    for f in os.listdir(out_dir):
        if f.startswith("source"):
            return os.path.join(out_dir, f)

    raise FileNotFoundError("Download failed — no output file found")
