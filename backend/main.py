from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.jobs import router as jobs_router
from app.routes.license import router as license_router
from app.database import create_tables

app = FastAPI(title="ClipForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_tables()

app.include_router(jobs_router, prefix="/api")
app.include_router(license_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
