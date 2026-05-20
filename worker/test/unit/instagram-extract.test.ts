import { describe, it, expect } from 'vitest';
import { extractFromHtml, parseEmbed } from '../../src/platforms/instagram';

describe('extractFromHtml', () => {
  it('returns video with thumbnail when og:video and og:image are present', () => {
    const html = `
      <html><head>
        <meta property="og:video" content="https://cdn.instagram.com/v/clip.mp4" />
        <meta property="og:image" content="https://cdn.instagram.com/i/thumb.jpg" />
      </head></html>
    `;
    expect(extractFromHtml(html)).toEqual([
      {
        type: 'video',
        url: 'https://cdn.instagram.com/v/clip.mp4',
        thumbnail: 'https://cdn.instagram.com/i/thumb.jpg',
      },
    ]);
  });

  it('falls back to og:video:secure_url when og:video is absent', () => {
    const html = `
      <meta property="og:video:secure_url" content="https://cdn.instagram.com/v/secure.mp4" />
      <meta property="og:image" content="https://cdn.instagram.com/i/thumb.jpg" />
    `;
    expect(extractFromHtml(html)).toEqual([
      {
        type: 'video',
        url: 'https://cdn.instagram.com/v/secure.mp4',
        thumbnail: 'https://cdn.instagram.com/i/thumb.jpg',
      },
    ]);
  });

  it('returns video without thumbnail when og:image is absent', () => {
    const html = `<meta property="og:video" content="https://cdn.instagram.com/v/clip.mp4" />`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'video', url: 'https://cdn.instagram.com/v/clip.mp4', thumbnail: undefined },
    ]);
  });

  it('returns image when only og:image is present', () => {
    const html = `<meta property="og:image" content="https://cdn.instagram.com/i/pic.jpg" />`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'image', url: 'https://cdn.instagram.com/i/pic.jpg' },
    ]);
  });

  it('returns [] for empty HTML', () => {
    expect(extractFromHtml('')).toEqual([]);
  });

  it('returns [] when neither og:video nor og:image is present', () => {
    const html = `<html><head><title>Instagram</title></head></html>`;
    expect(extractFromHtml(html)).toEqual([]);
  });

  it('decodes &amp; in og:video and og:image URLs', () => {
    const html = `
      <meta property="og:video" content="https://cdn.instagram.com/v/clip.mp4?a=1&amp;b=2" />
      <meta property="og:image" content="https://cdn.instagram.com/i/thumb.jpg?x=1&amp;y=2" />
    `;
    expect(extractFromHtml(html)).toEqual([
      {
        type: 'video',
        url: 'https://cdn.instagram.com/v/clip.mp4?a=1&b=2',
        thumbnail: 'https://cdn.instagram.com/i/thumb.jpg?x=1&y=2',
      },
    ]);
  });

  it('decodes &amp; in image-only og:image URL', () => {
    const html = `<meta property="og:image" content="https://cdn.instagram.com/i/pic.jpg?a=1&amp;b=2" />`;
    expect(extractFromHtml(html)).toEqual([
      { type: 'image', url: 'https://cdn.instagram.com/i/pic.jpg?a=1&b=2' },
    ]);
  });

  it('prefers og:video over og:video:secure_url when both are present', () => {
    const html = `
      <meta property="og:video" content="https://cdn.instagram.com/v/primary.mp4" />
      <meta property="og:video:secure_url" content="https://cdn.instagram.com/v/secure.mp4" />
    `;
    expect(extractFromHtml(html)).toEqual([
      { type: 'video', url: 'https://cdn.instagram.com/v/primary.mp4', thumbnail: undefined },
    ]);
  });
});

describe('parseEmbed', () => {
  it('returns video with display_url thumbnail when video_url and display_url are present', () => {
    const html = `{"video_url":"https://cdn.instagram.com/v/clip.mp4","display_url":"https://cdn.instagram.com/i/thumb.jpg"}`;
    expect(parseEmbed(html)).toEqual([
      {
        type: 'video',
        url: 'https://cdn.instagram.com/v/clip.mp4',
        thumbnail: 'https://cdn.instagram.com/i/thumb.jpg',
      },
    ]);
  });

  it('falls back to thumbnail_src when display_url is absent', () => {
    const html = `{"video_url":"https://cdn.instagram.com/v/clip.mp4","thumbnail_src":"https://cdn.instagram.com/i/thumb.jpg"}`;
    expect(parseEmbed(html)).toEqual([
      {
        type: 'video',
        url: 'https://cdn.instagram.com/v/clip.mp4',
        thumbnail: 'https://cdn.instagram.com/i/thumb.jpg',
      },
    ]);
  });

  it('returns video without thumbnail when neither display_url nor thumbnail_src is present', () => {
    const html = `{"video_url":"https://cdn.instagram.com/v/clip.mp4"}`;
    expect(parseEmbed(html)).toEqual([
      { type: 'video', url: 'https://cdn.instagram.com/v/clip.mp4', thumbnail: undefined },
    ]);
  });

  it('returns image when only display_url is present', () => {
    const html = `{"display_url":"https://cdn.instagram.com/i/pic.jpg"}`;
    expect(parseEmbed(html)).toEqual([
      { type: 'image', url: 'https://cdn.instagram.com/i/pic.jpg' },
    ]);
  });

  it('returns [] for empty HTML', () => {
    expect(parseEmbed('')).toEqual([]);
  });

  it('returns [] when no relevant JSON keys are present', () => {
    const html = `<html><body>nothing useful here</body></html>`;
    expect(parseEmbed(html)).toEqual([]);
  });

  it('ignores thumbnail_src alone (no video_url, no display_url)', () => {
    const html = `{"thumbnail_src":"https://cdn.instagram.com/i/orphan.jpg"}`;
    expect(parseEmbed(html)).toEqual([]);
  });

  it('unescapes \\u0026 and \\/ in JSON-encoded video_url', () => {
    const html = `{"video_url":"https:\\/\\/cdn.instagram.com\\/v\\/clip.mp4?a=1\\u0026b=2","display_url":"https:\\/\\/cdn.instagram.com\\/i\\/thumb.jpg"}`;
    expect(parseEmbed(html)).toEqual([
      {
        type: 'video',
        url: 'https://cdn.instagram.com/v/clip.mp4?a=1&b=2',
        thumbnail: 'https://cdn.instagram.com/i/thumb.jpg',
      },
    ]);
  });

  it('unescapes JSON sequences in image-only display_url', () => {
    const html = `{"display_url":"https:\\/\\/cdn.instagram.com\\/i\\/pic.jpg?a=1\\u0026b=2"}`;
    expect(parseEmbed(html)).toEqual([
      { type: 'image', url: 'https://cdn.instagram.com/i/pic.jpg?a=1&b=2' },
    ]);
  });
});
