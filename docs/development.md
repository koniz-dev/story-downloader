# Local development

## Requirements

- **Node.js 22+** (required by Wrangler 4 and Vite 8)
- **Cloudflare account** (free) for running the Worker — `wrangler login` once
- **PowerShell, bash, or zsh** — examples below use bash syntax; on PowerShell,
  swap `cp` for `Copy-Item` and use `$env:VAR` for environment variables.

## Worker

```bash
cd worker
npm install
npm run dev          # http://127.0.0.1:8787

# Smoke test
curl http://127.0.0.1:8787/api/health
# → { "ok": true }
```

Wrangler will hot-reload on edits to `worker/src/**`.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local:
#   VITE_WORKER_URL=http://127.0.0.1:8787
npm run dev          # http://localhost:5173
```

The Vite dev server proxies API calls based on `VITE_WORKER_URL`. If you change
that value you must restart `npm run dev`.

## Adding a translation

Translations live in `frontend/src/lib/i18n/<locale>.ts`. To add a new locale:

1. Copy `en.ts` → `<locale>.ts` and translate the strings.
2. Register it in `frontend/src/lib/i18n/index.ts` (`DICTS`, `isLocale`, and
   `detectLocale` if you want auto-detection from `navigator.language`).
3. Add the locale to `LOCALES` in `frontend/src/lib/i18n/types.ts`.
4. Update `frontend/index.html` `hreflang` alternates.

## Type checking

```bash
cd frontend && npm run lint   # tsc -b --noEmit
cd worker   && npm run lint   # tsc --noEmit
```

## Git hooks

Pre-commit hook runs `tsc --noEmit` and `vitest --changed` on whichever package
has staged files (worker / frontend). Install once per clone:

```bash
bash scripts/setup-hooks.sh
```

The hook is the first line of defence — the full suites still run in
`.github/workflows/deploy-{pages,worker}.yml`, but `main` auto-deploys, so
catching breakage *before* push saves a red CI badge on prod.
Skip in one-off cases with `git commit --no-verify`.
