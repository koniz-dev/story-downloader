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

- [ ] **P1** Test the `inlineHd playable_url` JSON parser — zero coverage, silent-breaks when Meta changes payload shape. `worker/src/platforms/facebook.ts:117`.
- [ ] **P2** Broaden `unescapeJson` decode set (match Instagram's `/`, `\"`, …) — narrow set returns broken URLs in edge cases. `worker/src/platforms/facebook.ts:155`.
- [ ] **P2** Re-detect kind from final `res.url` after fetch — `/share/<token>` is always tagged `post` even when redirect lands on `/reel/` or `/videos/`. `worker/src/platforms/facebook.ts:26`.

## Instagram

- [ ] **P1** Short-circuit story branch before HTML fetch — currently fetches then bails on empty items; wastes a slow upstream call. `worker/src/platforms/instagram.ts:32-55`.
- [ ] **P2** Add tests for `extractFromHtml` and `parseEmbed` — only `detectInstagramKind` is covered; these are the fragile scraping surface. `worker/test/unit/platforms.test.ts`.

## TikTok

- [x] **P1** Cache TikTok page fetch (~30s by URL hash) — shipped 2026-05-20; `fetchTikTokPageCached` wraps `fetchTikTokPage`, caches `{html, finalUrl, cookies}` at `tt-cache.local/page/<encoded>`, halves egress per download.
- [x] **P2** Iterate `urlList` fully in `extractPhotoItems` — shipped 2026-05-20; new `pickFirstUsableUrl` picks the first `https://` entry; 3 test cases added.
- [x] **P2** Test the `proxyPageUrl` redirect-mismatch fallback — shipped 2026-05-20; extracted `chooseProxyPageUrl(input, finalUrl)` + 6 test cases covering WAF/about, unparseable, off-platform, empty-username regressions.

## Core

Worker runtime, frontend shell, i18n, build/CI, tooling. Anything not tied to
a single platform.

- [ ] **P1** Wire `track()` to a real sink or remove dead events — `resolve.fail`/`bulk.complete` etc. are designed to aggregate but only `console.log`. `frontend/src/lib/track.ts:11`.
- [ ] **P1** Tests for `lib/download.ts`, `lib/api.ts` (ApiError + requestId fallback), and `lib/theme/index.ts` (meta-tag swap) — non-presentational code with real branching. `frontend/test/unit/`.
- [ ] **P2** `Cache-Control` on `/api/health` and `/api/version` — every probe is a cold round-trip; 30s `s-maxage` lets the CF edge serve. `worker/src/index.ts`.
- [ ] **P2** Forward `Content-Range`/`Accept-Ranges` in `proxyMedia` — large videos can't resume; only `Content-Length` is preserved today. `worker/src/proxy.ts:162-167`.
- [ ] **P2** Bump `compatibility_date` in `wrangler.toml` — `2024-11-20` is ~18 months stale; missing recent runtime features. `worker/wrangler.toml:3`.
- [ ] **P2** React 18 → 19 upgrade — rest of the stack (Vite 8, TS 6, Vitest 4) is bleeding-edge; React is the only LTS-lagged dep. `frontend/package.json`.
- [ ] **P2** Restore integration happy-path tests — `fetchMock` removed in `@cloudflare/vitest-pool-workers` v0.16 leaves resolve-success and proxy-stream untested. `worker/test/integration/api.test.ts`.
- [ ] **P2** Include `requestId` in `track.ts` events — frontend logs can't correlate with worker structured logs. `frontend/src/lib/track.ts:5`.
- [ ] **P2** Belt-and-braces: assert `request.cf` presence before trusting `cf-connecting-ip` — CF strips spoofed header at the edge so safe today, but defense-in-depth. `worker/src/rate-limit.ts:22`.

- [x] **P1** "Download all" affordance in bulk mode — shipped 2026-05-20; button appears when ≥2 successful rows, reuses 250ms stagger from single-mode handleDownloadAll.
- [x] **P1** Memoize `proxyUrl(item.url)` in `MediaCard` — shipped 2026-05-20; one `useMemo` keyed on `item.url`, both poster + video src reuse the same string.
- [x] **P1** Drop hardcoded GitHub Pages origin from `ALLOWED_ORIGINS` — shipped 2026-05-20; added `https://*.github.io` wildcard to env var (CORS already supported `*` globs in `worker/src/cors.ts`, just had to use them).
- [x] **P2** Dark / light / system theme toggle — shipped 2026-05-20 (reconciled; full impl already in `lib/theme` + `ThemeToggle`).
- [x] **P2** Bulk download from multiple URLs — shipped 2026-05-20; mode toggle on the form, sequential resolve with 500ms politeness gap, per-URL result rows.
- [x] **P2** PWA + mobile share-target — shipped 2026-05-20; web manifest with `share_target`, URL pre-fill on launch via `readShareTargetUrl()`, query-string stripped via `history.replaceState`.
