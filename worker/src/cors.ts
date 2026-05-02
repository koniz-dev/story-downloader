import type { Env } from './types';

const DEFAULT_ALLOWED = ['http://localhost:5173', 'https://*.github.io'];

function originAllowed(origin: string | null, env: Env): string | null {
  if (!origin) return null;
  const list = (env.ALLOWED_ORIGINS ?? DEFAULT_ALLOWED.join(',')).split(',').map((s) => s.trim());
  for (const pattern of list) {
    if (pattern === origin) return origin;
    if (pattern.includes('*')) {
      const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      if (re.test(origin)) return origin;
    }
  }
  return null;
}

export function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get('Origin');
  const allowed = originAllowed(origin, env);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = allowed;
  return headers;
}

export function handlePreflight(request: Request, env: Env): Response | null {
  if (request.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
