// ─────────────────────────────────────────────────────────────
//  Birthday bunting carried by birds
//
//  • Each flag is painted once onto its own small canvas: speckled
//    cream card, a hand-lettered capital, a little watercolour
//    scene (mountain, pines, lake, yellow sun) and two metal
//    eyelets, like the printed bunting she'd hang at a party.
//  • Every frame the twine is drawn as a sagging curve between the
//    birds' feet, and each flag hangs from it, tilting with the
//    string and swinging on its own as the birds move.
//  • The birds themselves are SVG (CuteBird); this file moves them.
// ─────────────────────────────────────────────────────────────
import { BirdRig, FEET_POINT, blinker } from '../components/CuteBird';

// ── Painting one flag ─────────────────────────────────────────
// Design units: the card is 100 × 130, drawn with a 10-unit margin
// for its shadow. The card hangs from its top-centre point.
const CARD_W = 100, CARD_H = 130, PAD = 10;

function rng(seed: number) {
  let a = seed * 2654435761 >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function pine(g: CanvasRenderingContext2D, r: () => number, x: number, base: number, h: number) {
  g.strokeStyle = 'rgba(80,52,30,0.8)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x, base);
  g.lineTo(x, base - h * 0.95);
  g.stroke();
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const y = base - h * 0.12 - t * h * 0.8;
    const w = h * 0.34 * (1 - t * 0.78);
    g.fillStyle = i % 2 ? 'rgba(52,92,50,0.9)' : 'rgba(34,66,38,0.92)';
    g.beginPath();
    g.moveTo(x - w - r() * 1.2, y + 2);
    g.lineTo(x - w * 0.3, y - h * 0.1);
    g.lineTo(x, y - h * 0.2 - 2);
    g.lineTo(x + w * 0.3, y - h * 0.1);
    g.lineTo(x + w + r() * 1.2, y + 2);
    g.closePath();
    g.fill();
  }
}

/** Paint a flag for one letter. Returns a canvas `cssWidth * 1.2` CSS px wide. */
export function paintFlag(letter: string, cssWidth: number, dpr: number, seed: number): HTMLCanvasElement {
  const k = (cssWidth / CARD_W) * dpr;
  const c = document.createElement('canvas');
  c.width = Math.ceil((CARD_W + PAD * 2) * k);
  c.height = Math.ceil((CARD_H + PAD * 2) * k);
  const g = c.getContext('2d')!;
  const r = rng(seed + 11);
  g.scale(k, k);
  g.translate(PAD, PAD);

  // card + its soft shadow
  g.save();
  g.shadowColor = 'rgba(30,20,10,0.38)';
  g.shadowBlur = 6 * k;
  g.shadowOffsetX = 1.5 * k;
  g.shadowOffsetY = 3 * k;
  roundRect(g, 0, 0, CARD_W, CARD_H, 7);
  g.fillStyle = '#efe5cf';
  g.fill();
  g.restore();

  g.save();
  roundRect(g, 0, 0, CARD_W, CARD_H, 7);
  g.clip();
  // paper: gentle tone change and a darker edge
  const tone = g.createRadialGradient(45, 50, 10, 50, 65, 95);
  tone.addColorStop(0, '#f5eedd');
  tone.addColorStop(1, '#e2d4b4');
  g.fillStyle = tone;
  g.fillRect(0, 0, CARD_W, CARD_H);
  // fibres and speckles of recycled card
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(120,90,50,${0.05 + r() * 0.06})`;
    g.lineWidth = 0.4;
    const x = r() * CARD_W, y = r() * CARD_H, a = r() * Math.PI;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
    g.stroke();
  }
  for (let i = 0; i < 70; i++) {
    g.fillStyle = ['#b98a52', '#8f6a3f', '#d9a94e', '#6d5236'][Math.floor(r() * 4)];
    g.globalAlpha = 0.25 + r() * 0.45;
    g.beginPath();
    g.arc(r() * CARD_W, r() * CARD_H, 0.3 + r() * 0.7, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // the little watercolour scene
  const peak = 40 + r() * 20, top = 60 + r() * 7;
  const sunX = r() < 0.75 ? 76 + r() * 8 : 18 + r() * 8;
  // sun
  for (let i = 0; i < 3; i++) {
    g.fillStyle = i ? 'rgba(247,205,82,0.55)' : '#f0b32c';
    g.beginPath();
    g.arc(sunX + (r() - 0.5) * 1.2, 66 + (r() - 0.5) * 1.2, 8 - i * 1.6, 0, Math.PI * 2);
    g.fill();
  }
  // a paler far peak behind
  if (r() < 0.6) {
    const fx = peak + (r() < 0.5 ? -22 : 22);
    g.fillStyle = 'rgba(160,170,176,0.75)';
    g.beginPath();
    g.moveTo(fx - 24, 101);
    g.lineTo(fx, top + 10);
    g.lineTo(fx + 24, 101);
    g.closePath();
    g.fill();
  }
  // main mountain: lit left face, shadowed right face, jagged ridge
  const ridge: [number, number][] = [];
  for (let i = 0; i <= 6; i++) ridge.push([peak + i * 1.5 + (r() - 0.5) * 2, top + i * 6.5]);
  const lit = r() < 0.5 ? '#9b8d7c' : '#a3a8a9';
  const dark = r() < 0.5 ? '#665a50' : '#6c7276';
  for (let pass = 0; pass < 2; pass++) {
    g.globalAlpha = pass ? 0.4 : 0.92;
    g.fillStyle = lit;
    g.beginPath();
    g.moveTo(14, 102);
    g.lineTo(peak - 10, top + 12 + (r() - 0.5) * 3);
    g.lineTo(peak, top);
    for (const [x, y] of ridge) g.lineTo(x, y);
    g.lineTo(peak + 8, 102);
    g.closePath();
    g.fill();
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(peak, top);
    g.lineTo(peak + 16, top + 14 + (r() - 0.5) * 3);
    g.lineTo(88, 102);
    g.lineTo(peak + 8, 102);
    for (let i = ridge.length - 1; i >= 0; i--) g.lineTo(ridge[i][0], ridge[i][1]);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
  // snow on the peak
  g.fillStyle = 'rgba(255,255,255,0.88)';
  g.beginPath();
  g.moveTo(peak, top);
  g.lineTo(peak - 6, top + 8);
  g.lineTo(peak - 2, top + 6);
  g.lineTo(peak + 1, top + 10);
  g.lineTo(peak + 4, top + 6);
  g.lineTo(peak + 8, top + 9);
  g.closePath();
  g.fill();
  // grassy shore
  g.fillStyle = 'rgba(104,140,62,0.85)';
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.ellipse(10 + r() * 80, 102 + r() * 2, 6 + r() * 6, 2.4, 0, 0, Math.PI * 2);
    g.fill();
  }
  // lake: horizontal brush strokes with white glints, narrowing downwards
  g.save();
  g.beginPath();
  g.moveTo(8, 102);
  g.lineTo(92, 102);
  g.lineTo(80, 118);
  g.lineTo(52, 128);
  g.lineTo(22, 119);
  g.closePath();
  g.clip();
  g.lineCap = 'round';
  for (let y = 103; y < 130; y += 2.6) {
    for (let x = 4; x < 96; ) {
      const len = 6 + r() * 14;
      g.strokeStyle = ['#2f7aa0', '#4f9cc0', '#6bb4cf', '#3d88ad'][Math.floor(r() * 4)];
      g.globalAlpha = 0.75 + r() * 0.25;
      g.lineWidth = 2.6;
      g.beginPath();
      g.moveTo(x, y + (r() - 0.5));
      g.lineTo(x + len, y + (r() - 0.5));
      g.stroke();
      x += len + (r() < 0.25 ? 2 + r() * 3 : 0);
    }
  }
  g.globalAlpha = 0.85;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 0.9;
  for (let i = 0; i < 9; i++) {
    const x = 18 + r() * 64, y = 105 + r() * 16;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 2 + r() * 4, y);
    g.stroke();
  }
  g.restore();
  g.globalAlpha = 1;
  // pines on one or both sides
  const left = r() < 0.85, right = r() < 0.7 || !left;
  if (left) { pine(g, r, 12 + r() * 4, 104, 26 + r() * 8); if (r() < 0.6) pine(g, r, 22 + r() * 4, 104, 18 + r() * 6); }
  if (right) { pine(g, r, 84 + r() * 4, 104, 24 + r() * 8); if (r() < 0.5) pine(g, r, 76 + r() * 3, 104, 16 + r() * 6); }

  // the letter
  g.fillStyle = '#2a2520';
  g.font = '400 50px "Patrick Hand", "Comic Sans MS", cursive';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText(letter, 50, 54);

  // edge
  g.restore();
  roundRect(g, 0.5, 0.5, CARD_W - 1, CARD_H - 1, 7);
  g.strokeStyle = 'rgba(110,80,45,0.3)';
  g.lineWidth = 1;
  g.stroke();

  // metal eyelets
  for (const x of [14, 86]) {
    const ring = g.createRadialGradient(x - 1, 8, 0.5, x, 9, 4.6);
    ring.addColorStop(0, '#f4ecd8');
    ring.addColorStop(1, '#8c7c5c');
    g.fillStyle = ring;
    g.beginPath();
    g.arc(x, 9, 4.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3a2e22';
    g.beginPath();
    g.arc(x, 9, 2.2, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ── The banner scene ──────────────────────────────────────────
interface Flag {
  letter: string;
  x: number;        // centre, relative to the row's centre (CSS px)
  span: number;     // which stretch of twine it hangs on
  sprite: HTMLCanvasElement | null;
  angle: number;    // its own swing (radians)
  spin: number;
}
interface Row {
  flags: Flag[];
  anchors: number[]; // x of each bird's feet, relative to the row's centre
  birds: number[];   // which bird holds each anchor
  y: number;         // feet height
  cx: number;        // row centre
  width: number;
  side: number;      // −1 enters from the left, +1 from the right
  dx: number;        // current offset (for the swing physics)
  vx: number;
}
export interface BannerBird {
  g: SVGGElement;    // positioned group
  rig: BirdRig;
}

export class Banner {
  private g: CanvasRenderingContext2D;
  private rows: Row[] = [];
  private fw = 40;
  private dpr = 1;
  private W = 1;
  private H = 1;
  private phases: number[];
  private blinks: ((t: number) => number)[];
  private prev: { x: number; y: number; tilt: number }[];
  private spritesFor = '';

  constructor(private canvas: HTMLCanvasElement, private birds: BannerBird[], private words: { wide: string[]; tall: string[] }) {
    this.g = canvas.getContext('2d')!;
    this.phases = birds.map((_, i) => i * 1.7);
    this.blinks = birds.map((_, i) => blinker(i * 0.37));
    this.prev = birds.map(() => ({ x: 0, y: 0, tilt: 0 }));
  }

  /** How many birds the current layout uses. */
  get birdsUsed() {
    return this.rows.reduce((n, r) => n + r.anchors.length, 0);
  }

  resize(W: number, H: number, top: number) {
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    const lines = W / H > 1.05 ? this.words.wide : this.words.tall;

    // flag size: the longest line fits the width, all lines fit the top half
    const units = (s: string) => [...s].reduce((n, ch) => n + (ch === ' ' ? 1.5 : 1.08), 0) + 0.84 + 1.15;
    const longest = Math.max(...lines.map(units));
    const rowsHigh = lines.length * 3.3;
    const fw = Math.min((W * 0.95) / longest, (H * 0.5) / rowsHigh, 74);
    this.fw = fw;
    const bs = fw * 1.6;              // bird size
    const fh = fw * 1.3;              // flag height

    let birdIndex = 0;
    let y = top + bs * 0.8;
    this.rows = lines.map((line, r) => {
      const chars = [...line];
      const widths = chars.map((ch) => (ch === ' ' ? 1.5 : 1.08) * fw);
      const total = widths.reduce((a, b) => a + b, 0);
      let x = -total / 2;
      const flags: Flag[] = [];
      const anchors = [-total / 2 - fw * 0.42];
      chars.forEach((ch, i) => {
        const mid = x + widths[i] / 2;
        if (ch === ' ') anchors.push(mid);
        else flags.push({ letter: ch, x: mid, span: anchors.length - 1, sprite: null, angle: 0, spin: 0 });
        x += widths[i];
      });
      anchors.push(total / 2 + fw * 0.42);
      const birds = anchors.map(() => birdIndex++);
      const maxSpan = Math.max(...anchors.slice(1).map((a, i) => a - anchors[i]));
      const sag = maxSpan * 0.07 + fw * 0.12;
      const slack = Math.max(0, (W - (total + fw * 0.84 + bs)) / 2);
      const row: Row = {
        flags, anchors, birds, y, width: total + fw * 0.84,
        cx: W / 2 + slack * 0.3 * (r % 2 ? -1 : 1),
        side: r % 2 ? -1 : 1, dx: 0, vx: 0,
      };
      y += bs * 0.7 + sag + fh + fw * 0.3;
      return row;
    });

    const key = `${Math.round(fw)}|${this.dpr}|${lines.join('/')}`;
    if (key !== this.spritesFor) {
      this.spritesFor = key;
      let seed = 0;
      for (const row of this.rows) for (const f of row.flags) f.sprite = paintFlag(f.letter, fw, this.dpr, ++seed);
    }
    this.birds.forEach((b, i) => { b.g.style.display = i < this.birdsUsed ? '' : 'none'; });
  }

  /** enter: per row 0 → 1 (flown in). away: 0 → 1 (flown off upwards). */
  update(time: number, dt: number, enter: number[], away: number) {
    const { g, fw, W, H, dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const bs = fw * 1.6, sc = bs / 200;
    const step = dt > 0 ? dt : 1 / 60;

    this.rows.forEach((row, r) => {
      const e = enter[r] ?? 0;
      const a = Math.min(1, Math.max(0, away * 1.5 - r * 0.22));
      // where the row is: flying in from its side, later up and away
      const inX = row.side * (1 - e) * (W * 0.55 + row.width * 0.6 + bs);
      const inY = -(1 - e) * H * 0.12;
      const offX = inX + a * row.side * W * 0.12;
      const offY = inY - a * a * (row.y + bs + fw * 2.5);
      const vx = (offX - row.dx) / step;
      const ax = (vx - row.vx) / step;
      row.dx = offX;
      row.vx = vx;
      if (e <= 0.001 || a >= 0.999) {
        row.birds.forEach((b) => { this.birds[b].g.style.visibility = 'hidden'; });
        return;
      }

      // the birds, each hovering and flapping on its own rhythm
      const feet = row.anchors.map((ax0, k) => {
        const b = row.birds[k];
        const moving = Math.min(1, Math.abs(vx) / 600 + a * 2);
        this.phases[b] += step * (15 + moving * 9);
        const ph = this.phases[b];
        const bob = Math.sin(time * 1.9 + b * 1.3) * fw * 0.1 - Math.sin(ph) * fw * 0.035;
        const x = row.cx + ax0 + offX + Math.sin(time * 0.9 + b) * fw * 0.06;
        const y = row.y + offY + bob;
        const p = this.prev[b];
        const lean = Math.max(-16, Math.min(16, ((x - p.x) / step) * 0.022));
        p.tilt += (lean - p.tilt) * Math.min(1, step * 6);
        p.x = x;
        p.y = y;
        const bird = this.birds[b];
        bird.g.style.visibility = 'visible';
        bird.g.setAttribute('transform', `translate(${(x - FEET_POINT[0] * sc).toFixed(1)} ${(y - FEET_POINT[1] * sc).toFixed(1)}) scale(${sc.toFixed(4)})`);
        const flap = -34 + 46 * Math.sin(ph);
        bird.rig.pose({ wingR: flap, wingL: flap, tilt: p.tilt, squash: Math.sin(ph) * 0.015, blink: this.blinks[b](time) });
        return [x, y + bs * 0.005] as const;
      });

      // twine between each pair of birds, and the flags hanging from it
      const curve = (s: number) => {
        const [x0, y0] = feet[s], [x1, y1] = feet[s + 1];
        const sag = (x1 - x0) * 0.07 + fw * 0.12;
        return { x0, y0, x1, y1, sag };
      };
      g.lineCap = 'round';
      for (let s = 0; s < feet.length - 1; s++) {
        const { x0, y0, x1, y1, sag } = curve(s);
        const path = new Path2D();
        path.moveTo(x0, y0);
        path.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1);
        g.setLineDash([]);
        g.strokeStyle = '#b08b58';
        g.lineWidth = Math.max(1.2, fw * 0.035);
        g.stroke(path);
        g.setLineDash([fw * 0.05, fw * 0.06]);
        g.strokeStyle = 'rgba(105,75,40,0.85)';
        g.lineWidth = Math.max(0.8, fw * 0.02);
        g.stroke(path);
      }
      g.setLineDash([]);

      const spriteW = fw * 1.2, spriteH = fw * 1.5;
      for (let i = 0; i < row.flags.length; i++) {
        const f = row.flags[i];
        if (!f.sprite) continue;
        const { x0, y0, x1, y1, sag } = curve(f.span);
        const fx = row.cx + offX + f.x;
        const t = Math.min(1, Math.max(0, (fx - x0) / (x1 - x0)));
        const fy = y0 + (y1 - y0) * t + 4 * sag * t * (1 - t);
        const slope = Math.atan(((y1 - y0) + 4 * sag * (1 - 2 * t)) / (x1 - x0));
        // a damped pendulum, pushed by the birds' acceleration and a little wind
        const wind = Math.sin(time * 1.3 + i * 0.7 + r) * 0.9 + Math.sin(time * 2.7 + i * 1.9) * 0.4;
        const torque = -ax * 0.00055 + wind * 0.35;
        f.spin += (-38 * f.angle - 3.2 * f.spin + torque) * step;
        f.angle = Math.max(-0.6, Math.min(0.6, f.angle + f.spin * step));
        g.save();
        g.translate(fx, fy);
        g.rotate(slope * 0.85 + f.angle);
        g.drawImage(f.sprite, -spriteW / 2, -fw * 0.1, spriteW, spriteH);
        // the twine threads through the eyelets, over the card's top edge
        g.strokeStyle = '#a07c4c';
        g.lineWidth = Math.max(1, fw * 0.03);
        g.beginPath();
        g.moveTo(-fw * 0.53, fw * 0.005);
        g.lineTo(-fw * 0.36, -fw * 0.01);
        g.moveTo(fw * 0.36, -fw * 0.01);
        g.lineTo(fw * 0.53, fw * 0.005);
        g.stroke();
        g.restore();
      }
    });
  }

  hideAll() {
    this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const b of this.birds) b.g.style.visibility = 'hidden';
  }
}
