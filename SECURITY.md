# Security Policy

This is a personal open-source project. Best-effort response only — no SLA.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Use **GitHub's private vulnerability reporting** for this repository:

1. Go to the [Security tab](https://github.com/koniz-dev/story-downloader/security).
2. Click **Report a vulnerability**.

Include the URL or request that triggered the issue, the error code shown in
the UI (if any), and a brief impact description. Proof-of-concept code is
welcome but please do not run it against accounts or content you do not own.

## In scope

- The Cloudflare Worker (`worker/`) — SSRF, header injection, request
  smuggling, host-allowlist bypass, rate-limit bypass, log/response injection.
- The frontend (`frontend/`) — XSS, CSP gaps, secret leakage in the bundle.
- CI/CD (`.github/workflows/`) — privileged token exposure, supply-chain
  vectors.

## Out of scope

- Issues that require Meta / TikTok auth to reproduce (this tool only operates
  on anonymous public content).
- Rate-limit bypass via residential proxies (no realistic mitigation on free
  tier; documented limitation).
- Denial of service via legitimate-looking traffic against the free tier
  quota — the worker is best-effort and may be throttled or paused by
  Cloudflare upstream of any fix.
- Issues in third-party services (Cloudflare Workers, GitHub Pages, Meta
  endpoints, TikTok endpoints) — please report those to the respective
  vendor.

## What to expect

Acknowledgement within ~7 days. Fix timing depends on severity and
maintainer availability. Coordinated disclosure preferred for non-trivial
findings; please allow at least 30 days before publishing details.
