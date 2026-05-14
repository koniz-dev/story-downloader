import { useEffect, useState } from 'react';

// Returns true once the window has scrolled past `threshold` px. Used by the
// header to collapse subtitle + chips after the user starts engaging with
// the form/results — Linear-style compact header pattern.
export function useScrolled(threshold = 80): boolean {
  const [scrolled, setScrolled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.scrollY > threshold;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}
