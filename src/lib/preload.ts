// ─────────────────────────────────────────────────────────────
//  Quietly fetch page 2's heavy pieces while she is still on
//  page 1 (reading the question), so nothing arrives late:
//  the valley picture and its masks, and the birdsong. The browser keeps them in its cache.
// ─────────────────────────────────────────────────────────────
import valleyUrl from '../assets/valley.webp';
import masksUrl from '../assets/valley-masks.png';
import ambientUrl from '../assets/valley-morning.m4a';

let started = false;

export function preloadStory(): void {
  if (started) return;
  started = true;
  for (const url of [valleyUrl, masksUrl]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
  void fetch(ambientUrl).catch(() => {});
}
