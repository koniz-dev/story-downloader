import { describe, it, expect } from 'vitest';
import {
  SECURITY_HEADERS,
  applySecurityHeaders,
  getOrCreateRequestId,
  setRequestId,
} from '../../src/headers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('getOrCreateRequestId', () => {
  it('mints a new UUID when no header is present', () => {
    const req = new Request('https://example.com/');
    const id = getOrCreateRequestId(req);
    expect(UUID_RE.test(id)).toBe(true);
  });

  it('returns the supplied UUID when well-formed', () => {
    const supplied = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const req = new Request('https://example.com/', {
      headers: { 'X-Request-Id': supplied },
    });
    expect(getOrCreateRequestId(req)).toBe(supplied);
  });

  it('rejects a non-UUID supplied ID and mints fresh', () => {
    const req = new Request('https://example.com/', {
      headers: { 'X-Request-Id': '<script>alert(1)</script>' },
    });
    const id = getOrCreateRequestId(req);
    expect(UUID_RE.test(id)).toBe(true);
    expect(id).not.toContain('<');
  });

  it('rejects arbitrarily long supplied IDs', () => {
    const tooLong = '0'.repeat(2048);
    const req = new Request('https://example.com/', {
      headers: { 'X-Request-Id': tooLong },
    });
    expect(UUID_RE.test(getOrCreateRequestId(req))).toBe(true);
  });

  it('returns different UUIDs on successive calls (entropy sanity check)', () => {
    const req = new Request('https://example.com/');
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) seen.add(getOrCreateRequestId(req));
    expect(seen.size).toBe(5);
  });
});

describe('applySecurityHeaders', () => {
  it('writes every defined hardening header', () => {
    const h = new Headers();
    applySecurityHeaders(h);
    for (const key of Object.keys(SECURITY_HEADERS)) {
      expect(h.get(key)).toBe(SECURITY_HEADERS[key]);
    }
  });

  it('does not overwrite a header that an upstream already set', () => {
    const h = new Headers({ 'X-Frame-Options': 'SAMEORIGIN' });
    applySecurityHeaders(h);
    expect(h.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('is idempotent across repeated application', () => {
    const h = new Headers();
    applySecurityHeaders(h);
    applySecurityHeaders(h);
    // Headers.get returns the single value; should match the canonical one.
    expect(h.get('X-Content-Type-Options')).toBe('nosniff');
  });
});

describe('setRequestId', () => {
  it('sets the X-Request-Id header (overwriting prior value)', () => {
    const h = new Headers({ 'X-Request-Id': 'previous' });
    setRequestId(h, 'new-id');
    expect(h.get('X-Request-Id')).toBe('new-id');
  });
});
