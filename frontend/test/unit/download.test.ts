import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MediaItem } from '../../src/types';

vi.mock('../../src/lib/api', () => ({
  // proxyUrl is mocked to a sentinel so the test asserts the wrapping happens
  // — not the worker-url shape (covered separately in api.test.ts).
  proxyUrl: vi.fn((url: string, filename?: string) => `PROXY::${url}::${filename ?? ''}`),
}));

vi.mock('../../src/lib/track', () => ({
  track: vi.fn(),
}));

import { downloadMedia } from '../../src/lib/download';
import { proxyUrl } from '../../src/lib/api';
import { track } from '../../src/lib/track';

const proxyUrlMock = vi.mocked(proxyUrl);
const trackMock = vi.mocked(track);

describe('downloadMedia', () => {
  let appendSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let removeSpy: ReturnType<typeof vi.fn>;
  let anchor: HTMLAnchorElement;
  let createElementSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    proxyUrlMock.mockClear();
    trackMock.mockClear();

    anchor = document.createElement('a');
    clickSpy = vi.fn();
    removeSpy = vi.fn();
    // Stub click + remove so the test does not actually navigate / mutate.
    Object.defineProperty(anchor, 'click', { value: clickSpy, configurable: true });
    Object.defineProperty(anchor, 'remove', { value: removeSpy, configurable: true });

    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return anchor;
      // Defer to native for anything else.
      return Document.prototype.createElement.call(document, tag);
    });
    appendSpy = vi.spyOn(document.body, 'appendChild');
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  function videoItem(overrides: Partial<MediaItem> = {}): MediaItem {
    return { type: 'video', url: 'https://cdn.example/a.mp4', ...overrides };
  }
  function imageItem(overrides: Partial<MediaItem> = {}): MediaItem {
    return { type: 'image', url: 'https://cdn.example/a.jpg', ...overrides };
  }

  it('emits a download.click track event with platform, kind and type', () => {
    downloadMedia(videoItem(), 'instagram', 'reel');
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      event: 'download.click',
      platform: 'instagram',
      kind: 'reel',
      type: 'video',
    });
  });

  it('sets href via proxyUrl(item.url, filename)', () => {
    downloadMedia(videoItem(), 'tiktok', 'video');
    expect(proxyUrlMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledFilename] = proxyUrlMock.mock.calls[0];
    expect(calledUrl).toBe('https://cdn.example/a.mp4');
    expect(calledFilename).toMatch(/^tiktok-video-\d+\.mp4$/);
    expect(anchor.href).toBe(`PROXY::https://cdn.example/a.mp4::${calledFilename}`);
  });

  it('derives filename from platform + kind for a video (.mp4)', () => {
    downloadMedia(videoItem(), 'facebook', 'reel');
    expect(anchor.download).toMatch(/^facebook-reel-\d+\.mp4$/);
  });

  it('derives filename from platform + kind for an image (.jpg)', () => {
    downloadMedia(imageItem(), 'instagram', 'post');
    expect(anchor.download).toMatch(/^instagram-post-\d+\.jpg$/);
  });

  it('honors item.filename when provided', () => {
    downloadMedia(videoItem({ filename: 'custom.mp4' }), 'instagram', 'reel');
    expect(anchor.download).toBe('custom.mp4');
    expect(proxyUrlMock).toHaveBeenCalledWith('https://cdn.example/a.mp4', 'custom.mp4');
  });

  it('appends the anchor, clicks it, then removes it', () => {
    downloadMedia(videoItem(), 'instagram', 'reel');
    expect(appendSpy).toHaveBeenCalledWith(anchor);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('sets rel="noopener noreferrer" on the anchor', () => {
    downloadMedia(videoItem(), 'instagram', 'reel');
    expect(anchor.rel).toBe('noopener noreferrer');
  });
});
