# Known limitations

## Stories almost never work

Both Instagram and Facebook Stories are gated behind an authenticated session.
Anonymous datacenter-IP requests from a Cloudflare Worker get redirected to
login or hit rate limits. Stories are kept as a best-effort attempt but most
will fail with `INSTAGRAM_STORY_BLOCKED` / `FACEBOOK_STORY_BLOCKED`.

## Private and friends-only content cannot be downloaded

This tool only sees what an anonymous browser sees — i.e. Open Graph meta tags
on public posts. Private accounts, friends-only Facebook posts, and private
groups are invisible to it.

## Cloudflare IPs are heavily rate-limited

Meta flags Cloudflare Worker IP ranges aggressively. Even legitimate public
content can return rate-limit errors during peak hours. If you see
`*_RATE_LIMITED`, wait 1–2 minutes and retry.

## TikTok-specific limitations

- **Always watermarked.** Downloaded videos include the TikTok watermark.
  Clean (no-watermark) downloads need a device-signed token that is not
  available from a stateless Cloudflare Worker.
- **Session-bound CDN URLs.** TikTok signs `playAddr` with cookies set during
  the original page fetch — the Worker can't hand the URL back to the browser
  to download directly. The proxy fetches the page itself and forwards
  cookies (one extra HTTP hop per download, see `docs/api.md`).
- **CF egress soft-blocks.** When TikTok rate-limits a Cloudflare Worker
  egress IP, it transparently 302's every video URL to a regional landing
  page (`/<region>/about`). Detected as `TIKTOK_RATE_LIMITED` so users can
  retry. Recovery is non-deterministic; usually clears in 30–60s or when CF
  routes through a different colo.
- **Geo-restricted videos** (region-locked uploads) cannot be fetched
  anonymously. Surfaced as `TIKTOK_GEO_BLOCKED`.
- **Photo slideshows** return individual image URLs in `mediaItems[]`. The
  user downloads each one separately — there is no zip flow.

## Expired content returns 404

Stories expire after 24 hours; deleted posts return 404. The Worker surfaces
these as `*_NOT_FOUND` / `*_STORY_EXPIRED`.

## The parser breaks when Meta ships HTML changes

Instagram and Facebook change their HTML structure and endpoints frequently.
When the parser starts failing across the board, the fix lives in
[`worker/src/platforms/`](../worker/src/platforms). Open an issue with the URL
that broke and the error code so it can be reproduced.

## Facebook multi-image posts only return the cover image

For posts with multiple images (carousels), only the first/cover image is
returned. The anonymous HTML Facebook serves to a non-logged-in client (the
shape this worker scrapes) carries exactly one `og:image` meta tag; the rest
of the carousel only renders after Facebook's React app boots in the
browser. Extracting the full carousel would require running a headless
browser, which is out of scope for a Cloudflare Worker.

## Facebook serves probabilistic stub pages

Anonymous, Worker-IP fetches against Facebook see a stub OG-only page
roughly 40% of the time and a `FACEBOOK_NO_MEDIA` 422 the rest. This is
Facebook's anti-bot system rotating between full and stub HTML based on IP
reputation / rate. To mitigate, the worker caches the *first* successful
resolve per URL in `caches.default` for an hour — so once any caller wins
the FB lottery for a given URL, every subsequent request hits the cache and
returns immediately. Cold-URL behaviour remains a coin flip; retry usually
works.

## What the proxy will *not* do

`/api/proxy` is restricted to `*.cdninstagram.com`, `*.fbcdn.net`,
`*.facebook.com`, `*.instagram.com`, `*.tiktokcdn{,-us,-eu}.com`, `*.tiktok.com`.
It is not an open proxy and will not fetch arbitrary URLs.

## Quality

Media is served back at whatever quality the public Open Graph meta tag points
to — typically the same resolution Instagram/Facebook serves to logged-out
viewers. Higher-bitrate variants that require auth are not accessible.
