// Remembers (in this browser only) that she has reached the end, and which hidden
// messages she found, so when she visits again he can offer her the story straight away.
const KEY = 'wish-story-v1';
export type Found = Record<'moon' | 'stars' | 'fireflies' | 'lamp' | 'birds', number>;

export function rememberEnd(found: Found): void {
  try { localStorage.setItem(KEY, JSON.stringify({ found, at: Date.now() })); } catch { /* private window: fine */ }
}
export function recallEnd(): Found | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return v && v.found ? (v.found as Found) : null;
  } catch { return null; }
}
