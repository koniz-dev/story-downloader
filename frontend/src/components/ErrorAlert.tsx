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
    <div className="rounded-xl border border-danger/30 bg-danger/10 backdrop-blur-md px-4 py-3 flex items-start justify-between gap-3 shadow-card">
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
          onClick={onDismiss}
          className="text-danger hover:text-danger/80 text-sm shrink-0 min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          aria-label={t.alert.close}
        >
          ✕
        </button>
      )}
    </div>
  );
}
