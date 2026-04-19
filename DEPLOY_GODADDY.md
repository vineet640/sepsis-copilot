# Deploying on GoDaddy

This project is a **Python FastAPI API** + **React static frontend**. GoDaddy **shared hosting** (cPanel, “Linux Hosting”) is built for **PHP** and simple sites—it **cannot** reliably run a long‑lived FastAPI process or Docker. Use one of the paths below.

---

## Option A — GoDaddy **VPS** or **Dedicated Server** (recommended if you stay on GoDaddy)

You get a full Linux machine (Ubuntu is typical). You can run **Docker** exactly like any other cloud VPS.

### Steps (high level)

1. **Buy / open** a GoDaddy VPS (or dedicated) with Ubuntu.
2. **SSH** in as root or sudo user.
3. Install Docker + Compose:  
   https://docs.docker.com/engine/install/ubuntu/
4. **Clone** your repo (or upload files), `cd sepsis-copilot`.
5. Create **`backend/.env`** from `backend/.env.example` and set at least **`GEMINI_API_KEY`**, **`ELEVENLABS_API_KEY`**, **`CORS_ORIGINS`** (your real site URL), etc. See [DEPLOY.md](./DEPLOY.md).
6. **Build & run**:
   ```bash
   docker compose up -d --build
   ```
   Or run only the API container and serve the frontend with nginx—see [DEPLOY.md](./DEPLOY.md) for split vs compose.

7. **DNS** in GoDaddy:
   - Point **`A`** record for `api.yourdomain.com` → **VPS public IP** (if API is on subdomain).
   - Point **`A`** (or `CNAME`) for `www` / `@ → same IP or frontend host as you design.

8. **HTTPS**: Install **Certbot** (Let’s Encrypt) on the VPS and terminate TLS on **nginx** (port 443), reverse-proxy to:
   - `localhost:8080` (if nginx serves the UI container), and/or  
   - `localhost:8000` (API).

9. **Firewall**: Open **80**, **443** (and **22** for SSH). Close direct public access to **8000** if the API is only behind nginx.

10. **Frontend build**: Set **`VITE_API_BASE`** to your **public API URL** (e.g. `https://api.yourdomain.com`) when building the web image or static files.

**MongoDB / Solana**: Same as [DEPLOY.md](./DEPLOY.md)—Atlas is optional; Solana needs devnet SOL for signatures.

---

## Option B — **Static site on GoDaddy**, API **elsewhere** (common + cheap)

Many teams use GoDaddy **only for the domain** or **only for hosting the built React files** (HTML/CSS/JS from `npm run build`), while the API runs on **Render, Railway, Fly.io, Google Cloud Run**, etc.

1. Deploy **FastAPI** on a platform that supports Docker or Python (see [DEPLOY.md](./DEPLOY.md)).
2. Set **`CORS_ORIGINS`** on the API to your GoDaddy site URL (e.g. `https://www.yourdomain.com`).
3. Build the frontend with **`VITE_API_BASE=https://your-api-host...`**.
4. Upload **`frontend/dist`** contents to GoDaddy **cPanel File Manager** (public_html) or connect **Git** if your plan supports it.

**Limitation:** Shared hosting must allow your **SPA** (single-page app): all routes should fall back to `index.html` (GoDaddy sometimes needs a `.htaccess` rule for React Router—see below).

### Apache `.htaccess` snippet (if GoDaddy uses Apache on shared hosting)

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

(Only if `mod_rewrite` is enabled—check GoDaddy docs for your plan.)

---

## Option C — **Domain only at GoDaddy**

Register the domain at GoDaddy, set **DNS**:

- **`A`** / **`CNAME`** to your **VPS** (Option A), or  
- **`CNAME`** for `www` → **Vercel / Netlify / Cloudflare Pages** (frontend), and **`api`** → **Render / Railway** (backend).

No GoDaddy hosting required.

---

## What **not** to expect

| Product | Run FastAPI + Docker? |
|--------|-------------------------|
| GoDaddy **Economy / Deluxe shared Linux** | **No** (not suitable for this stack) |
| GoDaddy **VPS / Dedicated** | **Yes** |
| **GoDaddy Website Builder** | **No** (not for this app) |

---

## Checklist

- [ ] Confirm you have **VPS/dedicated** *or* use GoDaddy **only for DNS/static** + API elsewhere.
- [ ] Set **`CORS_ORIGINS`** to the exact browser origin of your live site.
- [ ] Rebuild frontend with **`VITE_API_BASE`** = public API URL.
- [ ] HTTPS on the public hostname users type in the browser.

For environment variables and Docker commands, see **[DEPLOY.md](./DEPLOY.md)**.
