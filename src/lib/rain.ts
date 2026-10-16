// ─────────────────────────────────────────────────────────────
//  Rain
//  Rain       falling streaks and little splashes (2D canvas).
//  WetMap     a small grey canvas remembering where drops hit;
//             the paper shader reads it to darken those spots.
//
//  Both keep their canvas sized to the screen (no stretched
//  pixels) and free everything in destroy().
// ─────────────────────────────────────────────────────────────

const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Drop { x: number; y: number; vx: number; vy: number; len: number; depth: number; hitY: number }
interface Bit { x: number; y: number; vx: number; vy: number }
interface Splash { x: number; y: number; t: number; r: number; bits: Bit[] }

export type ImpactHandler = (u: number, v: number, depth: number) => void;

export class Rain {
  private g: CanvasRenderingContext2D;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private drops: Drop[] = [];
  private splashes: Splash[] = [];
  private spawnDebt = 0;
  private onResize = () => this.resize();

  constructor(private canvas: HTMLCanvasElement, private onImpact?: ImpactHandler, private density = 1) {
    this.g = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', this.onResize);
  }

  resize(): void {
    this.W = this.canvas.clientWidth || window.innerWidth;
    this.H = this.canvas.clientHeight || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
  }

  private spawn(): void {
    const { W, H } = this;
    const depth = Math.random(); // 0 far … 1 near
    const speed = rand(1300, 2100) * (0.75 + depth * 0.45);
    const len = rand(14, 26) * (0.7 + depth * 0.8);
    this.drops.push({
      x: rand(-0.15 * W, W * 1.02),
      y: -len - Math.random() * H * 0.25,
      vy: speed,
      vx: speed * 0.11, // a little wind
      len,
      depth,
      hitY: Math.random() < 0.78 ? rand(0.02, 1.0) * H : Infinity, // most land on the paper
    });
  }

  private splash(x: number, y: number, depth: number): void {
    const s: Splash = { x, y, t: 0, r: rand(3, 7) * (0.6 + depth * 0.7), bits: [] };
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 1.1, Math.PI * 1.9); // mostly upwards
      const v = rand(40, 110);
      s.bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    }
    this.splashes.push(s);
  }

  // intensity 0 → 1. impacts = false lets drops fall without splashing.
  update(dt: number, intensity: number, impacts = true): void {
    const rate = intensity < 0.01 ? 0 : (6 + 170 * intensity * intensity) * this.density;
    this.spawnDebt += rate * dt;
    while (this.spawnDebt >= 1) {
      this.spawn();
      this.spawnDebt -= 1;
    }

    const { drops, splashes, W, H } = this;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y >= d.hitY) {
        if (impacts) {
          this.splash(d.x, d.hitY, d.depth);
          this.onImpact?.(d.x / W, d.hitY / H, d.depth);
        }
        drops.splice(i, 1);
      } else if (d.y - d.len > H) {
        drops.splice(i, 1);
      }
    }
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.t += dt;
      for (const b of s.bits) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += 600 * dt;
      }
      if (s.t > 0.32) splashes.splice(i, 1);
    }
  }

  // tint 0 = dark rain (over the white page) → 1 = pale rain (over fog)
  draw(tint = 0): void {
    const { g, dpr, W, H } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const r = Math.round(96 + 134 * tint), gg = Math.round(116 + 122 * tint), b = Math.round(150 + 100 * tint);
    g.lineCap = 'round';

    // three depth layers, so styles are only set three times per frame
    for (let layer = 0; layer < 3; layer++) {
      const lo = layer / 3, hi = (layer + 1) / 3;
      g.beginPath();
      for (const d of this.drops) {
        if (d.depth < lo || d.depth >= hi) continue;
        const k = d.len / d.vy;
        g.moveTo(d.x - d.vx * k, d.y - d.len);
        g.lineTo(d.x, d.y);
      }
      g.strokeStyle = `rgba(${r},${gg},${b},${0.22 + layer * 0.14})`;
      g.lineWidth = 0.8 + layer * 0.45;
      g.stroke();
    }

    for (const s of this.splashes) {
      const p = s.t / 0.32;
      const a = (1 - p) * 0.55;
      g.strokeStyle = g.fillStyle = `rgba(${r},${gg},${b},${a})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(s.x, s.y, s.r * (0.3 + p), s.r * (0.3 + p) * 0.45, 0, 0, Math.PI * 2);
      g.stroke();
      for (const bit of s.bits) {
        g.beginPath();
        g.arc(bit.x, bit.y, 1.1, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.drops.length = 0;
    this.splashes.length = 0;
    this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// ── Wetness map ──────────────────────────────────────────────
interface Blot { parts: { x: number; y: number; r: number; a: number }[]; born: number }

export class WetMap {
  readonly canvas = document.createElement('canvas');
  private g: CanvasRenderingContext2D;
  private baked = document.createElement('canvas');
  private bg: CanvasRenderingContext2D;
  private sprite = document.createElement('canvas');
  private growing: Blot[] = [];
  private static GROW = 0.9; // seconds for a drop to spread into the paper

  constructor(aspect: number) {
    const W = 128;
    const H = Math.max(64, Math.round(W / aspect));
    this.canvas.width = this.baked.width = W;
    this.canvas.height = this.baked.height = H;
    this.g = this.canvas.getContext('2d')!;
    this.bg = this.baked.getContext('2d')!;
    this.bg.fillStyle = '#000';
    this.bg.fillRect(0, 0, W, H);

    // one soft round blot, reused for every drop
    this.sprite.width = this.sprite.height = 64;
    const sg = this.sprite.getContext('2d')!;
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 64, 64);
  }

  private stamp(ctx: CanvasRenderingContext2D, blot: Blot, p: number): void {
    const e = 1 - Math.pow(1 - p, 3);
    for (const part of blot.parts) {
      const r = part.r * e;
      ctx.globalAlpha = part.a;
      ctx.drawImage(this.sprite, part.x - r, part.y - r, r * 2, r * 2);
    }
  }

  // u, v in 0–1 screen space; nearer drops make bigger blots
  add(u: number, v: number, depth = 0.5): void {
    const W = this.canvas.width, H = this.canvas.height;
    const base = W * (0.018 + depth * 0.03) * (0.7 + Math.random() * 0.6);
    const parts = [];
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      parts.push({
        x: u * W + (Math.random() - 0.5) * base * 0.8,
        y: v * H + (Math.random() - 0.5) * base * 0.8,
        r: base * (0.6 + Math.random() * 0.5),
        a: 0.42 + Math.random() * 0.18,
      });
    }
    this.growing.push({ parts, born: performance.now() });
  }

  update(now = performance.now()): void {
    const { g, bg } = this;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.drawImage(this.baked, 0, 0);
    g.globalCompositeOperation = bg.globalCompositeOperation = 'lighter';
    for (let i = this.growing.length - 1; i >= 0; i--) {
      const blot = this.growing[i];
      const p = Math.min(1, (now - blot.born) / 1000 / WetMap.GROW);
      if (p >= 1) {
        this.stamp(bg, blot, 1); // finished drops are baked in once
        this.growing.splice(i, 1);
      }
      this.stamp(g, blot, p);
    }
    g.globalAlpha = bg.globalAlpha = 1;
  }

  destroy(): void {
    this.growing.length = 0;
    this.canvas.width = this.baked.width = 0;
  }
}
