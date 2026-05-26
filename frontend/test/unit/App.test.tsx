import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../../src/App';
import { I18nProvider } from '../../src/lib/i18n';
import { ToastProvider } from '../../src/lib/toast';
import { ThemeProvider } from '../../src/lib/theme';

vi.mock('../../src/lib/api', async () => {
  const actual = await vi.importActual('../../src/lib/api');
  return {
    ...(actual as Record<string, unknown>),
    resolveMedia: vi.fn(),
  };
});

vi.mock('../../src/lib/track', () => ({
  track: vi.fn(),
}));

vi.mock('../../src/lib/share-target', () => ({
  readShareTargetUrl: vi.fn(() => null),
}));

vi.mock('../../src/lib/useScrolled', () => ({
  useScrolled: vi.fn(() => false),
}));

import { resolveMedia } from '../../src/lib/api';

function wrap(ui: React.ReactNode) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>{ui}</ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('App', () => {
  const resolveMediaMock = vi.mocked(resolveMedia);

  beforeEach(() => {
    resolveMediaMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('disables platform switching while a resolve is in flight', async () => {
    const pending = deferred<{
      platform: 'instagram';
      kind: 'reel';
      mediaItems: [];
    }>();
    resolveMediaMock.mockReturnValue(pending.promise);

    render(wrap(<App />));

    fireEvent.click(screen.getByRole('button', { name: /Instagram/ }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'https://www.instagram.com/reel/abc123/' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(resolveMediaMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Instagram/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Facebook/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /TikTok/ })).toBeDisabled();

    pending.resolve({ platform: 'instagram', kind: 'reel', mediaItems: [] });
  });

  it('passes an AbortSignal to bulk resolves', async () => {
    resolveMediaMock.mockResolvedValue({
      platform: 'instagram',
      kind: 'reel',
      mediaItems: [{ type: 'video', url: 'https://cdn.example/video.mp4' }],
    });

    render(wrap(<App />));

    fireEvent.click(screen.getByRole('button', { name: /Instagram/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Multiple URLs' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: {
        value: 'https://www.instagram.com/reel/abc123/\nhttps://www.instagram.com/reel/def456/',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(resolveMediaMock).toHaveBeenCalled();
    for (const call of resolveMediaMock.mock.calls) {
      expect(call[1]).toBeInstanceOf(AbortSignal);
    }
  });
});
