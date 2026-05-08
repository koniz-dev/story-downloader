import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../../src/proxy';

describe('sanitizeFilename', () => {
  it('returns null for null/empty input', () => {
    expect(sanitizeFilename(null)).toBeNull();
    expect(sanitizeFilename('')).toBeNull();
  });

  it('passes through a clean filename', () => {
    expect(sanitizeFilename('khaby-video.mp4')).toBe('khaby-video.mp4');
    expect(sanitizeFilename('My Photo (2024).jpg')).toBe('My Photo (2024).jpg');
  });

  it('strips CR/LF (header injection)', () => {
    expect(sanitizeFilename('a\r\nX-Evil: true.mp4')).toBe('aX-Evil: true.mp4');
    expect(sanitizeFilename('foo\nbar')).toBe('foobar');
  });

  it('strips quote and backslash (quoted-string injection)', () => {
    expect(sanitizeFilename('a"b.mp4')).toBe('ab.mp4');
    expect(sanitizeFilename('a\\b.mp4')).toBe('ab.mp4');
  });

  it('strips semicolon (Content-Disposition param injection)', () => {
    expect(sanitizeFilename('video.mp4; filename*=utf-8\'\'evil.txt')).toBe(
      "video.mp4 filename*=utf-8''evil.txt",
    );
  });

  it('truncates to 120 characters', () => {
    const long = 'a'.repeat(200) + '.mp4';
    const result = sanitizeFilename(long);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(120);
  });

  it('returns null if everything was stripped', () => {
    expect(sanitizeFilename('";\\')).toBeNull();
  });
});
