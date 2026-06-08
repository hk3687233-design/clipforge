# ClipForge — Complete System Documentation

> **Read this file first.** It covers every part of the system — architecture, files, env vars, deployment, security, payments, and pending tasks. Written so any developer (or Claude in a new session) can understand and continue the project from scratch.

---

## Table of Contents
1. [What Is ClipForge?](#1-what-is-clipforge)
2. [Live URLs](#2-live-urls)
3. [Tech Stack](#3-tech-stack)
4. [Repository Structure](#4-repository-structure)
5. [Backend — FastAPI](#5-backend--fastapi)
6. [Frontend — Next.js](#6-frontend--nextjs)
7. [Database Schema](#7-database-schema)
8. [License & Payment System](#8-license--payment-system)
9. [Security System](#9-security-system)
10. [Email System (Resend)](#10-email-system-resend)
11. [Environment Variables](#11-environment-variables)
12. [Deployment](#12-deployment)
13. [Admin Panel](#13-admin-panel)
14. [DNS & Domain](#14-dns--domain)
15. [Pending Tasks](#15-pending-tasks)
16. [Credentials & Secrets](#16-credentials--secrets-keep-private)

---

## 1. What Is ClipForge?

ClipForge is a **micro-SaaS AI tool** that:
- Takes any YouTube / TikTok / Instagram **review video URL** (or file upload)
- Uses **Whisper AI** to transcribe the audio
- Uses **Google Gemini AI** to detect every product mentioned with timestamps
- **Auto-clips** each product mention into individual short video clips
- Adds **Amazon affiliate buy links** to each product
- Returns downloadable clips ready to post on social media

**Business model:** One-time payment — $29 Pro Lifetime via Lemon Squeezy.

---

## 2. Live URLs

| Service | URL |
|---|---|
| **Frontend (live)** | https://getclipforge.online |
| **Frontend (Vercel)** | https://getclipforge.vercel.app |
| **Backend API** | https://clipforge-production-8733.up.railway.app |
| **API Health check** | https://clipforge-production-8733.up.railway.app/health |
| **Admin Panel** | https://getclipforge.online/admin |
| **Lemon Squeezy Checkout** | https://getclipforge.lemonsqueezy.com/checkout/buy/bc4d99dd-7fbf-4d95-bc95-cab1b0a7ed64 |
| **GitHub Repo** | https://github.com/hk3687233-design/clipforge |

---

## 3. Tech Stack

### Backend
- **Python 3.11** + **FastAPI** — REST API
- **SQLAlchemy** + **SQLite** — Database (ephemeral on Railway restart — needs PostgreSQL migration)
- **yt-dlp** — YouTube/TikTok/Instagram video downloads (requires cookies for YouTube auth)
- **OpenAI Whisper** (tiny model) — Audio transcription
- **Google Gemini AI** — Product detection from transcript
- **FFmpeg** — Video clipping (extract timestamps)
- **Resend** — Transactional email (license keys)
- **slowapi** — Rate limiting
- **Deployed on:** Railway (Docker/Nixpacks)

### Frontend
- **Next.js 14** (App Router) — React framework
- **TypeScript** — Type safety
- **Tailwind CSS** — Styling (dark theme, purple brand color)
- **Lucide React** — Icons
- **Axios** — API calls
- **Deployed on:** Vercel

### Payments
- **Lemon Squeezy** — One-time purchase, license key generation via webhook

---

## 4. Repository Structure

```
clipforge/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, rate limiter setup
│   │   ├── config.py            # Settings from .env (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy models: Job, License
│   │   ├── worker.py            # Background job processing
│   │   ├── routes/
│   │   │   ├── jobs.py          # POST /api/jobs/ — submit video job
│   │   │   └── license.py       # License activate/verify/webhook + admin endpoints
│   │   └── services/
│   │       ├── analyzer.py      # Whisper + Gemini — transcribe & detect products
│   │       ├── clipper.py       # FFmpeg — extract video clips by timestamp
│   │       ├── downloader.py    # yt-dlp — download from URL
│   │       ├── email.py         # Resend — send license key email
│   │       └── storage.py       # Cloudflare R2 or local file storage
│   ├── .env                     # Local env vars (NEVER commit — gitignored)
│   ├── .env.example             # Template for env vars
│   ├── requirements.txt         # Python dependencies
│   ├── Procfile                 # Railway start command
│   ├── nixpacks.toml            # Railway build config
│   └── runtime.txt              # python-3.11.x
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page (Hero, Pricing, FAQ, etc.)
│   │   │   ├── layout.tsx       # Root layout, fonts, metadata
│   │   │   ├── globals.css      # Global styles + Tailwind
│   │   │   ├── tool/
│   │   │   │   └── page.tsx     # Main tool page (upload + results)
│   │   │   └── admin/
│   │   │       └── page.tsx     # Admin dashboard (license management)
│   │   ├── components/
│   │   │   ├── Uploader.tsx     # URL input + file drop zone
│   │   │   ├── JobPoller.tsx    # Polls job status, shows product clips
│   │   │   └── LicenseGate.tsx  # License key input UI (inline/footer/free mode)
│   │   └── lib/
│   │       ├── api.ts           # All API calls (axios)
│   │       └── fingerprint.ts   # Browser device fingerprint generator
│   ├── public/
│   │   ├── demo.mp4             # Demo video (1:54, ~20MB, CapCut edited)
│   │   └── favicon.svg          # Purple scissors icon
│   ├── .env.local               # Local env (NEVER commit — gitignored)
│   ├── .env.production          # Production env (gitignored)
│   └── vercel.json              # Vercel config
│
├── CLIPFORGE_SYSTEM.md          # THIS FILE
├── SETUP.md                     # Quick setup guide
└── railway.json                 # Railway project config
```

---

## 5. Backend — FastAPI

### API Endpoints

#### Jobs
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/jobs/` | X-License-Key header | Submit video job (URL or file upload) |
| GET | `/api/jobs/{job_id}` | None | Poll job status |
| GET | `/api/jobs/{job_id}/clips/{filename}` | None | Download individual clip |
| GET | `/api/jobs/{job_id}/clips/download-all` | None | Download all clips as ZIP |

#### License
| Method | Endpoint | Rate Limit | Description |
|---|---|---|---|
| POST | `/api/license/activate` | 10/min/IP | Activate a license key (with device binding) |
| POST | `/api/license/verify` | 30/min/IP | Verify key on app load |
| POST | `/api/license/free-signup` | — | Free plan email signup |
| POST | `/api/license/webhook` | — | Lemon Squeezy webhook (order → generate key → email) |

#### Admin (requires `X-Admin-Secret` header)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/licenses` | List all licenses (paginated) |
| GET | `/api/admin/stats` | Dashboard stats (revenue, jobs, etc.) |
| POST | `/api/admin/licenses/generate` | Manually generate a license key |
| PATCH | `/api/admin/licenses/{key}/disable` | Disable a license |
| PATCH | `/api/admin/licenses/{key}/enable` | Re-enable a license |

### Job Processing Flow
```
User submits URL/file
        ↓
POST /api/jobs/ → creates Job in DB (status: pending)
        ↓
BackgroundTask starts worker.py
        ↓
1. downloader.py  → yt-dlp downloads video → saves to TEMP_DIR
2. analyzer.py    → Whisper transcribes audio → Gemini finds products
3. clipper.py     → FFmpeg cuts clip per product timestamp
4. storage.py     → upload clips (R2 or local)
        ↓
Job status updated to "done", products JSON saved in DB
        ↓
Frontend polls GET /api/jobs/{id} every 3 seconds
```

### YouTube Downloads
- Requires **cookies** for age-gated/auth-required videos
- Cookie file path (local only): `C:/Users/Abdul Hannan/Downloads/ce4e10ce-64f4-48e8-b67d-9bb0515383df.txt`
- On Railway: set env var `YOUTUBE_COOKIES` = base64-encoded Netscape cookies file
- **NEVER commit the cookies file to Git**

---

## 6. Frontend — Next.js

### Pages

#### `/` — Landing Page (`page.tsx`)
Sections in order:
1. **Navbar** — Logo, How it works, Pricing, Activate License, Get Pro $29
2. **Hero** — Main headline, CTA buttons, trust badges
3. **Demo Video** — `public/demo.mp4` autoplay loop
4. **Stats** — 10x faster, <2 min, 100+ products/video, unlimited downloads
5. **How It Works** — 3-step process
6. **Features** — 6-card grid
7. **Customer Reviews** — 3 testimonials (Sarah Chen, Marcus Johnson, Priya Patel)
8. **Pricing** — Free vs Pro cards with LicenseGate
9. **FAQ** — 5 questions accordion
10. **Final CTA Banner** — getclipforge.online watermark
11. **Footer** — Links, support@getclipforge.online

#### `/tool` — Tool Page (`tool/page.tsx`)
- License check on load (from localStorage)
- Shows Uploader if no license or free plan
- Shows JobPoller after job submission
- Upgrade to Pro button (top right)

#### `/admin` — Admin Dashboard (`admin/page.tsx`)
- Password-protected (X-Admin-Secret)
- Shows license table with: key, plan, email, jobs used, device locked status, active/disabled
- Can enable/disable any license
- Can generate new license keys
- Stats cards (total revenue, active licenses, total jobs)

### Key Frontend Files

#### `lib/api.ts`
All API calls. Every request to `/api/license/activate` and `/api/license/verify` automatically includes `device_id` from fingerprint.

#### `lib/fingerprint.ts`
Generates a stable browser fingerprint:
- Components: userAgent, language, screen size, color depth, timezone offset, hardware concurrency, canvas fingerprint
- Stored in `localStorage` as `clipforge_device_id`
- Format: `dev_XXXXXXXX`

#### `components/LicenseGate.tsx`
Three render modes:
1. **inline** — navbar dropdown for "Activate License"
2. **freeMode** — "Start for Free" button on pricing card
3. **default** — footer "Already purchased?" link

### localStorage Keys
| Key | Value | Purpose |
|---|---|---|
| `clipforge_license_key` | `CF-PRO-XXXXXX-XXXXXX-XXXXXX` | Active license key |
| `clipforge_plan` | `pro` or `free` | Current plan |
| `clipforge_device_id` | `dev_XXXXXXXX` | Device fingerprint (permanent) |

---

## 7. Database Schema

### `licenses` table
| Column | Type | Description |
|---|---|---|
| `key` | String (PK) | `CF-PRO-XXXXXX-XXXXXX-XXXXXX` |
| `email` | String (nullable) | Customer email |
| `is_valid` | Boolean | Active/disabled |
| `plan` | String | `pro` or `free` |
| `instance_id` | String (nullable) | Lemon Squeezy instance ID |
| `order_id` | String (nullable) | Lemon Squeezy order ID |
| `jobs_used` | Integer | How many jobs run |
| `device_id` | String (nullable) | Browser fingerprint (bound on first activation) |
| `activated_at` | DateTime (nullable) | When first activated |
| `created_at` | DateTime | When generated |

### `jobs` table
| Column | Type | Description |
|---|---|---|
| `id` | String (PK) | UUID |
| `status` | Enum | pending/downloading/analyzing/extracting/done/failed |
| `source_url` | String | YouTube/TikTok URL |
| `original_filename` | String | Uploaded file name |
| `products` | JSON | Array of detected products with clips |
| `error` | String | Error message if failed |
| `license_key` | String | Which license ran this job |
| `plan` | String | free or pro |
| `created_at` | DateTime | — |
| `updated_at` | DateTime | — |

**⚠️ Current DB:** SQLite (ephemeral — data lost on Railway restart)
**TODO:** Migrate to PostgreSQL (Neon free tier recommended)

---

## 8. License & Payment System

### License Key Format
```
CF-PRO-XXXXXX-XXXXXX-XXXXXX    (Pro plan)
CF-FREE-XXXXXX-XXXXXX-XXXXXX   (Free plan)
```
Where each X is an uppercase hex character (0-9, A-F).
Regex: `^CF-(PRO|FREE)-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$`

### Plans
| Feature | Free | Pro |
|---|---|---|
| Jobs per day | 3 | Unlimited |
| Clips per job | 5 | Unlimited |
| Price | Free | $29 one-time |

### Payment Flow (Lemon Squeezy)
```
User clicks "Get Pro — $29"
        ↓
Lemon Squeezy checkout page
        ↓
Payment successful
        ↓
Lemon Squeezy sends webhook → POST /api/license/webhook
        ↓
Backend verifies HMAC signature
        ↓
Generates CF-PRO-XXXXXX-XXXXXX-XXXXXX key
        ↓
Saves to DB
        ↓
Sends email via Resend (noreply@getclipforge.online)
        ↓
Customer receives email with license key
        ↓
Customer goes to getclipforge.online → Activate License → pastes key
```

### Lemon Squeezy Setup
- **Store:** getclipforge.lemonsqueezy.com
- **Product ID:** 1127357
- **Checkout URL:** https://getclipforge.lemonsqueezy.com/checkout/buy/bc4d99dd-7fbf-4d95-bc95-cab1b0a7ed64
- **Price:** $29 (displayed as PKR to Pakistani users — Lemon Squeezy auto-converts)
- **License length:** 1 year (renewable)
- **Activation limit:** 1 device

### Webhook Configuration (TODO — after LS approval)
Set in Lemon Squeezy dashboard:
- URL: `https://clipforge-production-8733.up.railway.app/api/license/webhook`
- Events: `order_created`
- Secret: (set as `LEMON_SQUEEZY_WEBHOOK_SECRET` on Railway)

---

## 9. Security System

### Layers (in order of execution)

#### 1. Key Format Validation
Before any DB query, regex-checks the key format.
Rejects anything that doesn't match `CF-(PRO|FREE)-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}`.

#### 2. Rate Limiting (slowapi)
- `/api/license/activate` → **10 requests/minute per IP**
- `/api/license/verify` → **30 requests/minute per IP**
- Prevents brute force key guessing

#### 3. Device Fingerprinting & Binding
- On first activation, the browser's device fingerprint is saved to DB (`device_id` column)
- Every subsequent verify/activate from a **different** device → `403: "Key already activated on another device"`
- Fingerprint is stored in `localStorage` as `clipforge_device_id`
- **Note:** Clearing browser data = fingerprint reset. This is intentional (allows user to re-activate on same machine if needed)

#### 4. Key Disabled Check
Admin can disable any key via `PATCH /api/admin/licenses/{key}/disable`.
Disabled keys return `403: "This license key has been disabled"`.

#### 5. No Lemon Squeezy API Key = Reject Unknown Keys
If `LEMON_SQUEEZY_API_KEY` is not set (e.g. local dev or LS not approved yet), any key NOT already in DB is rejected. This prevents the fake-key bypass vulnerability.

#### 6. Webhook Signature Verification
Lemon Squeezy webhook uses HMAC-SHA256 signature. Backend verifies using `X-Signature` header before processing.

#### 7. Admin Secret
All admin endpoints require `X-Admin-Secret: clipforge-admin-2024` header.
Secret is stored as `ADMIN_SECRET` env var on Railway.
**Change this in production if compromised.**

#### 8. CORS
Only these origins allowed:
```python
"https://getclipforge.online"
"https://www.getclipforge.online"
"https://getclipforge.vercel.app"
"http://localhost:3000"
```

---

## 10. Email System (Resend)

- **Provider:** Resend (free tier: 3000 emails/month)
- **From address:** `noreply@getclipforge.online`
- **Domain verified:** ✅ (DNS records added to Hostinger)
- **API Key:** Set as `RESEND_API_KEY` on Railway

### DNS Records added for email (Hostinger)
| Type | Name | Value |
|---|---|---|
| TXT | `resend._domainkey` | DKIM public key |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

### Email Template
Beautiful dark-themed HTML email with:
- ClipForge logo (SVG scissors icon in purple gradient)
- "AI-POWERED CLIP EXTRACTOR" badge
- License key in styled box (monospace, purple)
- 3-step activation instructions
- CTA button → getclipforge.online
- Footer with mini logo and copyright

---

## 11. Environment Variables

### Backend (Railway)

| Variable | Value / Description |
|---|---|
| `DATABASE_URL` | `sqlite:///./clipforge.db` (change to PostgreSQL URL when migrating) |
| `ADMIN_SECRET` | `clipforge-admin-2024` |
| `RESEND_API_KEY` | `re_Vr4RbzaJ_JPepAWZeKZxA8GTVJWFTzyPT` |
| `EMAIL_FROM` | `ClipForge <noreply@getclipforge.online>` |
| `MAX_VIDEO_SIZE_MB` | `500` |
| `TEMP_DIR` | `/tmp/clipforge` |
| `WHISPER_MODEL` | `tiny` |
| `YOUTUBE_COOKIES` | base64-encoded Netscape cookies file (for YouTube downloads) |
| `LEMON_SQUEEZY_API_KEY` | ⏳ Set after LS store approval |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | ⏳ Set after LS store approval |
| `LEMON_SQUEEZY_STORE_ID` | ⏳ Set after LS store approval |
| `LEMON_SQUEEZY_VARIANT_PRO` | ⏳ Set after LS store approval |
| `R2_ACCESS_KEY_ID` | Optional — Cloudflare R2 for persistent clip storage |
| `R2_SECRET_ACCESS_KEY` | Optional |
| `R2_BUCKET_NAME` | `clipforge` |
| `R2_ENDPOINT_URL` | Optional |
| `R2_PUBLIC_URL` | Optional |

### Frontend (Vercel)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://clipforge-production-8733.up.railway.app` |
| `NEXT_PUBLIC_LEMON_CHECKOUT_URL` | `https://getclipforge.lemonsqueezy.com/checkout/buy/bc4d99dd-7fbf-4d95-bc95-cab1b0a7ed64` |

---

## 12. Deployment

### Backend — Railway
- **Project ID:** `999e2305-ccc8-4ebd-b89d-2faf95f77142`
- **Service ID:** `432c76ae-7674-4577-8524-5920661677ab`
- **Start command** (Procfile): `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Build:** Nixpacks auto-detects Python
- **Auto-deploy:** On every push to `master` branch
- **⚠️ Credit warning:** $4.99 left — add card or migrate to Render.com (free tier)

#### Migrate to Render (if Railway credit runs out)
1. Go to render.com → New Web Service → Connect GitHub
2. Select `clipforge` repo → Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all env vars
6. Update `NEXT_PUBLIC_API_URL` on Vercel with new Render URL

### Frontend — Vercel
- **Project:** getclipforge (linked to GitHub repo)
- **Root directory:** `frontend`
- **Framework:** Next.js (auto-detected)
- **Auto-deploy:** On every push to `master`
- **Custom domain:** `getclipforge.online` (A record → 76.76.21.21)

### Local Development
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

---

## 13. Admin Panel

**URL:** https://getclipforge.online/admin
**Password:** `clipforge-admin-2024` (stored as `ADMIN_SECRET` env var)

### Features
- License table: key, plan, email, jobs used, device lock status, active/disabled
- Toggle enable/disable per license
- Generate new license key (for gifting, refunds, support)
- Stats: total licenses, pro count, free count, revenue estimate, total jobs

### Common Admin Tasks

#### Disable a key (e.g. refund/chargeback)
```bash
curl -X PATCH "https://clipforge-production-8733.up.railway.app/api/admin/licenses/CF-PRO-XXXXXX-XXXXXX-XXXXXX/disable" \
  -H "X-Admin-Secret: clipforge-admin-2024"
```

#### Generate a gift key
```bash
curl -X POST "https://clipforge-production-8733.up.railway.app/api/admin/licenses/generate?plan=pro&email=user@example.com" \
  -H "X-Admin-Secret: clipforge-admin-2024"
```

#### Check stats
```bash
curl "https://clipforge-production-8733.up.railway.app/api/admin/stats" \
  -H "X-Admin-Secret: clipforge-admin-2024"
```

---

## 14. DNS & Domain

**Domain:** `getclipforge.online`
**Registrar:** Hostinger (hpanel.hostinger.com)
**Cost:** ~400-500 PKR/year

### All DNS Records (Hostinger)

| Type | Name | Value | TTL | Purpose |
|---|---|---|---|---|
| A | `@` | `76.76.21.21` | 14400 | Points domain to Vercel |
| CNAME | `www` | `cname.vercel-dns.com` | 14400 | www subdomain to Vercel |
| TXT | `resend._domainkey` | *(DKIM public key)* | 14400 | Email DKIM signing |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 3600 | Email SPF MX |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | 3600 | Email SPF |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | 14400 | Email DMARC |

---

## 15. Pending Tasks

### High Priority
- [ ] **Lemon Squeezy store approval** — waiting for manual review
  - After approval: set `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_WEBHOOK_SECRET`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_VARIANT_PRO` on Railway
  - Set webhook URL in LS dashboard: `https://clipforge-production-8733.up.railway.app/api/license/webhook`

- [ ] **Railway credit** — $4.99 remaining
  - Option A: Add card to Railway
  - Option B: Migrate backend to Render.com (free tier, same process)

### Medium Priority
- [ ] **PostgreSQL migration** — SQLite data is lost on Railway restart
  - Recommended: Neon.tech (free PostgreSQL)
  - Change `DATABASE_URL` on Railway to Neon connection string
  - SQLAlchemy will auto-create tables on first run

- [ ] **Cloudflare R2 storage** — Clips currently stored in `/tmp` (lost on restart)
  - Create R2 bucket on Cloudflare
  - Set R2 env vars on Railway
  - `storage.py` already has R2 support built in

### Low Priority
- [ ] **YouTube cookies refresh** — Cookies expire, need periodic refresh
- [ ] **Custom Lemon Squeezy email** — Currently uses LS default email + our Resend email (double email)
- [ ] **Analytics** — Add Plausible or similar (privacy-friendly)

---

## 16. Credentials & Secrets (Keep Private)

> ⚠️ **NEVER commit these to Git. NEVER share publicly.**

| Item | Value / Location |
|---|---|
| Admin panel password | `clipforge-admin-2024` |
| Resend API key | `re_Vr4RbzaJ_JPepAWZeKZxA8GTVJWFTzyPT` |
| Railway project ID | `999e2305-ccc8-4ebd-b89d-2faf95f77142` |
| Railway service ID | `432c76ae-7674-4577-8524-5920661677ab` |
| YouTube cookies file | `C:/Users/Abdul Hannan/Downloads/ce4e10ce-64f4-48e8-b67d-9bb0515383df.txt` |
| GitHub repo | https://github.com/hk3687233-design/clipforge |
| Hostinger login | hpanel.hostinger.com |
| Lemon Squeezy login | app.lemonsqueezy.com |
| Railway login | railway.app |
| Vercel login | vercel.com |
| Resend login | resend.com |

---

## 17. Git History (Key Commits)

```
0a165c9  security: device fingerprinting, rate limiting, key format validation
c93cb27  feat: professional email template with logo, badge and footer branding
9faf018  fix: update remaining old URLs to getclipforge.online
6e3155a  feat: custom domain getclipforge.online — update CORS, emails, footer
36945a4  feat: update demo video — CapCut edited 4K export
cb3ffd7  security: reject unknown keys when no LS API key configured (fake key bypass fix)
02b568c  security: remove admin secret hint from admin login page
a0b0134  feat: full landing page restructure — pro-level sections
```

---

*Last updated: 2026-06-09 | ClipForge v2.0.0*
