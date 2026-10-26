// ─────────────────────────────────────────────────────────────
//  A crumpled ball of paper opening out to reveal him.
//  draw(t), t: 0 → 1
//   • the sheet: an irregular, crinkled shape that starts as a small
//     tight ball and opens out, flattening (its creases soften) into a
//     sheet a little bigger than him;
//   • a jagged hole in the middle of it, over his face, that widens as
//     the paper opens until all of him is there, standing on the sheet.
//  Everything is drawn here (no picture of paper is needed).
// ─────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const eio = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
function rng(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** crumpled paper: facets, each tilted its own way and lit from the top left */
function crumple(size: number, strength: number, seed: number): HTMLCanvasElement {
  const r = rng(seed);
  const pts = Array.from({ length: 320 }, () => ({ x: r() * size, y: r() * size, nx: (r() - 0.5) * 2, ny: (r() - 0.5) * 2 }));
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  const im = g.createImageData(size, size);
  const L = [-0.55, -0.65, 0.52];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // nearest and second-nearest facet: their border is a crease
    let d1 = 1e9, d2 = 1e9, k = 0;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - x, dy = pts[i].y - y, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; k = i; } else if (d < d2) d2 = d;
    }
    const p = pts[k];
    const nx = p.nx * strength, ny = p.ny * strength, nz = 1;
    const n = Math.hypot(nx, ny, nz);
    const lit = (nx * L[0] + ny * L[1] + nz * L[2]) / n;
    const crease = Math.sqrt(d2) - Math.sqrt(d1) < 1.6 ? 1 : 0;
    const grain = (r() - 0.5) * 6;
    const v = 230 + lit * 26 - crease * 16 * strength + grain;
    const o = (y * size + x) * 4;
    im.data[o] = v + 1; im.data[o + 1] = v; im.data[o + 2] = v - 3; im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  // (softened a little, so the facets read as creased paper rather than cut glass)
  const s2 = document.createElement('canvas'); s2.width = s2.height = size;
  const g2 = s2.getContext('2d')!;
  g2.filter = 'blur(1.1px)';
  g2.drawImage(c, 0, 0);
  return s2;
}

export class Unfurl {
  private g: CanvasRenderingContext2D;
  private tight: HTMLCanvasElement;
  private soft: HTMLCanvasElement;
  private sheetR: { a: number; tight: number; flat: number }[];
  private holeR: { a: number; r: number }[];
  private W = 1; private H = 1; private dpr = 1;

  /** `pad`: how much bigger the canvas is than his picture on each side (share of its width) */
  constructor(private canvas: HTMLCanvasElement, private portrait: HTMLImageElement, private pad = 0.12) {
    this.g = canvas.getContext('2d')!;
    this.tight = crumple(240, 0.95, 7);
    this.soft = crumple(240, 0.22, 7);
    const r = rng(42);
    // the sheet's outline: very ragged as a ball, a gently uneven sheet when open
    this.sheetR = Array.from({ length: 26 }, (_, i) => ({
      a: (i / 26) * TAU + (r() - 0.5) * 0.18,
      tight: 0.6 + r() * 0.55,
      flat: 0.93 + r() * 0.12,
    }));
    // the hole: jagged, torn
    this.holeR = Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * TAU + (r() - 0.5) * 0.25, r: 0.65 + r() * 0.6 }));
  }

  resize() {
    const b = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = Math.max(1, b.width); this.H = Math.max(1, b.height);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
  }

  /** `paper`: how much of the sheet is still there (it fades away once he's out, leaving just him) */
  draw(t: number, paper = 1) {
    const { g, W, H, dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (t <= 0) return;
    // his picture's box inside the canvas
    const k = 1 / (1 + this.pad * 2);
    const bw = W * k, bh = H * k, bx = (W - bw) / 2, by = (H - bh) / 2;
    // the paper opens out first; the hole only widens fully at the very end, as it does in your hands
    const open = eio(clamp(t / 0.8));                        // how far the paper has opened
    const flat = eio(clamp((t - 0.2) / 0.8));                // how flat it is
    const reveal = eio(clamp((t - 0.12) / 0.8));             // how wide the hole is
    const whole = eio(clamp((t - 0.78) / 0.22));             // (at the very end, all of him, past the hole's edge)

    // the sheet: a ball turning a little as it opens, centred a touch below the middle of him
    const cx = bx + bw * 0.5, cy = by + bh * 0.58;
    const R = lerp(bw * 0.2, bw * 0.52, open);
    const spin = lerp(-0.55, 0, open);
    const sheet = new Path2D();
    this.sheetR.forEach((v, i) => {
      const rr = R * lerp(v.tight, v.flat, flat);
      const a = v.a + spin;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * lerp(1, 1.12, flat);
      if (i === 0) sheet.moveTo(x, y); else sheet.lineTo(x, y);
    });
    sheet.closePath();
    g.save();
    g.globalAlpha = paper;
    g.shadowColor = 'rgba(30, 20, 10, 0.35)';
    g.shadowBlur = bw * 0.05;
    g.shadowOffsetY = bw * 0.02;
    g.fillStyle = '#efece6';
    g.fill(sheet);
    g.restore();
    g.save();
    g.globalAlpha = paper;
    g.clip(sheet);
    const tx = cx - R * 1.25, ty = cy - R * 1.35, ts = R * 2.6;
    g.drawImage(this.soft, tx, ty, ts, ts);
    g.globalAlpha = paper * (1 - flat * 0.85);                         // (the creases soften as it's smoothed out)
    g.drawImage(this.tight, tx, ty, ts, ts);
    g.restore();

    // the hole, torn over his face, widening until all of him shows
    const hx = bx + bw * 0.55, hy = by + bh * 0.4;
    const hr = lerp(bw * 0.08, bw * 0.78, reveal);
    const hole = new Path2D();
    this.holeR.forEach((v, i) => {
      const a = v.a + spin * 0.6;
      const rr = hr * lerp(v.r, 1, reveal * 0.6);
      const x = hx + Math.cos(a) * rr, y = hy + Math.sin(a) * rr * 1.15;
      if (i === 0) hole.moveTo(x, y); else hole.lineTo(x, y);
    });
    hole.closePath();
    // (the dark inside of the ball, only where there's paper around it, fading as it opens up)
    g.save();
    g.clip(sheet);
    g.fillStyle = `rgba(14, 12, 10, ${(0.85 * (1 - reveal) ** 2).toFixed(3)})`;
    g.fill(hole);
    g.restore();
    g.save();
    g.clip(hole);
    g.globalAlpha = clamp(t / 0.15) * (1 - whole);
    g.drawImage(this.portrait, bx, by, bw, bh);
    g.restore();
    if (whole > 0) { g.globalAlpha = whole; g.drawImage(this.portrait, bx, by, bw, bh); g.globalAlpha = 1; }
    // the torn edge of the hole: a shadow and a light paper rim, gone once it's fully open
    if (whole < 0.98) {
      g.save();
      g.clip(sheet);                                          // (the torn edge exists only in the paper)
      const a = (1 - reveal * 0.5) * (1 - whole);
      g.strokeStyle = `rgba(40, 30, 20, ${(0.35 * a).toFixed(3)})`; g.lineWidth = bw * 0.03; g.stroke(hole);
      g.strokeStyle = `rgba(255, 253, 248, ${(0.9 * a).toFixed(3)})`; g.lineWidth = bw * 0.012; g.stroke(hole);
      g.restore();
    }
  }
}
