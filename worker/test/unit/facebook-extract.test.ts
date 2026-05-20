import { describe, it, expect } from 'vitest';
import { extractFromHtml, unescapeJson } from '../../src/platforms/facebook';

describe('extractFromHtml (facebook)', () => {
  it('og:video meta → single video item with og:image as thumbnail', () => {
    const html = `
      <html><head>
        <meta property="og:video" content="https://video.example.com/v.mp4" />
        <meta property="og:image" content="https://image.example.com/thumb.jpg" />
      </head></html>
    `;
    expect(extractFromHtml(html)).toEqual([
      {
        type: 'video',
        url: 'https://video.example.com/v.mp4',
        thumbnail: 'https://image.example.com/thumb.jpg',
      },
    ]);
  });

  it('og:video:secure_url is honored when og:video is absent', () => {
    const html = `
      <meta property="og:video:secure_url" content="https://secure.example.com/v.mp4" />
      <meta property="og:image" content="https://image.example.com/thumb.jpg" />
    `;
    expect(extractFromHtml(html)).toEqual([
      {
        type: 'video',
        url: 'https://secure.example.com/v.mp4',
        thumbnail: 'https://image.example.com/thumb.jpg',
      },
    ]);
  });

  it('only og:image → returns single image item', () => {
    const html = `<meta property="og:image" content="https://image.example.com/p.jpg" />`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'image', url: 'https://image.example.com/p.jpg' },
    ]);
  });

  it('inline playable_url_quality_hd → video item with unescaped URL (slash + amp)', () => {
    // Real Meta payloads ship `\/` for slashes and `&` for ampersands.
    const html = String.raw`<script>{"playable_url_quality_hd":"https:\/\/video.example.com\/hd.mp4?token=a&sig=b"}</script>`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'video', url: 'https://video.example.com/hd.mp4?token=a&sig=b' },
    ]);
  });

  it('inline playable_url (no _quality_hd) → same outcome', () => {
    const html = String.raw`<script>{"playable_url":"https:\/\/video.example.com\/sd.mp4?x=1&y=2"}</script>`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'video', url: 'https://video.example.com/sd.mp4?x=1&y=2' },
    ]);
  });

  it('og:video wins over inline playable_url (no duplicate video item)', () => {
    const html = String.raw`
      <meta property="og:video" content="https://og.example.com/v.mp4" />
      <script>{"playable_url_quality_hd":"https:\/\/inline.example.com\/hd.mp4"}</script>
    `;
    const items = extractFromHtml(html);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ type: 'video', url: 'https://og.example.com/v.mp4' });
  });

  it('empty HTML → []', () => {
    expect(extractFromHtml('')).toEqual([]);
  });

  it('no og tags and no inline playable_url → []', () => {
    expect(extractFromHtml('<html><body>nothing useful here</body></html>')).toEqual([]);
  });

  it('og:video URL with &amp; → single-pass decode (no double-unescape)', () => {
    // The decode is single-pass: `&amp;quot;` must decode to literal `&quot;`,
    // not to `"`. Here we verify the simpler case that `&amp;` becomes `&` once.
    const html = `<meta property="og:video" content="https://video.example.com/v.mp4?a=1&amp;b=2" />`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'video', url: 'https://video.example.com/v.mp4?a=1&b=2', thumbnail: undefined },
    ]);
  });

  it('og:video URL with &amp;quot; stays as &quot; (single-pass guarantee)', () => {
    const html = `<meta property="og:video" content="https://video.example.com/v.mp4?x=&amp;quot;y&amp;quot;" />`;
    const items = extractFromHtml(html);
    expect(items[0].url).toBe('https://video.example.com/v.mp4?x=&quot;y&quot;');
  });
});

describe('unescapeJson (facebook)', () => {
  const BS = '\\';
  it.each([
    [BS + '/', '/'],
    [BS + 'u0026', '&'],
    [BS + 'u002F', '/'],
    [BS + 'u002f', '/'],
    [BS + 'u003D', '='],
    [BS + 'u003d', '='],
    [BS + '"', '"'],
    [BS + BS, BS],
  ])('decodes %s to %s', (input, expected) => {
    expect(unescapeJson(input)).toBe(expected);
  });

  it('decodes a realistic inline playable_url with mixed escapes', () => {
    const input = 'https:\\/\\/cdn.example.com\\/v.mp4?token=abc\\u0026sig=xyz\\u0026q=\\"hd\\"';
    expect(unescapeJson(input)).toBe('https://cdn.example.com/v.mp4?token=abc&sig=xyz&q="hd"');
  });

  it('single-pass: \\\\\\/ decodes to \\/ (literal backslash + slash), not //', () => {
    // Source contains a literal backslash followed by an escaped slash.
    // Single-pass means \\ -> \ and \/ -> / happen independently — the engine
    // does not re-scan output, so we do not turn a literal backslash escape
    // into a second slash decode.
    expect(unescapeJson('\\\\\\/')).toBe('\\/');
  });

  it('leaves non-escape sequences alone', () => {
    expect(unescapeJson('plain string with no escapes')).toBe('plain string with no escapes');
  });
});
