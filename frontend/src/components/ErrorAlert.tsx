import { useI18n } from '../lib/i18n';

interface Props {
  message: string;
  code?: string;
  requestId?: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, code, requestId, onDismiss }: Props) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger/10 backdrop-blur-md px-4 py-3 flex items-start gap-3 shadow-card"
    >
      <AlertIcon className="h-5 w-5 shrink-0 mt-0.5 text-danger" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-danger">{message}</p>
        {code && <p className="mt-1 text-[11px] font-mono text-danger/70">{t.alert.code}: {code}</p>}
        {requestId && (
          <p className="mt-0.5 text-[11px] font-mono text-danger/70 break-all">
            {t.alert.requestId}: <span data-testid="request-id">{requestId}</span>
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-danger hover:text-danger/80 shrink-0 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger transition-colors motion-reduce:transition-none"
          aria-label={t.alert.close}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5" />
      <path d="M12 16.25h.01" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
