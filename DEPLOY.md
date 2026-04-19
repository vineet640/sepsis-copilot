# Deploy First Hour

**GoDaddy-specific notes:** Shared hosting won’t run this API; use a **GoDaddy VPS**, or host **static files** on GoDaddy and run the API elsewhere. See **[DEPLOY_GODADDY.md](./DEPLOY_GODADDY.md)**.

## What you must provide (secrets & config)

Set these in your host’s environment or in `backend/.env` (never commit real secrets).

| Variable | Required for | Notes |
|----------|----------------|-------|
| **`GEMINI_API_KEY`** | AI explanations, chat, vitals-chart insight, simplified text | From [Google AI Studio](https://aistudio.google.com/apikey). Without it, the API falls back to static text. |
| **`ELEVENLABS_API_KEY`** | Spoken narration (`/narrate`) | Without it, narration returns `no_api_key` (text still shown). |
| **`MONGODB_URI`** | Persistent recently viewed, saved cases, access logs, explain cache | Optional: omit for **in-memory** storage (resets when the API restarts). Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for production. |
| **`SOLANA_PRIVATE_KEY`** | On-chain memo + signature column in audit log | Optional: base58 secret; fund the pubkey on **devnet** (faucet) so txs pay fees. |
| **`CORS_ORIGINS`** | Browser calling API from another domain | **Required for split deploys.** Comma-separated frontend URLs, e.g. `https://myapp.vercel.app,https://www.myapp.com`. |
| **`PORT`** | PaaS (Railway, Render, Fly, Cloud Run) | Usually injected by the platform; defaults to `8000` in Docker. |

Frontend **build-time**:

| Variable | Notes |
|----------|--------|
| **`VITE_API_BASE`** | Full public URL of the API, e.g. `https://first-hour-api.onrender.com` — **no trailing slash**. Rebuild the frontend whenever this changes. |

---

## Option A — Docker Compose (API + UI locally)

1. `cp backend/.env.example backend/.env` and fill keys (at minimum `GEMINI_API_KEY` for full AI).
2. From repo root (`sepsis-copilot/`):

   ```bash
   docker compose up --build
   ```

3. **UI:** http://localhost:8080  
   **API:** http://localhost:8000  

The UI image is built with `VITE_API_BASE=http://localhost:8000` so the browser can reach the API.

---

## Option B — Split services (typical cloud)

1. **Deploy the API** from `Dockerfile.backend` (Railway, Render, Fly.io, Google Cloud Run, AWS App Runner, etc.).
   - Set env vars on the service.
   - Set `CORS_ORIGINS` to your **exact** deployed frontend origin(s) (scheme + host, no path).

2. **Build and deploy the frontend** from `Dockerfile.frontend` with a **build arg**:

   ```bash
   docker build -f Dockerfile.frontend \
     --build-arg VITE_API_BASE=https://YOUR-API-HOST \
     -t first-hour-web .
   ```

   Or on Vercel/Netlify: set `VITE_API_BASE` in the project env and run `npm run build` in `frontend/`.

3. **Health check:** `GET /health` on the API.

---

## Option C — API only + local Vite

Run the backend (Docker or `uvicorn`), set `VITE_API_BASE` in `frontend/.env` to that API URL, then `npm run dev` in `frontend/`. Add your dev origin to `CORS_ORIGINS` if needed.

---

## Checklist before demo

- [ ] `data/combined_sepsis_data_v7.csv` present in the image/repo (included in `Dockerfile.backend`).
- [ ] `GEMINI_API_KEY` set if you want live LLM text.
- [ ] `CORS_ORIGINS` matches your live frontend URL(s).
- [ ] Frontend rebuilt with correct `VITE_API_BASE`.
- [ ] `ELEVENLABS_API_KEY` if you need real audio.
- [ ] `MONGODB_URI` if you need persistence across restarts / multiple API instances.

---

*Synthetic data only — not for clinical use.*
