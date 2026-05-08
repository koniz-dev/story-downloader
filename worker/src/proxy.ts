import { ResolveError } from './types';
import {
  TIKTOK_BROWSER_UA,
  extractPlayAddr,
  fetchTikTokPage,
  isTikTokPageUrl,
  parseTikTokItemStruct,
} from './platforms/tiktok';

const ALLOWED_HOSTS = [
  /\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i,
  /\.facebook\.com$/i,
  /\.instagram\.com$/i,
  /\.tiktokcdn\.com$/i,
  /\.tiktokcdn-us\.com$/i,
  /\.tiktokcdn-eu\.com$/i,
  /\.tiktok\.com$/i,
];

export async function proxyMedia(targetUrl: string, filename: string | null): Promise<Response> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    throw new ResolveError('Invalid URL', 'INVALID_URL');
  }

  if (url.protocol !== 'https:') {
    throw new ResolveError('Only https:// is accepted', 'INVALID_PROTOCOL');
  }

  if (!ALLOWED_HOSTS.some((re) => re.test(url.hostname))) {
    throw new ResolveError(
      `Domain ${url.hostname} is not in the whitelist`,
      'HOST_NOT_ALLOWED',
      403,
      { host: url.hostname },
    );
  }

  if (isTikTokPageUrl(url)) {
    return await proxyTikTokVideo(targetUrl, filename);
  }

  const referer = url.hostname.includes('instagram')
    ? 'https://www.instagram.com/'
    : url.hostname.includes('tiktok')
      ? 'https://www.tiktok.com/'
      : 'https://www.facebook.com/';

  const upstream = await fetch(targetUrl, {
    headers: {
      Referer: referer,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  });

  if (!upstream.ok || !upstream.body) {
    throw new ResolveError(
      `Upstream returned ${upstream.status}`,
      'UPSTREAM_ERROR',
      502,
      { status: upstream.status },
    );
  }

  return streamingResponse(upstream, filename);
}

// TikTok video CDN URLs are session-bound: the playAddr signature is tied to
// the cookies set by the page that produced it. We re-fetch the page here so
// the playAddr we extract and the cookies we forward come from the same fetch.
async function proxyTikTokVideo(pageUrl: string, filename: string | null): Promise<Response> {
  const { html, cookies } = await fetchTikTokPage(pageUrl);
  const itemStruct = parseTikTokItemStruct(html);
  const playAddr = itemStruct ? extractPlayAddr(itemStruct) : null;
  if (!playAddr) {
    throw new ResolveError(
      'Could not extract video URL from TikTok page.',
      'TIKTOK_NO_MEDIA',
      404,
    );
  }

  const upstream = await fetch(playAddr, {
    headers: {
      'User-Agent': TIKTOK_BROWSER_UA,
      Referer: 'https://www.tiktok.com/',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    redirect: 'follow',
  });

  if (!upstream.ok || !upstream.body) {
    throw new ResolveError(
      `TikTok CDN returned ${upstream.status}`,
      'UPSTREAM_ERROR',
      502,
      { status: upstream.status },
    );
  }

  // If TikTok served a captcha / interstitial instead of the real video,
  // upstream's content-type will be text/html. Catch that explicitly so we
  // don't stream HTML to the user as a fake .mp4.
  const ct = upstream.headers.get('Content-Type') ?? '';
  if (!ct.startsWith('video/') && !ct.startsWith('image/')) {
    throw new ResolveError(
      'TikTok CDN returned an unexpected response. The video may be geo-restricted or require login.',
      'TIKTOK_GEO_BLOCKED',
      403,
    );
  }

  return streamingResponse(upstream, filename);
}

function streamingResponse(upstream: Response, filename: string | null): Response {
  const headers = new Headers();
  const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream';
  const contentLength = upstream.headers.get('Content-Length');
  headers.set('Content-Type', contentType);
  if (contentLength) headers.set('Content-Length', contentLength);
  headers.set('Cache-Control', 'private, max-age=0, no-store');

  const safeName = sanitizeFilename(filename) ?? defaultFilename(contentType);
  headers.set('Content-Disposition', `attachment; filename="${safeName}"`);

  return new Response(upstream.body, { status: 200, headers });
}

function sanitizeFilename(name: string | null): string | null {
  if (!name) return null;
  const cleaned = name.replace(/[\r\n"\\]/g, '').slice(0, 120);
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
