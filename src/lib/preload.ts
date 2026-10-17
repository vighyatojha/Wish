// ─────────────────────────────────────────────────────────────
//  Quietly fetch page 2's heavy pieces while she is still on
//  page 1 (reading the question), so nothing arrives late:
//  the bus-stop pictures and masks, the bus film and the birdsong.
//  The browser keeps them in its cache.
// ─────────────────────────────────────────────────────────────
import emptyUrl from '../assets/stop-empty.webp';
import busUrl from '../assets/stop-bus.webp';
import masksUrl from '../assets/stop-masks.png';
import masks2Url from '../assets/stop-masks2.png';
import filmUrl from '../assets/bus-arrives.mp4';
import birdsongUrl from '../assets/birdsong.m4a';

let started = false;

export function preloadStory(): void {
  if (started) return;
  started = true;
  for (const url of [emptyUrl, busUrl, masksUrl, masks2Url]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
  void fetch(birdsongUrl).catch(() => {});
  void fetch(filmUrl).catch(() => {});
}
