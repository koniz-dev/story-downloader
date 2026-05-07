# Worker API reference

All endpoints are served by the Cloudflare Worker. The base URL is whatever you
set as `VITE_WORKER_URL` (e.g. `https://story-dl-worker.<account>.workers.dev`).

## `GET /api/health`

Liveness probe. Returns `200 OK`.

```json
{ "ok": true }
```

## `POST /api/resolve`

Resolves a public Instagram/Facebook URL to a list of downloadable media items.

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
| `INVALID_URL`              | The provided string is not a valid URL.                              |
| `INVALID_PROTOCOL`         | Only `https://` URLs are accepted.                                   |
| `UNSUPPORTED_PLATFORM`     | URL is not Instagram or Facebook.                                    |
| `INVALID_INSTAGRAM_URL`    | Instagram URL did not match a supported shape.                       |
| `INVALID_FACEBOOK_URL`     | Facebook URL did not match a supported shape.                        |
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
| `INTERNAL`                 | Unhandled exception — check Worker logs.                             |

## `GET /api/proxy?url=<encoded>&filename=<optional>`

Streams media from the IG/FB CDN to the browser with `Content-Disposition:
attachment` so the browser writes a file to disk instead of opening it.

### Host whitelist

Only these CDN hosts are accepted:

- `*.cdninstagram.com`
- `*.fbcdn.net`
- `*.facebook.com`
- `*.instagram.com`

Any other host returns `400 HOST_NOT_ALLOWED`. This prevents the Worker from
being abused as an open proxy.
