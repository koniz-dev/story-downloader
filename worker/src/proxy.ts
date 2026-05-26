import { ResolveError } from './types';
import {
  TIKTOK_BROWSER_UA,
  extractPlayAddr,
  fetchTikTokPageCached,
  isTikTokPageUrl,
  parseTikTokItemStruct,
} from './platforms/tiktok';
import {
  FETCH_TIMEOUT_MS,
  MAX_PROXY_BYTES,
  assertFinalHostAllowed,
  boundedStream,
  isHostAllowed,
} from './util/fetch';

const ALLOWED_HOSTS = [
  /\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i,
  /\.facebook\.com$/i,
  /\.instagram\.com$/i,
  /\.tiktokcdn\.com$/i,
  /\.tiktokcdn-us\.com$/i,
  /\.tiktokcdn-eu\.com$/i,
  /\.tiktok\.com$/i,
] as const;

export async function proxyMedia(
  targetUrl: string,
  filename: string | null,
  inboundRequest?: Request,
): Promise<Response> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    throw new ResolveError('Invalid URL', 'INVALID_URL');
  }

  if (url.protocol !== 'https:') {
    throw new ResolveError('Only https:// is accepted', 'INVALID_PROTOCOL');
  }

  if (!isHostAllowed(url.hostname, ALLOWED_HOSTS)) {
    throw new ResolveError(
      `Domain ${url.hostname} is not in the whitelist`,
      'HOST_NOT_ALLOWED',
      403,
      { host: url.hostname },
    );
  }

  if (isTikTokPageUrl(url)) {
    return await proxyTikTokVideo(targetUrl, filename, inboundRequest);
  }

  const referer = url.hostname.includes('instagram')
    ? 'https://www.instagram.com/'
    : url.hostname.includes('tiktok')
      ? 'https://www.tiktok.com/'
      : 'https://www.facebook.com/';

  const upstreamHeaders: Record<string, string> = {
    Referer: referer,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };
  // Forward Range so the browser can resume large-video downloads. Without
  // this the CDN always returns 200 with the full body and the client has
  // to restart from byte 0 on any network blip.
  const inboundRange = inboundRequest?.headers.get('Range');
  if (inboundRange) upstreamHeaders.Range = inboundRange;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw upstreamFetchError(e);
  }

  // Re-validate the FINAL host after redirect — initial host check is not
  // sufficient because a 30x can land us on an unrelated origin and we'd
  // happily proxy that as if it were CDN content.
  assertFinalHostAllowed(upstream, ALLOWED_HOSTS);

  if (!upstream.ok || !upstream.body) {
    throw new ResolveError(
      `Upstream returned ${upstream.status}`,
      'UPSTREAM_ERROR',
      502,
      { status: upstream.status },
    );
  }

  rejectIfTooLarge(upstream);
  return streamingResponse(upstream, filename);
}

// TikTok video CDN URLs are session-bound: the playAddr signature is tied to
// the cookies set by the page that produced it. We re-fetch the page here so
// the playAddr we extract and the cookies we forward come from the same fetch.
async function proxyTikTokVideo(
  pageUrl: string,
  filename: string | null,
  inboundRequest?: Request,
): Promise<Response> {
  const callerIp = inboundRequest?.headers.get('cf-connecting-ip') ?? null;
  const { html, cookies } = await fetchTikTokPageCached(pageUrl, callerIp);
  const itemStruct = parseTikTokItemStruct(html);
  const playAddr = itemStruct ? extractPlayAddr(itemStruct) : null;
  if (!playAddr) {
    throw new ResolveError(
      'Could not extract video URL from TikTok page.',
      'TIKTOK_NO_MEDIA',
      404,
    );
  }

  // Validate the extracted playAddr BEFORE fetching it. The post-fetch
  // `assertFinalHostAllowed` check below only stops us serving attacker
  // content back to the client — by the time it fires we've already opened a
  // TLS connection to the attacker and shipped the TikTok session cookies
  // (msToken / tt_chain_token) in the request headers. Pre-fetch validation
  // is the only place we can prevent cookie exfiltration if a doctored
  // itemStruct ever names an off-CDN URL.
  let playAddrUrl: URL;
  try {
    playAddrUrl = new URL(playAddr);
  } catch {
    throw new ResolveError('TikTok returned an unparseable playAddr', 'TIKTOK_NO_MEDIA', 502);
  }
  if (playAddrUrl.protocol !== 'https:' || !isHostAllowed(playAddrUrl.hostname, ALLOWED_HOSTS)) {
    throw new ResolveError(
      `TikTok playAddr host ${playAddrUrl.hostname} is not in the whitelist`,
      'HOST_NOT_ALLOWED',
      403,
      { host: playAddrUrl.hostname },
    );
  }

  const upstreamHeaders: Record<string, string> = {
    'User-Agent': TIKTOK_BROWSER_UA,
    Referer: 'https://www.tiktok.com/',
    ...(cookies ? { Cookie: cookies } : {}),
  };
  const inboundRange = inboundRequest?.headers.get('Range');
  if (inboundRange) upstreamHeaders.Range = inboundRange;

  let upstream: Response;
  try {
    upstream = await fetch(playAddr, {
      headers: upstreamHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw upstreamFetchError(e, 'TIKTOK_FETCH_FAILED');
  }

  // Defence-in-depth: if TikTok ever 30x'd us off-CDN, refuse to proxy.
  assertFinalHostAllowed(upstream, ALLOWED_HOSTS);

  if (!upstream.ok || !upstream.body) {
    throw new ResolveError(
      `TikTok CDN returned ${upstream.status}`,
      'UPSTREAM_ERROR',
      502,
      { status: upstream.status },
    );
  }

  // Catches TikTok captcha/interstitial pages that come back with text/html
  // when we expected an mp4. Without this we'd happily stream HTML as a fake
  // video file.
  const ct = upstream.headers.get('Content-Type') ?? '';
  if (!ct.startsWith('video/') && !ct.startsWith('image/')) {
    throw new ResolveError(
      'TikTok CDN returned an unexpected response. The video may be geo-restricted or require login.',
      'TIKTOK_GEO_BLOCKED',
      403,
    );
  }

  rejectIfTooLarge(upstream);
  return streamingResponse(upstream, filename);
}

function rejectIfTooLarge(upstream: Response): void {
  const lenHeader = upstream.headers.get('Content-Length');
  if (lenHeader && Number(lenHeader) > MAX_PROXY_BYTES) {
    throw new ResolveError(
      `Upstream body exceeds ${MAX_PROXY_BYTES} bytes`,
      'UPSTREAM_TOO_LARGE',
      502,
      { limit: MAX_PROXY_BYTES, length: Number(lenHeader) },
    );
  }
}

function streamingResponse(upstream: Response, filename: string | null): Response {
  const headers = new Headers();
  const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream';
  const contentLength = upstream.headers.get('Content-Length');
  headers.set('Content-Type', contentType);
  if (contentLength) headers.set('Content-Length', contentLength);
  headers.set('Cache-Control', 'private, max-age=0, no-store');

  // Range-resume support: forward the upstream's range metadata so the
  // browser can pick up where it left off on a dropped large-video download.
  // Accept-Ranges advertises capability even on 200 responses; Content-Range
  // and the 206 status only appear when upstream honored a Range request.
  const acceptRanges = upstream.headers.get('Accept-Ranges');
  if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
  const contentRange = upstream.headers.get('Content-Range');
  if (contentRange) headers.set('Content-Range', contentRange);

  const safeName = sanitizeFilename(filename) ?? defaultFilename(contentType);
  headers.set('Content-Disposition', `attachment; filename="${safeName}"`);

  // upstream.body is non-null here — checked by callers.
  const body = boundedStream(upstream.body!, MAX_PROXY_BYTES);
  const status = upstream.status === 206 ? 206 : 200;
  return new Response(body, { status, headers });
}

function upstreamFetchError(e: unknown, code: string = 'UPSTREAM_ERROR'): ResolveError {
  if (e instanceof ResolveError) return e;
  const isAbort = e instanceof DOMException && e.name === 'TimeoutError';
  return new ResolveError(
    isAbort ? 'Upstream timed out' : 'Upstream fetch failed',
    isAbort ? 'UPSTREAM_TIMEOUT' : code,
    504,
  );
}

export function sanitizeFilename(name: string | null): string | null {
  if (!name) return null;
  // Strip CR/LF (header injection), quote/backslash (breaks the surrounding
  // quoted-string), and `;` (Content-Disposition parameter injection).
  const cleaned = name.replace(/[\r\n"\\;]/g, '').slice(0, 120);
  return cleaned.length > 0 ? cleaned : null;
}

function defaultFilename(contentType: string): string {
  const ext = contentType.includes('mp4')
    ? 'mp4'
    : contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpg';
  return `story-${Date.now()}.${ext}`;
}
