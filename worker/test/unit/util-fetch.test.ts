import { describe, it, expect } from 'vitest';
import { isHostAllowed, readBoundedText, boundedStream } from '../../src/util/fetch';

const ALLOWED = [
  /\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i,
  /\.tiktokcdn\.com$/i,
  /\.tiktok\.com$/i,
] as const;

describe('isHostAllowed', () => {
  it.each([
    ['scontent.cdninstagram.com', true],
    ['video-foo.fbcdn.net', true],
    ['video.tiktokcdn.com', true],
    ['www.tiktok.com', true],
  ])('%s → %s', (host, expected) => {
    expect(isHostAllowed(host, ALLOWED)).toBe(expected);
  });

  it('rejects bare domain (regex requires leading dot)', () => {
    // The whitelist patterns are `\.cdninstagram\.com$` etc, which require
    // a leading dot. Bare apex domains aren't matched — by design, since
    // CDN traffic always lives on subdomains.
    expect(isHostAllowed('cdninstagram.com', ALLOWED)).toBe(false);
  });

  it.each([
    'attacker.com',
    'evil-cdninstagram.com', // suffix-attack attempt
    'cdninstagram.com.attacker.com', // prefix-attack attempt
    '169.254.169.254',
  ])('rejects %s', (host) => {
    expect(isHostAllowed(host, ALLOWED)).toBe(false);
  });
});

describe('readBoundedText', () => {
  function bodyOf(text: string): Response {
    return new Response(text);
  }

  it('reads small body in full', async () => {
    const res = bodyOf('hello world');
    expect(await readBoundedText(res, 100)).toBe('hello world');
  });

  it('returns empty string for empty body', async () => {
    const res = new Response(null);
    expect(await readBoundedText(res, 100)).toBe('');
  });

  it('throws when body exceeds the cap', async () => {
    const res = bodyOf('a'.repeat(1024));
    await expect(readBoundedText(res, 100)).rejects.toMatchObject({
      code: 'UPSTREAM_TOO_LARGE',
    });
  });

  it('handles unicode without splitting characters', async () => {
    // 4 emojis, each multibyte — total ~16 bytes. Cap of 100 should be fine.
    const res = bodyOf('🎬📘🎵🌐');
    expect(await readBoundedText(res, 100)).toBe('🎬📘🎵🌐');
  });
});

describe('boundedStream', () => {
  it('passes through bytes up to the cap', async () => {
    const input = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('hello '));
        c.enqueue(new TextEncoder().encode('world'));
        c.close();
      },
    });
    const out = boundedStream(input, 100);
    const text = await new Response(out).text();
    expect(text).toBe('hello world');
  });

  it('errors the stream when bytes exceed the cap', async () => {
    const input = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array(50));
        c.enqueue(new Uint8Array(60)); // total 110 > 100
        c.close();
      },
    });
    const out = boundedStream(input, 100);
    const reader = out.getReader();
    let caught: Error | null = null;
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).toMatch(/Stream exceeded 100 bytes/);
  });
});
