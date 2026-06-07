from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, create_tables
from app.routes import jobs, license

# Create all DB tables on startup
create_tables()

app = FastAPI(title="ClipForge API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Jobs routes: /api/jobs/...
app.include_router(jobs.router, prefix="/api")

# License + Admin routes: /api/license/... and /api/admin/...
app.include_router(license.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
