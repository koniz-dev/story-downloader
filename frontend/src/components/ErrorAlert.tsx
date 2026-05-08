import { useI18n } from '../lib/i18n';

interface Props {
  message: string;
  code?: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, code, onDismiss }: Props) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-danger">{message}</p>
        {code && <p className="mt-1 text-[11px] font-mono text-danger/70">{t.alert.code}: {code}</p>}
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
