import type { ResolveResponse } from '../types';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public params?: Record<string, string | number>,
  ) {
    super(message);
  }
}

export async function resolveMedia(url: string, signal?: AbortSignal): Promise<ResolveResponse> {
  if (!WORKER_URL) {
    throw new ApiError(
      'VITE_WORKER_URL is not configured. Create frontend/.env.local with VITE_WORKER_URL=https://...',
      'NO_WORKER_URL',
    );
  }

  let res: Response;
  try {
    res = await fetch(`${WORKER_URL}/api/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal,
    });
  } catch (e) {
    throw new ApiError(
      e instanceof Error ? e.message : 'Network error',
      'NETWORK_ERROR',
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      params?: Record<string, string | number>;
    };
    throw new ApiError(
      body.error ?? `Worker returned ${res.status}`,
      body.code ?? 'WORKER_HTTP_ERROR',
      body.params ?? (body.code ? undefined : { status: res.status }),
    );
  }

  return (await res.json()) as ResolveResponse;
}

export function proxyUrl(mediaUrl: string, filename?: string): string {
  const params = new URLSearchParams({ url: mediaUrl });
  if (filename) params.set('filename', filename);
  return `${WORKER_URL}/api/proxy?${params.toString()}`;
}
