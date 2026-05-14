# Worker API reference

All endpoints are served by the Cloudflare Worker. The base URL is whatever you
set as `VITE_WORKER_URL` (e.g. `https://story-dl-worker.<account>.workers.dev`).

## Response headers (all endpoints)

Every response carries:

| Header                        | Value                  | Purpose                                       |
| ----------------------------- | ---------------------- | --------------------------------------------- |
| `X-Request-Id`                | UUID v4                | Correlation ID — include in bug reports.      |
| `X-Content-Type-Options`      | `nosniff`              | Block MIME sniffing.                          |
| `X-Frame-Options`             | `DENY`                 | API is not embeddable.                        |
| `Referrer-Policy`             | `no-referrer`          | Don't leak Referer to upstream CDNs.          |
| `Cross-Origin-Resource-Policy`| `cross-origin`         | Consumable from the frontend origin only.     |
| `X-Robots-Tag`                | `noindex, nofollow`    | API responses are not indexed.                |

Clients may pass an `X-Request-Id: <uuid>` header to thread their own
correlation ID through the request; non-UUID values are dropped and a fresh
UUID is generated.

## `GET /api/health`

Liveness probe. Returns `200 OK`.

```json
{
  "ok": true,
  "service": "story-dl-worker",
  "version": "0.1.0",
  "commit": "abc1234",
  "builtAt": "2026-05-13T16:39:49.716Z",
  "timestamp": "2026-05-13T16:40:10.000Z",
  "uptimeSec": 21
}
```

`commit` and `builtAt` are populated by the deploy workflow; locally they
are `null`.

## `GET /api/version`

Lightweight identity probe — same identity fields as `/api/health` without
runtime state.

```json
{
  "service": "story-dl-worker",
  "version": "0.1.0",
  "commit": "abc1234",
  "builtAt": "2026-05-13T16:39:49.716Z"
}
```

## `POST /api/resolve`

Resolves a public Instagram/Facebook/TikTok URL to a list of downloadable media items.

### Supported URL shapes

**Instagram**

- `/reel/<id>/`
- `/reels/<id>/`
- `/p/<id>/`
- `/tv/<id>/`
- `/stories/<user>/<id>/` *(best-effort — usually requires login)*

**Facebook**

- `/<page>/posts/<id>`
- `/<page>/videos/<id>`
- `/watch?v=<id>`
- `/reel/<id>`
- `fb.watch/<id>`
- `/stories/<id>` *(best-effort — usually private)*

**TikTok**

- `/@<user>/video/<id>` *(standard video URL)*
- `/@<user>/photo/<id>` *(photo slideshow)*
- `/v/<id>` *(legacy mobile-share URL — `m.tiktok.com` works too)*
- `/t/<short>` *(short link, redirects to canonical)*
- `vm.tiktok.com/<short>` *(short link, redirects to canonical)*

For TikTok video items, `mediaItems[].url` is the original page URL — the
proxy re-fetches the page on download to acquire fresh session cookies (TikTok
CDN URLs are session-bound; see `docs/limitations.md`).

### Request

```json
{ "url": "https://www.instagram.com/reel/<id>/" }
```

### Response 200

```json
{
  "platform": "instagram",
  "kind": "reel",
  "mediaItems": [
    { "type": "video", "url": "https://...mp4", "thumbnail": "https://...jpg" }
  ],
  "degraded": false
}
```

`degraded: true` means only a thumbnail could be retrieved (Instagram is
restricting video access for the anonymous request).

### Response 4xx/5xx

```json
{ "error": "...", "code": "INSTAGRAM_NO_MEDIA" }
```

### Error codes

| Code                       | Meaning                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `MISSING_URL`              | The `url` field was missing from the request body.                   |
| `BODY_TOO_LARGE`           | Request body exceeds 8 KB. HTTP 413.                                 |
| `METHOD_NOT_ALLOWED`       | Wrong HTTP method for the endpoint. HTTP 405 with `Allow` header.    |
| `INVALID_URL`              | The provided string is not a valid URL.                              |
| `INVALID_PROTOCOL`         | Only `https://` URLs are accepted.                                   |
| `UNSUPPORTED_PLATFORM`     | URL is not Instagram, Facebook, or TikTok.                           |
| `INVALID_INSTAGRAM_URL`    | Instagram URL did not match a supported shape.                       |
| `INVALID_FACEBOOK_URL`     | Facebook URL did not match a supported shape.                        |
| `INVALID_TIKTOK_URL`       | TikTok URL did not match a supported shape.                          |
| `HOST_NOT_ALLOWED`         | The proxy refused the host (whitelist below).                        |
| `INSTAGRAM_NO_MEDIA`       | Page parsed but no media found (private, deleted, structure change). |
| `INSTAGRAM_STORY_BLOCKED`  | Instagram redirected to login — anonymous access denied.             |
| `INSTAGRAM_RATE_LIMITED`   | Instagram throttled the Worker IP. Wait 1–2 min.                     |
| `INSTAGRAM_NOT_FOUND`      | Post does not exist or has been deleted.                             |
| `INSTAGRAM_FETCH_FAILED`   | Upstream returned an unexpected status.                              |
| `FACEBOOK_NO_MEDIA`        | Same as IG variant, for Facebook.                                    |
| `FACEBOOK_STORY_BLOCKED`   | Same as IG variant, for Facebook.                                    |
| `FACEBOOK_RATE_LIMITED`    | Same as IG variant, for Facebook.                                    |
| `FACEBOOK_NOT_FOUND`       | Same as IG variant, for Facebook.                                    |
| `FACEBOOK_FETCH_FAILED`    | Same as IG variant, for Facebook.                                    |
| `TIKTOK_NO_MEDIA`          | Page parsed but no media found (private, geo-blocked, structure).    |
| `TIKTOK_RATE_LIMITED`      | TikTok soft-blocked the CF Worker egress (302 to `/<region>/about`). Wait ~30s. |
| `TIKTOK_NOT_FOUND`         | Video does not exist or has been deleted.                            |
| `TIKTOK_FETCH_FAILED`      | Upstream returned an unexpected status.                              |
| `TIKTOK_GEO_BLOCKED`       | TikTok refused the request — geo-restricted or login required.       |
| `RATE_LIMITED`             | Per-IP rate limit hit (30/min on `/api/resolve`, 60/min on `/api/proxy`). HTTP 429. |
| `UPSTREAM_ERROR`           | `/api/proxy` upstream returned non-2xx (e.g. CDN 403/404/410) or body was missing. HTTP 502. |
| `UPSTREAM_TIMEOUT`          | Upstream did not respond within 8 s. HTTP 504.                       |
| `UPSTREAM_TOO_LARGE`        | Upstream body exceeds the cap (5 MB HTML / 200 MB media). HTTP 502.  |
| `INTERNAL`                 | Unhandled exception — check Worker logs.                             |

## `GET /api/proxy?url=<encoded>&filename=<optional>`

Streams media from the IG/FB CDN to the browser with `Content-Disposition:
attachment` so the browser writes a file to disk instead of opening it.

### Host whitelist

Only these hosts are accepted:

- `*.cdninstagram.com`
- `*.fbcdn.net`
- `*.facebook.com`
- `*.instagram.com`
- `*.tiktokcdn.com`, `*.tiktokcdn-us.com`, `*.tiktokcdn-eu.com`
- `*.tiktok.com` *(includes `www.tiktok.com`, `m.tiktok.com`, `vm.tiktok.com` — used by the TikTok page-as-proxy flow)*

Any other host returns `400 HOST_NOT_ALLOWED`. This prevents the Worker from
being abused as an open proxy.

The whitelist is checked **twice** per proxy request: once on the URL the
client supplied, and once on the FINAL URL after `redirect: 'follow'`. Without
the second check, a 30x from a whitelisted host could land us on an arbitrary
origin.

### Limits

- **Body size cap.** `/api/proxy` aborts mid-stream past 200 MB. `/api/resolve`
  refuses HTML bodies past 5 MB.
- **Fetch timeout.** All upstream fetches abort after 8 s
  (`UPSTREAM_TIMEOUT`).
- **Rate limit.** Per IP, per route, sliding 60 s window. Best-effort and
  per-isolate on free tier — not a hard guarantee.

### TikTok proxy flow (page-as-proxy)

For TikTok video downloads the proxy receives the original page URL (not a
CDN URL). It then:

1. Fetches the page with a browser User-Agent and follows redirects.
2. Captures session cookies (`ttwid`, `tt_chain_token`, `msToken`, etc.) from
   the response.
3. Extracts the `playAddr` from the embedded `__UNIVERSAL_DATA_FOR_REHYDRATION__`
   JSON blob.
4. Fetches the `playAddr` with the captured cookies + `Referer:
   https://www.tiktok.com/`.
5. Streams the resulting `video/mp4` body to the client.

This adds one HTTP request per TikTok download compared to the IG/FB flow but
is necessary because TikTok CDN URLs are session-signed.
