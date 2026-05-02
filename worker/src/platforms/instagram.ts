import { ResolveError, type ResolveResult, type MediaItem, type ContentKind } from '../types';

const HEADERS_BROWSER: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export function detectInstagramKind(url: URL): ContentKind | null {
  const p = url.pathname;
  if (/^\/reel(?:s)?\/[^/]+/i.test(p)) return 'reel';
  if (/^\/p\/[^/]+/i.test(p)) return 'post';
  if (/^\/tv\/[^/]+/i.test(p)) return 'video';
  if (/^\/stories\/[^/]+\/\d+/i.test(p)) return 'story';
  return null;
}

export async function resolveInstagram(rawUrl: string): Promise<ResolveResult> {
  const url = new URL(rawUrl);
  const kind = detectInstagramKind(url);
  if (!kind) {
    throw new ResolveError(
      'URL Instagram không hợp lệ. Hỗ trợ Reel (/reel/<id>), Post (/p/<id>), IGTV (/tv/<id>), Story (/stories/<user>/<id>).',
      'INVALID_INSTAGRAM_URL',
    );
  }

  const html = await fetchHtml(rawUrl, kind);
  const items = extractFromHtml(html);

  if (items.length === 0) {
    throw new ResolveError(
      kind === 'story'
        ? 'Không trích xuất được media. Story Instagram yêu cầu đăng nhập với hầu hết account — chỉ một số ít story public mới tải được anonymous.'
        : 'Không trích xuất được media. Bài có thể là riêng tư hoặc cấu trúc trang đã thay đổi.',
      kind === 'story' ? 'INSTAGRAM_STORY_BLOCKED' : 'INSTAGRAM_NO_MEDIA',
      404,
    );
  }

  return { platform: 'instagram', kind, mediaItems: items };
}

async function fetchHtml(url: string, kind: ContentKind): Promise<string> {
  const res = await fetch(url, { headers: HEADERS_BROWSER, redirect: 'follow' });
  if (!res.ok) {
    if (res.status === 429) {
      throw new ResolveError(
        'Instagram tạm chặn (rate limit). Đợi 1-2 phút rồi thử lại, hoặc dùng URL khác.',
        'INSTAGRAM_RATE_LIMITED',
        429,
      );
    }
    if (res.status === 404) {
      throw new ResolveError(
        kind === 'story'
          ? 'Story không tồn tại hoặc đã hết hạn 24h.'
          : 'Bài không tồn tại hoặc đã bị xoá.',
        'INSTAGRAM_NOT_FOUND',
        404,
      );
    }
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
