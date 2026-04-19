# First Hour

Patient-centered clinical decision support for a hackathon: **clinician** vs **patient/family** modes (toggle in header), Gemini explanations & chat, ElevenLabs narration (audio served by the API), MongoDB (recently viewed / saved cases / access log), Solana devnet memo audit trail.

## Data

Place `combined_sepsis_data_v7.csv` in `data/` (included from the synthetic generator).

## Backend

```bash
cd sepsis-copilot/backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill keys (optional for partial demo)
uvicorn main:app --reload --port 8000
```

- Without `MONGODB_URI`, the app uses **in-memory** storage (demo still works). With Atlas, collections live in database **`first_hour`** (older demos may have used `sepsis_copilot`; copy data in Atlas if you need to migrate).
- Without API keys, Gemini / ElevenLabs / Solana features **degrade gracefully**.

### Solana devnet

Generate a throwaway keypair and fund via UI or:

```bash
curl http://127.0.0.1:8000/solana/fund-wallet
```

Set `SOLANA_PRIVATE_KEY` to the **base58-encoded secret key** (64-byte wallet secret). If unset, chain logging is skipped and MongoDB-only access logs are used.

## Frontend

```bash
cd sepsis-copilot/frontend
npm install
npm run dev
```

Set `VITE_API_BASE=http://127.0.0.1:8000` if the API is not the default.

## Demo flow

1. Open `http://localhost:5173` — clinician mode.
2. **Load Critical Demo Case** → highest modeled-risk encounter.
3. Review actions, timeline replay, counterfactual, Gemini, Mongo sidebars.
4. Toggle **Patient & Family View** — narration, simplify, Solana transparency copy.

## Prizes alignment

- **Gemini**: `/explain`, `/chat`, `/explain/simplified`, counterfactual narrative.
- **ElevenLabs**: `/narrate` + `AudioPlayer` word-highlight sync.
- **MongoDB Atlas**: `MONGODB_URI` → persistent `recently_viewed`, `saved_cases`, `access_log`, caches.
- **Audio**: generated MP3 is held in memory and streamed from `/static/audio/...` (see `audio_storage.py`).
- **Solana**: devnet memo transactions + explorer links in `SolanaLog`.

Synthetic data only — not for real clinical decisions.

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for Docker Compose, split API/UI deploys, environment variables, and CORS.

**Domain `firsthour.health` (GoDaddy DNS):** **[DEPLOY_FIRSTHOUR_HEALTH.md](./DEPLOY_FIRSTHOUR_HEALTH.md)**.

Quick local stack:

```bash
cp backend/.env.example backend/.env   # add GEMINI_API_KEY, etc.
docker compose up --build
```

- UI: http://localhost:8080  
- API: http://localhost:8000  
