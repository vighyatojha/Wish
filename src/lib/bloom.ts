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
const backOut = (t: number) => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
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

/** more colours, only for the field of flowers that spreads out afterwards */
const EXTRA: Record<FlowerKind, Variant[]> = {
  Tulip: [],
  Lily: [V('lily-small-red', [0.445, 0.963], [214, 50, 36]), V('lily-small-burgundy', [0.425, 0.95], [150, 40, 80])],
  Lotus: [],
};

/** a flower picture, ready to draw: itself, a dimmer copy (for the ones further back), and its glow */
interface Art { img: CanvasImageSource; dim: CanvasImageSource; soft?: HTMLCanvasElement; src: HTMLImageElement; glow: HTMLCanvasElement; w: number; h: number; pivot: P2; star: boolean }

function glowSprite(c: RGB, core = 1): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d')!, gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  const [r, g, b] = c;
  gr.addColorStop(0, `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 60)},${core})`);
  gr.addColorStop(0.22, `rgba(${r},${g},${b},0.5)`); gr.addColorStop(0.55, `rgba(${r},${g},${b},0.12)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return cv;
}
/** far away: out of focus, darker and a little blue with the night air */
function softened(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d')!;
  x.filter = `blur(${Math.max(4, Math.round(img.naturalWidth / 38))}px)`;
  x.drawImage(img, 0, 0);
  x.filter = 'none';
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(10,18,44,0.5)'; x.fillRect(0, 0, c.width, c.height);
  return c;
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
        if (img) return { img, src: img, dim: dimmed(img), glow: glowSprite(v.glow, 0.9), w: img.naturalWidth, h: img.naturalHeight, pivot: v.pivot, star: !!v.star };
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

interface Root { pts: P2[]; t0: number; dur: number; w: number; field?: boolean; fadeAt?: number }
/** a leaf on a stem: where along it (0 = its foot), which side, how long; and (optional) how broad and how
 *  close it stands to the stem (radians), for each flower's own kind of leaf */
interface Leaf { u: number; side: number; L: number; w?: number; a?: number }
interface Head { vi: number; star: boolean; waited: number; art?: Art; main: boolean; root: number; gy: number; fade: number; grass?: number; field: boolean; thin: number; tip: P2; bow: number; t0: number; dur: number; size: number; spin: number; depth: number; seed: number; leaves: Leaf[];
  /** where the flower is (its stem is worked out from here and where it starts) */
  abs?: P2;
  /** (lilies) it branches off the main stem this far up it, rather than rising from the ground */
  branch?: number }
/** something under the ground (or the water), drawn as glowing lines: it grows from t0 over dur */
interface Under { t0: number; dur: number; draw: (p: number, a: number) => void }
/** a lotus leaf: floating flat on the water, or held up above it on its own stalk */
interface Pad { x: number; y: number; r: number; t0: number; raised: number; seed: number; node: number }
interface Mote { x: number; y: number; vx: number; vy: number; life: number; age: number; r: number; tw: number }

const BLUE = [110, 180, 255] as const;
const WEDGES: Record<number, number[]> = {};

export class Bloom {
  private g: CanvasRenderingContext2D;
  private W = 1; private H = 1; private dpr = 1;
  private raf = 0;
  private roots: Root[] = [];
  private under: Under[] = [];
  private pads: Pad[] = [];
  private heads: Head[] = [];
  /** (lilies) the main stem as it was last drawn, for the flowers that branch off it */
  private trunk: P2[] | null = null;
  private motes: Mote[] = [];
  private glowSprite: HTMLCanvasElement;
  private done?: () => void;
  /** resolves once everything (the bunch and the whole meadow) has finished opening */
  private onSettled: () => void = () => {};
  readonly settled = new Promise<void>((r) => { this.onSettled = r; });
  private cued = new Set<string>();
  /** moments worth a sound: 'land' (the seed) and 'bloom' (each flower opening) */
  onCue: (cue: 'land' | 'bloom' | 'spread') => void = () => {};

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
    this.variants = [...BUNCH[kind], ...EXTRA[kind]];
    this.arts = this.variants.map(() => undefined);
    this.variants.forEach((v, i) => void loadArt(v).then((a) => { this.arts[i] = a; }));
    this.plan();
  }

  /** the picture for this flower: its own, or once it has waited long enough (or failed), any that has arrived */
  private artOf(h: Head): Art | undefined {
    if (h.art) return h.art; // (once chosen it stays: no swapping pictures mid-bloom)
    const own = this.arts[h.vi];
    if (own) return (h.art = own);
    if (own === null || h.field || h.waited > (h.main ? 20 : 8)) h.art = this.arts.find((a): a is Art => !!a);
    return h.art;
  }
  /** a flower that should be showing by now but has no picture yet (and might still get one) */
  private blocked(): Head | undefined {
    if (this.arts.every((a) => a === null)) return undefined; // (nothing will come: carry on without)
    return this.heads.find((h) => this.clock >= h.t0 + h.dur * 0.8 && !this.artOf(h));
  }

  // ── each flower grows its own way ──
  //  • tulips: each flower from its own bulb, a papery teardrop just under the ground with a tuft of fine
  //    roots from its base; two broad leaves come up from the ground round each stem;
  //  • lilies: one scaly bulb (stout roots below it, and a few little roots on the stem above it), and one
  //    tall stem, its narrow leaves spiralling up it; at the top it branches, a flower on each branch;
  //  • lotuses: in water. The seed drops through the surface (rings spread out across it) to the mud, where
  //    a root stock runs out sideways, node by node, fine roots hanging from each node. Round leaves unroll
  //    flat on the water first, a couple are held up on stalks; then bare stalks carry the buds up.
  //  Under the ground / water everything is drawn as faint glowing lines, as if seen through it.
  private seedDepth = 0.02;
  private plan() {
    const r = rng(1234);
    const kind = this.kind;
    // depth 0 = behind (a little dimmer), 2 = in front
    const H = (vi: number, main: boolean, tip: P2, bow: number, t0: number, dur: number, size: number, spin: number, depth: number): Head => ({
      vi, star: !!this.variants[vi].star, waited: 0, main, root: 0, gy: 0, fade: 1, field: false, thin: 1, tip, bow, t0, dur, size, spin, depth, seed: r() * 100, abs: tip, leaves: [],
    });
    const n = BUNCH[kind].length;
    // (size: the picture's larger side, as a share of the main stem's length; tulips are cups, so a little smaller)
    const s0 = kind === 'Tulip' ? 0.46 : 0.74;
    const main = H(0, true, [0.0, -1.0], 0.03, 4.6, 3.3, s0, 0, 1);
    this.heads.push(main);
    const ring: [number, number, number, number, number][] = [ // x, y, size (× main), spin, depth
      [-0.5, -0.84, 0.8, -0.3, 0], [0.5, -0.86, 0.8, 0.3, 0], [-0.31, -0.56, 0.74, -0.16, 2], [0.32, -0.58, 0.74, 0.18, 2], [0.02, -0.66, 0.64, 0.05, 0],
    ];
    ring.forEach(([x, y, s, spin, depth], i) => {
      const vi = (i + 1) % n, star = !!this.variants[vi].star;
      this.heads.push(H(vi, false, [x, y], x * 0.12, 9.3 + i * 0.7, 2.6, s0 * s * (star ? 0.85 : 1), star ? spin * 2.4 : spin, depth));
    });
    // (a stem's flower stays where it is; its stem now starts at `root`, on the ground)
    const from = (h: Head, x: number) => { h.root = x; h.tip = [h.abs![0] - x, h.abs![1]]; h.bow = h.tip[0] * 0.12 + (h.main ? 0.03 : 0); };

    if (kind === 'Tulip') {
      this.seedDepth = 0.075;
      // (the bulbs sit side by side, in the order of their flowers, so no stems cross)
      const order = [...this.heads].sort((a, b) => a.abs![0] - b.abs![0]);
      for (const h of this.heads) {
        const bx = (order.indexOf(h) - (order.length - 1) / 2) * 0.075;
        const by = 0.068 + r() * 0.03 + (h.depth === 0 ? -0.01 : h.depth === 2 ? 0.012 : 0), bs = h.main ? 0.05 : 0.036 + r() * 0.01;
        from(h, bx);
        // the bulb forms and roots before its shoot comes up
        const bt = h.main ? 1.7 : h.t0 - 2.4;
        this.bulb(bx, by, bs, bt, r);
        this.tuft(bx, by + bs * 0.95, bs, bt + 0.5, 1.8, 12, r);
        this.shoot(bx, by - bs * 1.85, bx, 0, h.t0 - 0.45, 0.5);
        const out = h.abs![0] < -0.05 ? -1 : h.abs![0] > 0.05 ? 1 : r() < 0.5 ? -1 : 1;
        h.leaves = h.main
          ? [{ u: 0.02, side: -1, L: 0.44, w: 0.2, a: 0.2 }, { u: 0.05, side: 1, L: 0.36, w: 0.2, a: 0.26 }]
          : [{ u: 0.03, side: out, L: 0.3 + r() * 0.06, w: 0.2, a: 0.3 }];
      }
    } else if (kind === 'Lily') {
      this.seedDepth = 0.09;
      const bs = 0.06;
      this.scales(0, 0.09, bs, 1.7, r);
      this.tuft(0, 0.09 + bs * 0.9, bs * 1.25, 2.2, 2.2, 8, r, 0.006, true);
      // (lilies also root from the stem just above the bulb)
      this.tuft(0, 0.09 - bs * 1.5, bs * 0.45, 4.2, 1.2, 4, r, 0.003);
      this.shoot(0, 0.09 - bs * 1.2, 0, 0, 4.1, 0.5);
      // narrow leaves all the way up the main stem, turning round it as they go
      main.leaves = Array.from({ length: 10 }, (_, i) => ({ u: 0.1 + i * 0.058, side: i % 2 ? 1 : -1, L: 0.15 - i * 0.007, w: 0.13, a: 0.55 }));
      main.thin = 1.15;
      // the others branch off near the top, each on its own little stalk
      for (const h of this.heads) if (!h.main) {
        h.branch = clamp(0.42 + (-h.abs![1] - 0.55) * 0.6, 0.4, 0.66);
        h.thin = 0.6;
        h.leaves = [{ u: 0.12, side: h.abs![0] < 0 ? 1 : -1, L: 0.05, w: 0.16, a: 0.6 }];
      }
    } else {
      // lotus: the root stock in the mud, its nodes reached one by one out from the middle
      this.seedDepth = 0.15;
      const depth = 0.15, nodes = [-0.66, -0.5, -0.34, -0.17, 0, 0.17, 0.34, 0.5, 0.66];
      const at = (x: number) => 2.1 + Math.abs(x) * 3.4;
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1], out = Math.abs(a) > Math.abs(b) ? [b, a] : [a, b];
        this.segment(out[0], out[1], depth + (r() - 0.5) * 0.01, at(out[0]), at(out[1]) - at(out[0]));
      }
      nodes.forEach((x) => this.tuft(x, depth + 0.02, 0.03, at(x) + 0.2, 1.4, 5, r, 0.0025));
      for (const h of this.heads) {
        const nx = nodes.reduce((m, x) => (Math.abs(x - h.abs![0] * 0.62) < Math.abs(m - h.abs![0] * 0.62) ? x : m), 0);
        from(h, nx + (r() - 0.5) * 0.03);
        h.bow = h.tip[0] * 0.05;
        h.thin = 0.75;
        h.leaves = [];
        this.shoot(nx, depth, h.root, 0, h.t0 - 0.5, 0.55);
      }
      // round leaves: flat on the water first, then two held up on stalks
      const flat: [number, number, number][] = [[-0.36, 0.19, 3.5], [0.4, 0.17, 4.1], [-0.12, 0.12, 4.9], [0.18, 0.13, 5.5], [-0.62, 0.14, 7.2], [0.64, 0.12, 7.8]];
      for (const [x, rad, t0] of flat) {
        const node = nodes.reduce((m, q) => (Math.abs(q - x) < Math.abs(m - x) ? q : m), 0);
        this.pads.push({ x, y: 0, r: rad, t0, raised: 0, seed: r() * 100, node });
        this.shoot(node, depth, x, 0, t0 - 0.6, 0.6);
      }
      this.pads.push({ x: -0.22, y: -0.34, r: 0.15, t0: 8.3, raised: 1, seed: r() * 100, node: -0.17 });
      this.pads.push({ x: 0.26, y: -0.26, r: 0.13, t0: 8.9, raised: 1, seed: r() * 100, node: 0.34 });
      for (const pd of this.pads) if (pd.raised) this.shoot(pd.node, depth, pd.x, 0, pd.t0 - 0.9, 0.6);
    }
    this.heads.sort((a, b) => a.depth - b.depth);
    this.bunchEnd = this.heads.reduce((m, h) => Math.max(m, h.t0 + h.dur), 0);
  }

  // ── what grows under the ground (all in U, from the middle of the ground line) ──
  private xray(a: number) { return { core: `rgba(160,205,255,${(0.38 * a).toFixed(3)})`, halo: `rgba(70,140,255,${(0.04 * a).toFixed(3)})` }; }
  private stroke(path: Path2D, w: number, a: number, fill = 0) {
    const g = this.g, c = this.xray(a), U = this.U;
    if (fill > 0) { g.fillStyle = `rgba(110,170,255,${(fill * a).toFixed(3)})`; g.fill(path); }
    g.strokeStyle = c.halo; g.lineWidth = w * U * 3; g.stroke(path);
    g.strokeStyle = c.core; g.lineWidth = Math.max(0.6, w * U); g.stroke(path);
  }
  /** a tulip bulb: a teardrop, round below and pointed above, its papery skin drawn in a few lines */
  private bulb(x: number, y: number, s: number, t0: number, r: () => number) {
    const tw = (r() - 0.5) * 0.2;
    this.under.push({ t0, dur: 1.1, draw: (p, a) => {
      const k = eo(p) * s, [cx, cy] = this.P(x, y), U = this.U, q = k * U;
      const g = this.g;
      g.save(); g.translate(cx, cy); g.rotate(tw);
      const body = new Path2D();
      body.moveTo(0, -q * 1.9);
      body.bezierCurveTo(q * 0.35, -q * 1.25, q * 1.15, -q * 0.7, q * 1.05, q * 0.15);
      body.bezierCurveTo(q, q * 0.8, q * 0.45, q * 1.0, 0, q * 1.0);
      body.bezierCurveTo(-q * 0.45, q * 1.0, -q, q * 0.8, -q * 1.05, q * 0.15);
      body.bezierCurveTo(-q * 1.15, -q * 0.7, -q * 0.35, -q * 1.25, 0, -q * 1.9);
      this.stroke(body, 0.004, a, 0.07);
      const skin = new Path2D();
      skin.moveTo(0, -q * 1.75); skin.bezierCurveTo(q * 0.5, -q * 0.9, q * 0.62, 0, q * 0.4, q * 0.9);
      skin.moveTo(0, -q * 1.75); skin.bezierCurveTo(-q * 0.3, -q * 0.9, -q * 0.4, 0, -q * 0.2, q * 0.95);
      skin.moveTo(-q * 0.55, q * 0.92); skin.lineTo(q * 0.55, q * 0.92);
      this.stroke(skin, 0.0018, a * 0.7);
      g.restore();
    } });
  }
  /** a lily bulb: loose pointed scales, overlapping, like a little artichoke */
  private scales(x: number, y: number, s: number, t0: number, r: () => number) {
    const sc = Array.from({ length: 9 }, (_, i) => {
      const row = i < 5 ? 0 : 1, k = row ? (i - 5) / 3 - 0.5 : i / 4 - 0.5;
      return { bx: k * s * (row ? 0.7 : 1.1), tx: k * s * (row ? 1.0 : 1.7), ty: -s * (row ? 0.95 : 1.15) + (r() - 0.5) * s * 0.15, w: s * (row ? 0.42 : 0.5), d: row ? 0.35 : 0 };
    });
    this.under.push({ t0, dur: 1.4, draw: (p, a) => {
      const [cx, cy] = this.P(x, y), q = this.U;
      for (const c of sc) {
        const k = eo((p - c.d) / (1 - c.d));
        if (k <= 0) continue;
        const bx = cx + c.bx * q * k, by = cy + s * 0.75 * q * k, tx = cx + c.tx * q * k, ty = cy + c.ty * q * k, w = c.w * q * k;
        const path = new Path2D();
        path.moveTo(bx, by);
        path.quadraticCurveTo(bx - w + (tx - bx) * 0.4, (by + ty) / 2, tx, ty);
        path.quadraticCurveTo(bx + w + (tx - bx) * 0.4, (by + ty) / 2, bx, by);
        this.stroke(path, 0.0025, a * (c.d ? 1 : 0.75), 0.05);
      }
    } });
  }
  /** a tuft of roots from one point, hanging down and fanning out; `branchy`: thicker ones that fork once */
  private tuft(x: number, y: number, s: number, t0: number, dur: number, n: number, r: () => number, w = 0.0035, branchy = false) {
    for (let i = 0; i < n; i++) {
      let a = Math.PI / 2 + ((i + 0.5) / n - 0.5) * 2.1 + (r() - 0.5) * 0.2;
      const len = s * (1.8 + r() * 1.6), steps = 8, pts: P2[] = [[x, y]];
      let px = x, py = y;
      for (let k = 1; k <= steps; k++) {
        a += (r() - 0.5) * 0.42 + (Math.PI / 2 - a) * 0.08;
        px += Math.cos(a) * len / steps; py += Math.sin(a) * len / steps;
        pts.push([px, py]);
        if (branchy && k === 4) {
          const b2: P2[] = [[px, py]]; let ba = a + (r() < 0.5 ? -0.7 : 0.7), bx = px, by = py;
          for (let j = 1; j <= 4; j++) { ba += (r() - 0.5) * 0.4; bx += Math.cos(ba) * len * 0.09; by += Math.sin(ba) * len * 0.09; b2.push([bx, by]); }
          this.rootLine(b2, t0 + dur * 0.5, dur * 0.5, w * 0.55);
        }
      }
      this.rootLine(pts, t0 + r() * 0.3, dur, w * (0.7 + r() * 0.5));
    }
  }
  private rootLine(pts: P2[], t0: number, dur: number, w: number) {
    this.under.push({ t0, dur, draw: (p, a) => {
      const c = this.xray(a), q = pts.map(([px, py]) => this.P(px, py));
      this.line(q, eo(p), w * this.U * 3, c.halo);
      this.line(q, eo(p), Math.max(0.6, w * this.U), c.core);
    } });
  }
  /** a shoot (or a stalk) still under the ground, climbing to where it breaks the surface */
  private shoot(x0: number, y0: number, x1: number, y1: number, t0: number, dur: number) {
    this.rootLine([[x0, y0], [x0 + (x1 - x0) * 0.2, y0 + (y1 - y0) * 0.5], [x1, y1]], t0, dur, 0.003);
  }
  /** one length of the lotus root stock: plump, rounded at its ends, with a ring where it meets the next */
  private segment(xa: number, xb: number, y: number, t0: number, dur: number) {
    this.under.push({ t0, dur, draw: (p, a) => {
      const k = eo(p), U = this.U;
      const [ax, ay] = this.P(xa, y), [bx] = this.P(xa + (xb - xa) * k, y);
      const len = Math.abs(bx - ax);
      if (len < 2) return;
      const h = 0.03 * U * (0.6 + 0.4 * k), x0 = Math.min(ax, bx), r = Math.min(h, len / 2);
      const path = new Path2D();
      path.roundRect(x0 + 1, ay - h, len - 2, h * 2, r);
      this.stroke(path, 0.003, a, 0.08);
      // the faint holes inside, the way a cut lotus root looks
      const holes = new Path2D();
      for (let i = 1; i < 4; i++) { const hx = x0 + (len * i) / 4; holes.moveTo(hx + h * 0.18, ay); holes.ellipse(hx, ay, h * 0.18, h * 0.3, 0, 0, Math.PI * 2); }
      this.stroke(holes, 0.0015, a * 0.5);
    } });
  }

  // ── then the roots run out under the ground to both edges of the screen, and all along them more
  //    of her flowers come up, in all their colours: a whole field of them (it depends on the screen's shape) ──
  private bunchEnd = 0;
  private spreadAt = 12.2;
  private planField() {
    this.heads = this.heads.filter((h) => !h.field);
    this.roots = this.roots.filter((rt) => !rt.field);
    const r = rng(777);
    const { W, H } = this, { U, base } = this.layout();
    const bottom = (H - base[1]) / U;
    const portrait = W / H < 1;
    const reach = Math.max(0.7, W / 2 / U - 0.06);
    const t0 = this.spreadAt;
    const s0 = this.kind === 'Tulip' ? 0.46 : 0.74;
    const nv = this.variants.length;
    let lastV = 0;
    const pick = () => { let v = Math.floor(r() * nv); if (v === lastV) v = (v + 1) % nv; return (lastV = v); };

    // Scattered over the dark ground, near and far, like a meadow seen at night: the far ones small and
    // dim with their stems rising from higher up, the near ones big, a couple right at the front. Placed
    // at random (no rows), each flower clear of the others and of the bunch.
    // (z: 0 = nearest, 1 = farthest)
    type Spot = { x: number; z: number; scale: number; gy: number; h: number; lean: number; hx: number; hy: number; size: number };
    const taken: { hx: number; hy: number; size: number; k: number }[] = this.heads.map((hd) => ({ hx: hd.tip[0], hy: hd.tip[1] - hd.size * 0.3, size: hd.size, k: 0.72 }));
    const want = Math.round(Math.min(26, Math.max(7, reach * 10.5)));
    const spots: Spot[] = [];
    for (let tries = 0; tries < 900 && spots.length < want; tries++) {
      const x = (r() * 2 - 1) * reach;
      const z = r() ** 0.85;
      const near = 1 - z;
      const scale = 0.42 + 0.8 * near ** 1.6;                 // size with distance
      const gy = (bottom + 0.25) * near ** 2 - 0.62 * z;      // where its stem starts: further = higher up, nearest off the bottom
      const h = (0.35 + r() * 1.0) * scale;
      const lean = (r() - 0.5) * 0.12 * scale;
      const size = s0 * 0.68 * scale;
      const hx = x + lean, hy = gy - h - size * 0.3;
      if (hy < -1.75 || hy + size * 0.4 > bottom || Math.abs(hx) > reach + (portrait ? 0.15 : 0.05)) continue;  // (not up into her name, not off the screen)
      if (z < 0.45 && Math.abs(hx) < 0.42) continue;           // (nothing near standing in front of the bunch's stems)
      // (far ones, behind the bunch, may peek out from behind it on a narrow screen)
      if (taken.some((o) => Math.hypot(o.hx - hx, (o.hy - hy) * 1.15) < (o.size + size) * (o.k > 0.6 && z > 0.5 && portrait ? 0.48 : o.k))) continue;
      taken.push({ hx, hy, size, k: 0.52 });
      spots.push({ x, z, scale, gy, h, lean, hx, hy, size });
    }
    // they come up one after another in no particular order, a beat apart
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    spots.forEach(({ x, z, scale, gy, h, lean, size }, k) => {
      const near = 1 - z;
      const vi = pick(), star = !!this.variants[vi].star;
      const start = t0 + 0.4 + k * (portrait ? 0.45 : 0.32);
      this.heads.push({
        vi, star, waited: 0, main: false, root: x, field: true, gy, fade: 0.45 + 0.55 * near,
        tip: [lean, -h], bow: (r() - 0.5) * 0.1 * scale, t0: start, dur: 1.7 + r() * 0.6,
        size: size * (star ? 0.85 : 1), spin: (r() - 0.5) * 0.3 * (star ? 2 : 1), depth: 2.4 - z * 4, seed: r() * 100,
        leaves: this.kind === 'Tulip'
          ? [{ u: 0.03, side: -1, L: (0.26 + r() * 0.06) * scale, w: 0.2, a: 0.26 }, { u: 0.07, side: 1, L: (0.2 + r() * 0.05) * scale, w: 0.2, a: 0.32 }]
          : this.kind === 'Lily'
            ? Array.from({ length: 5 }, (_, i) => ({ u: 0.18 + i * 0.1, side: i % 2 ? 1 : -1, L: (0.09 - i * 0.006) * scale, w: 0.13, a: 0.55 }))
            : [],
        thin: this.kind === 'Lotus' ? 0.35 + 0.35 * scale : 0.4 + 0.45 * scale,
        grass: this.kind === 'Lily' ? 1 + Math.floor(r() * 2) : 0,
      });
    });
    this.heads.sort((a, b) => a.depth - b.depth);
  }

  resize(W: number, H: number) {
    this.W = W; this.H = H;
    this.planField();
    // (phones: their screens are dense; 1.5× is plenty for soft, glowing flowers)
    this.dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia?.('(pointer: coarse)').matches ? 1.5 : 2);

    this.rootCache = null;
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
      // (a slow device: once everything is up, if frames keep taking too long, the costliest touches go)
      this.frameMs += ((now - this.lastFrame) - this.frameMs) * 0.05; this.lastFrame = now;
      if (!this.lite && this.clock > this.spreadAt + 4 && this.frameMs > 40) { if ((this.slowFor += dt) > 2.5) this.lite = true; } else this.slowFor = 0;
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
  private cue(name: string, c: 'land' | 'bloom' | 'spread') { if (!this.cued.has(name)) { this.cued.add(name); this.onCue(c); } }

  /** the finished bunch, drawn once (it hardly changes after that: it sways a little, and the motes move) */

  private settledAt = 0; // (0 until everything has opened)

  private hint = 0;
  private draw(t: number, held?: Head) {
    const { W, H, dpr } = this;
    const dt = Math.max(0, t - this.lastT); this.lastT = t;
    // the song's pulse: quick to rise, slower to fall (without a song: a slow breath)
    const raw = this.pulse();
    const target = raw ?? (0.25 + 0.25 * Math.sin(t * 1.6));
    this.pl += (target - this.pl) * Math.min(1, dt * (target > this.pl ? 18 : 4));
    const last = this.heads.reduce((m, h) => Math.max(m, h.t0 + h.dur), 0);
    if (!this.settledAt && t > last + 4.5) { this.settledAt = t; this.onSettled(); }
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    // everything is drawn into a layer first, so it can be reflected in the wet ground
    const L = (this.layer ??= document.createElement('canvas'));
    if (L.width !== this.canvas.width || L.height !== this.canvas.height) { L.width = this.canvas.width; L.height = this.canvas.height; }
    const lg = L.getContext('2d')!;
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, L.width, L.height);
    const real = this.g; this.g = lg;
    lg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [bx, by] = this.base();
    // the view starts close on her flower and draws back as the meadow comes up; then, once it's all
    // open, it slowly moves in again on the bunch over half a minute, like a film's last shot
    let zoom = 1 + (W / H < 1 ? 0.07 : 0.15) * (1 - eio((t - this.spreadAt + 0.5) / 4.5));
    if (this.settledAt) zoom += 0.07 * eio((t - this.settledAt) / 32);
    const fy = by - this.U * 0.55 * clamp(this.settledAt ? (t - this.settledAt) / 32 : 0);
    lg.translate(bx, fy); lg.scale(zoom, zoom); lg.translate(-bx, -fy);
    if (!this.lite) this.mist(t, false);
    this.scene(t, true, held);
    this.mist(t, true);
    this.fireflies(t);
    this.g = real;
    // the reflection: what stands above the ground, upside down beneath it, faint, soft and fading out
    const groundY = (by - fy) * zoom + fy;
    const gyPx = Math.round(groundY * dpr), below = this.canvas.height - gyPx;
    if (!this.lite && t > this.spreadAt && below > 2) {
      const R = (this.refl ??= document.createElement('canvas'));
      const rw = Math.ceil(this.canvas.width / 3), rh = Math.ceil(below / 3);
      if (R.width !== rw || R.height !== rh) { R.width = rw; R.height = rh; }
      const rg = R.getContext('2d')!;
      rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, rw, rh);
      rg.globalCompositeOperation = 'source-over';
      rg.save(); rg.scale(1, -1);
      const src = Math.min(gyPx, below * 3.2);
      rg.drawImage(L, 0, gyPx - src, L.width, src, 0, -rh, rw, rh);
      rg.restore();
      rg.globalCompositeOperation = 'destination-in';
      const fade = rg.createLinearGradient(0, 0, 0, rh);
      fade.addColorStop(0, 'rgba(0,0,0,0.55)'); fade.addColorStop(0.55, 'rgba(0,0,0,0.16)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      rg.fillStyle = fade; rg.fillRect(0, 0, rw, rh);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 0.7 * clamp((t - this.spreadAt) / 4);
      g.imageSmoothingQuality = 'high';
      g.drawImage(R, 0, gyPx, this.canvas.width, below);
      g.globalAlpha = 1;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(L, 0, 0);
    if (t > this.bunchEnd + 3.6 && this.done) { this.done(); this.done = undefined; }
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
    const U = Math.min(H * (portrait ? 0.46 : 0.41), W * (portrait ? 0.62 : 0.5));
    return { U, base: [W / 2, H * (portrait ? 0.8 : 0.855)] as P2 };
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
    const half = U;
    const sl = g.createLinearGradient(base[0] - half, 0, base[0] + half, 0);
    sl.addColorStop(0, 'rgba(90,150,255,0)'); sl.addColorStop(0.5, `rgba(90,150,255,${(0.08 + 0.12 * this.pl) * show})`); sl.addColorStop(1, 'rgba(90,150,255,0)');
    g.fillStyle = sl; g.fillRect(base[0] - half, base[1] - 1, half * 2, 2);
    if (t > this.spreadAt) this.cue('spread', 'spread');
    // (once every root has finished growing they're drawn once, into a picture, and that's reused)
    const rootsDone = this.under.reduce((m, u) => Math.max(m, u.t0 + u.dur), this.roots.reduce((m, rt) => Math.max(m, rt.t0 + rt.dur, (rt.fadeAt ?? 0) + 2), 0));
    if (t > rootsDone && !this.rootCache) this.rootCache = this.offscreen(() => this.drawRoots(t, P, U));
    if (this.rootCache) {
      g.globalCompositeOperation = 'lighter';
      g.drawImage(this.rootCache, 0, 0, this.W, H);
      // (with the music: the roots light up on the beat)
      if (this.pl > 0.02) { g.globalAlpha = Math.min(1, this.pl * 0.45); g.drawImage(this.rootCache, 0, 0, this.W, H); g.globalAlpha = 1; }
    }
    else this.drawRoots(t, P, U);
    // a pool of soft light on the ground under the bunch, breathing with the song
    const pool = clamp((t - 6) / 3);
    if (pool > 0) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.translate(base[0], base[1]); g.scale(1, 0.18);
      g.globalAlpha = pool * (0.28 + 0.4 * this.pl);
      g.drawImage(this.glowSprite, -U * 1.1, -U * 1.1, U * 2.2, U * 2.2);
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';

    // ── the seed: a blue mote of light falling into the dark ──
    if (t < 4.4) {
      const f = eio(t / 1.6), y0 = H * 0.1, y1 = base[1] + U * this.seedDepth;
      const sx = base[0] + Math.sin(t * 3) * 10 * (1 - f), sy = y0 + (y1 - y0) * f;
      const fade = 1 - clamp((t - 3.4) / 1);
      for (let k = 1; k <= 7; k++) { const tf = eio((t - k * 0.045) / 1.6); this.glow(sx, y0 + (y1 - y0) * tf, U * 0.04 * (1 - k / 8), 0.3 * fade * (1 - f * 0.8)); }
      this.glow(sx, sy, U * 0.14 * (0.8 + 0.2 * Math.sin(t * 7)), 0.95 * fade);
      if (t > 1.6) {
        this.cue('land', 'land');
        if (!this.cued.has('dust')) { this.cued.add('dust'); for (let i = 0; i < 30; i++) this.mote(sx, sy, (Math.random() - 0.5) * 130, -Math.random() * 120, 0.9 + Math.random() * 0.7, 1 + Math.random() * 1.6); }
      }
    }

    // (lotus: the seed drops through the water's surface, and rings spread out across it)
    if (this.kind === 'Lotus') {
      const lt = t - 1.45;
      if (lt > 0 && lt < 4) for (let k = 0; k < 3; k++) this.ripple(base[0], base[1], U * 0.5, clamp((lt - k * 0.45) / 2.6), 0.55);
      this.surface(t);
      this.drawPads(t);
    }

    // ── stems and leaves (all), then the flowers back to front ──
    // (the field is drawn far to near, each plant whole, so nearer flowers stand in front of farther ones;
    //  the bunch's own stems go first and its flowers after, as before)
    const flowers: (() => void)[] = [];
    let bunchDrawn = false;
    const drawBunchFlowers = () => { if (!bunchDrawn) { bunchDrawn = true; for (const f of flowers) f(); } };
    for (const h of this.heads) {
      if (h.field && h.depth > 1.05) drawBunchFlowers(); // (the near part of the field: in front of the bunch)
      const f = this.stem(h, t, U, P, h === held ? (tp) => { heldTip = tp; } : undefined);
      if (!f) continue;
      if (h.field || bunchDrawn) f(); else flowers.push(f);
    }
    drawBunchFlowers();

    if (!live) return;
    this.drawWaiting(held, heldTip);
    this.spawnMotes(t);
    this.drawMotes();
  }

  // ── water (lotus) ──
  /** a ring spreading out on the water, f: 0 → 1 */
  private ripple(x: number, y: number, R: number, f: number, a: number) {
    if (f <= 0 || f >= 1 || a <= 0) return;
    const g = this.g, r = R * (0.15 + 0.85 * eo(f));
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(150,200,255,${(a * (1 - f) * 0.6).toFixed(3)})`;
    g.lineWidth = Math.max(0.6, R * 0.012);
    g.beginPath(); g.ellipse(x, y, r, r * 0.16, 0, 0, TAU); g.stroke();
    g.globalCompositeOperation = 'source-over';
  }
  /** the water's surface: a faint line, and glints of light drifting along it */
  private surface(t: number) {
    const g = this.g, { U } = this, [bx, by] = this.base(), on = eo((t - 1.4) / 1.5);
    if (on <= 0) return;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const k = ((i * 0.618 + t * 0.012 * (1 + (i % 3) * 0.5)) % 1) * 2 - 1;
      const x = bx + k * this.W * 0.55, y = by + ((i % 4) - 1.5) * U * 0.012, w = U * (0.04 + (i % 5) * 0.02);
      const a = on * (0.1 + 0.08 * Math.sin(t * 1.3 + i * 2)) * (1 - Math.abs(k) * 0.7);
      g.fillStyle = `rgba(170,210,255,${a.toFixed(3)})`;
      g.fillRect(x - w / 2, y, w, Math.max(0.7, U * 0.003));
    }
    g.globalCompositeOperation = 'source-over';
  }
  private drawPads(t: number) {
    for (const pd of this.pads) {
      const k = (t - pd.t0) / 1.6;
      if (k <= 0) continue;
      const [x, y] = this.P(pd.x, pd.y);
      if (pd.raised) {
        // its stalk rises from the water, then the leaf unrolls on top of it
        const [sx, sy] = this.P(pd.x - 0.02, 0), up = eo(k / 0.6);
        const sway = this.gust(t, pd.x) * 0.02 * this.U;
        const top: P2 = [sx + (x - sx) * up + sway, sy + (y - sy) * up];
        this.line([[sx, sy], [sx + (top[0] - sx) * 0.5, sy + (top[1] - sy) * 0.5], top], 1, Math.max(1.2, this.U * 0.008), 'rgba(40,110,55,0.95)');
        this.ripple(sx, sy, this.U * 0.07, ((t * 0.2 + pd.seed) % 1), 0.35);
        if (k > 0.5) this.pad(top[0], top[1], this.U * pd.r, eo((k - 0.5) / 0.9), 1, 1, pd.seed, t, true);
      } else {
        this.pad(x, y, this.U * pd.r, eo(k), 1, 1, pd.seed, t);
        this.ripple(x, y, this.U * pd.r * 1.4, ((t * 0.12 + pd.seed) % 1), 0.25);
      }
    }
  }
  /** a lotus leaf: round, its veins running out from the middle; flat on the water (seen at a low angle),
   *  or (raised) held up and cupped like a shallow bowl. `o` 0 → 1: it unrolls */
  private pad(x: number, y: number, r: number, o: number, dim: number, near: number, seed: number, t: number, raised = false) {
    if (o <= 0.01 || r < 1) return;
    const g = this.g, rx = r * (0.25 + 0.75 * o), ry = r * (raised ? 0.42 : 0.24) * (0.6 + 0.4 * o);
    const bob = raised ? 0 : Math.sin(t * 0.8 + seed) * r * 0.02 + this.gust(t, (x - this.base()[0]) / this.U) * r * 0.04;
    g.save();
    g.translate(x, y + bob);
    g.rotate((raised ? 0.12 : 0.03) * Math.sin(seed));
    const gr = g.createRadialGradient(0, -ry * 0.3, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(58,128,66,${0.95 * dim})`); gr.addColorStop(0.7, `rgba(30,92,48,${0.95 * dim})`); gr.addColorStop(1, `rgba(16,62,36,${0.95 * dim})`);
    g.fillStyle = gr;
    g.beginPath();
    if (raised) {
      // a shallow bowl: the near rim lower than the far one
      g.moveTo(-rx, 0);
      g.bezierCurveTo(-rx, -ry * 1.1, rx, -ry * 1.1, rx, 0);
      g.bezierCurveTo(rx * 0.8, ry * 1.25, -rx * 0.8, ry * 1.25, -rx, 0);
    } else {
      // a flat disc on the water, its edge a little wavy
      for (let i = 0; i <= 28; i++) {
        const a = (i / 28) * TAU, w = 1 + Math.sin(a * 7 + seed) * 0.025;
        const px = Math.cos(a) * rx * w, py = Math.sin(a) * ry * w;
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      }
    }
    g.closePath();
    g.fill();
    g.strokeStyle = `rgba(130,230,200,${(0.4 * dim * near).toFixed(3)})`; g.lineWidth = Math.max(0.6, r * 0.015); g.stroke();
    // veins from the middle
    g.strokeStyle = `rgba(150,230,180,${(0.22 * dim).toFixed(3)})`; g.lineWidth = Math.max(0.5, r * 0.008);
    g.beginPath();
    const cy = raised ? -ry * 0.25 : 0;
    for (let i = 0; i < 11; i++) { const a = (i / 11) * TAU + seed; g.moveTo(0, cy); g.lineTo(Math.cos(a) * rx * 0.88, cy + Math.sin(a) * ry * (raised ? 0.8 : 0.88)); }
    g.stroke();
    g.restore();
  }
  /** a field flower's little bulb and roots, faint, just under where it comes up */
  private miniBulb(x: number, y: number, s: number, p: number, a: number) {
    if (p <= 0 || a <= 0.02) return;
    const g = this.g, k = eo(p) * s, cy = y + s * 2.1;
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(165,210,255,${(0.42 * a).toFixed(3)})`; g.lineWidth = Math.max(0.5, s * 0.08);
    g.beginPath();
    g.moveTo(x, cy - k * 1.8);
    g.bezierCurveTo(x + k * 1.1, cy - k * 0.8, x + k * 1.05, cy + k, x, cy + k);
    g.bezierCurveTo(x - k * 1.05, cy + k, x - k * 1.1, cy - k * 0.8, x, cy - k * 1.8);
    g.moveTo(x, cy - k * 1.8); g.lineTo(x, y);
    for (let i = 0; i < 5; i++) { const ang = Math.PI / 2 + (i / 4 - 0.5) * 1.8, L = k * (1.6 + (i % 2) * 0.8); g.moveTo(x, cy + k); g.quadraticCurveTo(x + Math.cos(ang) * L * 0.6 + (i - 2) * k * 0.2, cy + k + Math.sin(ang) * L * 0.5, x + Math.cos(ang) * L, cy + k + Math.sin(ang) * L); }
    g.stroke();
    g.globalCompositeOperation = 'source-over';
  }

  private rootCache: HTMLCanvasElement | null = null;
  /** draws into another canvas (a new one the size of this one, or the one given) */
  private offscreen(draw: () => void, c?: HTMLCanvasElement): HTMLCanvasElement {
    if (!c) { c = document.createElement('canvas'); c.width = this.canvas.width; c.height = this.canvas.height; }
    const real = this.g;
    this.g = c.getContext('2d')!;
    this.g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    try { draw(); } finally { this.g = real; }
    return c;
  }
  private drawRoots(t: number, P: (x: number, y: number) => P2, U: number) {
    this.g.globalCompositeOperation = 'lighter';
    for (const u of this.under) { const p = clamp((t - u.t0) / u.dur); if (p > 0) u.draw(p, 1); }
    for (const rt of this.roots) {
      const p = clamp((t - rt.t0) / rt.dur);
      if (p <= 0) continue;
      const pts = rt.pts.map(([x, y]) => P(x, y));
      // (a field root fades to a faint thread once its flower is up: the meadow, not the roots, is the picture)
      const a = rt.fadeAt === undefined ? 1 : 1 - 0.85 * clamp((t - rt.fadeAt) / 2);
      this.line(pts, p, rt.w * U * 3, `rgba(70,140,255,${0.05 * a})`);
      this.line(pts, p, Math.max(0.6, rt.w * U), `rgba(165,210,255,${0.5 * a})`);
    }
    this.g.globalCompositeOperation = 'source-over';
  }

  private grass(h: Head, at: P2, t: number, U: number, dim: number) {
    const g = this.g, n = h.grass ?? 0;
    for (let i = 0; i < n; i++) {
      const k = eo((t - h.t0 - 0.35 - i * 0.12) / 0.9);
      if (k <= 0.01) continue;
      // a blade arcs up and over to one side, like a quarter circle, fading into the dark at its foot
      const side = i % 2 ? 1 : -1, L = U * h.size * (0.7 + 0.3 * ((h.seed * (i + 3)) % 1)) * k;
      const sway = Math.sin(t * 0.7 + h.seed + i) * 0.04 * L + this.gust(t, h.root) * 0.22 * L;
      const bx = at[0] + side * L * 0.02, by = at[1] + L * 0.25; // (its foot, a little below the stem's: in the dark)
      const ex = bx + side * L * (0.55 + 0.1 * i) + sway, ey = by - L * (0.95 - 0.12 * i);
      const lg = g.createLinearGradient(0, by, 0, ey);
      lg.addColorStop(0, 'rgba(40,140,80,0)'); lg.addColorStop(0.5, `rgba(45,150,85,${0.6 * dim})`); lg.addColorStop(1, `rgba(110,215,160,${0.85 * dim})`);
      const w = L * 0.045;
      g.beginPath(); g.moveTo(bx - side * w, by);
      g.quadraticCurveTo(bx - side * w, ey + (by - ey) * 0.05, ex, ey);
      g.quadraticCurveTo(bx + side * w, ey + (by - ey) * 0.2, bx + side * w, by);
      g.fillStyle = lg; g.fill();
    }
  }

  /** one stem and its leaves; returns how to draw its flower (drawn after all the stems), if it has one yet */
  private stem(h: Head, t: number, U: number, P: (x: number, y: number) => P2, tipOut?: (p: P2) => void): (() => void) | undefined {
      const g = this.g;
      const p = eio((t - h.t0) / h.dur);
      if (p <= 0) return undefined;
      if (h.branch !== undefined && this.trunk) {
        const [bx, by] = this.trunk[Math.round(h.branch * 32)], [ox, oy] = this.base();
        h.root = (bx - ox) / U; h.gy = (by - oy) / U; h.tip = [h.abs![0] - h.root, h.abs![1] - h.gy];
      }
      const after = clamp((t - h.t0 - h.dur) / 2);
      const wind = this.gust(t, h.root + h.tip[0]) * after;
      const sw = h.field
        ? Math.sin(t * 0.6 + h.seed) * 0.03 * after + wind * 0.11 * (0.6 + 0.4 * h.thin)
        : Math.sin(t * 0.8 + h.seed) * 0.016 * clamp(t - h.t0 - h.dur) + wind * 0.05;
      const ca = Math.cos(sw), sa = Math.sin(sw);
      const rot = (q: P2): P2 => [q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca];
      const tip = rot(h.tip), c1 = rot([h.tip[0] * 0.08 + h.bow, h.tip[1] * 0.35]), c2 = rot([h.tip[0] * 0.8 + h.bow * 1.3, h.tip[1] * 0.72]);
      const pts: P2[] = [];
      for (let i = 0; i <= 32; i++) { const q = bez([0, 0], c1, c2, tip, i / 32); pts.push(P(h.root + q[0], h.gy + q[1])); }
      if (h.main && this.kind === 'Lily') this.trunk = pts;
      const dim = h.field ? (h.fade < 0.7 ? h.fade * 0.65 : h.fade) : h.depth === 0 ? 0.7 : 1;
      // (a field stem rises out of the darkness: transparent at the bottom, solid a third of the way up)
      const col = (rgb: string, a: number): string | CanvasGradient => {
        if (!h.field) return `rgba(${rgb},${a})`;
        const lg = g.createLinearGradient(pts[0][0], pts[0][1], pts[12][0], pts[12][1]);
        lg.addColorStop(0, `rgba(${rgb},0)`); lg.addColorStop(1, `rgba(${rgb},${a})`);
        return lg;
      };
      if (h.field) {
        const sp = (t - h.t0 + 0.35) / 1.4;
        if (sp > 0 && sp < 1) this.glow(pts[0][0], pts[0][1] - U * 0.02, U * h.size * 0.5 * (0.6 + 0.4 * sp), 0.7 * Math.sin(Math.PI * sp) * h.fade);
        if (!this.cued.has(`s${h.seed}`) && sp > 0.2) { this.cued.add(`s${h.seed}`); for (let i = 0; i < 6; i++) this.mote(pts[0][0], pts[0][1], (Math.random() - 0.5) * 40, -10 - Math.random() * 30, 1 + Math.random(), 0.6 + Math.random()); }
        if (h.grass) this.grass(h, pts[0], t, U, dim);
        // its own bulb (or, for a lotus, the water it comes up through)
        const near = Math.max(0.3, h.thin);
        if (this.kind === 'Lotus') {
          const pr = clamp((t - h.t0 + 0.6) / 1.2);
          if (pr > 0) this.pad(pts[0][0] + U * h.size * 0.55 * (h.seed % 2 > 1 ? 1 : -1), pts[0][1], U * h.size * 0.42 * eo(pr), eo(pr), dim, near, h.seed, t);
          if (p > 0.05) this.ripple(pts[0][0], pts[0][1], U * h.size * 0.5, ((t * 0.22 + h.seed) % 1), 0.35 * dim);
        } else if (pts[0][1] < this.H + 4) this.miniBulb(pts[0][0], pts[0][1], U * 0.028 * near, clamp((t - h.t0 + 1.2) / 1.2), 0.45 * dim);
      }
      if (!h.field && this.kind === 'Lotus' && p > 0.02) this.ripple(pts[0][0], pts[0][1], U * 0.09, ((t * 0.2 + h.seed) % 1), 0.4);
      this.line(pts, p, Math.max(1.5, U * 0.016 * h.thin), col('20,70,34', dim));
      this.line(pts, p, Math.max(1, U * 0.008 * h.thin), col('70,150,60', 0.9 * dim));
      g.globalCompositeOperation = 'lighter';
      this.line(pts, p, Math.max(1, U * 0.003 * Math.min(1, h.thin * 1.4)), col('140,230,200', 0.25 * dim));
      g.globalCompositeOperation = 'source-over';
      for (const lf of h.leaves) {
        if (p < lf.u) continue;
        const k = spring((t - (h.t0 + h.dur * lf.u)) / 1.2, 6, 10);
        const i = Math.round(lf.u * 32), q = pts[i], q2 = pts[Math.min(32, i + 1)];
        const ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
        const side = lf.side || (h.tip[0] >= 0 ? 1 : -1);
        this.leaf(q, ang + side * (lf.a ?? 0.75), U * lf.L * k, side * 0.6, dim, lf.w);
      }
      tipOut?.(pts[Math.round(p * 32)]);
      const art = this.artOf(h);
      if (p > 0.85 && art) {
        const end = pts[32], pre = pts[29];
        const dir = Math.atan2(end[1] - pre[1], end[0] - pre[0]) + Math.PI / 2;
        return () => this.flower(h, art, end, dir + h.spin * (art.star ? 1 : 0.35), t, U);
      }
      return undefined;
  }

  /** how hard the wind is pushing at x (in U from the middle) at time t: a gust sweeps across from the
   *  left every 8 seconds, leaning everything over as it passes, with a small sway back after it */
  private gust(t: number, x: number): number {
    const reach = this.W / 2 / this.U + 1;
    const T = t - this.spreadAt - 10;
    if (T < 0) return 0;
    const front = (T % 8) * ((reach * 2 + 1.5) / 3.2) - reach - 0.4;
    const d = x - front;
    return Math.exp(-(d * d) / 0.3) - 0.4 * Math.exp(-((d + 0.75) ** 2) / 0.35);
  }

  /** the song: how loud it is right now (0–1). Set from outside; without a song, a slow breath */
  pulse: () => number | null = () => null;
  /** lighter drawing for a slow device: no reflection, less mist, fewer fireflies */
  private lite = false;
  private frameMs = 16; private lastFrame = performance.now(); private slowFor = 0;
  private pl = 0;
  private lastT = 0;

  // fireflies: warm little lights wandering among the flowers, blinking slowly, near ones big and blurry
  private flies: { x: number; y: number; z: number; ph: number; sp: number; blink: number; per: number }[] = [];
  private fireflies(t: number) {
    const g = this.g, { W, H } = this, [bx, by] = this.base(), U = this.U;
    if (!this.flies.length) {
      const r = rng(99);
      const n = W / H < 1 ? 10 : 16;
      for (let i = 0; i < n; i++) this.flies.push({ x: (r() * 2 - 1) * (W / 2 / U), y: -0.15 - r() * 1.1, z: r(), ph: r() * TAU, sp: 0.6 + r() * 0.8, blink: r() * 5, per: 3 + r() * 3 });
    }
    const on = clamp((t - this.spreadAt - 6) / 4);
    if (on <= 0) return;
    g.globalCompositeOperation = 'lighter';
    for (const f of this.lite ? this.flies.slice(0, 6) : this.flies) {
      const s = t * 0.18 * f.sp + f.ph;
      const x = bx + (f.x + Math.sin(s) * 0.25 + Math.sin(s * 2.3 + 1) * 0.08) * U;
      const y = by + (f.y + Math.sin(s * 1.4 + 2) * 0.12 + Math.cos(s * 0.7) * 0.06) * U;
      // blink: a slow glow up and down, then dark for a while
      const c = ((t + f.blink) % f.per) / f.per;
      const b = c < 0.45 ? Math.sin((c / 0.45) * Math.PI) : 0;
      if (b <= 0.01) continue;
      const near = f.z > 0.78, size = near ? 9 + f.z * 8 : 2.2 + f.z * 3;
      g.globalAlpha = b * on * (near ? 0.35 : 0.9);
      g.drawImage(this.flyGlow, x - size * 4, y - size * 4, size * 8, size * 8);
      if (!near) { g.globalAlpha = b * on; g.fillStyle = '#fbffd0'; g.beginPath(); g.arc(x, y, size * 0.35, 0, TAU); g.fill(); }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }
  private flyGlow = glowSprite([200, 240, 90], 1);
  private mistSprite = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d')!, gr = x.createRadialGradient(128, 32, 0, 128, 32, 128);
    gr.addColorStop(0, 'rgba(150,180,230,0.55)'); gr.addColorStop(0.5, 'rgba(120,150,210,0.18)'); gr.addColorStop(1, 'rgba(120,150,210,0)');
    x.setTransform(1, 0, 0, 0.25, 0, 24); x.fillStyle = gr; x.fillRect(0, -128, 256, 256);
    return c;
  })();
  /** low mist drifting slowly along the ground */
  private mist(t: number, front: boolean) {
    const g = this.g, { W } = this, [, by] = this.base(), U = this.U;
    const on = clamp((t - this.spreadAt) / 5);
    if (on <= 0) return;
    g.globalCompositeOperation = 'lighter';
    const n = front ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const sp = (front ? 9 : 5) * (1 + (i % 3) * 0.3), w = U * (front ? 1.6 : 2.2) * (1 + (i % 2) * 0.4);
      const x = ((i * 0.37 * (W + w * 2) + t * sp) % (W + w * 2)) - w;
      const y = by + (front ? U * 0.06 + (i % 2) * U * 0.05 : -U * 0.04 - (i % 3) * U * 0.05);
      g.globalAlpha = on * (front ? 0.22 : 0.3) * (0.7 + 0.3 * Math.sin(t * 0.3 + i));
      g.drawImage(this.mistSprite, x - w / 2, y - w * 0.12, w, w * 0.25);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  private layer: HTMLCanvasElement | null = null;
  private refl: HTMLCanvasElement | null = null;
  private P: (x: number, y: number) => P2 = (x, y) => [x, y];
  private U = 1;
  // ── motes of light drifting up off the flowers, and a few always hanging in the dark, like in her pictures ──
  private spawnMotes(t: number) {
    const { W, H, P, U } = this;
    if (t > 8 && this.motes.length < 60 && Math.random() < 0.35) {
      const h = this.heads[Math.floor(Math.random() * this.heads.length)];
      if (t > h.t0 + h.dur + 0.5) {
        const [x, y] = P(h.root + h.tip[0], h.gy + h.tip[1] - h.size * 0.3);
        this.mote(x + (Math.random() - 0.5) * U * h.size * 0.8, y + (Math.random() - 0.5) * U * h.size * 0.4, (Math.random() - 0.5) * 12, -14 - Math.random() * 24, 3 + Math.random() * 2.5, 0.7 + Math.random() * 1.4);
      }
    }
    if (this.motes.length < 24 && Math.random() < 0.1) this.mote(Math.random() * W, H * (0.1 + Math.random() * 0.7), (Math.random() - 0.5) * 6, -4 - Math.random() * 6, 5 + Math.random() * 4, 0.6 + Math.random() * 1.2);
  }

  // ── a flower: the picture, opening wedge by wedge about where its petals grow from ──
  private flower(h: Head, A: Art, at: P2, dir: number, t: number, U: number) {
    const g = this.g;
    // the bud forms as the stem finishes, waits a moment, then opens slowly
    const bloomStart = h.t0 + h.dur + (h.main ? 0.9 : h.field ? 0.15 : 0.5);
    const open = clamp((t - bloomStart) / (h.main ? 3.4 : h.field ? 1.5 : 2.8));
    // (a field flower pops: it swells a touch past its size, then settles)
    const grow = h.field ? backOut((t - h.t0 - h.dur * 0.85) / 0.9) : eo((t - h.t0 - h.dur * 0.8) / 1.4);
    if (grow <= 0.01) return;
    if (open > 0.4 && (!h.field || h.seed < 30)) this.cue(`b${h.seed}`, 'bloom');
    const big = Math.max(A.w, A.h);
    const k = ((h.size * U) / big) * (h.field ? grow : 0.55 + 0.45 * grow) * (1 + Math.sin(t * 1.3 + h.seed) * 0.01 * open);
    const px = A.pivot[0] * A.w, py = A.pivot[1] * A.h;
    // a halo of its own colour behind it (centred on the flower, above where it joins the stem)
    const up = (A.star ? 0 : py - A.h * 0.45) * k;
    const cx = at[0] + Math.sin(dir) * up, cy = at[1] - Math.cos(dir) * up;
    const halo = big * k * (0.55 + 0.3 * open), ha = (0.16 + 0.14 * open) * Math.min(1, grow) * (h.field ? h.fade * h.fade : h.depth === 0 ? 0.6 : 1);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = ha;
    g.drawImage(A.glow, cx - halo, cy - halo, halo * 2, halo * 2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    const far = h.field && h.fade < 0.7;
    const img = far ? (A.soft ??= softened(A.src)) : (h.field ? h.fade < 0.78 : h.depth === 0) ? A.dim : A.img;
    if (open >= 1) {
      g.save();
      g.translate(at[0], at[1]); g.rotate(dir); g.scale(k, k);
      g.drawImage(img, -px, -py);
      g.restore();
    } else {
      // folded: every wedge turned towards the top; opening, the outer ones last
      const N = h.field ? 16 : 30, closedK = A.star ? 0.08 : 0.1, r0 = A.star ? 0.5 : 0.6, R = Math.hypot(A.w, A.h) * 1.2, eps = (TAU / N) * 0.12;
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
  private line(pts: P2[], frac: number, w: number, col: string | CanvasGradient) {
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
  private leaf(at: P2, ang: number, L: number, bend: number, dim = 1, wide = 0.22) {
    if (L < 1) return;
    const g = this.g;
    g.save();
    g.translate(at[0], at[1]);
    g.rotate(ang);
    const w = L * wide;
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
