# ClipForge — Setup Guide

## Prerequisites — Install These First

1. **Python 3.11+** → https://python.org/downloads (check "Add to PATH")
2. **Node.js 20+** → https://nodejs.org
3. **FFmpeg** → https://ffmpeg.org/download.html
   - Windows: Download, extract, add `bin/` folder to PATH
4. **Redis** → https://github.com/microsoftarchive/redis/releases (Windows build)
   - Or use Docker: `docker run -d -p 6379:6379 redis`

---

## Backend Setup

```bash
cd F:\Claude\clipforge\backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and fill env vars
copy .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY and DATABASE_URL

# Start API server
uvicorn main:app --reload --port 8000

# In a SEPARATE terminal — start Celery worker
venv\Scripts\activate
celery -A app.worker.celery_app worker --loglevel=info --pool=solo
```

---

## Frontend Setup

```bash
cd F:\Claude\clipforge\frontend

npm install
npm run dev
# Open http://localhost:3000
```

---

## Environment Variables (.env)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | YES | Your Claude API key |
| `DATABASE_URL` | YES | PostgreSQL connection string |
| `REDIS_URL` | YES | Redis URL (default: redis://localhost:6379/0) |
| `AWS_ACCESS_KEY_ID` | Optional | S3 for clip hosting (skip for local dev) |
| `AWS_SECRET_ACCESS_KEY` | Optional | S3 secret |
| `AWS_BUCKET_NAME` | Optional | S3 bucket name |
| `TEMP_DIR` | Optional | Local temp folder (default: /tmp/clipforge) |

**For local dev without S3:** Leave AWS keys empty. Clips serve from local disk via `/api/jobs/{id}/clips/{file}`.

---

## Database Setup (Neon PostgreSQL)

1. Go to https://neon.tech → create free project
2. Copy connection string → paste in `.env` as `DATABASE_URL`
3. Tables auto-create on first startup

---

## Production Deploy

- **Backend** → Railway.app (free tier works)
  - Set all env vars in Railway dashboard
  - Deploy command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Add a second Railway service for Celery worker: `celery -A app.worker.celery_app worker --loglevel=info`
- **Frontend** → Vercel
  - Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
- **Redis** → Upstash (free tier, serverless Redis)

---

## What's Next (License System)

After core is working:
1. Sign up at https://lemonsqueezy.com
2. Create a one-time product
3. Add webhook → generates license key in DB on purchase
4. Add license gate to frontend (key input → validate → unlock tool)
