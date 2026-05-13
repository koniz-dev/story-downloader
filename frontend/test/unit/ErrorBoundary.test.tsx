import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { I18nProvider } from '../../src/lib/i18n';

function wrap(ui: React.ReactNode) {
  return <I18nProvider>{ui}</I18nProvider>;
}

function ThrowBomb({ message }: { message: string }): React.ReactElement {
  throw new Error(message);
}

// React logs caught errors to console.error by default — silence in tests
// so the failed-render output doesn't drown the test report.
let consoleSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleSpy.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      wrap(
        <ErrorBoundary>
          <p>healthy</p>
        </ErrorBoundary>,
      ),
    );
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('shows the localized fallback when a child renders throws', () => {
    render(
      wrap(
        <ErrorBoundary>
          <ThrowBomb message="boom-boom" />
        </ErrorBoundary>,
      ),
    );
    // English locale used because I18nProvider falls back to 'en' under jsdom.
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    // The raw error message is surfaced so support staff have a fingerprint.
    expect(screen.getByText('boom-boom')).toBeInTheDocument();
  });

  it('calls window.location.reload when the reload button is clicked', () => {
    const reload = vi.fn();
    // jsdom's location is read-only; redefine just the reload property.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    render(
      wrap(
        <ErrorBoundary>
          <ThrowBomb message="x" />
        </ErrorBoundary>,
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('logs the caught error to console.error with a tag', () => {
    render(
      wrap(
        <ErrorBoundary>
          <ThrowBomb message="loggable" />
        </ErrorBoundary>,
      ),
    );
    // React itself logs first, ErrorBoundary logs second — verify our tag
    // appears in at least one call.
    const calls = consoleSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((c) => c.includes('[ErrorBoundary]'))).toBe(true);
  });
});
