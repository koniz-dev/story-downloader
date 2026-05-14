import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'info' | 'error';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, variant }]);
      const handle = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, handle);
    },
    [dismiss],
  );

  useEffect(() => {
    const timersAtMount = timers.current;
    return () => {
      timersAtMount.forEach((handle) => clearTimeout(handle));
      timersAtMount.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return createElement(
    ToastContext.Provider,
    { value },
    children,
    createElement(ToastViewport, { toasts, onDismiss: dismiss }),
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return createElement(
    'div',
    {
      'aria-live': 'polite',
      'aria-atomic': 'false',
      role: 'status',
      className:
        'pointer-events-none fixed z-50 inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-2 px-4',
    },
    toasts.map((t) =>
      createElement(ToastItem, { key: t.id, toast: t, onDismiss }),
    ),
  );
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: 'border-success/30 text-fg',
  info: 'border-accent/30 text-fg',
  error: 'border-danger/40 text-danger',
};

const ICON_TINT: Record<ToastVariant, string> = {
  success: 'text-success',
  info: 'text-accent',
  error: 'text-danger',
};

interface IconShape {
  paths: string[];
  // True for shapes that already include closed loops (e.g. triangle) so we
  // can keep stroke joins clean and avoid an extra `fill="currentColor"`.
  circle?: { cx: number; cy: number; r: number };
}

const ICONS: Record<ToastVariant, IconShape> = {
  success: { paths: ['m5 12 5 5 9-10'] },
  info: {
    circle: { cx: 12, cy: 12, r: 9 },
    paths: ['M12 8v4.5', 'M12 16.25h.01'],
  },
  error: {
    paths: ['M12 4 2.7 20.5h18.6L12 4Z', 'M12 10v4.5', 'M12 17.5h.01'],
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const shape = ICONS[toast.variant];
  const svgChildren = [
    ...(shape.circle
      ? [
          createElement('circle', {
            key: 'c',
            cx: shape.circle.cx,
            cy: shape.circle.cy,
            r: shape.circle.r,
          }),
        ]
      : []),
    ...shape.paths.map((d, i) => createElement('path', { key: `p${i}`, d })),
  ];
  return createElement(
    'div',
    {
      className: `glass pointer-events-auto animate-toastUp flex items-center gap-2.5 rounded-full border ${VARIANT_CLASSES[toast.variant]} px-4 py-2.5 shadow-pop max-w-md text-sm font-medium`,
      onClick: () => onDismiss(toast.id),
    },
    createElement(
      'svg',
      {
        viewBox: '0 0 24 24',
        className: `h-4 w-4 shrink-0 ${ICON_TINT[toast.variant]}`,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '2.2',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      },
      ...svgChildren,
    ),
    createElement('span', { className: 'truncate' }, toast.message),
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
