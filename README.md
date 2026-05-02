# Story Downloader

Website for downloading stories from Instagram and Facebook via URL. The frontend
runs on GitHub Pages, the backend is a Cloudflare Worker (free tier) acting as a
scraper + media proxy.

> **Note**: This tool is intended for personal use and only supports public stories.
> Downloading copyrighted or private content may violate Meta's ToS — you are solely
> responsible for how you use it.

## Architecture

```mermaid
flowchart TD
    A[GitHub Pages<br/>Vite + React + Tailwind] -->|POST /api/resolve<br/>GET /api/proxy| B[Cloudflare Worker<br/>story-dl-worker]
    B -->|fetch + parse og: meta tags| C[Instagram / Facebook<br/>public endpoints]
```

- **`frontend/`** — Vite + React + TypeScript + Tailwind SPA. Deployed to GitHub
  Pages via the `.github/workflows/deploy-pages.yml` workflow.
- **`worker/`** — Cloudflare Worker (TypeScript) with 3 routes: `/api/health`,
  `/api/resolve`, `/api/proxy`. Deploy with `wrangler deploy` or via the
  `.github/workflows/deploy-worker.yml` workflow.

## Local setup

### Requirements

- Node.js 20+
- Cloudflare account (for the Worker) — run `wrangler login` once

### Worker

```bash
cd worker
npm install
npm run dev          # http://127.0.0.1:8787
# Test:
curl http://127.0.0.1:8787/api/health
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: VITE_WORKER_URL=http://127.0.0.1:8787
npm run dev          # http://localhost:5173
```

## Deploy

### 1. Deploy the Worker to Cloudflare

```bash
cd worker
npx wrangler login
npx wrangler deploy
# Note the URL: https://story-dl-worker.<account>.workers.dev
```

### 2. Create the GitHub repo and enable Pages

```bash
# From the project root
git init
git add .
git commit -m "Initial commit"
gh repo create story-downloader --public --source=. --push
```

Under **Settings → Pages**, set **Source = GitHub Actions**.

### 3. Configure the frontend variable

**Settings → Secrets and variables → Actions → Variables → New repository variable**:

| Name              | Value                                                |
| ----------------- | ---------------------------------------------------- |
| `VITE_WORKER_URL` | `https://story-dl-worker.<account>.workers.dev`      |

> This is a **Variable** (public), not a Secret — the value will be embedded in the
> JS bundle.

### 4. (Optional) Deploy the Worker via GitHub Actions

**Settings → Secrets and variables → Actions → Secrets**:

| Name                    | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token from Cloudflare → My Profile → API Tokens   |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Account ID                 |

### 5. Configure CORS on the Worker

By default, `localhost:5173` and any `*.github.io` origin are allowed. If you use a
custom domain, edit `ALLOWED_ORIGINS` in `worker/wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "http://localhost:5173,https://your-user.github.io,https://yourdomain.com"
```

Then run `npx wrangler deploy` again.

## Worker API

### `GET /api/health`

```json
{ "ok": true }
```

### `POST /api/resolve`

```json
// Request
{ "url": "https://www.instagram.com/stories/<user>/<id>/" }

// Response 200
{
  "platform": "instagram",
  "mediaItems": [
    { "type": "video", "url": "https://...mp4", "thumbnail": "https://...jpg" }
  ]
}

// Response 4xx/5xx
{ "error": "...", "code": "INSTAGRAM_NO_MEDIA" }
```

### `GET /api/proxy?url=<encoded>&filename=<optional>`

Streams media from the IG/FB CDN to the browser with
`Content-Disposition: attachment` to trigger a download. Host whitelist:
`*.cdninstagram.com`, `*.fbcdn.net`, `*.facebook.com`, `*.instagram.com`.

## Roadmap

- [ ] Support Instagram Reel / Post media (not just stories)
- [ ] Support TikTok
- [ ] Bulk download from multiple URLs
- [ ] PWA + mobile share target
- [ ] Dark/light mode toggle
- [ ] i18n VI/EN

## Known limitations

- **Private** stories cannot be downloaded (a user session cookie is required —
  not yet supported).
- Some stories expire after 24 hours; IG/FB will return 404 — try while the story
  is still visible.
- IG/FB change their HTML structure and endpoints frequently — when the parser
  fails, please open an issue or update `worker/src/platforms/*.ts`.
