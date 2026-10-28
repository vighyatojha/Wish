// ─────────────────────────────────────────────────────────────
//  Text that fits itself: whatever you write in content.ts, a long
//  text shrinks (a step at a time, from its normal size) until it
//  fits its place, and a short one stays at its normal size.
// ─────────────────────────────────────────────────────────────

/** Shrinks the font of `targets` (from their CSS size) until `fits()` is true, down to `min` of it.
 *  Returns the scale it settled on (1 = no change). */
export function shrinkToFit(targets: HTMLElement[], fits: () => boolean, min = 0.6): number {
  if (!targets.length) return 1;
  for (const t of targets) t.style.fontSize = '';
  const base = targets.map((t) => parseFloat(getComputedStyle(t).fontSize));
  let k = 1;
  while (!fits() && k > min) {
    k *= 0.94;
    targets.forEach((t, i) => { t.style.fontSize = `${(base[i] * k).toFixed(2)}px`; });
  }
  return k;
}

/** Calls `fn` now and again (once things settle) whenever the window changes size. Returns a stop. */
export function refitOnResize(fn: () => void): () => void {
  let t = 0;
  const on = () => { clearTimeout(t); t = window.setTimeout(fn, 120); };
  window.addEventListener('resize', on);
  window.visualViewport?.addEventListener('resize', on);
  void document.fonts?.ready.then(fn);
  return () => { clearTimeout(t); window.removeEventListener('resize', on); window.visualViewport?.removeEventListener('resize', on); };
}
