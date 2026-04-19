# Deploy First Hour (free tier + your domain)

This walks through **one** simple split: **API on Render** (Docker) + **static UI on Cloudflare Pages** (or Vercel). Same ideas work on Railway/Fly with small UI differences.

**You need:** GitHub repo pushed, [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free M0 (optional but recommended), `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, GoDaddy DNS access for your domain.

---

## Phase 1 — Deploy the API (Render)

1. Go to [render.com](https://render.com) → sign up (GitHub login is fine).
2. **New** → **Web Service** → Connect your **`sepsis-copilot`** GitHub repo.
3. Configure:

   | Field | Value |
   |--------|--------|
   | **Name** | e.g. `first-hour-api` |
   | **Region** | Choose closest to you |
   | **Branch** | `main` |
   | **Root directory** | *(leave empty)* |
   | **Runtime** | **Docker** |
   | **Dockerfile path** | `Dockerfile.backend` |
   | **Docker build context** | `.` (repo root) |

4. **Instance type:** Free (or paid if you need no cold starts).

5. **Environment** (add as variables in the Render dashboard):

   | Key | Value |
   |-----|--------|
   | `GEMINI_API_KEY` | Your key |
   | `ELEVENLABS_API_KEY` | Your key |
   | `MONGODB_URI` | Atlas connection string (see Atlas → Connect → Drivers) |
   | `PORT` | `8000` *(Render often sets `PORT` automatically; if the app listens on `$PORT`, keep default in Dockerfile)* |
   | `CORS_ORIGINS` | **Set this after Phase 2** — your real frontend URL(s), comma-separated, e.g. `https://first-hour.pages.dev,https://www.yourdomain.com` — must include **scheme** (`https://`) and **no trailing slash** |

6. **Create Web Service.** Wait for build + deploy (several minutes first time).

7. Copy your API URL, e.g. **`https://first-hour-api.onrender.com`**. Test:

   ```bash
   curl https://YOUR-SERVICE.onrender.com/health
   ```

   Expect: `{"status":"ok"}`

**Note:** Free Render **spins down** when idle; first request after idle can take **30–60+ seconds** (cold start).

---

## Phase 2 — Deploy the frontend (Cloudflare Pages)

Cloudflare Pages is free for static sites and works well with SPAs.

### Option A — Cloudflare Pages (Git integration)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select repo **`sepsis-copilot`**, branch **`main`**.
3. **Build settings:**

   | Field | Value |
   |--------|--------|
   | **Framework preset** | None / Vite (either is fine if commands match) |
   | **Build command** | `cd frontend && npm ci && npm run build` |
   | **Build output directory** | `frontend/dist` |
   | **Root directory** | `/` (repo root) |

4. **Environment variables** (important — **build time**):

   | Name | Value |
   |------|--------|
   | `VITE_API_BASE` | `https://YOUR-SERVICE.onrender.com` *(no trailing slash — your Render API URL from Phase 1)* |

5. Save and deploy. You get a URL like **`https://first-hour.pages.dev`**.

6. Open that URL and click through the app. If the browser blocks API calls, go back to Render and set **`CORS_ORIGINS`** to include **exactly** your Pages URL (and later your custom domain), e.g.:

   `https://xxxx.pages.dev,https://www.yourdomain.com`

   Redeploy the API service if needed.

### Option B — Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the repo.
2. **Root Directory:** set to **`frontend`** (important).
3. **Environment Variables:** `VITE_API_BASE` = `https://YOUR-RENDER-API.onrender.com`
4. Deploy. Vercel runs `npm run build` inside `frontend/`.

---

## Phase 3 — Custom domain (GoDaddy DNS)

You keep the domain at GoDaddy; you only **point DNS** to Cloudflare or Vercel (not to Render for the **site** — the site is on Pages/Vercel).

1. In **Cloudflare Pages** (or Vercel) → your project → **Custom domains** → add `www.yourdomain.com` and/or `yourdomain.com`. They will show **DNS records** to add (usually **CNAME** for `www`, and **A** or CNAME for apex).
2. In **GoDaddy** → **My Products** → your domain → **DNS** → **Manage DNS**.
3. Add/replace the records **exactly** as Cloudflare/Vercel instructs (often CNAME `www` → `xxxx.pages.dev` or similar).
4. Wait for DNS (minutes to 48 hours). Turn on **HTTPS** in the Pages/Vercel UI (automatic once DNS verifies).

5. **Update Render `CORS_ORIGINS`** to include your live origins, e.g.:

   `https://www.yourdomain.com,https://yourdomain.com`

   Use the **same** scheme/host the browser shows in the address bar.

---

## Phase 4 — Optional: API on a subdomain

If you want **`api.yourdomain.com`** → Render:

1. In Render → your Web Service → **Custom Domain** → add `api.yourdomain.com` and follow their DNS (often **CNAME** to `xxx.onrender.com`).
2. In GoDaddy DNS, add that CNAME.
3. Rebuild the **frontend** with **`VITE_API_BASE=https://api.yourdomain.com`** (no trailing slash).
4. Set **`CORS_ORIGINS`** on the API to your **frontend** URLs only (not the API URL).

---

## Checklist

- [ ] `curl https://YOUR-API/health` returns OK  
- [ ] `VITE_API_BASE` matches the **public** API URL used in the browser  
- [ ] `CORS_ORIGINS` lists every **frontend** origin (Pages preview URL + custom domain if any)  
- [ ] Atlas **Network Access** allows `0.0.0.0/0` (or Render’s egress IPs if you lock it down)  
- [ ] Never commit **`backend/.env`** — only set secrets in Render / hosting dashboards  

---

## If something breaks

| Symptom | Likely fix |
|---------|------------|
| Blank API / timeout | Render cold start — wait and retry; or upgrade plan. |
| CORS error in browser console | Add exact frontend origin to `CORS_ORIGINS` on API. |
| UI loads but “network error” | Wrong `VITE_API_BASE` — rebuild frontend after changing API URL. |
| 404 on refresh (`/patient/...`) | SPA host must rewrite to `index.html` — Cloudflare Pages/Vercel usually handle this; GoDaddy static-only needs `.htaccess` (see `DEPLOY_GODADDY.md`). |

For Docker/env details, see **[DEPLOY.md](./DEPLOY.md)**. For GoDaddy-only caveats, see **[DEPLOY_GODADDY.md](./DEPLOY_GODADDY.md)**.
