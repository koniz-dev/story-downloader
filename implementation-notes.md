# Security Audit — Implementation Notes

Running journal of decisions, deviations, and tradeoffs while auditing
this codebase for security issues and implementing fixes.

**Scope:** Whole-codebase audit, not just current-branch changes.

**Started:** 2026-05-20.

---

## Method

OWASP-style checklist applied to a Cloudflare Worker + Vite/React frontend:

1. SSRF surface (`/api/proxy`).
2. Input validation (all endpoints, all params).
3. Output / response headers (CSP, CORS, security headers).
4. Rate limiting (bypass / abuse).
5. Information disclosure (error responses, logs).
6. Secrets (hardcoded keys, tokens, accidental commits).
7. Dependencies (`npm audit` on both packages).
8. Header injection (CRLF, content-disposition, etc.).
9. DoS vectors (body size, slow-loris, regex catastrophic backtracking).
10. Open redirects.
11. PII in logs / telemetry.

Each finding is rated **P0 / P1 / P2** by realistic exploitability and impact, not theoretical worst-case.

---

## Findings

### P0 — block release

_None found._ Codebase has been actively hardened across the last few sessions and the bugs that would warrant a P0 (the TikTok cookie leak, the CORS wildcard, the request.cf gate that collapsed buckets) were already fixed in earlier commits visible in `git log`.

### P1 — needs a fix before next deploy

**P1-1: Internal `Error.message` leaks in non-`ResolveError` 500 responses.**

`worker/src/index.ts:226`:

```ts
const message = isResolveErr ? e.message : e instanceof Error ? e.message : 'Internal error';
```

For any uncaught runtime error (a `TypeError` from a code path we don't recognise, an unexpected `RangeError`, a Cache API surprise), the **raw `Error.message`** is serialised into the response body. That can disclose code structure ("Cannot read properties of undefined (reading 'foo')"), filesystem paths in stack-trace-flavoured messages, or runtime internals to anyone hitting the endpoint.

`ResolveError` instances are explicitly authored, so their messages are safe to forward. Everything else should be redacted.

**Fix:** for `!isResolveErr`, return a generic `"Internal error"` and keep the detailed message in the log only. Status stays 500, code stays `INTERNAL`, requestId still lets a user reference the failure when reporting.

### P2 — worth fixing, not urgent

**P2-1: `request.error` logs the full inbound URL.**

`worker/src/index.ts:251-256`:

```ts
logEvent('request.error', {
  requestId,
  url: request.url,
  ...
});
```

For `/api/proxy?url=<full-CDN-URL>` the query string is the user's content reference. CDN URLs include signed `oh=`/`oe=` tokens, but more importantly they identify *which* media a caller was downloading. Worker logs are admin-only (CF dashboard), so impact is low, but if logs are ever exported to a SIEM / shared with a third party, that's a leak.

**Fix:** log `path + method` and (for `/api/proxy`) the safely-extracted host, not the full URL with query.

**P2-2: `proxy` event log already does the right thing.**

`worker/src/index.ts:116-119` only logs `host: safeHost(target)`. Reuse that pattern in the error log path.

### Clean — verified during audit

- **Secrets in repo:** `git ls-files | grep .env` only matches `frontend/.env.example` (template, no values). `.gitignore` covers `.env`, `.env.local`, `.env.*.local`, `.dev.vars`. No hardcoded API keys or bearer tokens in source.
- **Dependencies (production):** `npm audit --omit=dev` → 0 vulnerabilities on both `worker/` and `frontend/`.
- **Dependencies (dev-only):** worker has 4 moderate severity advisories (ws → miniflare → wrangler → @cloudflare/vitest-pool-workers). All are dev-only test infrastructure; production Workers runtime doesn't ship `ws`. Documented but not fixed because `npm audit fix --force` would downgrade pool-workers to 0.6.x and break test isolation.
- **SSRF protection in `/api/proxy`:** host allowlist (regex on `\.cdninstagram\.com$` etc with `/i` flag), https-only, `assertFinalHostAllowed` re-runs after redirect on `upstream.url`. Trailing-dot hostnames fail the regex (no bypass), IPs / punycode / wrong-port domains all rejected.
- **Input validation per endpoint:** `/api/resolve` checks body shape + platform detect; `/api/proxy` checks URL parse + protocol + host; `/api/track` checks event-prefix allowlist; `/api/health`/`/api/version` take no input.
- **Body size caps:** HTML 5 MB (`MAX_HTML_BYTES`), proxy 200 MB (`MAX_PROXY_BYTES`), `/api/resolve` body 8 KB, `/api/track` body 2 KB.
- **Stream caps:** `boundedStream` errors mid-stream when the cumulative byte count exceeds `max`.
- **Security headers:** nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, CORP cross-origin, X-Robots-Tag noindex — applied to every response including errors and preflights.
- **CSP:** delivered via `<meta>` in built HTML; `default-src 'self'`, no `'unsafe-eval'`, no `*` for script-src; worker origin read from `VITE_WORKER_URL` env at build (recent fork-friendliness fix).
- **CORS:** explicit `Access-Control-Allow-Origin` list, no `Access-Control-Allow-Credentials` (intentional — endpoints are anonymous), `Vary: Origin` set, wildcard support gated to admin-controlled env var.
- **Rate limiting:** per-IP, per-route, sliding-minute, backed by `caches.default`. Documented TOCTOU race (Cache API has no compare-and-swap; can leak ~10× under concurrent burst from one IP — acceptable best-effort guard).
- **Request ID:** client-supplied `X-Request-Id` only echoed if it matches a strict UUID regex; otherwise generated server-side. No arbitrary string echo.
- **Header injection on `Content-Disposition`:** `sanitizeFilename` strips `\r\n"\\;` and caps at 120 chars before quoting. Tested with 7 cases in `proxy.test.ts`.
- **Regex ReDoS surface:** all dynamically-constructed regexes (`matchMeta`, `cors.ts`) take admin-controlled patterns through `escapeRe`, never user-controlled regex bodies. User-input regex tests are linear (`detectPlatform`, `detectKind`, etc.).
- **Frontend XSS:** no `innerHTML`, no `dangerouslySetInnerHTML`, no `eval`, no `new Function`. React handles escaping. CSP forbids unsafe-eval and inline scripts (with a single bootstrap allowance for `theme-init.js` which is same-origin static).
- **Open redirect:** i18n `setLocale` uses a typed `Locale` enum, not user-controlled string, for navigation. `share-target.ts` validates URL protocol is `http:` or `https:` before accepting.
- **TikTok cookie cache:** per-IP scoped after a recent P0 review (cache key now includes `cf-connecting-ip`; cache disabled when header missing).
- **Logging PII:** `cf-connecting-ip` is used for rate limiting and cache scoping but never logged. `logEvent('proxy', ...)` only logs `host`, not full URL. `logEvent('resolve.ok'/'.fail', ...)` only logs platform/kind/code/ms.

---

## Decisions made outside the spec

1. **Audited the whole codebase, not just the current branch.** The user asked to "implement Audit Security" without scoping; given the project is small (~30 source files), full-codebase was tractable and more useful than current-branch-only.

2. **Treated the dev-only `ws` advisory chain as informational only.** `npm audit fix --force` would downgrade `@cloudflare/vitest-pool-workers` to 0.6.x — back across the v0.16 → v0.15 boundary that just got us merge conflicts in dependabot PR #16 yesterday. The vulnerability is in WebSocket frame parsing that workerd doesn't ship in production. Documented under "Clean", not implemented.

3. **Did NOT spawn a separate review agent** for this audit. The previous session already spawned an "independent review" agent that found two real bugs (TikTok cookie leak, CSP/VITE_WORKER_URL fork issue) and we triaged + fixed both. Re-running the same agent now would mostly produce a delta against changes that have been merged; better value to do the OWASP checklist directly and document deviations in this file.

4. **Closed-form regex for SSRF check rather than DNS pinning.** Could resolve the hostname and check the IP isn't in RFC 1918 / link-local space (defence-in-depth against DNS rebinding). Decided **not** to add — the hostname-pattern allowlist forbids any host not under Meta/ByteDance control; even a DNS rebinding attack would have to land on a `.cdninstagram.com` etc. record, which the attacker can't influence. The added DNS round trip would slow every proxy call for a defence with no realistic attacker.

---

## Tradeoffs

1. **Error message redaction vs debug ergonomics (P1-1 fix).** Could expose detailed errors to the developer console while still hiding them from the response body — e.g. via a `WORKER_DEBUG_MODE` env var that bypasses redaction. Decided to keep it simple: redact in response, full message stays in the worker log (`request.error` already captures it). Debugging happens via `wrangler tail` + the request ID, which is enough.

2. **Request URL redaction (P2-1 fix).** Could redact only the `url=` query param, keep the path. Or could log a hash of the URL for de-duplication while not exposing the URL itself. Picked the minimum: log `path + method + host (if proxy)`, drop the query entirely. Less data in logs = strictly less leak surface; we don't currently grep logs by URL anyway.

3. **Not refactoring `errorResponse` to use a structured `safeMessage` function.** Could centralise "is this message safe to expose?" logic in a helper. For now the `isResolveErr` branch is a one-liner inside `errorResponse`; not worth a helper. If a third source of safe messages appears, revisit.

---

## Things you should know

1. **Production worker has 0 vulnerable dependencies.** All `npm audit` noise is dev tooling. Don't run `npm audit fix --force` — it'll downgrade pool-workers and break the test suite for marginal "fixes" to an unshipped attack surface.

2. **The new error-message redaction silences a useful debug signal in the response.** When an uncaught error happens, the user now sees `{"error":"Internal error","code":"INTERNAL","requestId":"..."}` with no hint. To debug: `wrangler tail` and grep for the request ID; the full message + stack land in the worker log via `logEvent('request.error', …)`. The CLAUDE.md convention (full-suite test before push) already catches most uncaught errors before deploy, so this should rarely matter.

3. **Logging dropped the `url` field entirely**, not just redacted the query. If you ever wanted to grep logs by inbound path (`/api/proxy` vs `/api/resolve`), use the `method` and `code` fields plus the structured tags emitted by `logEvent('proxy', …)` / `logEvent('resolve.fail', …)` which fire BEFORE the error reaches the top-level catch. The `request.error` log is for crashes the per-route handlers didn't catch — rare, and the request ID is enough to find the matching upstream record.

4. **The audit didn't find anything alarming.** Most of the security work was already done across the last few sessions (CORS, rate limiting, SSRF guards, body caps, security headers, sanitisation, request-ID validation, dependency hygiene, telemetry input validation). The two real findings are housekeeping rather than emergencies. If you skip them, the system is still safe; if you take them, you close two small info-disclosure surfaces that a SIEM would flag eventually.
