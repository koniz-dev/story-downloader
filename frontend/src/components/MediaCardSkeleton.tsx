export function MediaCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className="glass animate-fadeUp rounded-2xl overflow-hidden flex flex-col shadow-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="skeleton-shimmer aspect-[9/16] max-h-[70vh]" />
      <div className="p-3 flex items-center justify-between gap-2">
        <span className="skeleton-shimmer h-3 w-20 rounded" />
        <span className="skeleton-shimmer h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}
