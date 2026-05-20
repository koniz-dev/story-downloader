import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readShareTargetUrl } from '../../src/lib/share-target';

function setSearch(search: string): void {
  window.history.replaceState(null, '', `/${search}`);
}

describe('readShareTargetUrl', () => {
  const originalLocation = window.location.href;

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    window.history.replaceState(null, '', originalLocation);
  });

  it('returns the URL from ?url=', () => {
    setSearch('?url=' + encodeURIComponent('https://www.instagram.com/reel/ABC/'));
    expect(readShareTargetUrl()).toBe('https://www.instagram.com/reel/ABC/');
  });

  it('falls back to ?text= when url is missing', () => {
    setSearch('?text=' + encodeURIComponent('https://www.tiktok.com/@u/video/123'));
    expect(readShareTargetUrl()).toBe('https://www.tiktok.com/@u/video/123');
  });

  it('prefers url over text when both are present', () => {
    const url = encodeURIComponent('https://www.instagram.com/reel/ABC/');
    const text = encodeURIComponent('https://www.tiktok.com/@u/video/123');
    setSearch(`?url=${url}&text=${text}`);
    expect(readShareTargetUrl()).toBe('https://www.instagram.com/reel/ABC/');
  });

  it('returns null when title is not a URL', () => {
    setSearch('?title=' + encodeURIComponent('not-a-url'));
    expect(readShareTargetUrl()).toBeNull();
  });

  it('rejects non-http(s) schemes like javascript:', () => {
    setSearch('?url=' + encodeURIComponent('javascript:alert(1)'));
    expect(readShareTargetUrl()).toBeNull();
  });

  it('returns null when no search params are present', () => {
    setSearch('');
    expect(readShareTargetUrl()).toBeNull();
  });
});
