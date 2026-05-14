type StepState = 'pending' | 'active' | 'completed';

interface Props {
  step: 1 | 2 | 3;
  label: string;
  state: StepState;
}

// Decoupled visual labels from the numeric prefix that lived inside the
// translation strings. The number now lives on a chip; locales just supply
// the descriptive part so future RTL/CJK reorderings stay clean.
export function StepHeader({ step, label, state }: Props) {
  return (
    <div className="flex items-center gap-2 select-none">
      <StepBadge step={step} state={state} />
      <h2
        className={`text-sm font-semibold tracking-tight ${
          state === 'pending' ? 'text-fg-muted' : 'text-fg'
        }`}
      >
        {label}
      </h2>
    </div>
  );
}

function StepBadge({ step, state }: { step: number; state: StepState }) {
  // The visible number / check icon is decorative for assistive tech — the
  // heading next to it carries the meaning. aria-hidden keeps screen readers
  // from announcing "1 Choose platform 1" twice, and avoids aria-label on
  // <span> (which axe flags as a prohibited-attr violation).
  if (state === 'completed') {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success text-white shadow-card"
      >
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg font-semibold text-xs shadow-card"
      >
        {step}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border-strong text-fg-muted font-semibold text-xs"
    >
      {step}
    </span>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}
