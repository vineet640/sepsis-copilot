# Deploy First Hour to **firsthour.health** (GoDaddy domain)

Your domain **firsthour.health** can stay registered at **GoDaddy**. This app still needs:

1. **A public API** (FastAPI) — GoDaddy **shared hosting cannot run it**; use **Render / Railway / Fly** (see below).  
2. **Static frontend** (built React) — **Cloudflare Pages**, **Vercel**, **Netlify**, **GoDaddy cPanel** (upload `dist`), or your **GoDaddy VPS** (nginx + Docker).  
3. **DNS at GoDaddy** — point **firsthour.health** (and **www**) to wherever the UI is hosted; optionally **api.firsthour.health** to the API.

MongoDB: **Atlas** (recommended). Keys: **`GEMINI_API_KEY`**, **`ELEVENLABS_API_KEY`** in the API host’s environment.

---

## Architecture (recommended)

| Piece | Where | URL (example) |
|--------|--------|----------------|
| **Website (React)** | Cloudflare Pages / Vercel / Netlify | `https://firsthour.health`, `https://www.firsthour.health` |
| **API (Docker)** | Render Web Service | `https://api.firsthour.health` *(custom domain)* **or** `https://first-hour-api.onrender.com` |
| **DNS** | GoDaddy | Records below |

You **must** rebuild the frontend whenever the **public API URL** changes:

```bash
cd frontend
VITE_API_BASE=https://YOUR_PUBLIC_API_URL npm run build
```

**No trailing slash** on `VITE_API_BASE`.

---

## 1. Deploy the API (Render example)

1. [Render](https://render.com) → **New** → **Web Service** → connect repo **`vineet640/sepsis-copilot`**.  
2. **Docker** → Dockerfile path: **`Dockerfile.backend`**, context: **`.`** (repo root).  
3. **Environment variables** (minimum):

   | Key | Value |
   |-----|--------|
   | `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) |
   | `ELEVENLABS_API_KEY` | From ElevenLabs |
   | `MONGODB_URI` | Atlas connection string |
   | `CORS_ORIGINS` | See **section 4** below (after you know UI URLs) |

4. Note the default URL, e.g. `https://first-hour-api.onrender.com`.

### Optional: **api.firsthour.health** on Render

Render → your service → **Custom Domains** → add **`api.firsthour.health`**.  
In **GoDaddy DNS**, add the **CNAME** (or records) Render shows, e.g.:

| Type | Name | Value / Points to |
|------|------|-------------------|
| CNAME | `api` | `<something>.onrender.com` *(exact value from Render)* |

Wait for TLS to issue, then test:

```bash
curl https://api.firsthour.health/health
```

Use **`VITE_API_BASE=https://api.firsthour.health`** when building the frontend (no trailing slash).

---

## 2. Deploy the frontend (Cloudflare Pages example)

1. [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → connect GitHub repo.  
2. **Build:**

   - **Build command:** `cd frontend && npm ci && npm run build`  
   - **Output directory:** `frontend/dist`  
   - **Root:** repo root `/`

3. **Environment variable** (build time):

   | Name | Example value |
   |------|----------------|
   | `VITE_API_BASE` | `https://api.firsthour.health` **or** `https://your-service.onrender.com` |

4. Deploy. You’ll get a `*.pages.dev` URL first.

5. **Custom domains:** add **`firsthour.health`** and **`www.firsthour.health`**. Cloudflare will show **which DNS to add**.

---

## 3. DNS in GoDaddy (domain: firsthour.health)

GoDaddy → **My Products** → **firsthour.health** → **DNS** → **Manage DNS**.

### If Cloudflare manages the site (nameservers or partial)

- Easiest: **change nameservers** to Cloudflare’s (given when you add the site to Cloudflare), **or**  
- Add the **A / CNAME** records Cloudflare lists for `firsthour.health` / `www`.

### Typical records (examples — **use values your host shows**)

| Type | Name | Value |
|------|------|--------|
| CNAME | `www` | `xxxx.pages.dev` or Vercel target |
| A | `@` | Apex may use **A** to Pages/Vercel IP — **follow host docs** |

**WWW vs apex:** Configure **both** `firsthour.health` and `www.firsthour.health` in your static host, then add both to **`CORS_ORIGINS`**.

Propagation can take **minutes to hours**.

---

## 4. CORS on the API (required)

Set on **Render** (or wherever the API runs), **exact** browser origins (https, no path, no trailing slash):

```text
CORS_ORIGINS=https://firsthour.health,https://www.firsthour.health
```

If you also use a **preview** URL (e.g. `https://xyz.pages.dev`), add it too while testing:

```text
CORS_ORIGINS=https://firsthour.health,https://www.firsthour.health,https://xyz.pages.dev
```

Redeploy or restart the API after changing env.

---

## 5. GoDaddy **only** = upload static files (cPanel)

If you **do not** use Cloudflare/Vercel and only have **GoDaddy web hosting**:

1. Build locally with the **final** API URL:

   ```bash
   cd frontend
   VITE_API_BASE=https://api.firsthour.health npm run build
   ```

2. Upload contents of **`frontend/dist/`** to **`public_html`** (or subdomain folder).  
3. Add **`.htaccess`** for React Router (see [DEPLOY_GODADDY.md](./DEPLOY_GODADDY.md)).  
4. Still run the **API** on Render (or VPS) — **not** inside shared PHP hosting.

---

## 6. GoDaddy **VPS** (full stack on one server)

If you purchased a **GoDaddy VPS**:

1. SSH in, install **Docker** + **Docker Compose**.  
2. Clone the repo, create **`backend/.env`** from **`.env.example`**.  
3. Set **`CORS_ORIGINS`** as in section 4.  
4. Build frontend with `VITE_API_BASE=https://firsthour.health` (or `https://api.firsthour.health` if you split by subdomain).  
5. **`docker compose up -d --build`** (from repo root) **or** nginx + TLS with **Certbot** on the VPS.  
6. Point GoDaddy **A** records `@` and **`www`** to the VPS public IP.

Details: [DEPLOY_GODADDY.md](./DEPLOY_GODADDY.md) Option A.

---

## Checklist

- [ ] `curl https://<API>/health` returns `{"status":"ok"}`  
- [ ] `VITE_API_BASE` equals the **same** API URL the browser will call (https, no trailing slash)  
- [ ] `CORS_ORIGINS` includes every **live** site origin you use  
- [ ] Atlas **Network Access** allows `0.0.0.0/0` (or your API egress IPs)  
- [ ] SPA routes work (direct load of `/patient/...`) — use `vercel.json` / `public/_redirects` in this repo or host-specific rewrites  

---

## Related docs

- [DEPLOY_FREE_TIER.md](./DEPLOY_FREE_TIER.md) — Render + Pages walkthrough  
- [DEPLOY.md](./DEPLOY.md) — env reference  
- [DEPLOY_GODADDY.md](./DEPLOY_GODADDY.md) — shared vs VPS, `.htaccess`  

*Synthetic demo data only — not for clinical use.*
