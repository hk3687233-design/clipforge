import uuid
import os
import zipfile
from datetime import datetime, date
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db, Job, JobStatus, License, User
from app.services.downloader import is_supported_url
from app.services.clipper import QUALITY_MAP
from app.worker import process_video_job
from app.config import settings


def _p(path: str) -> str:
    return path.replace("\\", "/")

router = APIRouter(prefix="/jobs", tags=["jobs"])

FREE_DAILY_LIMIT  = 3
FREE_CLIPS_LIMIT  = 5
FREE_MAX_DURATION = 600  # 10 minutes in seconds


# ── Auth helper: accept JWT Bearer OR legacy X-License-Key ─────────────────

class _AuthCtx:
    """Unified auth context — works with both new JWT users and legacy license keys."""
    def __init__(self, plan: str, user: Optional[User] = None, lic: Optional[License] = None):
        self.plan = plan
        self.user = user
        self.lic  = lic


def _get_auth(
    authorization:  Optional[str] = Header(None),
    x_license_key:  Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> _AuthCtx:
    # ── JWT path (new users) ──────────────────────────────────────────
    if authorization and authorization.startswith("Bearer "):
        from app.services.auth_service import decode_token
        token = authorization.removeprefix("Bearer ").strip()
        payload = decode_token(token)
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user:
            raise HTTPException(401, "User not found — please log in again")
        return _AuthCtx(plan=user.plan, user=user)

    # ── Legacy license-key path ───────────────────────────────────────
    if x_license_key:
        lic = db.query(License).filter(License.key == x_license_key).first()
        if not lic or not lic.is_valid:
            raise HTTPException(403, "Invalid or disabled license key")
        return _AuthCtx(plan=lic.plan, lic=lic)

    raise HTTPException(401, "Authentication required")


# ── Job creation ────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_job(
    background_tasks: BackgroundTasks,
    url:  Optional[str]        = Form(None),
    file: Optional[UploadFile] = File(None),
    auth: _AuthCtx = Depends(_get_auth),
    db:   Session  = Depends(get_db),
):
    if not url and not file:
        raise HTTPException(400, "Provide either a URL or a video file")
    if url and not is_supported_url(url):
        raise HTTPException(400, "URL must be from TikTok, YouTube, or Instagram")

    plan = auth.plan

    # ── Free plan restrictions ────────────────────────────────────────
    if plan == "free":
        if auth.user:
            today = date.today().isoformat()
            user  = auth.user
            if user.daily_jobs_date != today:
                user.daily_jobs_used = 0
                user.daily_jobs_date = today
            if user.daily_jobs_used >= FREE_DAILY_LIMIT:
                raise HTTPException(429, f"Free plan limit: {FREE_DAILY_LIMIT} exports per day. Upgrade to Pro for unlimited access.")
        else:
            # Legacy free license key — keep coming-soon block
            raise HTTPException(403, "Free plan is coming soon. Upgrade to Pro for immediate access.")

    job_id     = str(uuid.uuid4())
    local_path = None

    if file:
        job_dir = os.path.join(settings.temp_dir, job_id)
        os.makedirs(job_dir, exist_ok=True)
        dest    = os.path.join(job_dir, "source.mp4")
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
        license_key=auth.lic.key if auth.lic else None,
        user_id=auth.user.id if auth.user else None,
        plan=plan,
    )
    db.add(job)

    # Increment daily counter for JWT free users
    if plan == "free" and auth.user:
        auth.user.daily_jobs_used = (auth.user.daily_jobs_used or 0) + 1

    # Increment legacy license counter
    if auth.lic:
        auth.lic.jobs_used = (auth.lic.jobs_used or 0) + 1

    db.commit()

    background_tasks.add_task(
        process_video_job,
        job_id=job_id,
        source_url=url,
        local_path=local_path,
        max_clips=FREE_CLIPS_LIMIT if plan == "free" else None,
        max_duration=FREE_MAX_DURATION if plan == "free" else None,
    )

    return {"job_id": job_id, "status": "pending", "plan": plan}


# ── Job status ──────────────────────────────────────────────────────────────

@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id":     job.id,
        "status":     job.status,
        "products":   job.products or [],
        "error":      job.error,
        "created_at": job.created_at.isoformat(),
    }


# ── Clip downloads ──────────────────────────────────────────────────────────

@router.get("/{job_id}/clips/download-all")
def download_all_clips(job_id: str):
    clips_dir = os.path.join(settings.temp_dir, job_id, "clips")
    if not os.path.exists(clips_dir):
        raise HTTPException(404, "No clips found for this job")

    quality_suffixes = tuple(f"_{k}.mp4" for k in QUALITY_MAP)
    clips = sorted(
        f for f in os.listdir(clips_dir)
        if f.endswith(".mp4") and not f.endswith(quality_suffixes)
    )
    if not clips:
        raise HTTPException(404, "No clips available")

    zip_path = os.path.join(settings.temp_dir, job_id, "clips.zip")
    if not os.path.exists(zip_path):
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as zf:
            for clip in clips:
                zf.write(os.path.join(clips_dir, clip), clip)

    zip_name = f"clipforge_{job_id[:8]}.zip"
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=zip_name,
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
    )


@router.get("/{job_id}/clips/{filename}")
def download_clip(job_id: str, filename: str):
    clip_path = os.path.join(settings.temp_dir, job_id, "clips", filename)
    if not os.path.exists(clip_path):
        raise HTTPException(404, "Clip not found")
    return FileResponse(
        clip_path,
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
