from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    database_url: str
    # Storage (Cloudflare R2 - optional)
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "clipforge"
    r2_endpoint_url: str = ""
    r2_public_url: str = ""
    # Video
    max_video_size_mb: int = 500
    temp_dir: str = "/tmp/clipforge"
    whisper_model: str = "tiny"
    # Lemon Squeezy (payments)
    lemon_squeezy_api_key: str = ""
    lemon_squeezy_webhook_secret: str = ""
    lemon_squeezy_store_id: str = ""
    lemon_squeezy_variant_pro: str = ""     # Pro plan variant ID
    lemon_squeezy_variant_free: str = ""    # Free plan variant ID
    # Email via Resend
    resend_api_key: str = ""
    email_from: str = "ClipForge <noreply@getclipforge.online>"
    # Gemini Flash (free tier — AI product extraction from transcripts)
    gemini_api_key: str = ""
    # Auth / JWT
    google_client_id: str = ""
    jwt_secret: str = "clipforge-change-this-secret"
    admin_email: str = ""                # auto-grant is_admin to this email on signup
    # Admin (legacy header-based for backward compat)
    admin_secret: str = "change-me-in-prod"

    class Config:
        env_file = ".env"

settings = Settings()

os.makedirs(settings.temp_dir, exist_ok=True)
