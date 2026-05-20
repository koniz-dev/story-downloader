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

- [x] **P1** Test the `inlineHd playable_url` JSON parser — shipped 2026-05-20; `facebook-extract.test.ts` covers og:video, og:image, inline `playable_url(_quality_hd)`, HTML-entity decode, empty HTML.
- [x] **P2** Broaden `unescapeJson` decode set — shipped 2026-05-20; single-pass tokenizer covers `&`, `/`, `=`, `\/`, `\"`, `\\` (chain would double-decode).
- [x] **P2** Re-detect kind from final `res.url` after fetch — shipped 2026-05-20; `fetchHtml` now returns `{ html, finalUrl }`, new pure `reconcileKind(initialUrl, finalUrl, initialKind)` only re-detects when input path is `/share/`.

## Instagram

- [x] **P1** Short-circuit story branch before HTML fetch — shipped 2026-05-20; throws `INSTAGRAM_STORY_BLOCKED` (422) immediately with the existing user-facing message; saves a slow upstream fetch.
- [x] **P2** Tests for `extractFromHtml` and `parseEmbed` — shipped 2026-05-20; `instagram-extract.test.ts` adds 17 cases covering OG fallbacks, JSON unescape, and `parseEmbed`'s `video_url`/`display_url`/`thumbnail_src` precedence.

## TikTok

- [x] **P1** Cache TikTok page fetch (~30s by URL hash) — shipped 2026-05-20; `fetchTikTokPageCached` wraps `fetchTikTokPage`, caches `{html, finalUrl, cookies}` at `tt-cache.local/page/<encoded>`, halves egress per download.
- [x] **P2** Iterate `urlList` fully in `extractPhotoItems` — shipped 2026-05-20; new `pickFirstUsableUrl` picks the first `https://` entry; 3 test cases added.
- [x] **P2** Test the `proxyPageUrl` redirect-mismatch fallback — shipped 2026-05-20; extracted `chooseProxyPageUrl(input, finalUrl)` + 6 test cases covering WAF/about, unparseable, off-platform, empty-username regressions.

## Core

Worker runtime, frontend shell, i18n, build/CI, tooling. Anything not tied to
a single platform.

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
