# TODO

Backlog and shipped log. New items get added as they come up; completed
items stay ticked as a reference of what's been done in each area.

## Conventions

**Priority** (urgency, not difficulty):

- **P0** — blocker, user-facing breakage, or data-loss risk. Drop other work.
- **P1** — important; schedule into the next working session.
- **P2** — nice-to-have, polish, or exploratory.

**Format:**

```
- [ ] **P1** Short imperative description — optional context / why.
- [x] **P2** Same shape, ticked once shipped — leave it for the record.
```

Use `- [~]` for in-progress. Within each epic, list open items first
(P0 → P2, then by date added) and ticked items at the bottom.

---

## Facebook

- [x] **P1** Cache `/api/resolve` by URL hash — shipped 2026-05-20 (commit b4457dc, prior to this TODO entry being added). 1-hour TTL on success only; `normalizeFacebookCacheKey` strips per-user attribution params (`__cft__`, `__tn__`, `__xts__`, `fbclid`) so two callers share an entry. Rationale: FB serves an empty-stub OG page ~60% of the time anonymously, so caching the lucky fetch shifts win-rate per-URL toward 100%. Covered by `normalizeFacebookCacheKey` test suite in `facebook-extract.test.ts`.

- [x] **P1** Test the `inlineHd playable_url` JSON parser — shipped 2026-05-20; `facebook-extract.test.ts` covers og:video, og:image, inline `playable_url(_quality_hd)`, HTML-entity decode, empty HTML.
- [x] **P2** Broaden `unescapeJson` decode set — shipped 2026-05-20; single-pass tokenizer covers `&`, `/`, `=`, `\/`, `\"`, `\\` (chain would double-decode).
- [x] **P2** Re-detect kind from final `res.url` after fetch — shipped 2026-05-20; `fetchHtml` now returns `{ html, finalUrl }`, new pure `reconcileKind(initialUrl, finalUrl, initialKind)` only re-detects when input path is `/share/`.

## Instagram

- [x] **P1** Cache `/api/resolve` by URL hash — shipped 2026-05-20; mirrors the Facebook resolve-result cache. 1-hour TTL on success only, `normalizeInstagramCacheKey` strips `igsh` / `igshid` / `utm_*` share-tracking params. IG signed `oe=` URLs are valid ~24h so 1h sits inside the validity window. Cache lookup happens before any upstream fetch — a hit dodges IG's rate-limit bucket. 6 normalizer test cases added to `instagram-extract.test.ts`.

- [x] **P1** Short-circuit story branch before HTML fetch — shipped 2026-05-20; throws `INSTAGRAM_STORY_BLOCKED` (422) immediately with the existing user-facing message; saves a slow upstream fetch.
- [x] **P2** Tests for `extractFromHtml` and `parseEmbed` — shipped 2026-05-20; `instagram-extract.test.ts` adds 17 cases covering OG fallbacks, JSON unescape, and `parseEmbed`'s `video_url`/`display_url`/`thumbnail_src` precedence.

## TikTok

- [x] **P1** Cache TikTok page fetch (~30s by URL hash) — shipped 2026-05-20; `fetchTikTokPageCached` wraps `fetchTikTokPage`, caches `{html, finalUrl, cookies}` at `tt-cache.local/page/<encoded>`, halves egress per download.
- [x] **P2** Iterate `urlList` fully in `extractPhotoItems` — shipped 2026-05-20; new `pickFirstUsableUrl` picks the first `https://` entry; 3 test cases added.
- [x] **P2** Test the `proxyPageUrl` redirect-mismatch fallback — shipped 2026-05-20; extracted `chooseProxyPageUrl(input, finalUrl)` + 6 test cases covering WAF/about, unparseable, off-platform, empty-username regressions.

## Core

Worker runtime, frontend shell, i18n, build/CI, tooling. Anything not tied to
a single platform.

- [ ] **P1** Fix `theme.test.ts` localStorage failure under Node 22 + vitest 4 + jsdom 29 — 16 tests in `frontend/test/unit/theme.test.ts` throw `TypeError: Cannot read properties of undefined (reading 'clear')` on bare `localStorage.clear()`. Root cause is Node 22's `ExperimentalWarning: localStorage is not available because --localstorage-file was not provided` — bare `localStorage` falls through to Node native (undefined) instead of resolving to `window.localStorage` from the jsdom env. Suspected fixes: (a) switch tests to `window.localStorage.clear()`, (b) pin `vitest-environment-jsdom` to a version that re-globalises `localStorage`, or (c) add a globalSetup that does `globalThis.localStorage = window.localStorage`. CI may already work around this via a different Node flag; verify against `deploy-pages.yml` before declaring the gap blocking.

- [x] **P1** CSP on the SPA — shipped 2026-05-20 (commit ac066c4, prior to TODO entry). `<meta http-equiv="Content-Security-Policy">` is injected per-locale by `frontend/scripts/build-locale-html.mjs`; worker origin is read from `VITE_WORKER_URL` so forks Just Work without patching the script. Policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' <worker>; connect-src 'self' <worker>; base-uri 'self'; form-action 'self'`. `frame-ancestors` / `sandbox` / `report-uri` intentionally omitted — meta-CSP can't carry them, response headers aren't settable on GitHub Pages.
- [x] **P1** CodeQL SAST + Dependabot — shipped 2026-05-20 (pre-existing, TODO entry was stale). `.github/workflows/codeql.yml` runs on push to `main`, on every PR, and weekly (Monday 04:37 UTC) with `security-extended` queries. `.github/dependabot.yml` weekly updates for GitHub Actions (all bumps) + npm in `/worker` and `/frontend` (minor/patch grouped, majors ignored).
- [x] **P2** `ALLOWED_ORIGINS` env var — shipped 2026-05-20 (pre-existing). `worker/src/cors.ts:7` reads `env.ALLOWED_ORIGINS` (comma-separated), `DEFAULT_ALLOWED` is dev-only fallback. Production sets `[vars] ALLOWED_ORIGINS` in `wrangler.toml`. Forks override via the same key — no source edit required.
- [x] **P2** Bundle size budget + CI guard — shipped 2026-05-20 (pre-existing, commit 54401fb). `frontend/scripts/check-bundle-size.mjs` enforces JS/CSS raw + gzip budgets against `dist/assets/`; CI runs `npm run check:bundle-size` after `vite build` in `deploy-pages.yml`.
- [x] **P2** Web Vitals → `/api/track` — shipped 2026-05-20; `web-vitals@5.2.0`, ~1.5 KB gz, registered once from `main.tsx` via `reportWebVitals()`. Each of LCP/INP/CLS/TTFB/FCP fires `vitals.<name>` with the value in the existing `ms` double (CLS × 1000 to fit the same field, no AE schema bump). Worker `ALLOWED_EVENT_PREFIXES` extended with `vitals.`; 7 frontend test cases + 5 worker prefix cases added.
- [x] **P2** Pre-commit hook — shipped 2026-05-20; `scripts/git-hooks/pre-commit` (bash, not husky — project has no root `package.json` and adding one for one hook isn't worth the surface area). Detects which of `worker/` / `frontend/` is staged and runs `tsc --noEmit` + `vitest run --changed --reporter=dot` per affected package; skips packages without staged changes or without `node_modules`. One-time activation: `bash scripts/setup-hooks.sh` (sets `core.hooksPath`). Documented in `docs/development.md`.
- [x] **P2** PR template — shipped 2026-05-20; `.github/PULL_REQUEST_TEMPLATE.md` with the "ran worker suite + frontend suite + Playwright" checklist, plus the reminder that pushing to `main` auto-deploys.

- [x] **P1** Wire `track()` to a real sink — shipped 2026-05-20; fire-and-forget `fetch` with `keepalive: true` + `credentials: 'omit'` + `Content-Type: text/plain` (CORS-safelisted, no preflight) → `POST /api/track` → `env.AE.writeDataPoint` with a positional schema documented in `worker/src/analytics.ts`. 120/min/IP rate-limit bucket; query data via Cloudflare Dashboard → Workers & Pages → Analytics Engine. (Initial impl used `navigator.sendBeacon` which hardcodes `credentials: 'include'` and tripped CORS preflight; swapped to fetch+keepalive in commit e976eed.)
- [x] **P2** React 18 → 19 upgrade — shipped 2026-05-20. Codebase only used stable APIs (`useEffect/useRef/useState/useMemo/useContext/useCallback`, `createContext/createElement`, class component for `ErrorBoundary`, `ReactDOM.createRoot`); no `forwardRef`, no `defaultProps`, no string refs, no removed `ReactDOM.render` / `Children.*` / `propTypes`. The bump was a no-op for source code — typecheck, full test suite (131/131), and production build all pass green on 19.
- [x] **P2** Restore integration happy-path tests — closed 2026-05-20 as won't-fix. `fetchMock` was removed in `@cloudflare/vitest-pool-workers` v0.16 with no drop-in replacement (the `MockAgent` class in v0.16.5 types is abstract, no instantiation export). Restoration paths surveyed: pin v0.15 (defeats the recent bump); refactor resolvers to use service-binding DI (~2-3h, modifies prod code only for tests); add `stubGlobal('fetch')` chain tests (~1-2h, but not true integration). Conclusion: the actual coverage gap is small — parser logic is already covered by `extractFromHtml`, `parseEmbed`, `chooseProxyPageUrl`, `extractPhotoItems`, `reconcileKind`, `unescapeJson` unit tests; only the fetch+parse wiring is uncovered, and that's stable. Gap documented inline at `worker/test/integration/api.test.ts:1-5` instead of building speculative coverage.
- [x] **P1** Tests for `lib/download.ts`, `lib/api.ts` (ApiError + requestId fallback), and `lib/theme/index.ts` — shipped 2026-05-20; 30 new cases across 3 test files; `theme/index.ts` switched to attribute APIs for `media` (jsdom-safe + universal browser support).
- [x] **P2** `Cache-Control` on `/api/health` and `/api/version` — shipped 2026-05-20; `public, s-maxage=30` so the CF edge serves probes.
- [x] **P2** Forward `Content-Range`/`Accept-Ranges` in `proxyMedia` — shipped 2026-05-20; inbound `Range` forwarded to upstream, 206 + Content-Range passed back to client; covered by 2 unit tests.
- [x] **P2** Bump `compatibility_date` in `wrangler.toml` — shipped 2026-05-20; `2024-11-20` → `2026-01-15` (~4 months shakeout).
- [x] **P2** Include `requestId` in `track.ts` events — shipped 2026-05-20; optional field on `resolve.ok` + `resolve.fail`, plumbed through both single + bulk submit handlers.
- [x] **P2** Belt-and-braces: assert `request.cf` presence before trusting `cf-connecting-ip` — attempted 2026-05-20 (`d3c2ef5`) and reverted in `<this commit>`. The gate collapsed all integration-test IPs into one bucket (`vitest-pool-workers` leaves `request.cf` null), without adding real prod protection — CF strips `cf-connecting-ip` from inbound requests at the edge. Original `?? 'unknown'` fallback restored.

- [x] **P1** "Download all" affordance in bulk mode — shipped 2026-05-20; button appears when ≥2 successful rows, reuses 250ms stagger from single-mode handleDownloadAll.
- [x] **P1** Memoize `proxyUrl(item.url)` in `MediaCard` — shipped 2026-05-20; one `useMemo` keyed on `item.url`, both poster + video src reuse the same string.
- [x] **P1** Drop hardcoded GitHub Pages origin from `ALLOWED_ORIGINS` — shipped 2026-05-20; documented the fork override in `docs/deployment.md` and clarified the wrangler.toml comment. Tried adding a `*.github.io` wildcard first (`62a3b4d`); reverted in `<this commit>` because any GitHub Pages subdomain is registrable, which makes the wildcard an open-door CORS bypass (caught by `test/integration/api.test.ts:179`).
- [x] **P2** Dark / light / system theme toggle — shipped 2026-05-20 (reconciled; full impl already in `lib/theme` + `ThemeToggle`).
- [x] **P2** Bulk download from multiple URLs — shipped 2026-05-20; mode toggle on the form, sequential resolve with 500ms politeness gap, per-URL result rows.
- [x] **P2** PWA + mobile share-target — shipped 2026-05-20; web manifest with `share_target`, URL pre-fill on launch via `readShareTargetUrl()`, query-string stripped via `history.replaceState`.
