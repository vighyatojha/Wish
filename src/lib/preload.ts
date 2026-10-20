// ─────────────────────────────────────────────────────────────
//  Downloads page 2's pieces while she is still on page 1, and
//  reports how far along it is, so page 2 is only revealed once its
//  pictures have really arrived (on a slow connection they can take
//  a minute; before, the scene started anyway, over black).
//
//  Order: the pictures first (needed the moment the fog clears),
//  then the bus film (needed a minute later), then the birdsong.
//  Each file is downloaded once and handed out as a local blob: URL,
//  so nothing is fetched twice. If anything goes wrong, the normal
//  address is used instead.
// ─────────────────────────────────────────────────────────────
import emptyUrl from '../assets/stop-empty.webp';
import busUrl from '../assets/stop-bus.webp';
import masksUrl from '../assets/stop-masks.webp';
import masks2Url from '../assets/stop-masks2.webp';
import lampUrl from '../assets/street-lamp.webp';
import moonUrl from '../assets/moon.webp';
import morningUrl from '../assets/stop-morning.webp';
import filmUrl from '../assets/bus-arrives.mp4';
import birdsongUrl from '../assets/birdsong.m4a';
import flowerSongUrl from '../assets/flower-song.mp3';

export const PICTURES = { morning: morningUrl, empty: emptyUrl, bus: busUrl, masks: masksUrl, masks2: masks2Url, lamp: lampUrl, moon: moonUrl };
export type PictureKey = keyof typeof PICTURES;
export type Pictures = Record<PictureKey, string>;

// Rough sizes, used for the progress bar until the server reports the real ones.
const GUESS: Record<string, number> = {
  [emptyUrl]: 260e3, [busUrl]: 255e3, [masksUrl]: 19e3, [masks2Url]: 138e3, [lampUrl]: 7e3, [moonUrl]: 38e3, [morningUrl]: 250e3,
  [filmUrl]: 1.03e6, [birdsongUrl]: 108e3,
};

export interface Progress {
  pictures: number; // 0–1
  film: number;     // 0–1
}

const total: Record<string, number> = { ...GUESS };
const got: Record<string, number> = {};
const listeners = new Set<(p: Progress) => void>();

function share(urls: string[]): number {
  let a = 0, b = 0;
  for (const u of urls) { a += Math.min(got[u] ?? 0, total[u]); b += total[u]; }
  return b ? a / b : 1;
}
export function progress(): Progress {
  return { pictures: share(Object.values(PICTURES)), film: share([filmUrl]) };
}
export function onProgress(cb: (p: Progress) => void): () => void {
  listeners.add(cb);
  cb(progress());
  return () => listeners.delete(cb);
}
let pending = 0;
function tell() {
  if (pending) return;
  pending = requestAnimationFrame(() => { pending = 0; const p = progress(); listeners.forEach((cb) => cb(p)); });
}

/** when any download last received bytes (a file waiting its turn behind others isn't stuck) */
let lastByteAt = 0;

/** Downloads one file with progress. Gives up on a real stall (no bytes for this file, and none for
 *  any other either, for 25 s) and tries again, twice. */
async function download(url: string): Promise<string> {
  if (!location.protocol.startsWith('http')) return url;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    let stall = 0, mine = performance.now();
    const check = () => {
      const quiet = performance.now() - Math.max(mine, lastByteAt);
      if (quiet > 25000) ctrl.abort(); else stall = window.setTimeout(check, 5000);
    };
    const poke = () => { mine = lastByteAt = performance.now(); };
    try {
      stall = window.setTimeout(check, 5000);
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const len = Number(res.headers.get('content-length'));
      if (len > 0) total[url] = len;
      got[url] = 0;
      const reader = res.body.getReader();
      const parts: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        poke();
        parts.push(value);
        got[url] += value.length;
        tell();
      }
      clearTimeout(stall);
      total[url] = got[url];
      tell();
      const type = res.headers.get('content-type') ?? '';
      return URL.createObjectURL(new Blob(parts as BlobPart[], { type }));
    } catch (err) {
      clearTimeout(stall);
      console.warn(`[load] ${url.split('/').pop()} failed (try ${attempt + 1}):`, err);
    }
  }
  // could not download it ourselves: let the browser try the normal address
  got[url] = total[url];
  tell();
  return url;
}

/** Waits until an image can be drawn (decoded), so the first frame is never blank. */
function decoded(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { (img.decode?.() ?? Promise.resolve()).catch(() => {}).finally(() => resolve(src)); };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

let started: { pictures: Promise<Pictures>; film: Promise<string>; birdsong: Promise<string>; flowerSong: Promise<string> } | null = null;

export function preloadStory() {
  if (started) return started;
  const keys = Object.keys(PICTURES) as PictureKey[];
  const pictures = Promise.all(keys.map((k) => download(PICTURES[k]).then(decoded)))
    .then((urls) => Object.fromEntries(keys.map((k, i) => [k, urls[i]])) as Pictures);
  // the film and the birdsong only start once the pictures are in, so they don't slow them down
  const film = pictures.then(() => download(filmUrl));
  const birdsong = film.then(() => download(birdsongUrl));
  // the song for her flowers comes last of all: it's only needed at the very end, minutes later
  const flowerSong = birdsong.then(() => download(flowerSongUrl));
  started = { pictures, film, birdsong, flowerSong };
  return started;
}

export const loadedPictures = () => preloadStory().pictures;
export const loadedFilm = () => preloadStory().film;
export const loadedBirdsong = () => preloadStory().birdsong;
export const loadedFlowerSong = () => preloadStory().flowerSong;
