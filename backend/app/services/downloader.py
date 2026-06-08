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

    base_opts = {
        "outtmpl": out_path,
        "merge_output_format": "mp4",
        "quiet": False,
        "no_warnings": False,
        "socket_timeout": 60,
        "retries": 3,
        "fragment_retries": 3,
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

    # YouTube: try many combinations of player clients + formats
    if is_youtube:
        attempts = [
            # 1. tv_embedded with 720p
            {**base_opts,
             "format": "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]",
             "extractor_args": {"youtube": {"player_client": ["tv_embedded"]}}},
            # 2. ios client — bypasses some bot detection
            {**base_opts,
             "format": "bestvideo[height<=720]+bestaudio/best",
             "extractor_args": {"youtube": {"player_client": ["ios"]}}},
            # 3. android_vr — often not blocked
            {**base_opts,
             "format": "best[height<=720]/best",
             "extractor_args": {"youtube": {"player_client": ["android_vr"]}}},
            # 4. web_creator
            {**base_opts,
             "format": "best",
             "extractor_args": {"youtube": {"player_client": ["web_creator"]}}},
            # 5. mweb — mobile web
            {**base_opts,
             "format": "best",
             "extractor_args": {"youtube": {"player_client": ["mweb"]}}},
            # 6. Format 18 (360p MP4) — almost always available, no merge needed
            {**base_opts,
             "format": "18",
             "extractor_args": {"youtube": {"player_client": ["ios"]}}},
            # 7. Format 18 with tv_embedded
            {**base_opts,
             "format": "18",
             "extractor_args": {"youtube": {"player_client": ["tv_embedded"]}}},
            # 8. Skip js player — use API directly
            {**base_opts,
             "format": "bestvideo+bestaudio/best",
             "extractor_args": {"youtube": {
                 "player_client": ["ios"],
                 "player_skip": ["js", "configs", "webpage"],
             }}},
            # 9. android client
            {**base_opts,
             "format": "best",
             "extractor_args": {"youtube": {"player_client": ["android"]}}},
            # 10. No format restriction, no extractor args
            {**base_opts},
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
            print(f"[downloader] attempt {i+1}/{len(attempts)}")
            with yt_dlp.YoutubeDL(attempt_opts) as ydl:
                ydl.download([url])
            last_error = None
            print(f"[downloader] success on attempt {i+1}")
            break
        except Exception as e:
            print(f"[downloader] attempt {i+1} failed: {e}")
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
