// ─────────────────────────────────────────────────────────────
//  Her flower, on a black screen: the last gift.
//  A seed of light drops into the dark; roots spread; a sprout rises;
//  the stem climbs, leaves unfold, and the bud opens into the flower
//  she chose. More stems rise from the same roots, each opening into
//  the same flower in another colour, until there's a bunch of them
//  (tulips: red, pink, yellow · lilies: red, burgundy, pink, yellow,
//  blue, crimson · lotuses: pink, white, hot pink, purple, peach, blue).
//
//  Every flower is one of her own pictures, cut out of its black
//  background, so when it's open it looks exactly like the picture.
//  They open by turning thin wedges of the picture about the point the
//  petals grow from: folded up, the wedges make a bud; turning back out
//  (the outer petals last) they become the flower.
// ─────────────────────────────────────────────────────────────
import lilyBlueUrl from '../assets/flower-lily.webp';
import lotusBlueUrl from '../assets/flower-lotus.webp';

export type FlowerKind = 'Tulip' | 'Lily' | 'Lotus';
type P2 = [number, number];
type RGB = [number, number, number];

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const eo = (t: number) => { t = clamp(t); return 1 - (1 - t) ** 3; };
const eio = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
const spring = (t: number, k = 6, w = 11) => (t <= 0 ? 0 : 1 - Math.exp(-t * k) * Math.cos(t * w));
function rng(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function bez(a: P2, b: P2, c: P2, d: P2, t: number): P2 {
  const u = 1 - t;
  return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]];
}

// Her flower pictures, cut out of black (src/assets/flowers): each with the point its petals grow
// from (where the stem joins; for the front-facing blue lily, its centre) and the colour of its glow.
const FLOWER_URLS = import.meta.glob('../assets/flowers/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const url = (name: string) => FLOWER_URLS[`../assets/flowers/${name}.webp`];
interface Variant { url: string; pivot: P2; glow: RGB; star?: boolean }
const V = (name: string, pivot: P2, glow: RGB): Variant => ({ url: url(name), pivot, glow });
/** the first is the one in the middle; the rest gather round it */
const BUNCH: Record<FlowerKind, Variant[]> = {
  Tulip: [
    V('tulip-red', [0.467, 0.98], [196, 26, 22]), V('tulip-pink', [0.432, 0.98], [238, 96, 135]), V('tulip-yellow', [0.487, 0.987], [240, 169, 31]),
    V('tulip-pink', [0.432, 0.98], [238, 96, 135]), V('tulip-yellow', [0.487, 0.987], [240, 169, 31]), V('tulip-red', [0.467, 0.98], [196, 26, 22]),
  ],
  Lily: [
    V('lily-red', [0.44, 0.983], [219, 62, 43]), V('lily-burgundy', [0.448, 0.968], [171, 47, 87]), V('lily-small-pink', [0.445, 0.963], [218, 125, 142]),
    V('lily-small-yellow', [0.445, 0.963], [232, 174, 29]), { url: lilyBlueUrl, pivot: [0.519, 0.63], glow: [60, 110, 255], star: true },
    V('lily-small-crimson', [0.445, 0.951], [193, 37, 61]),
  ],
  Lotus: [
    V('lotus-pink', [0.504, 0.897], [235, 144, 138]), V('lotus-white', [0.518, 0.892], [228, 198, 166]), V('lotus-hotpink', [0.497, 0.857], [233, 101, 126]),
    V('lotus-purple', [0.464, 0.889], [179, 132, 185]), V('lotus-peach', [0.497, 0.896], [236, 168, 118]),
    { url: lotusBlueUrl, pivot: [0.543, 0.728], glow: [70, 140, 255] },
  ],
};

/** a flower picture, ready to draw: itself, a dimmer copy (for the ones further back), and its glow */
interface Art { img: CanvasImageSource; dim: CanvasImageSource; glow: HTMLCanvasElement; w: number; h: number; pivot: P2; star: boolean }

function glowSprite(c: RGB, core = 1): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d')!, gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  const [r, g, b] = c;
  gr.addColorStop(0, `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)},${core})`);
  gr.addColorStop(0.22, `rgba(${r},${g},${b},0.5)`); gr.addColorStop(0.55, `rgba(${r},${g},${b},0.12)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return cv;
}
function dimmed(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d')!;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
const cache = new Map<string, Promise<Art | null>>();
/** One picture (tried up to three times on a bad connection). Resolves null if it can't be had. */
function loadArt(v: Variant): Promise<Art | null> {
  const key = v.url;
  if (!cache.has(key)) {
    const once = () => new Promise<HTMLImageElement | null>((res) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = v.url;
    });
    const p = (async () => {
      for (let i = 0; i < 3; i++) {
        const img = await once();
        if (img) return { img, dim: dimmed(img), glow: glowSprite(v.glow, 0.9), w: img.naturalWidth, h: img.naturalHeight, pivot: v.pivot, star: !!v.star };
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
      cache.delete(key); // (so a later call tries again)
      return null;
    })();
    cache.set(key, p);
  }
  return cache.get(key)!;
}

/** Starts loading every picture for this flower's bunch (the middle one first). Call early. */
export function loadFlower(kind: FlowerKind): Promise<(Art | null)[]> {
  return Promise.all(BUNCH[kind].map(loadArt));
}
/** The middle flower of every kind: small, so it's worth having before she even chooses. */
export function preloadFlowers(): void {
  (Object.keys(BUNCH) as FlowerKind[]).forEach((k) => void loadArt(BUNCH[k][0]));
}

interface Root { pts: P2[]; t0: number; dur: number; w: number }
interface Head { vi: number; star: boolean; waited: number; art?: Art; main: boolean; tip: P2; bow: number; t0: number; dur: number; size: number; spin: number; depth: number; seed: number; leaves: { u: number; side: number; L: number }[] }
interface Mote { x: number; y: number; vx: number; vy: number; life: number; age: number; r: number; tw: number }

const BLUE = [110, 180, 255] as const;
const WEDGES: Record<number, number[]> = {};

export class Bloom {
  private g: CanvasRenderingContext2D;
  private W = 1; private H = 1; private dpr = 1;
  private raf = 0;
  private roots: Root[] = [];
  private heads: Head[] = [];
  private motes: Mote[] = [];
  private glowSprite: HTMLCanvasElement;
  private done?: () => void;
  private cued = new Set<string>();
  /** moments worth a sound: 'land' (the seed) and 'bloom' (each flower opening) */
  onCue: (cue: 'land' | 'bloom') => void = () => {};

  /** shown softly under the roots only if a picture is still downloading when its flower should open */
  waitingText = '';
  /** her pictures as they arrive: undefined = still coming, null = couldn't be had */
  private arts: (Art | null | undefined)[];
  private variants: Variant[];
  /** the bloom's own clock: it holds still (only the motes move) while a picture is still on its way */
  private clock = 0;
  private lastNow = 0;
  private waiting = 0;

  constructor(private canvas: HTMLCanvasElement, private kind: FlowerKind) {
    this.g = canvas.getContext('2d')!;
    this.glowSprite = glowSprite([110, 180, 255]);
    this.variants = BUNCH[kind];
    this.arts = this.variants.map(() => undefined);
    this.variants.forEach((v, i) => void loadArt(v).then((a) => { this.arts[i] = a; }));
    this.plan();
  }

  /** the picture for this flower: its own, or once it has waited long enough (or failed), any that has arrived */
  private artOf(h: Head): Art | undefined {
    if (h.art) return h.art; // (once chosen it stays: no swapping pictures mid-bloom)
    const own = this.arts[h.vi];
    if (own) return (h.art = own);
    if (own === null || h.waited > (h.main ? 20 : 8)) h.art = this.arts.find((a): a is Art => !!a);
    return h.art;
  }
  /** a flower that should be showing by now but has no picture yet (and might still get one) */
  private blocked(): Head | undefined {
    if (this.arts.every((a) => a === null)) return undefined; // (nothing will come: carry on without)
    return this.heads.find((h) => this.clock >= h.t0 + h.dur * 0.8 && !this.artOf(h));
  }

  private plan() {
    const r = rng(1234);
    const grow = (x: number, y: number, a: number, len: number, depth: number, t0: number) => {
      const n = 9, pts: P2[] = [[x, y]], dur = 0.9 + len * 3.2;
      for (let i = 1; i <= n; i++) {
        a += (r() - 0.5) * 0.55 + (Math.PI / 2 - a) * 0.12;
        x += Math.cos(a) * (len / n); y += Math.sin(a) * (len / n);
        pts.push([x, y]);
        if (depth < 3 && i > 2 && i < n - 1 && r() < 0.34) grow(x, y, a + (r() < 0.5 ? -1 : 1) * (0.55 + r() * 0.5), len * (0.45 + r() * 0.2), depth + 1, t0 + dur * (i / n));
      }
      this.roots.push({ pts, t0, dur, w: 0.011 / (1 + depth * 0.7) });
    };
    for (const a of [Math.PI / 2, Math.PI / 2 - 0.95, Math.PI / 2 + 0.95, Math.PI / 2 - 0.42, Math.PI / 2 + 0.45]) grow(0, 0.01, a, 0.22 + r() * 0.12, 0, 1.6 + r() * 0.5);

    // a bunch: the first one in the middle, then the others around it, each its own colour;
    // depth 0 = behind (a little dimmer), 2 = in front
    const H = (vi: number, main: boolean, tip: P2, bow: number, t0: number, dur: number, size: number, spin: number, depth: number): Head => ({
      vi, star: !!this.variants[vi].star, waited: 0, main, tip, bow, t0, dur, size, spin, depth, seed: r() * 100,
      leaves: [{ u: 0.28 + r() * 0.1, side: r() < 0.5 ? -1 : 1, L: 0.17 + r() * 0.06 }, { u: 0.5 + r() * 0.1, side: 0, L: 0.13 + r() * 0.05 }],
    });
    const n = this.variants.length;
    // (size: the picture's larger side, as a share of the main stem's length; tulips are cups, so a little smaller)
    const s0 = this.kind === 'Tulip' ? 0.46 : 0.74;
    this.heads.push(H(0, true, [0.0, -1.0], 0.03, 4.6, 3.3, s0, 0, 1));
    const ring: [number, number, number, number, number][] = [ // x, y, size (× main), spin, depth
      [-0.5, -0.84, 0.8, -0.3, 0], [0.5, -0.86, 0.8, 0.3, 0], [-0.31, -0.56, 0.74, -0.16, 2], [0.32, -0.58, 0.74, 0.18, 2], [0.02, -0.66, 0.64, 0.05, 0],
    ];
    ring.forEach(([x, y, s, spin, depth], i) => {
      const vi = (i + 1) % n, star = !!this.variants[vi].star;
      this.heads.push(H(vi, false, [x, y], x * 0.12, 9.3 + i * 0.7, 2.6, s0 * s * (star ? 0.85 : 1), star ? spin * 2.4 : spin, depth));
    });
    this.heads.sort((a, b) => a.depth - b.depth);
  }

  resize(W: number, H: number) {
    this.W = W; this.H = H;
    // (phones: their screens are dense; 1.5× is plenty for soft, glowing flowers)
    this.dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia?.('(pointer: coarse)').matches ? 1.5 : 2);
    this.snap = null;
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
  }

  /** Grows it all; resolves once the last flower has opened (it goes on glowing afterwards). */
  play(): Promise<void> {
    this.lastNow = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, Math.max(0, (now - this.lastNow) / 1000));
      this.lastNow = now;
      const held = this.blocked();
      if (held) { held.waited += dt; this.waiting += dt; } else { this.clock += dt; this.waiting = 0; }
      // (the "on their way" line fades in only after a real wait, and out again once the picture is here)
      this.hint += ((this.waiting > 1.5 ? 1 : 0) - this.hint) * Math.min(1, dt * 2.5);
      this.draw(this.clock, held);
    };
    this.raf = requestAnimationFrame(loop);
    return new Promise((res) => { this.done = res; });
  }
  destroy() { cancelAnimationFrame(this.raf); }
  private cue(name: string, c: 'land' | 'bloom') { if (!this.cued.has(name)) { this.cued.add(name); this.onCue(c); } }

  /** the finished bunch, drawn once (it hardly changes after that: it sways a little, and the motes move) */
  private snap: HTMLCanvasElement | null = null;
  private settledAt = 0;

  private hint = 0;
  private draw(t: number, held?: Head) {
    const { W, H, dpr } = this;
    const last = this.heads.reduce((m, h) => Math.max(m, h.t0 + h.dur), 0);
    if (!this.snap && t > last + 4.5) {
      // everything has opened: keep a picture of it (without the motes) and draw that from now on
      const c = document.createElement('canvas');
      c.width = this.canvas.width; c.height = this.canvas.height;
      const real = this.g;
      this.g = c.getContext('2d')!;
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.scene(t, false);
      this.g = real;
      this.snap = c;
      this.settledAt = t;
    }
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    if (this.snap) {
      const [bx, by] = this.base();
      const sw = Math.sin((t - this.settledAt) * 0.7) * 0.006;
      g.save();
      g.translate(bx, by); g.rotate(sw); g.translate(-bx, -by);
      g.drawImage(this.snap, 0, 0, W, H);
      g.restore();
      this.spawnMotes(t);
      this.drawMotes();
      return;
    }
    this.scene(t, true, held);
    if (t > last + 3.6 && this.done) { this.done(); this.done = undefined; }
  }

  /** while a picture is still downloading: its bud glows softly at the top of its stem, and a quiet line says so */
  private drawWaiting(held: Head | undefined, tipAt: P2 | undefined) {
    const g = this.g, { U } = this, now = this.lastNow / 1000;
    if (held && tipAt) this.glow(tipAt[0], tipAt[1], U * 0.09 * (0.85 + 0.15 * Math.sin(now * 3)), 0.55 + 0.25 * Math.sin(now * 3));
    if (this.hint < 0.01 || !this.waitingText) return;
    const size = Math.max(14, Math.min(19, this.W * 0.038));
    g.save();
    g.globalAlpha = this.hint * (0.55 + 0.15 * Math.sin(now * 2));
    g.fillStyle = 'rgb(190,215,255)';
    g.font = `italic ${size}px "EB Garamond", Georgia, serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(this.waitingText, this.W / 2, this.H * 0.16); // (up where her name will grow: empty until then)
    g.restore();
  }

  private layout() {
    const { W, H } = this, portrait = W / H < 1;
    // (on wide screens a little lower and smaller, leaving the top for her name)
    const U = Math.min(H * (portrait ? 0.46 : 0.42), W * (portrait ? 0.62 : 0.5));
    return { U, base: [W / 2, H * (portrait ? 0.8 : 0.88)] as P2 };
  }
  private base(): P2 { return this.layout().base; }

  private scene(t: number, live: boolean, held?: Head) {
    let heldTip: P2 | undefined;
    const { g, H } = this;
    const { U, base } = this.layout();
    const P = (x: number, y: number): P2 => [base[0] + x * U, base[1] + y * U];
    this.P = P; this.U = U;

    // ── the dark earth: a faint line of light where it begins, and the roots glowing in it ──
    const show = eo(t / 1.5);
    g.globalCompositeOperation = 'lighter';
    const sl = g.createLinearGradient(base[0] - U, 0, base[0] + U, 0);
    sl.addColorStop(0, 'rgba(90,150,255,0)'); sl.addColorStop(0.5, `rgba(90,150,255,${0.2 * show})`); sl.addColorStop(1, 'rgba(90,150,255,0)');
    g.fillStyle = sl; g.fillRect(base[0] - U, base[1] - 1, U * 2, 2);
    for (const rt of this.roots) {
      const p = clamp((t - rt.t0) / rt.dur);
      if (p <= 0) continue;
      const pts = rt.pts.map(([x, y]) => P(x, y));
      this.line(pts, p, rt.w * U * 3, 'rgba(70,140,255,0.13)');
      this.line(pts, p, Math.max(0.8, rt.w * U), 'rgba(170,215,255,0.8)');
    }
    g.globalCompositeOperation = 'source-over';

    // ── the seed: a blue mote of light falling into the dark ──
    if (t < 4.4) {
      const f = eio(t / 1.6), y0 = H * 0.1, y1 = base[1] + U * 0.012;
      const sx = base[0] + Math.sin(t * 3) * 10 * (1 - f), sy = y0 + (y1 - y0) * f;
      const fade = 1 - clamp((t - 3.4) / 1);
      for (let k = 1; k <= 7; k++) { const tf = eio((t - k * 0.045) / 1.6); this.glow(sx, y0 + (y1 - y0) * tf, U * 0.04 * (1 - k / 8), 0.3 * fade * (1 - f * 0.8)); }
      this.glow(sx, sy, U * 0.14 * (0.8 + 0.2 * Math.sin(t * 7)), 0.95 * fade);
      if (t > 1.6) {
        this.cue('land', 'land');
        if (!this.cued.has('dust')) { this.cued.add('dust'); for (let i = 0; i < 30; i++) this.mote(sx, sy, (Math.random() - 0.5) * 130, -Math.random() * 120, 0.9 + Math.random() * 0.7, 1 + Math.random() * 1.6); }
      }
    }

    // ── the sprout's two seed leaves ──
    const sprout = spring((t - 3.7) / 1.6, 5, 9) * (1 - clamp((t - 9) / 2));
    if (sprout > 0.01) for (const side of [-1, 1]) this.leaf(P(0, -0.07 * clamp((t - 3.6) / 0.8)), -Math.PI / 2 + side * 1.05, U * 0.07 * sprout, side * 0.4);

    // ── stems and leaves (all), then the flowers back to front ──
    const flowers: (() => void)[] = [];
    for (const h of this.heads) {
      const p = eio((t - h.t0) / h.dur);
      if (p <= 0) continue;
      const sw = Math.sin(t * 0.8 + h.seed) * 0.02 * clamp(t - h.t0 - h.dur);
      const ca = Math.cos(sw), sa = Math.sin(sw);
      const rot = (q: P2): P2 => [q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca];
      const tip = rot(h.tip), c1 = rot([h.tip[0] * 0.08 + h.bow, h.tip[1] * 0.35]), c2 = rot([h.tip[0] * 0.8 + h.bow * 1.3, h.tip[1] * 0.72]);
      const pts: P2[] = [];
      for (let i = 0; i <= 32; i++) { const q = bez([0, 0], c1, c2, tip, i / 32); pts.push(P(q[0], q[1])); }
      const dim = h.depth === 0 ? 0.7 : 1;
      this.line(pts, p, Math.max(2, U * 0.016), `rgba(20,70,34,${dim})`);
      this.line(pts, p, Math.max(1, U * 0.008), `rgba(70,150,60,${0.9 * dim})`);
      g.globalCompositeOperation = 'lighter';
      this.line(pts, p, Math.max(1, U * 0.003), `rgba(140,230,200,${0.25 * dim})`);
      g.globalCompositeOperation = 'source-over';
      for (const lf of h.leaves) {
        if (p < lf.u) continue;
        const k = spring((t - (h.t0 + h.dur * lf.u)) / 1.2, 6, 10);
        const i = Math.round(lf.u * 32), q = pts[i], q2 = pts[Math.min(32, i + 1)];
        const ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
        const side = lf.side || (h.tip[0] >= 0 ? 1 : -1);
        this.leaf(q, ang + side * 0.75, U * lf.L * k, side * 0.6, dim);
      }
      if (h === held) heldTip = pts[Math.round(p * 32)];
      const art = this.artOf(h);
      if (p > 0.85 && art) {
        const end = pts[32], pre = pts[29];
        const dir = Math.atan2(end[1] - pre[1], end[0] - pre[0]) + Math.PI / 2;
        flowers.push(() => this.flower(h, art, end, dir + h.spin * (art.star ? 1 : 0.35), t, U));
      }
    }
    for (const f of flowers) f();

    if (!live) return;
    this.drawWaiting(held, heldTip);
    this.spawnMotes(t);
    this.drawMotes();
  }

  private P: (x: number, y: number) => P2 = (x, y) => [x, y];
  private U = 1;
  // ── motes of light drifting up off the flowers, and a few always hanging in the dark, like in her pictures ──
  private spawnMotes(t: number) {
    const { W, H, P, U } = this;
    if (t > 8 && this.motes.length < 60 && Math.random() < 0.35) {
      const h = this.heads[Math.floor(Math.random() * this.heads.length)];
      if (t > h.t0 + h.dur + 0.5) {
        const [x, y] = P(h.tip[0], h.tip[1] - h.size * 0.3);
        this.mote(x + (Math.random() - 0.5) * U * h.size * 0.8, y + (Math.random() - 0.5) * U * h.size * 0.4, (Math.random() - 0.5) * 12, -14 - Math.random() * 24, 3 + Math.random() * 2.5, 0.7 + Math.random() * 1.4);
      }
    }
    if (this.motes.length < 24 && Math.random() < 0.1) this.mote(Math.random() * W, H * (0.1 + Math.random() * 0.7), (Math.random() - 0.5) * 6, -4 - Math.random() * 6, 5 + Math.random() * 4, 0.6 + Math.random() * 1.2);
  }

  // ── a flower: the picture, opening wedge by wedge about where its petals grow from ──
  private flower(h: Head, A: Art, at: P2, dir: number, t: number, U: number) {
    const g = this.g;
    // the bud forms as the stem finishes, waits a moment, then opens slowly
    const bloomStart = h.t0 + h.dur + (h.main ? 0.9 : 0.5);
    const open = clamp((t - bloomStart) / (h.main ? 3.4 : 2.8));
    const grow = eo((t - h.t0 - h.dur * 0.8) / 1.4);
    if (grow <= 0.01) return;
    if (open > 0.4) this.cue(`b${h.seed}`, 'bloom');
    const big = Math.max(A.w, A.h);
    const k = ((h.size * U) / big) * (0.55 + 0.45 * grow) * (1 + Math.sin(t * 1.3 + h.seed) * 0.01 * open);
    const px = A.pivot[0] * A.w, py = A.pivot[1] * A.h;
    // a halo of its own colour behind it (centred on the flower, above where it joins the stem)
    const up = (A.star ? 0 : py - A.h * 0.45) * k;
    const cx = at[0] + Math.sin(dir) * up, cy = at[1] - Math.cos(dir) * up;
    const halo = big * k * (0.55 + 0.3 * open), ha = (0.16 + 0.14 * open) * grow * (h.depth === 0 ? 0.6 : 1);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = ha;
    g.drawImage(A.glow, cx - halo, cy - halo, halo * 2, halo * 2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    const img = h.depth === 0 ? A.dim : A.img;
    if (open >= 1) {
      g.save();
      g.translate(at[0], at[1]); g.rotate(dir); g.scale(k, k);
      g.drawImage(img, -px, -py);
      g.restore();
    } else {
      // folded: every wedge turned towards the top; opening, the outer ones last
      const N = 30, closedK = A.star ? 0.08 : 0.1, r0 = A.star ? 0.5 : 0.6, R = Math.hypot(A.w, A.h) * 1.2, eps = (TAU / N) * 0.12;
      const order = WEDGES[N] ??= Array.from({ length: N }, (_, i) => i).sort((a, b) => Math.abs(this.phi(a, N)) - Math.abs(this.phi(b, N)));
      for (const i of order) {
        const phi = this.phi(i, N);
        const delay = (Math.abs(phi) / Math.PI) * (A.star ? 0.25 : 0.45);
        // slow to start, unfurling, settling with the slightest give
        const x = clamp((open - delay) / (1 - delay));
        const q = eio(x) + Math.sin(Math.PI * x) * 0.05 * x;
        const f = closedK + (1 - closedK) * q, rs = r0 + (1 - r0) * Math.min(1, q);
        const a0 = -Math.PI / 2 + phi - Math.PI / N - eps, a1 = -Math.PI / 2 + phi + Math.PI / N + eps;
        g.save();
        g.translate(at[0], at[1]);
        g.rotate(dir + phi * f - phi);
        g.scale(k * rs, k * rs);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); g.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); g.closePath();
        g.clip();
        g.drawImage(img, -px, -py);
        g.restore();
      }
    }
  }
  private phi(i: number, N: number) { return -Math.PI + ((i + 0.5) / N) * TAU; }

  // ── small things ──
  private line(pts: P2[], frac: number, w: number, col: string) {
    const g = this.g, n = pts.length - 1, end = frac * n;
    if (end <= 0) return;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    const k = Math.floor(end);
    for (let i = 1; i <= k; i++) g.lineTo(pts[i][0], pts[i][1]);
    if (k < n) { const f = end - k, a = pts[k], b = pts[k + 1]; g.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); }
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.stroke();
  }
  private glow(x: number, y: number, r: number, a: number) {
    if (a <= 0.003 || r <= 0) return;
    const g = this.g;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = Math.min(1, a);
    g.drawImage(this.glowSprite, x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  private leaf(at: P2, ang: number, L: number, bend: number, dim = 1) {
    if (L < 1) return;
    const g = this.g;
    g.save();
    g.translate(at[0], at[1]);
    g.rotate(ang);
    const w = L * 0.22;
    const path = new Path2D();
    path.moveTo(0, 0);
    path.bezierCurveTo(L * 0.3, -w * (1.2 + bend * 0.3), L * 0.75, -w * (0.9 + bend * 0.3), L, bend * w * 0.4);
    path.bezierCurveTo(L * 0.72, w * (0.9 - bend * 0.3), L * 0.3, w * (1.0 - bend * 0.3), 0, 0);
    const gr = g.createLinearGradient(0, -w, 0, w);
    gr.addColorStop(0, `rgba(40,150,90,${0.92 * dim})`); gr.addColorStop(0.5, `rgba(16,92,52,${0.94 * dim})`); gr.addColorStop(1, `rgba(6,48,30,${0.96 * dim})`);
    g.fillStyle = gr; g.fill(path);
    g.strokeStyle = `rgba(120,240,215,${0.5 * dim})`; g.lineWidth = Math.max(0.6, L * 0.012); g.stroke(path);
    g.strokeStyle = `rgba(150,240,200,${0.3 * dim})`;
    g.beginPath(); g.moveTo(L * 0.05, 0); g.quadraticCurveTo(L * 0.5, -w * 0.15 + bend * w * 0.1, L * 0.92, bend * w * 0.35); g.stroke();
    g.restore();
  }
  private mote(x: number, y: number, vx: number, vy: number, life: number, r: number) {
    if (this.motes.length > 90) return;
    this.motes.push({ x, y, vx, vy, life, age: 0, r, tw: Math.random() * 6 });
  }
  private drawMotes() {
    const g = this.g, dt = 1 / 60;
    g.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.985; m.vy = m.vy * 0.99 - 2 * dt;
      const a = Math.sin(Math.PI * clamp(m.age / m.life)) * (0.7 + 0.3 * Math.sin(m.age * 5 + m.tw));
      g.globalAlpha = a * 0.85;
      g.drawImage(this.glowSprite, m.x - m.r * 3.5, m.y - m.r * 3.5, m.r * 7, m.r * 7);
      g.fillStyle = `rgb(${BLUE[0] + 120},${BLUE[1] + 70},255)`;
      g.fillRect(m.x - m.r * 0.5, m.y - m.r * 0.5, m.r, m.r);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    this.motes = this.motes.filter((m) => m.age < m.life);
  }
}
