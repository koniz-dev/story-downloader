interface Props {
  message: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: Props) {
  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-start justify-between gap-3">
      <p className="text-sm text-red-200">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-300 hover:text-red-100 text-sm shrink-0"
          aria-label="Đóng"
        >
          ✕
        </button>
      )}
    </div>
  );
}
