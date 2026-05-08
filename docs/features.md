# Features

Inventory of what's built and what's planned. The README has a shorter
marketing-flavored version — this file is the engineering source of truth.

## Shipped

### Content support

- **Instagram**: Reel, Post (single image + carousel), IGTV. Public accounts
  only — Open Graph meta tags from anonymous requests.
- **Facebook**: Post, Video, Reel, `fb.watch` short links. Audience must be
  Public.
- **TikTok**: Video, Photo slideshow, `vm.tiktok.com` and `tiktok.com/t/`
  short links. Public videos only. Downloads always include the TikTok
  watermark (clean versions require login). The proxy uses a "page-as-proxy"
  flow because TikTok CDN URLs are session-signed (see `docs/api.md`).
- **Stories** (best-effort): kept in the URL parser for IG/FB but almost
  always fails — Meta requires an authenticated session. Surfaced as
  `*_STORY_BLOCKED` / `*_STORY_EXPIRED` errors.

### URL handling

- Auto-detects platform from the pasted URL.
- Validates URL shape per platform before sending to the Worker (rejects
  unsupported subpaths early with an inline error).
- Supports optional URL prefixes (e.g. `/reels/`, `/p/`, query strings).

### Frontend UX

- Single-page app — no router; per-locale state lives in the URL.
- Per-platform setup guide (where to copy the link from inside IG / FB).
- Three-step UI: choose platform → guide → paste link & download.
- Loading and error states with platform-specific error codes mapped to
  human-readable messages.
- Degraded-mode banner: when only a thumbnail can be retrieved (e.g. IG video
  blocked for anonymous requests), the UI tells the user explicitly instead
  of silently failing.

### TikTok rate-limit handling

- **`TIKTOK_RATE_LIMITED` detection**: when TikTok soft-blocks a CF Worker
  egress IP it 302's every URL to a regional landing page
  (`/<region>/about`). The parser detects the redirect path and returns a
  clear "wait 30 seconds and retry" error instead of a generic
  "no media" failure.

### Internationalization

- 5 locales: **English, Vietnamese, Japanese, Korean, Chinese (Simplified)**.
- Auto-detects from `navigator.language` on first visit at root.
- Manual switcher via `LanguageSelector` component.
- Hand-rolled i18n (no library) — translations in
  `frontend/src/lib/i18n/<locale>.ts`, type-checked against
  `Translations` interface.

### SEO

- **Per-locale pre-rendered HTML**: `dist/index.html` (en) +
  `dist/{vi,ja,ko,zh}/index.html`. Each has its own localized `<title>`,
  `<meta description>`, `<meta keywords>`, `og:locale`, and JSON-LD.
- **Auto-generated OG images**: 1200×630 PNG per locale, generated at build
  time by `scripts/build-og-images.mjs` via satori + resvg-js. Fonts pulled
  from Google Fonts with text-subsetting for ~30 KB downloads per locale.
- **hreflang**: every locale HTML lists all five alternates plus
  `x-default`. Sitemap mirrors the same set per `<url>`.
- **Sitemap**: auto-generated `dist/sitemap.xml` with five URLs and full
  `xhtml:link` alternates. `robots.txt` points at it.
- **Twitter Card** (`summary_large_image`) and full **Open Graph** suite.
- **JSON-LD** `WebApplication` schema with `inLanguage`, `featureList`,
  `offers` (free).

### Backend (Cloudflare Worker)

- **`GET /api/health`** — liveness probe.
- **`POST /api/resolve`** — fetches the public Instagram/Facebook page,
  parses Open Graph meta tags, returns normalized `mediaItems[]`.
- **`GET /api/proxy`** — streams CDN media to the browser with
  `Content-Disposition: attachment` so files save to disk instead of opening
  inline (bypasses cross-origin download restrictions).
- **Host whitelist** on `/api/proxy`: `*.cdninstagram.com`, `*.fbcdn.net`,
  `*.facebook.com`, `*.instagram.com`. Anything else → `HOST_NOT_ALLOWED`.
- **CORS**: `localhost:5173` and any `*.github.io` origin allowed by
  default; configurable via `ALLOWED_ORIGINS` in `worker/wrangler.toml`.
- Detailed error taxonomy — see [`api.md`](./api.md) for the full code list.
  Error codes flow back to the frontend for locale-aware error messages.

### Tooling and CI

- GitHub Actions workflows for both frontend (Pages) and Worker (Cloudflare).
- Frontend builds: `prebuild` generates OG images, `vite build` produces
  the bundle, post-build clones HTML per locale and emits sitemap.
- TypeScript strict mode on both frontend and worker.

## Roadmap (not built yet)

### Content

- **Bulk download**: paste 5–20 URLs at once, download as zip.
- **Thread / Twitter / X media** — open question whether to include given the
  ToS landscape.

### UX

- **PWA + mobile share target** — register as a share recipient on Android
  so "Share to..." includes the downloader.
- **Dark / light mode toggle** — currently dark-only.
- **Download history** — local-only list of recent downloads (no backend
  storage).
- **Drag-and-drop URL field** for desktop power users.

### Quality

- **Per-locale OG variant tuning** — current OG images are generated from
  the same template; could vary background art per locale.
- **Real 404 page** instead of reusing the SPA shell. GitHub Pages serves
  `404.html` with HTTP 404 status, but the body is currently the English
  app, which is confusing.
- **i18n parity check** in CI — ensure every locale file has the same set
  of keys as `en.ts`. Currently relies on TypeScript structural matching.

### SEO

- **Per-locale `<h1>` and visible body text** in pre-rendered HTML — Google
  reads the meta tags fine but the body is empty until React hydrates.
  Pre-rendering visible content would help organic ranking and accessibility.
  Would need `vite-react-ssg` or a similar pre-render plugin.
- **Schema.org `HowTo`** for the per-platform guide — could earn a rich
  result on Google.
