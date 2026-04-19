# First Hour — Project overview

This document summarizes the **First Hour** clinical decision-support demo (repository folder: `sepsis-copilot`). It is **not** a medical device; data are **synthetic** and the app is for hackathon / demonstration only.

---

## One-line summary

**Dual-mode sepsis encounter explorer:** clinicians browse synthetic cohorts, open encounters, and optionally switch to **patient & family** language; **Gemini** powers explanations and chat, **ElevenLabs** optional narration, **MongoDB** optional persistence, **Solana devnet** optional on-chain audit memos.

---

## Repository

| Item | Value |
|------|--------|
| **GitHub** | `https://github.com/vineet640/sepsis-copilot` |
| **Stack** | FastAPI (Python) + React (Vite) + optional MongoDB Atlas + optional Solana devnet |

---

## Tech stack

### Backend (`backend/`)

| Layer | Technology |
|--------|------------|
| API | **FastAPI** + **Uvicorn** |
| Data file | **pandas** loads `data/combined_sepsis_data_v7.csv` |
| Risk / actions | Rule engines in `risk_engine.py`, `action_engine.py` |
| LLM | **Google Gemini** (`google-generativeai`) — explanations, chat, simplify, counterfactual, equity notes, vitals insight |
| TTS | **ElevenLabs** — `/narrate` returns MP3 URLs |
| Audio hosting | **In-memory** `audio_storage.py`; served at `GET /static/audio/{key}` (no cloud bucket) |
| Persistence | **PyMongo** → MongoDB database **`first_hour`** (collections: `patients`, `recently_viewed`, `saved_cases`, `access_log`, `chat_cache`, `explain_cache`) |
| Blockchain | **Solana devnet** — memo program for access events (`solana_service.py`) |

### Frontend (`frontend/`)

| Layer | Technology |
|--------|------------|
| UI | **React 18** + **React Router 6** |
| Build | **Vite 6** |
| Styling | **Tailwind CSS 4** + Radix UI primitives |
| Charts | **Recharts** |

---

## Directory layout (high level)

```
sepsis-copilot/
├── backend/
│   ├── main.py              # FastAPI app, routes, CORS
│   ├── data_loader.py       # CSV load / patient lookup
│   ├── risk_engine.py       # SOFA-related risk scoring
│   ├── action_engine.py     # Recommended actions
│   ├── gemini_service.py    # Gemini calls
│   ├── elevenlabs_service.py
│   ├── audio_storage.py     # In-memory MP3 for TTS
│   ├── mongo_service.py     # Atlas or in-memory fallback
│   ├── solana_service.py    # Devnet memos
│   ├── .env.example         # Copy to .env (not committed)
│   └── requirements.txt
├── data/
│   └── combined_sepsis_data_v7.csv   # Synthetic cohort (required)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Shell, routes, header
│   │   ├── api.js           # fetch helpers, API base URL
│   │   ├── pages/           # Login, PatientBrowser, PatientDashboard, …
│   │   ├── components/      # Dashboards, SolanaLog, RecentlyViewed, …
│   │   ├── context/         # Auth, mode, theme, patient questions
│   │   └── lib/             # encounterDashboardData, localCaseHistory (browser fallback)
│   ├── vite.config.js       # Dev proxy to API
│   └── package.json
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── deploy/nginx-frontend.conf
├── README.md
├── DEPLOY.md
├── DEPLOY_GODADDY.md
└── PROJECT.md               # This file
```

---

## Environment variables

Copy `backend/.env.example` → `backend/.env`. **Never commit `backend/.env`.**

| Variable | Role |
|----------|------|
| `GEMINI_API_KEY` | Explanations, chat, simplified text, counterfactual, equity, vitals-chart insight |
| `GEMINI_MODEL` | Optional comma-separated model fallback list |
| `ELEVENLABS_API_KEY` | Spoken narration (`/narrate`) |
| `ELEVENLABS_VOICE_CALM` / `ELEVENLABS_VOICE_URGENT` | Optional voice IDs (defaults use premade voices) |
| `MONGODB_URI` | MongoDB Atlas connection string; if unset, storage is **in-memory** (lost on restart) |
| `SOLANA_PRIVATE_KEY` | Base58 signing key for devnet memos; optional |
| `SOLANA_RPC_URL` | Default `https://api.devnet.solana.com` |
| `CORS_ORIGIN` | Single dev origin if `CORS_ORIGINS` not set |
| `CORS_ORIGINS` | Comma-separated allowed browser origins (production + merged local dev defaults in code) |
| `PORT` | API listen port (e.g. PaaS; Docker defaults to 8000) |

Frontend build:

| Variable | Role |
|----------|------|
| `VITE_API_BASE` | Full URL of the API for production builds (no trailing slash). In dev, empty string uses Vite proxy. |

---

## Local development

### Backend

```bash
cd sepsis-copilot/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add keys as needed
uvicorn main:app --reload --port 8000
```

- Health: `GET http://127.0.0.1:8000/health`
- First startup can take time while the CSV loads and (if configured) Mongo syncs patients.

### Frontend

```bash
cd sepsis-copilot/frontend
npm install
npm run dev
```

- Default dev URL: `http://127.0.0.1:5173/`
- With default `VITE_API_BASE` in dev, requests use the **Vite proxy** to the API (see `vite.config.js`).

### Docker Compose

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

- UI (nginx): `http://localhost:8080`
- API: `http://localhost:8000`

---

## HTTP API (main routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/patients` | List encounters + risk summary |
| GET | `/patient/{encounter_id}` | Full patient + risk + actions + timeline (logs access in background) |
| GET | `/actions/{encounter_id}` | Recommended actions |
| GET | `/explain/{encounter_id}` | Gemini explanation (`mode` query) |
| GET | `/explain/simplified/{encounter_id}` | Plain-language explanation |
| GET | `/explain/vitals-chart/{encounter_id}` | Short chart insight |
| GET | `/counterfactual/{encounter_id}` | Counterfactual risk + narrative |
| GET | `/equity/{encounter_id}` | Equity-oriented note |
| POST | `/narrate/{encounter_id}` | Gemini script + ElevenLabs audio (MP3 URL) |
| POST | `/chat/{encounter_id}` | Patient Q&A |
| GET | `/recently-viewed` | `session_id` query |
| POST | `/save-case` | Save case for session |
| GET | `/saved-cases` | `session_id` query |
| DELETE | `/save-case/{encounter_id}` | `session_id` query |
| GET | `/solana/access-log/{encounter_id}` | Access rows for encounter |
| GET | `/solana/wallet-status` | Devnet wallet balance / hints |
| GET | `/solana/fund-wallet` | Request devnet airdrop (may rate-limit) |
| GET | `/featured-patients` | Top risk encounters |
| GET | `/hospital/{hospital_id}/summary` | Aggregate stats |
| GET | `/credibility-anchors` | Static citation bullets |
| GET | `/static/audio/{key}` | Generated MP3 bytes |

---

## User-facing features

- **Sign-in:** Clinician vs patient & family (session stored in browser).
- **Clinician:** Browse table, encounter dashboard (risk, timeline, vitals, actions, Gemini panels, narration, recently viewed, save case, optional Solana audit table).
- **Patient & family:** Simplified layout, narration, team questions UI, care-journey copy.
- **Theme:** Light/dark toggle (`ThemeContext`, `localStorage` key `first_hour_theme`).
- **Session ID:** `first_hour_session_id` for API `session_id` on patient views and Mongo sidebars.

---

## Graceful degradation & fallbacks

- **No Gemini key:** Static / fallback copy where implemented; `/narrate` can still use demo summary text.
- **No ElevenLabs key:** Transcript-only narration with `speech_notice` (no MP3).
- **No MongoDB:** In-memory stores; no cross-restart persistence.
- **Mongo `ObjectId`:** Stripped from JSON responses for list endpoints.
- **CORS:** Production `CORS_ORIGINS` is merged with local dev origins so `npm run dev` does not break.
- **Saved / recently viewed:** `localCaseHistory.js` mirrors to `localStorage` when the API fails.
- **Solana:** If no key or no devnet SOL, signatures stay empty; Mongo still records access when possible.

---

## Data & safety

- **Synthetic cohort** only (`combined_sepsis_data_v7.csv`) — not real PHI.
- **Not for clinical use.** Credibility banner references real literature; modeled risk is for demo.

---

## Deployment

- **Full guide:** [DEPLOY.md](./DEPLOY.md)
- **GoDaddy / static hosting:** [DEPLOY_GODADDY.md](./DEPLOY_GODADDY.md)
- **Docker:** `Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`
- **CI:** `.github/workflows/docker-build.yml` builds images (no push by default)

---

## Related docs

| File | Content |
|------|---------|
| [README.md](./README.md) | Quick start, demo flow, prize alignment |
| [DEVPOST_ABOUT.md](./DEVPOST_ABOUT.md) | Hackathon / Devpost narrative |
| [DEPLOY.md](./DEPLOY.md) | Env vars, Docker, split deploy, checklist |

---

## Maintenance notes

- `google.generativeai` may show a deprecation warning; migrating to `google.genai` is future work.
- MongoDB database name **`first_hour`** (legacy `sepsis_copilot` DB name may exist in older Atlas projects).

---

*Last updated to match repository layout and features as of project documentation generation.*
