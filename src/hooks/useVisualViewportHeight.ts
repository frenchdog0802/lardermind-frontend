import { useEffect, useState } from 'react';

/**
 * Height (px) of the visual viewport, or null when unsupported / SSR.
 * iOS Safari does not shrink the layout viewport (or `dvh`) when the software
 * keyboard opens, so a `h-[100dvh]` column leaves the bottom-docked composer
 * hidden behind / floating over the keyboard. Sizing the root to this value keeps
 * the composer docked just above the keyboard.
 */
export function readVisualViewportHeight(
  vv: { height: number } | null | undefined,
): number | null {
  if (!vv || !Number.isFinite(vv.height) || vv.height <= 0) return null;
  return Math.round(vv.height);
}

export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() =>
    typeof window === 'undefined' ? null : readVisualViewportHeight(window.visualViewport),
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setHeight(readVisualViewportHeight(vv));
      // iOS may scroll the layout viewport to reveal the focused input; undo it
      // so the fixed-height column stays aligned with the visible area.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}
