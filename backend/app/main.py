from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.database import Base, engine, create_tables
from app.routes import jobs, license, auth

# Create all DB tables on startup
create_tables()

# Rate limiter (keyed by IP)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ClipForge API", version="2.0.0")
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
