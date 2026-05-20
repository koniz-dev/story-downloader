// Bounded reader for *inbound* request bodies. Inverse of util/fetch.ts'
// readBoundedText (which caps upstream response bodies).
//
// Why a stream-read instead of `request.json()` plus a Content-Length check:
// the Content-Length header is optional and client-controlled. A peer can omit
// it (or lie about it) and stream an unbounded body at the parser — up to
// Cloudflare's platform cap, which is large enough to chew worker CPU and
// memory per request. By reading via `request.body.getReader()` and aborting
// the moment we cross `maxBytes`, we guarantee a hard cap regardless of what
// the headers claim.

import { ResolveError } from '../types';

export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number,
): Promise<string> {
  const lenHeader = request.headers.get('Content-Length');
  if (lenHeader) {
    const len = Number.parseInt(lenHeader, 10);
    if (Number.isFinite(len) && len > maxBytes) {
      throw new ResolveError(
        `Request body exceeds ${maxBytes} bytes`,
        'BODY_TOO_LARGE',
        413,
        { limit: maxBytes, length: len },
      );
    }
  }

  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const out: string[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new ResolveError(
          `Request body exceeds ${maxBytes} bytes`,
          'BODY_TOO_LARGE',
          413,
          { limit: maxBytes },
        );
      }
      out.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // reader already closed; nothing to do
    }
  }
  out.push(decoder.decode());
  return out.join('');
}
