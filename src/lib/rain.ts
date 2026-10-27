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
  /** a raindrop as the eye (or a camera) sees it: a thin streak, faint at the top, with a light
   *  core and darker edges (light bending through water); one sharp, one soft for drops near the lens */
  private streaks: HTMLCanvasElement[] = [];
  private streakTint = -1;
  private makeStreaks(tint: number) {
    const r = Math.round(70 + 150 * tint), gg = Math.round(88 + 140 * tint), b = Math.round(118 + 120 * tint);
    const make = (w: number, blur: number) => {
      const c = document.createElement('canvas'); c.width = w; c.height = 96;
      const g = c.getContext('2d')!;
      if (blur) g.filter = `blur(${blur}px)`;
      const m = w / 2, half = Math.max(0.7, w / 2 - blur * 2 - 0.2);
      const lg = g.createLinearGradient(0, 0, 0, 96);
      lg.addColorStop(0, `rgba(${r},${gg},${b},0)`);
      lg.addColorStop(0.55, `rgba(${r},${gg},${b},0.55)`);
      lg.addColorStop(1, `rgba(${r},${gg},${b},0.95)`);
      g.fillStyle = lg;
      g.beginPath(); g.ellipse(m, 48, half, 46, 0, 0, Math.PI * 2); g.fill();
      // the bright core (a glint of light inside the drop)
      const core = g.createLinearGradient(0, 0, 0, 96);
      core.addColorStop(0, 'rgba(255,255,255,0)'); core.addColorStop(1, `rgba(255,255,255,${0.55 - tint * 0.2})`);
      g.fillStyle = core;
      g.beginPath(); g.ellipse(m, 52, half * 0.38, 40, 0, 0, Math.PI * 2); g.fill();
      return c;
    };
    this.streaks = [make(6, 0), make(18, 3.5)];
    this.streakTint = tint;
  }

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
    const depth = Math.random() ** 1.6; // 0 far … 1 near (most drops are far)
    const speed = rand(1500, 2300) * (0.55 + depth * 0.6);
    // (a falling drop is seen as a streak about as long as it falls in 1/30 s)
    const len = speed / 30 * rand(0.8, 1.2) * Math.max(0.6, H / 900);
    this.drops.push({
      x: rand(-0.15 * W, W * 1.02),
      y: -len - Math.random() * H * 0.25,
      vy: speed,
      vx: speed * 0.13, // a little wind
      len,
      depth,
      hitY: Math.random() < 0.3 ? rand(0.02, 1.0) * H : Infinity, // (enough land on the paper to soak it; the rest fall past)
    });
  }

  private splash(x: number, y: number, depth: number): void {
    const s: Splash = { x, y, t: 0, r: rand(2, 5) * (0.5 + depth * 0.8), bits: [] };
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 1.15, Math.PI * 1.85); // a little crown, mostly upwards
      const v = rand(50, 140) * (0.6 + depth * 0.6);
      s.bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    }
    this.splashes.push(s);
  }

  // intensity 0 → 1. impacts = false lets drops fall without splashing.
  update(dt: number, intensity: number, impacts = true): void {
    const rate = intensity < 0.01 ? 0 : (10 + 420 * intensity * intensity) * this.density;
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
      if (s.t > 0.26) splashes.splice(i, 1);
    }
  }

  // tint 0 = dark rain (over the white page) → 1 = pale rain (over fog)
  draw(tint = 0): void {
    const { g, dpr, W, H } = this;
    if (Math.abs(tint - this.streakTint) > 0.04) this.makeStreaks(tint);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // each drop: its streak, turned along the way it's falling; far drops thin and faint,
    // near ones longer and stronger, the very nearest soft and blurred (out of focus)
    for (const d of this.drops) {
      const near = d.depth > 0.85;
      const img = near ? this.streaks[1] : this.streaks[0];
      const ang = Math.atan2(d.vx, d.vy);
      const w = near ? 6 + d.depth * 6 : 0.9 + d.depth * 2.2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      g.globalAlpha = near ? 0.32 : 0.24 + d.depth * 0.6;
      g.setTransform(ca * dpr, -sa * dpr, sa * dpr, ca * dpr, d.x * dpr, d.y * dpr);
      g.drawImage(img, -w / 2, -d.len, w, d.len);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalAlpha = 1;

    const r = Math.round(70 + 150 * tint), gg = Math.round(88 + 140 * tint), b = Math.round(118 + 120 * tint);
    for (const s of this.splashes) {
      const p = s.t / 0.26;
      const a = (1 - p) * 0.45;
      g.strokeStyle = g.fillStyle = `rgba(${r},${gg},${b},${a})`;
      g.lineWidth = 0.8;
      g.beginPath();
      g.ellipse(s.x, s.y, s.r * (0.4 + p * 1.2), s.r * (0.4 + p * 1.2) * 0.35, 0, 0, Math.PI * 2);
      g.stroke();
      for (const bit of s.bits) {
        g.beginPath();
        g.arc(bit.x, bit.y, 0.8, 0, Math.PI * 2);
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
