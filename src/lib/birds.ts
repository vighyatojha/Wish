// ─────────────────────────────────────────────────────────────
//  Birds
//  Small flocks crossing the sky, flapping and gliding, at heights
//  taken from the picture so they stay above the mountains.
// ─────────────────────────────────────────────────────────────
import type { Vec2 } from './valley';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface Bird { dx: number; dy: number; size: number; phase: number; rate: number; glide: number; bob: number }
interface Flock { x: number; dir: 1 | -1; speed: number; height: number; depth: number; birds: Bird[] }

export interface BirdFrame {
  time: number;
  dt: number;
  toScreen: (uv: Vec2) => Vec2; // picture → screen, both 0–1
  scale: number;                // how big the picture is drawn (1 = original size)
  visible: number;              // 0 → 1
}

export class Birds {
  private g: CanvasRenderingContext2D;
  private W = 1;
  private H = 1;
  private dpr = 1;
  private flocks: Flock[] = [];
  private nextFlockIn = 0.5;

  constructor(private canvas: HTMLCanvasElement, private skyTop = 0.1, private skyBottom = 0.27, private maxFlocks = 2) {
    this.g = canvas.getContext('2d')!;
  }

  resize(W: number, H: number): void {
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
  }

  private spawnFlock(): void {
    const n = 5 + Math.floor(Math.random() * 5);
    const depth = rnd(0.55, 1); // nearer flocks are bigger and faster
    const fromLeft = Math.random() < 0.7;
    const birds: Bird[] = [];
    for (let i = 0; i < n; i++) {
      // a loose V: each bird trails a little behind and to the side
      const rank = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
      birds.push({
        dx: -Math.abs(rank) * rnd(0.018, 0.03),
        dy: rank * rnd(0.008, 0.014) + rnd(-0.004, 0.004),
        size: rnd(0.85, 1.15),
        phase: rnd(0, Math.PI * 2),
        rate: rnd(7.5, 9.5),
        glide: rnd(0, 10),
        bob: rnd(0, Math.PI * 2),
      });
    }
    this.flocks.push({
      x: fromLeft ? -0.03 : 1.03,
      dir: fromLeft ? 1 : -1,
      speed: rnd(34, 52) * depth,
      height: rnd(this.skyTop, this.skyBottom),
      depth,
      birds,
    });
  }

  private drawBird(x: number, y: number, span: number, flap: number, alpha: number): void {
    const { g } = this;
    const w = span / 2;
    const up = flap * span * 0.34;
    g.globalAlpha = alpha;
    g.beginPath();
    g.moveTo(x - w, y - up);
    g.quadraticCurveTo(x - w * 0.42, y - up * 0.25 - span * 0.1, x, y + span * 0.03);
    g.quadraticCurveTo(x + w * 0.42, y - up * 0.25 - span * 0.1, x + w, y - up);
    g.quadraticCurveTo(x + w * 0.42, y - up * 0.25 + span * 0.02, x, y + span * 0.13);
    g.quadraticCurveTo(x - w * 0.42, y - up * 0.25 + span * 0.02, x - w, y - up);
    g.fill();
  }

  render({ time, dt, toScreen, scale, visible }: BirdFrame): void {
    const { g, dpr, W, H } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (visible <= 0.001) return;

    this.nextFlockIn -= dt;
    if (this.nextFlockIn <= 0 && this.flocks.length < this.maxFlocks) {
      this.spawnFlock();
      this.nextFlockIn = rnd(7, 14);
    }

    g.fillStyle = '#2a2119';
    for (let f = this.flocks.length - 1; f >= 0; f--) {
      const flock = this.flocks[f];
      flock.x += (flock.dir * flock.speed * scale * dt) / W;
      if (flock.x < -0.4 || flock.x > 1.4) {
        this.flocks.splice(f, 1);
        continue;
      }
      const baseY = toScreen([0.5, flock.height])[1];
      for (const b of flock.birds) {
        const gliding = Math.sin(time * 0.35 + b.glide) > 0.55; // flap a while, glide a while
        if (!gliding) b.phase += b.rate * dt;
        const flap = gliding ? 0.12 : Math.sin(b.phase);
        const x = flock.x * W + b.dx * flock.dir * 900 * scale;
        const y = baseY * H + b.dy * 900 * scale + Math.sin(time * 1.3 + b.bob) * 2;
        this.drawBird(x, y, 15 * scale * flock.depth * b.size, flap, (0.55 + 0.4 * flock.depth) * visible);
      }
    }
    g.globalAlpha = 1;
  }

  destroy(): void {
    this.flocks.length = 0;
    this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
