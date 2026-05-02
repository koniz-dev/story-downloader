import { useI18n } from '../lib/i18n';

interface Props {
  message: string;
  code?: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, code, onDismiss }: Props) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-200">{message}</p>
        {code && <p className="mt-1 text-[11px] font-mono text-red-300/60">{t.alert.code}: {code}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-300 hover:text-red-100 text-sm shrink-0"
          aria-label={t.alert.close}
        >
          ✕
        </button>
      )}
    </div>
  );
}
