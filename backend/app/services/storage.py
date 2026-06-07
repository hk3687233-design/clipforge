"""
Cloudflare R2 storage (S3-compatible, free 10 GB).
If R2 credentials are not configured, clips are served directly from disk.
"""
import boto3
import os
from app.config import settings

def _r2_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )

def _r2_configured() -> bool:
    return bool(settings.r2_endpoint_url and settings.r2_access_key_id)

def upload_clip(local_path: str, job_id: str) -> str:
    """Upload clip to R2. Returns public URL (or presigned if no public domain)."""
    filename = os.path.basename(local_path)
    key = f"clips/{job_id}/{filename}"

    client = _r2_client()
    client.upload_file(
        local_path,
        settings.r2_bucket_name,
        key,
        ExtraArgs={"ContentType": "video/mp4"},
    )

    if settings.r2_public_url:
        return f"{settings.r2_public_url.rstrip('/')}/{key}"

    # Fall back to presigned URL (7 days)
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": key},
        ExpiresIn=604800,
    )

def upload_all_clips(clips: list, job_id: str) -> list:
    if not _r2_configured():
        return clips
    for clip in clips:
        if clip.get("clip_path") and os.path.exists(clip["clip_path"]):
            clip["clip_url"] = upload_clip(clip["clip_path"], job_id)
        else:
            clip["clip_url"] = None
    return clips
