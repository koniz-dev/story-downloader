// Smooth scroll helpers that respect prefers-reduced-motion and the visual
// viewport (so the keyboard-aware focus path still works on iOS Safari).

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollIntoView(
  el: HTMLElement | null,
  options: { block?: ScrollLogicalPosition; offsetTop?: number } = {},
) {
  if (!el || typeof window === 'undefined') return;
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
  const block = options.block ?? 'start';
  // If we need a manual offset (e.g. to clear a sticky header), compute the
  // absolute top instead of relying on scrollIntoView's positioning, which
  // doesn't accept a pixel offset cross-browser.
  if (typeof options.offsetTop === 'number') {
    const rect = el.getBoundingClientRect();
    const top = rect.top + window.scrollY - options.offsetTop;
    window.scrollTo({ top: Math.max(0, top), behavior });
    return;
  }
  try {
    el.scrollIntoView({ behavior, block });
  } catch {
    el.scrollIntoView();
  }
}

// Mobile keyboards push the visualViewport up. Scroll the element so it's
// visible above the keyboard. Falls back to a plain scrollIntoView if the
// visualViewport API isn't available.
export function scrollFocusedIntoView(el: HTMLElement | null) {
  if (!el || typeof window === 'undefined') return;
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
  // Give the browser a beat to surface the keyboard so visualViewport.height
  // reflects the post-keyboard window. Two rAFs is the cross-engine recipe;
  // 200ms is a safety net for iOS where viewport changes lag the focus event.
  window.setTimeout(() => {
    const vv = window.visualViewport;
    const rect = el.getBoundingClientRect();
    const viewportH = vv ? vv.height : window.innerHeight;
    const viewportTopOffset = vv ? vv.offsetTop : 0;
    // Desired: input sits at ~40% from the top of the *visible* viewport.
    const desiredY = viewportTopOffset + viewportH * 0.4;
    const delta = rect.top - desiredY;
    // Skip tiny adjustments that would feel jittery.
    if (Math.abs(delta) < 8) return;
    window.scrollBy({ top: delta, behavior });
  }, 200);
}
