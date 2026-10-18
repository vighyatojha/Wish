// ─────────────────────────────────────────────────────────────
//  Her flower, on a black screen: the last gift.
//  A blue seed of light drops into the dark; roots spread; a sprout
//  rises; the stem climbs, leaves unfold, and the bud opens into the
//  flower she chose. More stems rise from the same roots until there's
//  a bunch of them, glowing, with motes of light drifting up.
//
//  The lily and the lotus are her own pictures (cut out of their black
//  backgrounds), so when they're open they look exactly like them.
//  They open by turning thin wedges of the picture about the point the
//  petals grow from: folded up, the wedges make a bud; turning back out
//  (the outer petals last) they become the flower. The tulip is painted
//  in the same glowing blue.
// ─────────────────────────────────────────────────────────────
import lilyUrl from '../assets/flower-lily.webp';
import lotusUrl from '../assets/flower-lotus.webp';

export type FlowerKind = 'Tulip' | 'Lily' | 'Lotus';
type P2 = [number, number];

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

/** a flower picture and where, in it, the petals grow from (fractions of its width and height) */
interface Art { img: CanvasImageSource; w: number; h: number; pivot: P2; core: P2; star: boolean }

// her pictures: where the petals meet (the lily's centre; the lotus's base) and the glowing heart
const META = {
  Lily: { url: lilyUrl, pivot: [0.519, 0.63] as P2, core: [0.519, 0.6] as P2, star: true },
  Lotus: { url: lotusUrl, pivot: [0.543, 0.728] as P2, core: [0.549, 0.511] as P2, star: false },
};

/** Loads the picture for this flower (the tulip is painted). Call early: it's ready before it's needed. */
export function loadFlower(kind: FlowerKind): Promise<Art> {
  if (kind === 'Tulip') return Promise.resolve(paintTulip());
  const m = META[kind];
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ img, w: img.naturalWidth, h: img.naturalHeight, pivot: m.pivot, core: m.core, star: m.star });
    img.onerror = () => res(paintTulip());
    img.src = m.url;
  });
}

// a tulip in the same glowing blue as her pictures
function paintTulip(): Art {
  const W = 720, H = 640, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const bx = W / 2, by = H * 0.92, h = H * 0.8, w = W * 0.2;
  const petal = (ang: number, k: number, shade: number) => {
    g.save();
    g.translate(bx, by);
    g.rotate(ang);
    const path = new Path2D();
    path.moveTo(0, 0);
    path.bezierCurveTo(w * 0.95 * k, -h * 0.12, w * 1.05 * k, -h * 0.76, w * 0.28 * k, -h * 0.98);
    path.quadraticCurveTo(0, -h * 1.05, -w * 0.28 * k, -h * 0.98);
    path.bezierCurveTo(-w * 1.05 * k, -h * 0.76, -w * 0.95 * k, -h * 0.12, 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, -h);
    gr.addColorStop(0, 'rgba(8,30,140,0.98)'); gr.addColorStop(0.5, 'rgba(36,104,255,0.95)'); gr.addColorStop(1, 'rgba(150,205,255,0.95)');
    g.fillStyle = gr; g.fill(path);
    if (shade) { g.fillStyle = `rgba(0,6,40,${shade})`; g.fill(path); }
    // a lighter middle, like light coming through
    g.save(); g.clip(path);
    const mid = g.createLinearGradient(-w * k, 0, w * k, 0);
    mid.addColorStop(0, 'rgba(255,255,255,0)'); mid.addColorStop(0.5, 'rgba(190,225,255,0.28)'); mid.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = mid; g.fillRect(-w * 1.2 * k, -h * 1.1, w * 2.4 * k, h * 1.1);
    // veins
    g.strokeStyle = 'rgba(200,232,255,0.3)'; g.lineWidth = 1.4;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 2, -h * 0.04); g.quadraticCurveTo(i * w * 0.18 * k, -h * 0.5, i * w * 0.12 * k, -h * 0.94); g.stroke(); }
    // little points of light on the petal
    const r = rng(Math.round(ang * 1000) + 7);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(230,245,255,${0.5 + r() * 0.5})`; g.beginPath(); g.arc((r() - 0.5) * w * 1.3 * k, -h * (0.2 + r() * 0.7), 1 + r() * 2.2, 0, TAU); g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(170,215,255,0.85)'; g.lineWidth = 2; g.stroke(path);
    g.restore();
  };
  petal(-0.44, 0.92, 0.32); petal(0.44, 0.92, 0.32); petal(0, 1, 0.2);
  // the glowing heart inside the cup
  const core = g.createRadialGradient(bx, by - h * 0.42, 0, bx, by - h * 0.42, w * 0.9);
  core.addColorStop(0, 'rgba(235,248,255,0.95)'); core.addColorStop(0.3, 'rgba(140,200,255,0.5)'); core.addColorStop(1, 'rgba(60,120,255,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = core; g.fillRect(bx - w, by - h * 0.42 - w, w * 2, w * 2); g.globalCompositeOperation = 'source-over';
  petal(-0.2, 1.1, 0); petal(0.2, 1.1, 0);
  return { img: c, w: W, h: H, pivot: [0.5, 0.92], core: [0.5, 0.92 - 0.8 * 0.42], star: false };
}

interface Root { pts: P2[]; t0: number; dur: number; w: number }
interface Head { tip: P2; bow: number; t0: number; dur: number; size: number; spin: number; depth: number; seed: number; leaves: { u: number; side: number; L: number }[] }
interface Mote { x: number; y: number; vx: number; vy: number; life: number; age: number; r: number; tw: number }

const BLUE = [110, 180, 255] as const;

export class Bloom {
  private g: CanvasRenderingContext2D;
  private W = 1; private H = 1; private dpr = 1;
  private t0 = 0;
  private raf = 0;
  private roots: Root[] = [];
  private heads: Head[] = [];
  private motes: Mote[] = [];
  private glowSprite: HTMLCanvasElement;
  private done?: () => void;
  private cued = new Set<string>();
  /** moments worth a sound: 'land' (the seed) and 'bloom' (each flower opening) */
  onCue: (cue: 'land' | 'bloom') => void = () => {};

  constructor(private canvas: HTMLCanvasElement, private art: Art) {
    this.g = canvas.getContext('2d')!;
    this.glowSprite = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d')!, gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(200,230,255,0.55)'); gr.addColorStop(0.55, 'rgba(120,180,255,0.12)'); gr.addColorStop(1, 'rgba(100,160,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      return c;
    })();
    this.plan();
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

    // a bunch: the first one in the middle, then the others around it; depth 0 = behind, 2 = in front
    const star = this.art.star;
    const H = (tip: P2, bow: number, t0: number, dur: number, size: number, spin: number, depth: number): Head => ({
      tip, bow, t0, dur, size, spin, depth, seed: r() * 100,
      leaves: [{ u: 0.28 + r() * 0.1, side: r() < 0.5 ? -1 : 1, L: 0.17 + r() * 0.06 }, { u: 0.5 + r() * 0.1, side: 0, L: 0.13 + r() * 0.05 }],
    });
    const s0 = star ? 0.58 : 0.78;
    this.heads.push(H([0.0, -1.0], 0.03, 4.6, 3.3, s0, 0, 1));
    const ring: [number, number, number, number, number][] = star
      ? [[-0.42, -0.78, 0.44, -0.5, 0], [0.42, -0.8, 0.44, 0.45, 0], [-0.24, -0.5, 0.4, -0.25, 2], [0.26, -0.52, 0.4, 0.3, 2], [0.02, -0.66, 0.36, 0.9, 0]]
      : [[-0.5, -0.82, 0.6, -0.3, 0], [0.5, -0.84, 0.6, 0.3, 0], [-0.3, -0.54, 0.54, -0.16, 2], [0.31, -0.56, 0.54, 0.18, 2]];
    ring.forEach(([x, y, s, spin, depth], i) => this.heads.push(H([x, y], x * 0.12, 9.3 + i * 0.75, 2.6, s, spin, depth)));
    this.heads.sort((a, b) => a.depth - b.depth);
  }

  resize(W: number, H: number) {
    this.W = W; this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
  }

  /** Grows it all; resolves once the last flower has opened (it goes on glowing afterwards). */
  play(): Promise<void> {
    this.t0 = performance.now();
    const loop = (now: number) => { this.raf = requestAnimationFrame(loop); this.draw((now - this.t0) / 1000); };
    this.raf = requestAnimationFrame(loop);
    return new Promise((res) => { this.done = res; });
  }
  destroy() { cancelAnimationFrame(this.raf); }
  private cue(name: string, c: 'land' | 'bloom') { if (!this.cued.has(name)) { this.cued.add(name); this.onCue(c); } }

  private draw(t: number) {
    const { g, W, H, dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    const portrait = W / H < 1;
    // (on wide screens a little lower and smaller, leaving the top for her name)
    const U = Math.min(H * (portrait ? 0.46 : 0.42), W * (portrait ? 0.62 : 0.5));
    const base: P2 = [W / 2, H * (portrait ? 0.8 : 0.88)];
    const P = (x: number, y: number): P2 => [base[0] + x * U, base[1] + y * U];

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
      this.line(pts, p, Math.max(2, U * 0.016), `rgba(10,34,52,${dim})`);
      g.globalCompositeOperation = 'lighter';
      this.line(pts, p, Math.max(1, U * 0.005), `rgba(80,160,230,${0.35 * dim})`);
      g.globalCompositeOperation = 'source-over';
      for (const lf of h.leaves) {
        if (p < lf.u) continue;
        const k = spring((t - (h.t0 + h.dur * lf.u)) / 1.2, 6, 10);
        const i = Math.round(lf.u * 32), q = pts[i], q2 = pts[Math.min(32, i + 1)];
        const ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]);
        const side = lf.side || (h.tip[0] >= 0 ? 1 : -1);
        this.leaf(q, ang + side * 0.75, U * lf.L * k, side * 0.6, dim);
      }
      if (p > 0.85) {
        const end = pts[32], pre = pts[29];
        const dir = Math.atan2(end[1] - pre[1], end[0] - pre[0]) + Math.PI / 2;
        flowers.push(() => this.flower(h, end, dir + h.spin * (this.art.star ? 1 : 0.35), t, U));
      }
    }
    for (const f of flowers) f();

    // ── motes of light drifting up off the flowers ──
    if (t > 8 && Math.random() < 0.5) {
      const h = this.heads[Math.floor(Math.random() * this.heads.length)];
      if (t > h.t0 + h.dur + 0.5) {
        const [x, y] = P(h.tip[0], h.tip[1] - h.size * 0.3);
        this.mote(x + (Math.random() - 0.5) * U * h.size * 0.8, y + (Math.random() - 0.5) * U * h.size * 0.4, (Math.random() - 0.5) * 12, -14 - Math.random() * 24, 3 + Math.random() * 2.5, 0.7 + Math.random() * 1.6);
      }
    }
    // and a few always hanging in the dark, like in her pictures
    if (this.motes.length < 30 && Math.random() < 0.12) this.mote(Math.random() * W, H * (0.1 + Math.random() * 0.7), (Math.random() - 0.5) * 6, -4 - Math.random() * 6, 5 + Math.random() * 4, 0.6 + Math.random() * 1.4);
    this.drawMotes();

    const last = this.heads.reduce((m, h) => Math.max(m, h.t0 + h.dur), 0);
    if (t > last + 3.6 && this.done) { this.done(); this.done = undefined; }
  }

  // ── a flower: the picture, opening wedge by wedge about where its petals grow from ──
  private flower(h: Head, at: P2, dir: number, t: number, U: number) {
    const g = this.g, A = this.art;
    // the bud forms as the stem finishes, waits a moment, then opens slowly
    const main = h === this.heads.find((x) => x.depth === 1);
    const bloomStart = h.t0 + h.dur + (main ? 0.9 : 0.5);
    const open = clamp((t - bloomStart) / (main ? 3.4 : 2.8));
    const grow = eo((t - h.t0 - h.dur * 0.8) / 1.4);
    if (grow <= 0.01) return;
    if (open > 0.4) this.cue(`b${h.seed}`, 'bloom');
    const k = ((h.size * U) / A.w) * (0.55 + 0.45 * grow) * (1 + Math.sin(t * 1.3 + h.seed) * 0.01 * open);
    const px = A.pivot[0] * A.w, py = A.pivot[1] * A.h;
    // a halo behind it
    const cx = at[0] + Math.sin(dir) * (A.pivot[1] - A.core[1]) * A.h * k, cy = at[1] - Math.cos(dir) * (A.pivot[1] - A.core[1]) * A.h * k;
    this.glow(cx, cy, A.w * k * (0.5 + 0.3 * open), (A.star ? 0.08 : 0.12 + 0.12 * open) * grow);
    if (h.depth === 0 && 'filter' in g) g.filter = 'brightness(0.72)';
    if (open >= 1) {
      g.save();
      g.translate(at[0], at[1]); g.rotate(dir); g.scale(k, k);
      g.drawImage(A.img, -px, -py);
      g.restore();
    } else {
      // folded: every wedge turned towards the top; opening, the outer ones last
      const N = 40, closedK = A.star ? 0.08 : 0.1, r0 = A.star ? 0.5 : 0.6, R = Math.hypot(A.w, A.h) * 1.2, eps = (TAU / N) * 0.12;
      const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => Math.abs(this.phi(a, N)) - Math.abs(this.phi(b, N)));
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
        g.drawImage(A.img, -px, -py);
        g.restore();
      }
    }
    if ('filter' in g) g.filter = 'none';
    // its heart glows brighter as it opens
    // (the lily's heart isn't lit in her picture: only a breath of light there)
    this.glow(cx, cy, A.w * k * 0.16, (A.star ? 0.06 : 0.25 + 0.35 * open) * grow * (0.85 + 0.15 * Math.sin(t * 2 + h.seed)));
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
    gr.addColorStop(0, `rgba(30,90,140,${0.9 * dim})`); gr.addColorStop(0.5, `rgba(12,50,84,${0.92 * dim})`); gr.addColorStop(1, `rgba(6,24,44,${0.95 * dim})`);
    g.fillStyle = gr; g.fill(path);
    g.strokeStyle = `rgba(110,190,255,${0.45 * dim})`; g.lineWidth = Math.max(0.6, L * 0.012); g.stroke(path);
    g.strokeStyle = `rgba(130,200,255,${0.3 * dim})`;
    g.beginPath(); g.moveTo(L * 0.05, 0); g.quadraticCurveTo(L * 0.5, -w * 0.15 + bend * w * 0.1, L * 0.92, bend * w * 0.35); g.stroke();
    g.restore();
  }
  private mote(x: number, y: number, vx: number, vy: number, life: number, r: number) {
    if (this.motes.length > 200) return;
    this.motes.push({ x, y, vx, vy, life, age: 0, r, tw: Math.random() * 6 });
  }
  private drawMotes() {
    const g = this.g, dt = 1 / 60;
    g.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.985; m.vy = m.vy * 0.99 - 2 * dt;
      const a = Math.sin(Math.PI * clamp(m.age / m.life)) * (0.7 + 0.3 * Math.sin(m.age * 5 + m.tw));
      g.globalAlpha = a * 0.85;
      g.drawImage(this.glowSprite, m.x - m.r * 5, m.y - m.r * 5, m.r * 10, m.r * 10);
      g.fillStyle = `rgb(${BLUE[0] + 120},${BLUE[1] + 70},255)`;
      g.fillRect(m.x - m.r * 0.5, m.y - m.r * 0.5, m.r, m.r);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    this.motes = this.motes.filter((m) => m.age < m.life);
  }
}
