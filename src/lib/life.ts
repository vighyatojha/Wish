// ─────────────────────────────────────────────────────────────
//  Everything small that moves over the bus stop, on one canvas:
//  • a swarm of butterflies that sweeps across the whole screen;
//  • butterflies living in the meadow, in 3D (meadow.ts);
//  • white and black birds crossing the sky (she can tap them);
//  • fireflies rising out of the grass at dusk, wandering in the dark
//    (and once, at the very end, gathering into a heart);
//  • tulip petals bursting outwards;
//  • golden dust an animal dissolves into.
//  Garden things are pinned to the picture (they move with the
//  camera); the swarm, petals and dust live on the screen.
// ─────────────────────────────────────────────────────────────
import type { Vec2 } from './camera';

const TAU = Math.PI * 2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

import { drawButterfly3D, norm, NEUTRAL, WING_COLORS, type Light, type V3 } from './wings';
import { Meadow } from './meadow';
export { WING_COLORS };

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
interface Flyer { x: number; y: number; vx: number; vy: number; vz: number; size: number; phase: number; speed: number; colour: number; seed: number }
interface Bird { x: number; y: number; vx: number; size: number; phase: number; white: boolean; bob: number; sx: number; sy: number }
interface Firefly { home: Vec2; seed: number; size: number; depth: number; th: number }
interface HeartSpark { from: [number, number]; to: [number, number]; seed: number; delay: number }
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
  private meadow: Meadow;
  private heartSparks: HeartSpark[] = [];
  private heartT = -1;
  private heartLen = 0;
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
  amount = { garden: 0, birds: 0, fireflies: 0 };
  maxDpr = window.matchMedia?.('(pointer: coarse)').matches ? 1.5 : 1.75;
  /** whether anything was drawn on the front layer last frame (if not, it can leave the screen) */
  frontUsed = true;
  /** the light of the hour (the butterflies are lit by it) */
  light: Light = NEUTRAL;
  /** the part of the picture on screen (u range) */
  set view(v: [number, number]) { this.meadow.view = v; }

  /** back: behind the characters · front: in front of them */
  constructor(private canvas: HTMLCanvasElement, private front: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    this.f = front.getContext('2d')!;
    const few = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.meadow = new Meadow(few ? 6 : 10);
    // fireflies at three depths: far specks over the fields, nearer ones, and big soft out-of-focus lights
    this.fireflies = Array.from({ length: 70 }, () => {
      const depth = Math.random();
      return { home: [rand(0.0, 1.0), 0.58 + depth * 0.38 + rand(-0.04, 0.04)] as Vec2, seed: rand(0, 100), size: 0.5 + depth * 1.1, depth, th: Math.random() * 0.7 };
    });
    this.bokeh = Array.from({ length: 5 }, () => ({ home: [rand(0.05, 0.95), rand(0.15, 0.95)] as Vec2, seed: rand(0, 100), size: rand(0.6, 1.4), depth: 1, th: rand(0.4, 0.9) }));
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
        x: x - (i / count) * W * 0.6, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, vz: rand(-0.5, 0.5) * speed,
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

  /**
   * A rare little surprise: fireflies drift together into a heart around (cx, cy),
   * glow there for a while, then wander off again.
   */
  heart(cx: number, cy: number, size: number, seconds = 9) {
    const n = 34;
    this.heartSparks = Array.from({ length: n }, (_, i) => {
      const t = (i / n) * TAU;
      const hx = 16 * Math.sin(t) ** 3, hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return {
        from: [rand(0, this.W), rand(this.H * 0.55, this.H)] as [number, number],
        to: [cx + (hx / 17) * size, cy + (hy / 17) * size] as [number, number],
        seed: rand(0, 100), delay: rand(0, 0.8),
      };
    });
    this.heartT = 0;
    this.heartLen = seconds;
  }

  /** Where the birds are on screen (for testing). */
  get birdSpots(): [number, number][] { return this.birds.filter((b) => b.sx > 20 && b.sx < this.W - 20).map((b) => [b.sx, b.sy]); }

  /** where the glowing fireflies were last frame (screen px), for taps */
  private lit: { x: number; y: number; r: number }[] = [];
  /** Is there a glowing firefly under this point (screen px)? */
  hitFirefly(x: number, y: number): boolean {
    return this.lit.some((l) => Math.hypot(l.x - x, l.y - y) < l.r);
  }

  /** Is there a bird under this point (screen px)? */
  hitBird(x: number, y: number): boolean {
    return this.birds.some((b) => Math.hypot(b.sx - x, b.sy - y) < Math.max(30, b.size * 0.9));
  }

  frame(time: number, dt: number, map: (uv: Vec2) => Vec2, pxPerPicture: number) {
    const { g, f, W, H, dpr } = this;
    this.frontUsed = this.amount.fireflies > 0.01 || this.swarmers.length > 0 || this.petals.length > 0 || this.motes.length > 0;
    for (const c of [g, f]) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
    }

    // ── fireflies: far specks and nearer glows (behind the characters) ──
    this.lit.length = 0;
    if (this.amount.fireflies > 0.01) {
      g.globalCompositeOperation = 'lighter';
      for (const ff of this.fireflies) {
        // each one wakes at its own moment and rises out of the grass
        const awake = clamp((this.amount.fireflies - ff.th) / 0.3);
        if (awake <= 0) continue;
        const rise = (1 - awake) ** 2 * 0.06;
        const t = time * (0.06 + ff.depth * 0.08) + ff.seed;
        const u: Vec2 = [ff.home[0] + Math.sin(t * 1.3) * 0.035 + Math.sin(t * 2.9 + 1) * 0.012, ff.home[1] + rise + Math.cos(t * 1.1) * 0.022 + Math.sin(t * 3.7) * 0.008];
        const [sx, sy] = map(u);
        // each one glows for a few seconds, then rests in the dark
        const cycle = (time * (0.18 + (ff.seed % 1) * 0.12) + ff.seed) % 1;
        const on = Math.sin(Math.PI * clamp(cycle / 0.55)) ** 2;
        const a = awake * (0.05 + 0.95 * on);
        const s = (4 + pxPerPicture * 0.02) * ff.size;
        g.globalAlpha = a * (0.55 + ff.depth * 0.45);
        g.drawImage(this.fireGlow, sx * W - s, sy * H - s, s * 2, s * 2);
        g.globalAlpha = a;
        g.fillStyle = '#fbffe0';
        const core = 0.8 + ff.depth * 1.6;
        g.fillRect(sx * W - core / 2, sy * H - core / 2, core, core);
        // (any firefly that's awake and at least faintly glowing can be caught, with a generous fingertip's reach)
        if (a > 0.12) this.lit.push({ x: sx * W, y: sy * H, r: Math.max(46, s * 2.2) });
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
        const r = Math.min(W, H) * 0.04 * b.size;
        f.globalAlpha = clamp((this.amount.fireflies - b.th) / 0.2) * on * 0.32;
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

    // ── butterflies in the meadow (3D, lit by the hour) ──
    this.meadow.frame(g, dpr, W, H, time, dt, this.amount.garden, map, pxPerPicture, this.light);

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
        // drawn in 3D: x right, y up, z into the screen (shown at a slant, so turning ones foreshorten)
        const k = s.size;
        const fwd = norm([s.vx, -s.vy + s.speed * 0.15, s.vz] as V3);
        const up = norm([0, 0.3, -1] as V3);
        const upOrtho = norm([up[0] - fwd[0] * (up[0] * fwd[0] + up[1] * fwd[1] + up[2] * fwd[2]), up[1] - fwd[1] * (up[0] * fwd[0] + up[1] * fwd[1] + up[2] * fwd[2]), up[2] - fwd[2] * (up[0] * fwd[0] + up[1] * fwd[1] + up[2] * fwd[2])] as V3);
        const open = 0.5 + 0.9 * Math.sin(s.phase);
        drawButterfly3D(s.size > Math.min(W, H) * 0.18 ? f : g, dpr, [s.x, s.y], [[k, 0, 0.3 * k], [0, -k, -0.35 * k]], fwd, upOrtho, 1, open, s.colour, this.light);
      }
      this.swarmers = this.swarmers.filter((s) => s.x < W + s.size && s.y > -s.size * 2 && s.x > -W);
      if (this.swarmDone && this.swarmers.length < 6) { this.swarmDone(); this.swarmDone = null; }
    }

    // ── the fireflies' heart ──
    if (this.heartT >= 0) {
      this.heartT += dt;
      const T = this.heartT, gather = 2.6, leave = this.heartLen;
      g.globalCompositeOperation = 'lighter';
      for (const h of this.heartSparks) {
        const t = clamp((T - h.delay) / gather);
        const e = t * t * (3 - 2 * t);
        const out = clamp((T - leave) / 2.5);
        const wob = 6 * (1 - e * 0.7);
        let x = h.from[0] + (h.to[0] - h.from[0]) * e + Math.sin(T * 1.7 + h.seed) * wob;
        let y = h.from[1] + (h.to[1] - h.from[1]) * e + Math.cos(T * 1.3 + h.seed) * wob;
        x += Math.sin(h.seed * 7) * out * 60;
        y -= out * 80;
        const pulse = 0.75 + 0.25 * Math.sin(T * 2.2 + h.seed);
        const a = clamp(T / 0.6) * (1 - out) * pulse;
        const r = 9 + 5 * e;
        g.globalAlpha = a * 0.8;
        g.drawImage(this.fireGlow, x - r, y - r, r * 2, r * 2);
        g.globalAlpha = a;
        g.fillStyle = '#fbffe0';
        g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      if (T > leave + 2.5) this.heartT = -1;
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
