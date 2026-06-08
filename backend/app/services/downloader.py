import yt_dlp
import os
import base64
import tempfile
from app.config import settings

SUPPORTED_DOMAINS = ["tiktok.com", "youtube.com", "youtu.be", "instagram.com"]

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

    base_opts = {
        "outtmpl": out_path,
        "merge_output_format": "mp4",
        "quiet": False,
        "no_warnings": False,
        "socket_timeout": 60,
        "retries": 5,
        "fragment_retries": 5,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    }

    if cookies_file:
        base_opts["cookiefile"] = cookies_file

    if is_tiktok:
        base_opts["extractor_args"] = {
            "tiktok": {"api_hostname": "api22-normal-c-useast2a.tiktokv.com"}
        }

    # YouTube: try multiple player clients — tv_embedded is most permissive
    if is_youtube:
        attempts = [
            {**base_opts,
             "format": "bestvideo[height<=720]+bestaudio/bestvideo+bestaudio/best",
             "extractor_args": {"youtube": {"player_client": ["tv_embedded"]}}},
            {**base_opts,
             "format": "bestvideo+bestaudio/best",
             "extractor_args": {"youtube": {"player_client": ["ios"]}}},
            {**base_opts,
             "format": "best",
             "extractor_args": {"youtube": {"player_client": ["android_vr"]}}},
            {**base_opts,
             "format": "best",
             "extractor_args": {"youtube": {"player_client": ["web_creator"]}}},
            # Final fallback — no format restriction
            {**base_opts,
             "extractor_args": {"youtube": {"player_client": ["mweb"]}}},
        ]
    else:
        attempts = [
            {**base_opts, "format": "bestvideo[height<=1080]+bestaudio/best"},
            {**base_opts, "format": "best"},
            {**base_opts},  # no format specified
        ]

    last_error = None
    for attempt_opts in attempts:
        try:
            with yt_dlp.YoutubeDL(attempt_opts) as ydl:
                ydl.download([url])
            last_error = None
            break
        except Exception as e:
            last_error = e
            continue

    if last_error:
        raise Exception(str(last_error))

    # Clean up temp cookies file
    if cookies_file and os.path.exists(cookies_file):
        os.unlink(cookies_file)

    # Find the downloaded file
    for f in os.listdir(out_dir):
        if f.startswith("source"):
            return os.path.join(out_dir, f)

    raise FileNotFoundError("Download failed — no output file found")
