import { ResolveError } from './types';

const ALLOWED_HOSTS = [
  /\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i,
  /\.facebook\.com$/i,
  /\.instagram\.com$/i,
];

export async function proxyMedia(targetUrl: string, filename: string | null): Promise<Response> {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    throw new ResolveError('URL không hợp lệ', 'INVALID_URL');
  }

  if (url.protocol !== 'https:') {
    throw new ResolveError('Chỉ chấp nhận https://', 'INVALID_PROTOCOL');
  }

  if (!ALLOWED_HOSTS.some((re) => re.test(url.hostname))) {
    throw new ResolveError(
      `Domain ${url.hostname} không nằm trong whitelist`,
      'HOST_NOT_ALLOWED',
      403,
    );
  }

  const referer = url.hostname.includes('instagram') ? 'https://www.instagram.com/' : 'https://www.facebook.com/';

  const upstream = await fetch(targetUrl, {
    headers: {
      Referer: referer,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  });

  if (!upstream.ok || !upstream.body) {
    throw new ResolveError(`Upstream trả về ${upstream.status}`, 'UPSTREAM_ERROR', 502);
  }

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
