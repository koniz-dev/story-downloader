// Helpers shared by the proxy and platform parsers: bounded reads (DoS guard
// against runaway upstream bodies), bounded streaming (cap proxy responses),
// and a one-line host-allowlist check used after redirect:'follow' to make
// sure we don't serve content from a host we never approved.

import { ResolveError } from '../types';

export const FETCH_TIMEOUT_MS = 8_000;
export const MAX_HTML_BYTES = 5 * 1024 * 1024; //  5 MB
export const MAX_PROXY_BYTES = 200 * 1024 * 1024; // 200 MB

export type HostAllowlist = readonly RegExp[];

export function isHostAllowed(hostname: string, list: HostAllowlist): boolean {
  return list.some((re) => re.test(hostname));
}

export function assertFinalHostAllowed(
  upstream: Response,
  list: HostAllowlist,
): void {
  let host: string;
  try {
    host = new URL(upstream.url).hostname;
  } catch {
    throw new ResolveError('Upstream URL is not parseable', 'HOST_NOT_ALLOWED', 502);
  }
  if (!isHostAllowed(host, list)) {
    throw new ResolveError(
      `Redirect target ${host} is not in the whitelist`,
      'HOST_NOT_ALLOWED',
      403,
      { host },
    );
  }
}

// Read a Response body into a string, aborting if the cumulative byte count
// exceeds `max`. Used by HTML parsers — protects against multi-GB pages.
export async function readBoundedText(res: Response, max: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const out: string[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        throw new ResolveError(
          `Upstream HTML exceeded ${max} bytes`,
          'UPSTREAM_TOO_LARGE',
          502,
          { limit: max },
        );
      }
      out.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // ignore; reader already closed
    }
  }
  out.push(decoder.decode());
  return out.join('');
}

// Wrap a streaming body so that if cumulative bytes exceed `max`, the stream
// errors out (client connection closes mid-download). Cheap DoS guard.
export function boundedStream(
  body: ReadableStream<Uint8Array>,
  max: number,
): ReadableStream<Uint8Array> {
  let total = 0;
  const reader = body.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        total += value.byteLength;
        if (total > max) {
          controller.error(new Error(`Stream exceeded ${max} bytes`));
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          return;
        }
        controller.enqueue(value);
      } catch (e) {
        controller.error(e);
      }
    },
    cancel(reason) {
      try {
        reader.cancel(reason);
      } catch {
        // ignore
      }
    },
  });
}
