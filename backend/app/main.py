import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.database import Base, engine, create_tables, run_migrations
from app.routes import jobs, license, auth
from app.worker import cleanup_old_jobs

# Create all DB tables on startup, then add any new columns
create_tables()
run_migrations()


async def _periodic_cleanup():
    while True:
        await asyncio.sleep(3600)
        try:
            cleanup_old_jobs(max_age_hours=24)
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_old_jobs(max_age_hours=48)
    task = asyncio.create_task(_periodic_cleanup())
    yield
    task.cancel()

# Rate limiter (keyed by IP)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ClipForge API", version="2.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://getclipforge.online",
        "https://www.getclipforge.online",
        "https://getclipforge.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Jobs routes: /api/jobs/...
app.include_router(jobs.router, prefix="/api")

# Auth routes: /api/auth/...
app.include_router(auth.router)

# License + Admin routes: /api/license/... and /api/admin/...
app.include_router(license.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
