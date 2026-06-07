"""
Background task runner using FastAPI's BackgroundTasks (no Celery needed).
Saves progress after EVERY clip so a crash never loses completed work.
"""
import os
import shutil
from app.database import SessionLocal, Job, JobStatus
from app.services.downloader import download_video
from app.services.analyzer import analyze_video
from app.services.clipper import extract_clip
from app.services.storage import upload_all_clips
from app.config import settings


def _set_status(job_id: str, status: JobStatus, **kwargs):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = status
            for k, v in kwargs.items():
                setattr(job, k, v)
            db.commit()
    finally:
        db.close()


def _append_product(job_id: str, product: dict):
    """Append one completed clip to DB products list (crash-safe progress)."""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            current = list(job.products or [])
            current.append(product)
            job.products = current
            db.commit()
    finally:
        db.close()


def process_video_job(job_id: str, source_url: str = None, local_path: str = None, max_clips: int = None):
    """Full pipeline: download → analyze → clip (one at a time, saving each) → done."""
    try:
        video_path = local_path

        # ── Step 1: Download ──────────────────────────────────────────────
        if source_url:
            _set_status(job_id, JobStatus.downloading)
            video_path = download_video(source_url, job_id)

        if not video_path or not os.path.exists(video_path):
            raise FileNotFoundError("Video file not found after download")

        # ── Step 2: Analyze ───────────────────────────────────────────────
        _set_status(job_id, JobStatus.analyzing)
        products, duration = analyze_video(video_path, job_id, source_url=source_url)

        if not products:
            _set_status(job_id, JobStatus.done, products=[])
            return

        # Apply free plan clip limit
        if max_clips:
            products = products[:max_clips]

        # ── Step 3: Extract clips one-by-one (save each to DB) ───────────
        _set_status(job_id, JobStatus.extracting, products=[])

        completed_clips = []
        for i, product in enumerate(products):
            try:
                clip_path = extract_clip(video_path, job_id, product, i)
                clip_filename = os.path.basename(clip_path)
                clip_data = {
                    **product,
                    "clip_filename": clip_filename,
                }
                completed_clips.append(clip_data)
                # Save progress after EACH clip — crash-safe
                _append_product(job_id, clip_data)
            except Exception as clip_err:
                # Don't abort entire job for one bad clip
                err_data = {**product, "error": str(clip_err)[:200]}
                completed_clips.append(err_data)
                _append_product(job_id, err_data)

        # ── Step 4: Optional R2 upload ────────────────────────────────────
        if settings.r2_access_key_id and completed_clips:
            completed_clips = upload_all_clips(completed_clips, job_id)
            # Remove local paths before saving
            for c in completed_clips:
                c.pop("clip_path", None)
            _set_status(job_id, JobStatus.done, products=completed_clips)
        else:
            _set_status(job_id, JobStatus.done)

    except Exception as exc:
        _set_status(job_id, JobStatus.failed, error=str(exc))

    finally:
        # Clean up large temp files (keep clips dir, delete raw audio/frames)
        for fname in ["audio.wav"]:
            fpath = os.path.join(settings.temp_dir, job_id, fname)
            if os.path.exists(fpath):
                os.remove(fpath)
        frames_dir = os.path.join(settings.temp_dir, job_id, "frames")
        if os.path.exists(frames_dir):
            shutil.rmtree(frames_dir)
