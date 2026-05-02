import { ResolveError, type ResolveResult, type MediaItem } from '../types';

const STORY_PATH_RE = /\/stories\/([^/]+)\/(\d+)/i;

const HEADERS_BROWSER: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function resolveInstagram(rawUrl: string): Promise<ResolveResult> {
  const url = new URL(rawUrl);
  const match = url.pathname.match(STORY_PATH_RE);
  if (!match) {
    throw new ResolveError(
      'URL không phải Instagram story hợp lệ. Định dạng: https://www.instagram.com/stories/<user>/<id>/',
      'INVALID_INSTAGRAM_URL',
    );
  }

  const html = await fetchHtml(rawUrl);
  const items = extractFromHtml(html);

  if (items.length === 0) {
    throw new ResolveError(
      'Không tìm thấy media. Story có thể là riêng tư, đã hết hạn (24h), hoặc Instagram chặn anonymous access. Hỗ trợ private story sẽ được thêm sau.',
      'INSTAGRAM_NO_MEDIA',
      404,
    );
  }

  return { platform: 'instagram', mediaItems: items };
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS_BROWSER, redirect: 'follow' });
  if (!res.ok) {
    throw new ResolveError(`Instagram trả về ${res.status}`, 'INSTAGRAM_FETCH_FAILED', 502);
  }
  return await res.text();
}

function extractFromHtml(html: string): MediaItem[] {
  const items: MediaItem[] = [];

  const videoUrl = matchMeta(html, 'og:video') ?? matchMeta(html, 'og:video:secure_url');
  const imageUrl = matchMeta(html, 'og:image');

  if (videoUrl) {
    items.push({
      type: 'video',
      url: decodeHtml(videoUrl),
      thumbnail: imageUrl ? decodeHtml(imageUrl) : undefined,
    });
  } else if (imageUrl) {
    items.push({ type: 'image', url: decodeHtml(imageUrl) });
  }

  return items;
}

function matchMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+property=["']${escapeRe(property)}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re);
  return m?.[1] ?? null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
