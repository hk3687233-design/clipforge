import uuid
import os
import zipfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Header
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db, Job, JobStatus, License
from app.services.downloader import is_supported_url
from app.services.clipper import transcode_clip, QUALITY_MAP
from app.worker import process_video_job
from app.config import settings


def _p(path: str) -> str:
    return path.replace("\\", "/")

router = APIRouter(prefix="/jobs", tags=["jobs"])

FREE_DAILY_LIMIT = 3
FREE_CLIPS_LIMIT = 5


def _get_license(x_license_key: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Validate license key from header. Raises 401/403 if invalid."""
    if not x_license_key:
        raise HTTPException(401, "License key required. Get free access at getclipforge.online")
    lic = db.query(License).filter(License.key == x_license_key).first()
    if not lic or not lic.is_valid:
        raise HTTPException(403, "Invalid or disabled license key")
    return lic


@router.post("/", status_code=201)
async def create_job(
    background_tasks: BackgroundTasks,
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    lic: License = Depends(_get_license),
):
    if not url and not file:
        raise HTTPException(400, "Provide either a URL or a video file")

    if url and not is_supported_url(url):
        raise HTTPException(400, "URL must be from TikTok, YouTube, or Instagram")

    # Free plan: temporarily disabled (coming soon)
    if lic.plan == "free":
        raise HTTPException(403, "Free plan is coming soon. Upgrade to Pro for immediate access.")

    job_id = str(uuid.uuid4())
    local_path = None

    if file:
        job_dir = os.path.join(settings.temp_dir, job_id)
        os.makedirs(job_dir, exist_ok=True)
        dest = os.path.join(job_dir, "source.mp4")
        size_mb = 0

        with open(dest, "wb") as f:
            chunk_size = 1024 * 1024
            while chunk := await file.read(chunk_size):
                size_mb += len(chunk) / (1024 * 1024)
                if size_mb > settings.max_video_size_mb:
                    os.remove(dest)
                    raise HTTPException(413, f"File too large (max {settings.max_video_size_mb} MB)")
                f.write(chunk)

        local_path = dest

    job = Job(
        id=job_id,
        status=JobStatus.pending,
        source_url=url,
        original_filename=file.filename if file else None,
        license_key=lic.key,
    )
    db.add(job)
    # Update usage counter
    lic.jobs_used = (lic.jobs_used or 0) + 1
    db.commit()

    # Pass plan so worker can enforce clip limit for free users
    background_tasks.add_task(
        process_video_job,
        job_id=job_id,
        source_url=url,
        local_path=local_path,
        max_clips=FREE_CLIPS_LIMIT if lic.plan == "free" else None,
    )

    return {"job_id": job_id, "status": "pending", "plan": lic.plan}


@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job.id,
        "status": job.status,
        "products": job.products or [],
        "error": job.error,
        "created_at": job.created_at.isoformat(),
    }


@router.get("/{job_id}/clips/download-all")
def download_all_clips(job_id: str, q: str = "source"):
    """Stream ZIP of all clips at requested quality. Zero RAM overhead."""
    clips_dir = os.path.join(settings.temp_dir, job_id, "clips")
    if not os.path.exists(clips_dir):
        raise HTTPException(404, "No clips found for this job")

    # Exclude already-cached quality variants from base list
    quality_suffixes = tuple(f"_{k}.mp4" for k in QUALITY_MAP)
    clips = sorted(
        f for f in os.listdir(clips_dir)
        if f.endswith(".mp4") and not f.endswith(quality_suffixes)
    )
    if not clips:
        raise HTTPException(404, "No clips available")

    zip_suffix = f"_{q}" if q in QUALITY_MAP else ""
    zip_path   = os.path.join(settings.temp_dir, job_id, f"clips{zip_suffix}.zip")

    if not os.path.exists(zip_path):
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as zf:
            for clip in clips:
                src = os.path.join(clips_dir, clip)
                if q in QUALITY_MAP:
                    src = transcode_clip(src, q)   # re-encode + cache
                zf.write(src, clip)

    zip_name = f"clipforge_{job_id[:8]}{zip_suffix}.zip"
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=zip_name,
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
    )


@router.get("/{job_id}/clips/{filename}")
def download_clip(job_id: str, filename: str, q: str = "source"):
    """Download single clip. Optional ?q=720p|1080p|2k re-encodes on demand."""
    clip_path = os.path.join(settings.temp_dir, job_id, "clips", filename)
    if not os.path.exists(clip_path):
        raise HTTPException(404, "Clip not found")

    if q in QUALITY_MAP:
        clip_path = transcode_clip(clip_path, q)
        dl_name = f"{q}_{filename}"
    else:
        dl_name = filename

    return FileResponse(
        clip_path,
        media_type="video/mp4",
        filename=dl_name,
        headers={"Content-Disposition": f'attachment; filename="{dl_name}"'},
    )
