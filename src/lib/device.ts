// Phone-level helpers: fullscreen, portrait lock, screen wake, vibration.
// Every call is wrapped so a browser that says "no" never breaks the site.

export const isTouch = window.matchMedia('(pointer: coarse)').matches;

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Must be called directly inside a tap handler (browsers only allow
// fullscreen as a response to the user touching the screen).
export async function enterImmersive(): Promise<void> {
  if (!isTouch) return; // skip on laptops so testing stays comfortable
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: 'portrait') => Promise<void>;
    };
    await orientation.lock?.('portrait');
  } catch {
    /* Not allowed here. The site still works in a normal tab. */
  }
}

// Stops the phone screen from dimming and locking mid-story.
let wakeLock: WakeLockSentinel | null = null;
export async function keepAwake(): Promise<void> {
  const request = async () => {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      /* ignore */
    }
  };
  await request();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) void request();
  });
}

// Short vibration. A number (ms) or a pattern like [20, 60, 20].
export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

// Resolves once the on-screen keyboard has finished closing and the
// page size has stopped changing.
export function settleViewport({ quiet = 220, max = 1200 } = {}): Promise<void> {
  return new Promise((resolve) => {
    let lastH = window.innerHeight;
    let lastChange = performance.now();
    const start = lastChange;
    const tick = (now: number) => {
      if (window.innerHeight !== lastH) {
        lastH = window.innerHeight;
        lastChange = now;
      }
      if (now - lastChange > quiet || now - start > max) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
