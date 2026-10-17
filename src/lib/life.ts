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

// ── Kinds of life ─────────────────────────────────────────────
interface Flyer { x: number; y: number; vx: number; vy: number; size: number; phase: number; speed: number; colour: number; seed: number }
interface Garden { home: Vec2; phase: number; colour: number; seed: number; size: number }
interface Bird { x: number; y: number; vx: number; size: number; phase: number; white: boolean; bob: number; sx: number; sy: number }
interface Firefly { home: Vec2; seed: number; size: number }
interface Petal { x: number; y: number; vx: number; vy: number; rot: number; spin: number; size: number; life: number; age: number; color: string }
interface Mote { x: number; y: number; vx: number; vy: number; r: number; g: number; b: number; delay: number; age: number; life: number; size: number; seed: number }

export class Life {
  private g: CanvasRenderingContext2D;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private swarmers: Flyer[] = [];
  private swarmDone: (() => void) | null = null;
  private garden: Garden[];
  private birds: Bird[] = [];
  private birdTimer = 1;
  private fireflies: Firefly[];
  private petals: Petal[] = [];
  private motes: Mote[] = [];
  private glow: HTMLCanvasElement;
  private fireGlow: HTMLCanvasElement;

  /** 0 → 1: how much of each is showing */
  amount = { garden: 0, birds: 0, fireflies: 0 };

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    this.garden = [[0.33, 0.6], [0.6, 0.62], [0.44, 0.66], [0.7, 0.64], [0.26, 0.68], [0.52, 0.58]].map((home, i) => ({
      home: home as Vec2, phase: rand(0, TAU), colour: i % WING_COLORS.length, seed: rand(0, 100), size: rand(0.022, 0.03),
    }));
    this.fireflies = Array.from({ length: 46 }, () => ({ home: [rand(0.02, 0.98), rand(0.5, 0.97)] as Vec2, seed: rand(0, 100), size: rand(0.6, 1.3) }));
    this.glow = this.makeGlow(24, 'rgba(255,214,110,1)', 'rgba(255,170,40,0)');
    this.fireGlow = this.makeGlow(32, 'rgba(236,255,150,1)', 'rgba(170,255,90,0)');
  }

  private makeGlow(size: number, inner: string, outer: string) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.6)'));
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }

  maxDpr = 1.75;

  resize(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
  }

  /** A swarm sweeping across the screen. Resolves once most of it has passed. */
  swarm(count = 64): Promise<void> {
    const { W, H } = this;
    const diag = Math.hypot(W, H);
    for (let i = 0; i < count; i++) {
      const near = Math.random() ** 2.2;                  // most small and far, a few huge and close
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

  petalBurst(x: number, y: number, count: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU), s = rand(120, 700);
      this.petals.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, rot: rand(0, TAU), spin: rand(-8, 8), size: rand(10, 34), life: rand(1.4, 2.4), age: 0, color: colors[i % colors.length] });
    }
  }

  /** Golden dust from points on screen; each one is released at its `delay` (s). */
  dust(points: { x: number; y: number; r: number; g: number; b: number; delay: number }[]) {
    for (const p of points) {
      this.motes.push({
        ...p, vx: rand(-14, 30), vy: rand(-70, -20), age: 0, life: rand(1.1, 2.1), size: rand(0.9, 2.4), seed: rand(0, 100),
      });
    }
  }

  /** Where the birds are on screen (for testing). */
  get birdSpots(): [number, number][] { return this.birds.filter((b) => b.sx > 20 && b.sx < this.W - 20).map((b) => [b.sx, b.sy]); }

  /** Is there a bird under this point (screen px)? */
  hitBird(x: number, y: number): boolean {
    return this.birds.some((b) => Math.hypot(b.sx - x, b.sy - y) < Math.max(30, b.size * 0.9));
  }

  frame(time: number, dt: number, map: (uv: Vec2) => Vec2, pxPerPicture: number) {
    const { g, W, H, dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // fireflies (behind everything else, additive glow)
    if (this.amount.fireflies > 0.01) {
      g.globalCompositeOperation = 'lighter';
      for (const f of this.fireflies) {
        const t = time * 0.12 + f.seed;
        const u: Vec2 = [f.home[0] + Math.sin(t * 1.3) * 0.03 + Math.sin(t * 2.9 + 1) * 0.012, f.home[1] + Math.cos(t * 1.1) * 0.02 + Math.sin(t * 3.7) * 0.008];
        const [sx, sy] = map(u);
        const blink = Math.max(0, Math.sin(time * (0.9 + (f.seed % 1) * 0.8) + f.seed * 7)) ** 3;
        const a = this.amount.fireflies * (0.15 + 0.85 * blink);
        const s = (10 + pxPerPicture * 0.012) * f.size;
        g.globalAlpha = a;
        g.drawImage(this.fireGlow, sx * W - s, sy * H - s, s * 2, s * 2);
        g.globalAlpha = Math.min(1, a * 1.5);
        g.fillStyle = '#f7ffd0';
        g.fillRect(sx * W - 1, sy * H - 1, 2, 2);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }

    // birds across the sky
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
      const s = b.size * pxPerPicture;
      this.drawBird(b.sx, b.sy, s, b.phase, b.white, this.amount.birds, b.vx < 0);
    }
    this.birds = this.birds.filter((b) => b.x > -0.2 && b.x < 1.2);

    // garden butterflies
    if (this.amount.garden > 0.01) {
      for (const f of this.garden) {
        const t = time * 0.35 + f.seed;
        const u: Vec2 = [f.home[0] + Math.sin(t) * 0.04 + Math.sin(t * 2.3) * 0.012, f.home[1] + Math.sin(t * 1.7 + 1) * 0.025 - Math.abs(Math.sin(t * 4.1)) * 0.01];
        const du: Vec2 = [Math.cos(t) * 0.04 + Math.cos(t * 2.3) * 0.028, Math.cos(t * 1.7 + 1) * 0.042];
        f.phase += dt * 13;
        const [sx, sy] = map(u);
        drawButterfly(g, sx * W, sy * H, f.size * pxPerPicture, Math.atan2(du[1], du[0]) + Math.PI / 2, f.phase, f.colour, this.amount.garden);
      }
    }

    // the swarm
    if (this.swarmers.length) {
      for (const f of this.swarmers) {
        const wob = Math.sin(time * 3 + f.seed) * 0.6;
        const ang = Math.atan2(f.vy, f.vx) + wob * dt * 2;
        const sp = Math.hypot(f.vx, f.vy);
        f.vx = Math.cos(ang) * sp;
        f.vy = Math.sin(ang) * sp + Math.sin(time * 5 + f.seed) * 40 * dt * 60 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.phase += dt * (16 + 200 / f.size);
        drawButterfly(g, f.x, f.y, f.size, Math.atan2(f.vy, f.vx) + Math.PI / 2, f.phase, f.colour);
      }
      this.swarmers = this.swarmers.filter((f) => f.x < W + f.size && f.y > -f.size * 2 && f.x > -W);
      if (this.swarmDone && this.swarmers.length < 6) { this.swarmDone(); this.swarmDone = null; }
    }

    // petals
    for (const p of this.petals) {
      p.age += dt;
      p.vx *= 1 - dt * 1.4;
      p.vy = p.vy * (1 - dt * 1.4) + 160 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      const a = clamp(1 - p.age / p.life);
      g.save();
      g.globalAlpha = a;
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.scale(1, 0.55 + 0.45 * Math.sin(p.age * 6 + p.rot));
      g.fillStyle = p.color;
      g.beginPath();
      g.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, TAU);
      g.fill();
      g.restore();
    }
    this.petals = this.petals.filter((p) => p.age < p.life);

    // golden dust
    if (this.motes.length) {
      g.globalCompositeOperation = 'lighter';
      for (const m of this.motes) {
        m.age += dt;
        if (m.age < m.delay) continue;
        const t = m.age - m.delay;
        const swirl = Math.sin(t * 3 + m.seed) * 18;
        m.x += (m.vx + swirl) * dt;
        m.y += m.vy * dt;
        m.vy -= 12 * dt;
        const k = clamp(t / 0.45);
        const r = m.r + (255 - m.r) * k, gg = m.g + (212 - m.g) * k, b = m.b + (110 - m.b) * k;
        const a = clamp(1 - t / m.life) * (0.75 + 0.25 * Math.sin(t * 20 + m.seed));
        g.globalAlpha = a;
        g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
        g.fillRect(m.x - m.size / 2, m.y - m.size / 2, m.size, m.size);
        if ((m.seed * 10) % 1 < 0.18) {
          g.globalAlpha = a * 0.7;
          g.drawImage(this.glow, m.x - 7, m.y - 7, 14, 14);
        }
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
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
    // body
    path.ellipse(0, 0, s * 0.34, s * 0.11, 0, 0, TAU);
    // wings: two curved blades, rising and falling
    path.moveTo(-s * 0.05, -s * 0.02);
    path.quadraticCurveTo(-s * 0.2, wingY - s * 0.05, -s * 0.5, wingY * 1.1 + s * 0.04);
    path.quadraticCurveTo(-s * 0.22, wingY * 0.4 + s * 0.05, s * 0.05, s * 0.03);
    path.moveTo(s * 0.0, -s * 0.02);
    path.quadraticCurveTo(-s * 0.08, wingY * 0.8 - s * 0.06, s * 0.28, wingY * 0.9 + s * 0.02);
    path.quadraticCurveTo(s * 0.05, wingY * 0.3 + s * 0.04, s * 0.08, s * 0.03);
    // head and tail
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
