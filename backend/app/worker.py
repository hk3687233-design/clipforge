"""
Background task runner using FastAPI's BackgroundTasks (no Celery needed).
Saves progress after EVERY clip so a crash never loses completed work.
"""
import os
import logging
import shutil
from app.database import SessionLocal, Job, JobStatus

logger = logging.getLogger("clipforge.worker")
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


def process_video_job(job_id: str, source_url: str = None, local_path: str = None, max_clips: int = None, max_duration: int = None):
    """Full pipeline: download → analyze → clip (one at a time, saving each) → done."""
    logger.info(f"Job {job_id}: starting pipeline (url={source_url}, local={bool(local_path)})")
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

        # Free plan: reject videos longer than max_duration
        if max_duration and duration > max_duration:
            mins = max_duration // 60
            raise ValueError(f"Free plan supports videos up to {mins} minutes. This video is {int(duration // 60)}m long. Upgrade to Pro for unlimited length.")

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
        logger.error(f"Job {job_id}: failed — {exc}")
        _set_status(job_id, JobStatus.failed, error=str(exc))

    finally:
        job_dir = os.path.join(settings.temp_dir, job_id)
        # Clean up large temp files (keep clips dir for downloads)
        for fname in ["audio.wav", "source.mp4", "source.mkv", "source.webm"]:
            fpath = os.path.join(job_dir, fname)
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except OSError:
                    pass
        frames_dir = os.path.join(job_dir, "frames")
        if os.path.exists(frames_dir):
            shutil.rmtree(frames_dir, ignore_errors=True)


def cleanup_old_jobs(max_age_hours: int = 24):
    """Remove job directories older than max_age_hours. Call periodically."""
    import time
    base = settings.temp_dir
    if not os.path.exists(base):
        return
    now = time.time()
    cutoff = now - (max_age_hours * 3600)
    for name in os.listdir(base):
        job_dir = os.path.join(base, name)
        if os.path.isdir(job_dir):
            try:
                if os.path.getmtime(job_dir) < cutoff:
                    shutil.rmtree(job_dir, ignore_errors=True)
            except OSError:
                pass
