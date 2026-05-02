import type { ResolveResponse } from '../types';

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

export async function resolveMedia(url: string, signal?: AbortSignal): Promise<ResolveResponse> {
  if (!WORKER_URL) {
    throw new ApiError(
      'VITE_WORKER_URL chưa được cấu hình. Tạo file frontend/.env.local với VITE_WORKER_URL=https://...',
      'NO_WORKER_URL',
    );
  }

  const res = await fetch(`${WORKER_URL}/api/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Worker trả về ${res.status}`, body.code);
  }

  return (await res.json()) as ResolveResponse;
}

export function proxyUrl(mediaUrl: string, filename?: string): string {
  const params = new URLSearchParams({ url: mediaUrl });
  if (filename) params.set('filename', filename);
  return `${WORKER_URL}/api/proxy?${params.toString()}`;
}
