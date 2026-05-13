// Response-header helpers. Two responsibilities:
//   1. Generate a per-request correlation ID so logs and the client can
//      reference the same request when reporting a bug.
//   2. Apply a hardening set of HTTP security headers to every response.
//
// Kept separate from cors.ts because CORS is per-origin and dynamic, while
// these headers are static and apply unconditionally.

const REQUEST_ID_HEADER = 'X-Request-Id';

// Accept client-provided IDs only if they look like a UUID so we don't echo
// arbitrary attacker-controlled strings back (or log them as if they were
// trusted correlation IDs).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getOrCreateRequestId(request: Request): string {
  const supplied = request.headers.get(REQUEST_ID_HEADER);
  if (supplied && UUID_RE.test(supplied)) return supplied;
  return crypto.randomUUID();
}

export const SECURITY_HEADERS: Record<string, string> = {
  // Block MIME sniffing — proxied media already carries a correct
  // Content-Type, JSON responses are unambiguous, and we never want a
  // browser to upgrade text/* into application/javascript.
  'X-Content-Type-Options': 'nosniff',
  // The worker is an API, not an embeddable surface.
  'X-Frame-Options': 'DENY',
  // Don't leak the Referer header to upstream CDNs the proxy talks to.
  'Referrer-Policy': 'no-referrer',
  // Resources from this worker are intentionally consumable from the
  // frontend origin (GitHub Pages). cross-origin keeps that working while
  // still blocking COEP-isolated documents from grabbing the bytes.
  'Cross-Origin-Resource-Policy': 'cross-origin',
  // The API should never be indexed by search engines.
  'X-Robots-Tag': 'noindex, nofollow',
};

export function applySecurityHeaders(headers: Headers): void {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
}

export function setRequestId(headers: Headers, requestId: string): void {
  headers.set(REQUEST_ID_HEADER, requestId);
}
