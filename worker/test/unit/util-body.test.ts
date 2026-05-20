import { describe, it, expect } from 'vitest';
import { readBoundedRequestBody } from '../../src/util/body';
import { ResolveError } from '../../src/types';

function requestWithStreamBody(chunks: Uint8Array[], contentLength?: number): Request {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (contentLength !== undefined) headers['Content-Length'] = String(contentLength);
  return new Request('https://example.com/api/track', {
    method: 'POST',
    headers,
    body: stream,
  });
}

const enc = new TextEncoder();

describe('readBoundedRequestBody', () => {
  it('returns the body text when under the cap', async () => {
    const req = new Request('https://example.com/', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://www.instagram.com/p/abc' }),
    });
    const out = await readBoundedRequestBody(req, 1024);
    expect(JSON.parse(out)).toEqual({ url: 'https://www.instagram.com/p/abc' });
  });

  it('returns "" for a request with no body', async () => {
    const req = new Request('https://example.com/', { method: 'GET' });
    expect(await readBoundedRequestBody(req, 1024)).toBe('');
  });

  it('throws BODY_TOO_LARGE 413 when Content-Length exceeds the cap', async () => {
    const req = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'Content-Length': '20000' },
      body: 'x'.repeat(20000),
    });
    await expect(readBoundedRequestBody(req, 1024)).rejects.toBeInstanceOf(ResolveError);
    try {
      await readBoundedRequestBody(req, 1024);
    } catch (e) {
      expect((e as ResolveError).code).toBe('BODY_TOO_LARGE');
      expect((e as ResolveError).status).toBe(413);
      expect((e as ResolveError).params).toMatchObject({ limit: 1024, length: 20000 });
    }
  });

  it('throws when the body stream exceeds the cap even though Content-Length is missing', async () => {
    // 2 KB across two chunks, cap at 1 KB, no Content-Length header.
    const chunkA = enc.encode('a'.repeat(900));
    const chunkB = enc.encode('b'.repeat(900));
    const req = requestWithStreamBody([chunkA, chunkB]);
    await expect(readBoundedRequestBody(req, 1024)).rejects.toMatchObject({
      code: 'BODY_TOO_LARGE',
      status: 413,
    });
  });

  it('throws when the body stream exceeds the cap even though Content-Length lies low', async () => {
    // Lie: claim 100 bytes, send 2 KB. The Content-Length check passes (under
    // 1 KB cap), but the streaming reader must still cut us off mid-read.
    const chunkA = enc.encode('a'.repeat(900));
    const chunkB = enc.encode('b'.repeat(900));
    const req = requestWithStreamBody([chunkA, chunkB], 100);
    await expect(readBoundedRequestBody(req, 1024)).rejects.toMatchObject({
      code: 'BODY_TOO_LARGE',
      status: 413,
    });
  });

  it('handles a body that equals the cap exactly', async () => {
    const body = 'x'.repeat(1024);
    const req = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'Content-Length': '1024' },
      body,
    });
    const out = await readBoundedRequestBody(req, 1024);
    expect(out.length).toBe(1024);
  });

  it('handles a body one byte over the cap', async () => {
    const body = 'x'.repeat(1025);
    const req = new Request('https://example.com/', {
      method: 'POST',
      headers: { 'Content-Length': '1025' },
      body,
    });
    await expect(readBoundedRequestBody(req, 1024)).rejects.toMatchObject({
      code: 'BODY_TOO_LARGE',
    });
  });
});
