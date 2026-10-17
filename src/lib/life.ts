// ─────────────────────────────────────────────────────────────
//  Everything small that moves over the bus stop, on one canvas:
//  • a swarm of butterflies that sweeps across the whole screen;
//  • a few butterflies fluttering about the garden;
//  • white and black birds crossing the sky (she can tap them);
//  • fireflies wandering in the dark;
//  • tulip petals bursting outwards;
//  • golden dust an animal dissolves into.
//  Garden things are pinned to the picture (they move with the
//  camera); the swarm, petals and dust live on the screen.
// ─────────────────────────────────────────────────────────────
import type { Vec2 } from './camera';

const TAU = Math.PI * 2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ── Butterfly wings, painted once per colour ────────────────────
interface WingSet { right: HTMLCanvasElement; left: HTMLCanvasElement; body: HTMLCanvasElement }
export interface WingColors { inner: string; outer: string; edge: string; dots: string }
export const WING_COLORS: WingColors[] = [
  { inner: '#a8e4ff', outer: '#2f77d8', edge: '#16244a', dots: '#ffffff' }, // sky blue
  { inner: '#ffd27a', outer: '#ee6a1c', edge: '#2a160c', dots: '#fff4dc' }, // monarch
  { inner: '#fff6b0', outer: '#f2c230', edge: '#3a2a10', dots: '#ffffff' }, // lemon
  { inner: '#ffe0f0', outer: '#ff78b2', edge: '#5a1f3a', dots: '#ffffff' }, // rose
  { inner: '#efe2ff', outer: '#9a78e6', edge: '#2e1f4a', dots: '#ffffff' }, // lilac
  { inner: '#dcfff2', outer: '#3fc79a', edge: '#123a2c', dots: '#ffffff' }, // mint
];
const SPRITE = 64; // wing sprite size (px) at 1×; drawn scaled

function paintWing(c: WingColors, mirror: boolean): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = SPRITE * 2;
  cv.height = SPRITE * 2;
  const g = cv.getContext('2d')!;
  g.scale(2, 2);
  // body axis at x = 0 (left edge for the right wing), middle height
  if (mirror) { g.translate(SPRITE, 0); g.scale(-1, 1); }
  g.translate(2, SPRITE / 2);
  const fore = new Path2D('M0,-3 C10,-26 34,-34 56,-28 C60,-16 52,-6 36,-2 C24,0 10,1 0,1Z');
  const hind = new Path2D('M0,2 C14,2 32,6 40,16 C42,26 30,32 18,30 C10,26 4,16 0,4Z');
  for (const p of [hind, fore]) {
    const grd = g.createRadialGradient(4, 0, 2, 10, 0, 56);
    grd.addColorStop(0, c.inner);
    grd.addColorStop(0.75, c.outer);
    grd.addColorStop(1, c.edge);
    g.fillStyle = grd;
    g.fill(p);
    g.lineWidth = 1.6;
    g.strokeStyle = c.edge;
    g.stroke(p);
  }
  // dark border band and white dots along it
  g.save();
  g.clip(fore);
  g.lineWidth = 6;
  g.strokeStyle = c.edge;
  g.globalAlpha = 0.85;
  g.stroke(new Path2D('M10,-24 C30,-34 52,-32 58,-26 C58,-14 50,-6 36,-1'));
  g.restore();
  g.fillStyle = c.dots;
  for (const [x, y, r] of [[46, -26, 1.6], [52, -20, 1.4], [50, -12, 1.3], [30, 26, 1.4], [37, 20, 1.3]] as const) {
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  // veins
  g.globalAlpha = 0.35;
  g.strokeStyle = c.edge;
  g.lineWidth = 0.8;
  g.stroke(new Path2D('M2,-1 C16,-12 30,-20 50,-24 M2,0 C18,-4 30,-6 44,-8 M2,3 C14,8 24,14 32,24'));
  return cv;
}

function paintBody(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 24;
  cv.height = 80;
  const g = cv.getContext('2d')!;
  g.scale(2, 2);
  g.translate(6, 20);
  g.fillStyle = '#2a1d16';
  g.beginPath(); g.ellipse(0, 4, 2.6, 13, 0, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, -10, 3.2, 0, TAU); g.fill();
  g.strokeStyle = '#2a1d16';
  g.lineWidth = 0.9;
  g.beginPath(); g.moveTo(-1, -12); g.quadraticCurveTo(-4, -18, -5, -19); g.moveTo(1, -12); g.quadraticCurveTo(4, -18, 5, -19); g.stroke();
  return cv;
}

const wingCache: WingSet[] = [];
function wings(i: number): WingSet {
  return (wingCache[i] ??= { right: paintWing(WING_COLORS[i], false), left: paintWing(WING_COLORS[i], true), body: paintBody() });
}

/** Draw one butterfly. size = wingspan in px; heading 0 = flying up the screen. */
function drawButterfly(g: CanvasRenderingContext2D, x: number, y: number, size: number, heading: number, phase: number, colour: number, alpha = 1) {
  const w = wings(colour);
  const k = size / 112;               // wingspan of the sprite ≈ 112 units
  const open = 0.18 + 0.82 * Math.abs(Math.cos(phase));
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  g.rotate(heading);
  g.scale(k, k);
  g.save(); g.scale(open, 1); g.drawImage(w.right, -2, -SPRITE / 2, SPRITE, SPRITE); g.restore();
  g.save(); g.scale(open, 1); g.drawImage(w.left, -SPRITE + 2, -SPRITE / 2, SPRITE, SPRITE); g.restore();
  g.drawImage(w.body, -6, -20, 12, 40);
  g.restore();
}

// ── Petals, painted once: tulip pink, front and back, sharp and soft ──
interface PetalSprites { front: HTMLCanvasElement; back: HTMLCanvasElement; soft: HTMLCanvasElement }
const PETAL_TINTS = [['#ffd0dc', '#ff6a8f', '#c21d48'], ['#ffe2ea', '#ff86a6', '#d4305a'], ['#ffc0cf', '#f2507a', '#a81a3e'], ['#fff0f3', '#ffa3ba', '#e0577b']];
function paintPetal(tint: string[], back: boolean, blur = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 128;
  const g = c.getContext('2d')!;
  if (blur) g.filter = `blur(${blur}px)`;
  g.translate(48, 120);
  // a tulip petal: broad, cupped, rounded tip, narrowing to its base
  const p = new Path2D('M0,0 C-22,-10 -38,-46 -34,-78 C-30,-100 -14,-112 0,-112 C14,-112 30,-100 34,-78 C38,-46 22,-10 0,0Z');
  const grd = g.createLinearGradient(0, -112, 0, 0);
  grd.addColorStop(0, tint[0]);
  grd.addColorStop(0.45, tint[1]);
  grd.addColorStop(1, tint[2]);
  g.fillStyle = grd;
  g.fill(p);
  // cupped shading: darker along one side, a soft sheen down the middle
  const side = g.createLinearGradient(-34, 0, 34, 0);
  side.addColorStop(0, back ? 'rgba(60,0,20,0.35)' : 'rgba(80,0,30,0.22)');
  side.addColorStop(0.55, 'rgba(255,255,255,0)');
  side.addColorStop(1, back ? 'rgba(60,0,20,0.1)' : 'rgba(255,240,245,0.25)');
  g.fillStyle = side;
  g.fill(p);
  g.save();
  g.clip(p);
  g.strokeStyle = back ? 'rgba(120,10,40,0.18)' : 'rgba(255,255,255,0.28)';
  g.lineWidth = 1.2;
  for (const x of [-16, -8, 0, 8, 16]) {
    g.beginPath();
    g.moveTo(x * 0.2, -4);
    g.quadraticCurveTo(x * 1.2, -60, x * 1.1, -108);
    g.stroke();
  }
  g.restore();
  return c;
}
const petalCache: PetalSprites[] = [];
function petalSprites(i: number): PetalSprites {
  return (petalCache[i] ??= { front: paintPetal(PETAL_TINTS[i], false), back: paintPetal(PETAL_TINTS[i], true), soft: paintPetal(PETAL_TINTS[i], false, 6) });
}

// ── Kinds of life ─────────────────────────────────────────────
interface Flyer { x: number; y: number; vx: number; vy: number; size: number; phase: number; speed: number; colour: number; seed: number }
interface Garden { home: Vec2; phase: number; colour: number; seed: number; size: number }
interface Fore { seed: number; phase: number; colour: number; size: number }
interface Bird { x: number; y: number; vx: number; size: number; phase: number; white: boolean; bob: number; sx: number; sy: number }
interface Firefly { home: Vec2; seed: number; size: number; depth: number }
interface Petal { x: number; y: number; vx: number; vy: number; rot: number; spin: number; flip: number; flipRate: number; size: number; age: number; life: number; tint: number; near: boolean; seed: number }
interface Mote { x: number; y: number; vx: number; vy: number; r: number; g: number; b: number; delay: number; age: number; life: number; size: number; seed: number }

export class Life {
  private g: CanvasRenderingContext2D;
  private f: CanvasRenderingContext2D;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private swarmers: Flyer[] = [];
  private swarmDone: (() => void) | null = null;
  private garden: Garden[];
  private fore: Fore[];
  private birds: Bird[] = [];
  private birdTimer = 1;
  private fireflies: Firefly[];
  private bokeh: Firefly[];
  private petals: Petal[] = [];
  private motes: Mote[] = [];
  private glow: HTMLCanvasElement;
  private fireGlow: HTMLCanvasElement;
  private bokehDisc: HTMLCanvasElement;

  /** 0 → 1: how much of each is showing */
  amount = { garden: 0, fore: 0, birds: 0, fireflies: 0 };
  maxDpr = 1.75;

  /** back: behind the characters · front: in front of them */
  constructor(private canvas: HTMLCanvasElement, private front: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    this.f = front.getContext('2d')!;
    this.garden = [[0.4, 0.6], [0.6, 0.62], [0.47, 0.66], [0.7, 0.64], [0.33, 0.68], [0.55, 0.58], [0.64, 0.7]].map((home, i) => ({
      home: home as Vec2, phase: rand(0, TAU), colour: i % WING_COLORS.length, seed: rand(0, 100), size: rand(0.03, 0.042),
    }));
    this.fore = Array.from({ length: 3 }, (_, i) => ({ seed: rand(0, 100) + i * 37, phase: rand(0, TAU), colour: (i * 2 + 1) % WING_COLORS.length, size: rand(0.07, 0.1) }));
    // fireflies at three depths: far specks over the fields, nearer ones, and big soft out-of-focus lights
    this.fireflies = Array.from({ length: 70 }, () => {
      const depth = Math.random();
      return { home: [rand(0.0, 1.0), 0.58 + depth * 0.38 + rand(-0.04, 0.04)] as Vec2, seed: rand(0, 100), size: 0.5 + depth * 1.1, depth };
    });
    this.bokeh = Array.from({ length: 9 }, () => ({ home: [rand(0.05, 0.95), rand(0.15, 0.95)] as Vec2, seed: rand(0, 100), size: rand(0.6, 1.4), depth: 1 }));
    this.glow = this.makeGlow(24, 'rgba(255,214,110,1)', 'rgba(255,170,40,0)');
    this.fireGlow = this.makeGlow(48, 'rgba(240,255,170,1)', 'rgba(170,255,90,0)');
    this.bokehDisc = this.makeBokeh(96);
  }

  private makeGlow(size: number, inner: string, outer: string) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.2, inner.replace(/[\d.]+\)$/, '0.55)'));
    grd.addColorStop(0.5, inner.replace(/[\d.]+\)$/, '0.12)'));
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }

  /** an out-of-focus light: a soft disc with a slightly brighter rim, like a lens sees it */
  private makeBokeh(size: number) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    const r = size / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, 'rgba(220,255,150,0.35)');
    grd.addColorStop(0.72, 'rgba(225,255,160,0.42)');
    grd.addColorStop(0.86, 'rgba(240,255,190,0.6)');
    grd.addColorStop(0.95, 'rgba(200,255,140,0.15)');
    grd.addColorStop(1, 'rgba(200,255,140,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(r, r, r, 0, TAU);
    g.fill();
    return c;
  }

  resize(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    for (const c of [this.canvas, this.front]) {
      c.width = Math.round(W * this.dpr);
      c.height = Math.round(H * this.dpr);
    }
  }

  /** A swarm sweeping across the screen. Resolves once most of it has passed. */
  swarm(count = 64): Promise<void> {
    const { W, H } = this;
    const diag = Math.hypot(W, H);
    for (let i = 0; i < count; i++) {
      const near = Math.random() ** 2.2;
      const size = (0.05 + near * 0.28) * Math.min(W, H) + 14;
      const fromLeft = Math.random() < 0.6;
      const x = fromLeft ? rand(-0.4 * W, -0.05 * W) : rand(0, W);
      const y = fromLeft ? rand(0.2 * H, 1.25 * H) : rand(1.05 * H, 1.5 * H);
      const speed = (0.28 + near * 0.35) * diag;
      const ang = fromLeft ? rand(-0.55, -0.1) : rand(-1.7, -1.1);
      this.swarmers.push({
        x: x - (i / count) * W * 0.6, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        size, phase: rand(0, TAU), speed, colour: i % WING_COLORS.length, seed: rand(0, 100),
      });
    }
    return new Promise((res) => { this.swarmDone = res; });
  }

  /** Tulip petals bursting out from a point, then tumbling down like real petals. */
  petalBurst(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU), near = Math.random() < 0.18, s = rand(250, 1100) * (near ? 1.3 : 1);
      this.petals.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 150, rot: rand(0, TAU), spin: rand(-3, 3),
        flip: rand(0, TAU), flipRate: rand(2, 6) * (Math.random() < 0.5 ? -1 : 1),
        size: (near ? rand(0.16, 0.26) : rand(0.04, 0.1)) * Math.min(this.W, this.H),
        age: 0, life: rand(4, 6.5), tint: i % PETAL_TINTS.length, near, seed: rand(0, 100),
      });
    }
  }

  /** a few green leaf bits (the stem snapping) */
  leafBits(x: number, y: number) {
    this.petalBurst(x, y, 0);
    for (let i = 0; i < 7; i++) {
      const a = rand(-Math.PI, 0), s = rand(80, 260);
      this.motes.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 90, g: 150, b: 60, delay: 0, age: 0, life: rand(0.6, 1), size: rand(2, 4), seed: rand(0, 100) });
    }
  }

  /** Golden dust from points on screen; each one is released at its `delay` (s). */
  dust(points: { x: number; y: number; r: number; g: number; b: number; delay: number }[]) {
    for (const p of points) {
      this.motes.push({ ...p, vx: rand(-12, 26), vy: rand(-55, -18), age: 0, life: rand(1.6, 2.6), size: rand(0.9, 2.4), seed: rand(0, 100) });
    }
  }

  /** Where the birds are on screen (for testing). */
  get birdSpots(): [number, number][] { return this.birds.filter((b) => b.sx > 20 && b.sx < this.W - 20).map((b) => [b.sx, b.sy]); }

  /** Is there a bird under this point (screen px)? */
  hitBird(x: number, y: number): boolean {
    return this.birds.some((b) => Math.hypot(b.sx - x, b.sy - y) < Math.max(30, b.size * 0.9));
  }

  frame(time: number, dt: number, map: (uv: Vec2) => Vec2, pxPerPicture: number) {
    const { g, f, W, H, dpr } = this;
    for (const c of [g, f]) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
    }

    // ── fireflies: far specks and nearer glows (behind the characters) ──
    if (this.amount.fireflies > 0.01) {
      g.globalCompositeOperation = 'lighter';
      for (const ff of this.fireflies) {
        const t = time * (0.06 + ff.depth * 0.08) + ff.seed;
        const u: Vec2 = [ff.home[0] + Math.sin(t * 1.3) * 0.035 + Math.sin(t * 2.9 + 1) * 0.012, ff.home[1] + Math.cos(t * 1.1) * 0.022 + Math.sin(t * 3.7) * 0.008];
        const [sx, sy] = map(u);
        // each one glows for a few seconds, then rests in the dark
        const cycle = (time * (0.18 + (ff.seed % 1) * 0.12) + ff.seed) % 1;
        const on = Math.sin(Math.PI * clamp(cycle / 0.55)) ** 2;
        const a = this.amount.fireflies * (0.05 + 0.95 * on);
        const s = (4 + pxPerPicture * 0.02) * ff.size;
        g.globalAlpha = a * (0.55 + ff.depth * 0.45);
        g.drawImage(this.fireGlow, sx * W - s, sy * H - s, s * 2, s * 2);
        g.globalAlpha = a;
        g.fillStyle = '#fbffe0';
        const core = 0.8 + ff.depth * 1.6;
        g.fillRect(sx * W - core / 2, sy * H - core / 2, core, core);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      // big soft out-of-focus lights drifting close to the lens (in front)
      f.globalCompositeOperation = 'lighter';
      for (const b of this.bokeh) {
        const t = time * 0.05 + b.seed;
        const x = (b.home[0] + Math.sin(t * 1.1) * 0.08 + Math.sin(t * 2.3) * 0.03) * W;
        const y = (b.home[1] + Math.cos(t * 0.9) * 0.06) * H;
        const cycle = (time * 0.09 + b.seed) % 1;
        const on = Math.sin(Math.PI * clamp(cycle / 0.6)) ** 2;
        const r = Math.min(W, H) * 0.05 * b.size;
        f.globalAlpha = this.amount.fireflies * on * 0.55;
        f.drawImage(this.bokehDisc, x - r, y - r, r * 2, r * 2);
      }
      f.globalCompositeOperation = 'source-over';
      f.globalAlpha = 1;
    }

    // ── birds across the sky ──
    if (this.amount.birds > 0.01) {
      this.birdTimer -= dt;
      if (this.birdTimer <= 0 && this.birds.length < 12) {
        this.birdTimer = rand(3.5, 6.5);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const y = rand(0.07, 0.3);
        const n = 2 + Math.floor(Math.random() * 4);
        for (let k = 0; k < n; k++) {
          this.birds.push({
            x: dir > 0 ? -0.04 - k * 0.035 : 1.04 + k * 0.035, y: y + rand(-0.03, 0.03), vx: dir * rand(0.028, 0.04),
            size: rand(0.022, 0.032), phase: rand(0, TAU), white: Math.random() < 0.5, bob: rand(0, TAU), sx: -999, sy: -999,
          });
        }
      }
    }
    for (const b of this.birds) {
      b.x += b.vx * dt;
      b.phase += dt * 9;
      const [sx, sy] = map([b.x, b.y + Math.sin(time * 1.4 + b.bob) * 0.004]);
      b.sx = sx * W;
      b.sy = sy * H;
      this.drawBird(b.sx, b.sy, b.size * pxPerPicture, b.phase, b.white, this.amount.birds, b.vx < 0);
    }
    this.birds = this.birds.filter((b) => b.x > -0.2 && b.x < 1.2);

    // ── garden butterflies about the stop ──
    if (this.amount.garden > 0.01) {
      for (const gb of this.garden) {
        const t = time * 0.35 + gb.seed;
        const u: Vec2 = [gb.home[0] + Math.sin(t) * 0.05 + Math.sin(t * 2.3) * 0.015, gb.home[1] + Math.sin(t * 1.7 + 1) * 0.03 - Math.abs(Math.sin(t * 4.1)) * 0.012];
        const du: Vec2 = [Math.cos(t) * 0.05 + Math.cos(t * 2.3) * 0.034, Math.cos(t * 1.7 + 1) * 0.05];
        gb.phase += dt * 13;
        const [sx, sy] = map(u);
        drawButterfly(g, sx * W, sy * H, gb.size * pxPerPicture, Math.atan2(du[1], du[0]) + Math.PI / 2, gb.phase, gb.colour, this.amount.garden);
      }
    }

    // ── a few butterflies close to us, drifting round the edges of the screen ──
    if (this.amount.fore > 0.01) {
      for (const fb of this.fore) {
        const t = time * 0.16 + fb.seed;
        // keep to the sides and corners so they never sit on the words
        const x = 0.5 + Math.sin(t) * 0.47 + Math.sin(t * 2.7) * 0.04;
        const y = 0.5 + Math.sin(t * 1.37 + 1.1) * 0.44 + Math.cos(t * 3.1) * 0.03;
        const dx = Math.cos(t) * 0.47 + Math.cos(t * 2.7) * 0.108, dy = Math.cos(t * 1.37 + 1.1) * 0.6;
        fb.phase += dt * 11;
        drawButterfly(f, x * W, y * H, fb.size * Math.min(W, H) * 1.3, Math.atan2(dy * H, dx * W) + Math.PI / 2, fb.phase, fb.colour, this.amount.fore);
      }
    }

    // ── the swarm ──
    if (this.swarmers.length) {
      for (const s of this.swarmers) {
        const wob = Math.sin(time * 3 + s.seed) * 0.6;
        const ang = Math.atan2(s.vy, s.vx) + wob * dt * 2;
        const sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(ang) * sp;
        s.vy = Math.sin(ang) * sp;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.phase += dt * (16 + 200 / s.size);
        drawButterfly(s.size > Math.min(W, H) * 0.18 ? f : g, s.x, s.y, s.size, Math.atan2(s.vy, s.vx) + Math.PI / 2, s.phase, s.colour);
      }
      this.swarmers = this.swarmers.filter((s) => s.x < W + s.size && s.y > -s.size * 2 && s.x > -W);
      if (this.swarmDone && this.swarmers.length < 6) { this.swarmDone(); this.swarmDone = null; }
    }

    // ── petals: thrown out fast, then tumbling and drifting down ──
    for (const p of this.petals) {
      p.age += dt;
      const drag = Math.min(1, dt * (p.age < 0.6 ? 3.2 : 1.6));
      p.vx += (-p.vx * drag) + Math.sin(time * 2 + p.seed) * 60 * dt;
      p.vy += (-p.vy * drag) + 110 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.flip += p.flipRate * dt;
      const flipC = Math.cos(p.flip);
      const sprites = petalSprites(p.tint);
      const img = p.near ? sprites.soft : flipC > 0 ? sprites.front : sprites.back;
      const a = clamp(Math.min(p.age * 6, (p.life - p.age) / 1.2));
      const c = p.near ? f : g;
      c.save();
      c.globalAlpha = a * (p.near ? 0.85 : 1);
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.scale(Math.max(0.12, Math.abs(flipC)), 1);
      c.drawImage(img, -p.size * 0.375, -p.size * 0.94, p.size * 0.75, p.size);
      c.restore();
    }
    this.petals = this.petals.filter((p) => p.age < p.life && p.y < H + 200);

    // ── golden dust (in front) ──
    if (this.motes.length) {
      f.globalCompositeOperation = 'lighter';
      for (const m of this.motes) {
        m.age += dt;
        if (m.age < m.delay) continue;
        const t = m.age - m.delay;
        const swirl = Math.sin(t * 2.4 + m.seed) * 16;
        m.x += (m.vx + swirl) * dt;
        m.y += m.vy * dt;
        m.vy -= 10 * dt;
        const k = clamp(t / 0.5);
        const r = m.r + (255 - m.r) * k, gg = m.g + (212 - m.g) * k, b = m.b + (110 - m.b) * k;
        const a = clamp(1 - t / m.life) * (0.75 + 0.25 * Math.sin(t * 20 + m.seed));
        f.globalAlpha = a;
        f.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
        f.fillRect(m.x - m.size / 2, m.y - m.size / 2, m.size, m.size);
        if ((m.seed * 10) % 1 < 0.2) {
          f.globalAlpha = a * 0.7;
          f.drawImage(this.glow, m.x - 7, m.y - 7, 14, 14);
        }
      }
      f.globalCompositeOperation = 'source-over';
      f.globalAlpha = 1;
      this.motes = this.motes.filter((m) => m.age < m.delay + m.life);
    }
  }

  private drawBird(x: number, y: number, s: number, phase: number, white: boolean, alpha: number, left: boolean) {
    const g = this.g;
    const flap = Math.sin(phase);
    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y);
    if (left) g.scale(-1, 1);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const wingY = -flap * s * 0.42;
    const path = new Path2D();
    path.ellipse(0, 0, s * 0.34, s * 0.11, 0, 0, TAU);
    path.moveTo(-s * 0.05, -s * 0.02);
    path.quadraticCurveTo(-s * 0.2, wingY - s * 0.05, -s * 0.5, wingY * 1.1 + s * 0.04);
    path.quadraticCurveTo(-s * 0.22, wingY * 0.4 + s * 0.05, s * 0.05, s * 0.03);
    path.moveTo(s * 0.0, -s * 0.02);
    path.quadraticCurveTo(-s * 0.08, wingY * 0.8 - s * 0.06, s * 0.28, wingY * 0.9 + s * 0.02);
    path.quadraticCurveTo(s * 0.05, wingY * 0.3 + s * 0.04, s * 0.08, s * 0.03);
    path.moveTo(s * 0.34, 0);
    path.arc(s * 0.32, -s * 0.02, s * 0.08, 0, TAU);
    path.moveTo(-s * 0.3, 0);
    path.lineTo(-s * 0.48, -s * 0.06);
    path.lineTo(-s * 0.46, s * 0.06);
    path.closePath();
    g.fillStyle = white ? '#f8f7f2' : '#17171c';
    g.fill(path);
    if (white) {
      g.strokeStyle = 'rgba(80,90,110,0.55)';
      g.lineWidth = Math.max(0.6, s * 0.03);
      g.stroke(path);
    }
    g.restore();
  }
}
