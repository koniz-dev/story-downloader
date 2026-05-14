// Smooth scroll helpers that respect prefers-reduced-motion and the visual
// viewport (so the keyboard-aware focus path still works on iOS Safari).

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Px of buffer at the bottom of the viewport that still counts as "visible".
// If less than this would be visible, we treat the element as below the fold
// and scroll.
const VISIBLE_BUFFER_BOTTOM = 80;

function isComfortablyVisible(el: HTMLElement, topOffset: number): boolean {
  const rect = el.getBoundingClientRect();
  const viewportH = window.innerHeight;
  // "Comfortably visible" = the element's top sits below any sticky header
  // AND above the bottom buffer, so the user can see at least the start of
  // its content without scrolling.
  return rect.top >= topOffset && rect.top <= viewportH - VISIBLE_BUFFER_BOTTOM;
}

// Smooth-scrolls `el` into view. Skips when the element is already visible
// — that's almost always the right thing on desktop (tall viewports already
// show the form/results after a state change, so scrolling would be unwanted
// motion). Pass `force: true` to override this and always scroll.
export function scrollIntoView(
  el: HTMLElement | null,
  options: { block?: ScrollLogicalPosition; offsetTop?: number; force?: boolean } = {},
) {
  if (!el || typeof window === 'undefined') return;
  const offset = options.offsetTop ?? 0;
  if (!options.force && isComfortablyVisible(el, offset)) return;

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

// Mobile keyboard avoidance. On focus, if iOS/Android surfaces a software
// keyboard, visualViewport.height shrinks. We measure that shrink and only
// scroll when the input would actually be occluded. On desktop, where there
// is no virtual keyboard, visualViewport.height equals window.innerHeight and
// this function is a no-op — the previous version moved the page on every
// input click, which felt like a glitch.
const KEYBOARD_DETECT_THRESHOLD_PX = 150;

export function scrollFocusedIntoView(el: HTMLElement | null) {
  if (!el || typeof window === 'undefined') return;
  // Give the browser a beat to surface the keyboard so visualViewport.height
  // reflects the post-keyboard window. 200ms is a safety net for iOS where
  // the viewport change lags the focus event.
  window.setTimeout(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const keyboardLikelyOpen = window.innerHeight - vv.height >= KEYBOARD_DETECT_THRESHOLD_PX;
    if (!keyboardLikelyOpen) return;

    const rect = el.getBoundingClientRect();
    const viewportBottom = vv.offsetTop + vv.height;
    // 16px margin so the input doesn't sit pixel-flush against the keyboard.
    const overlap = rect.bottom + 16 - viewportBottom;
    if (overlap <= 0) return;

    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    window.scrollBy({ top: overlap, behavior });
  }, 200);
}
