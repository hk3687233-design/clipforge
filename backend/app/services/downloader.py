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

    # Format: flexible — no strict ext requirements, fallback to best available
    FORMAT = (
        "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/"
        "bestvideo[height<=1080]+bestaudio/"
        "best[height<=1080]/"
        "best"
    )

    ydl_opts = {
        "outtmpl": out_path,
        "format": FORMAT,
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "socket_timeout": 30,
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
        ydl_opts["cookiefile"] = cookies_file

    if is_youtube:
        ydl_opts["extractor_args"] = {
            "youtube": {
                "player_client": ["ios", "android", "web"],
            }
        }

    if is_tiktok:
        ydl_opts["extractor_args"] = {
            "tiktok": {
                "api_hostname": "api22-normal-c-useast2a.tiktokv.com",
            }
        }

    errors = []
    # Try with current opts
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        errors.append(str(e))
        # Fallback: simplest possible format
        if is_youtube:
            fallback = dict(ydl_opts)
            fallback["format"] = "best"
            fallback["extractor_args"] = {
                "youtube": {"player_client": ["mweb"]}
            }
            try:
                with yt_dlp.YoutubeDL(fallback) as ydl:
                    ydl.download([url])
            except Exception as e2:
                errors.append(str(e2))
                raise Exception(errors[-1])
        else:
            raise

    # Clean up temp cookies file
    if cookies_file and os.path.exists(cookies_file):
        os.unlink(cookies_file)

    # Find the downloaded file
    for f in os.listdir(out_dir):
        if f.startswith("source"):
            return os.path.join(out_dir, f)

    raise FileNotFoundError("Download failed — no output file found")
