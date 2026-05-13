import { Component, type ReactNode } from 'react';
import { useI18n } from '../lib/i18n';

interface State {
  hasError: boolean;
  message?: string;
}

interface Props {
  children: ReactNode;
}

// Top-level safety net. A bug inside any descendant component would otherwise
// blank the page (React unmounts the tree on uncaught render errors). We
// render a localized fallback with a reload button so users have a path
// forward and we get a console log we can grep in production.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }): void {
    // Keep this terse — the structured logger lives in the worker. Surface
    // enough context that a user can reproduce or attach to a bug report.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <BoundaryFallback message={this.state.message} onReload={this.reset} />;
    }
    return this.props.children;
  }
}

function BoundaryFallback({ message, onReload }: { message?: string; onReload: () => void }) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="min-h-[100dvh] flex items-center justify-center px-4"
    >
      <div className="max-w-md w-full text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">500</p>
        <h2 className="text-2xl font-bold">{t.errorBoundary.title}</h2>
        <p className="text-sm text-fg-muted">{t.errorBoundary.body}</p>
        {message && (
          <p className="text-[11px] font-mono text-fg-muted/70 break-words">{message}</p>
        )}
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-lg bg-fg text-bg font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
        >
          {t.errorBoundary.reload}
        </button>
      </div>
    </div>
  );
}
