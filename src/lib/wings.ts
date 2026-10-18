// ─────────────────────────────────────────────────────────────
//  Butterflies drawn in 3D.
//  Each wing is a flat painted plane hinged on the body. Given where
//  the butterfly is and which way it faces, both wings are projected
//  through the camera (an affine transform per wing, exact for small
//  things), so they foreshorten properly as they flap and turn: seen
//  from the side, from above, from behind. Each wing is shaded by
//  how it faces the sun (and glows when the sun shines through it),
//  and tinted like the light of the hour, so they sit in the painting.
// ─────────────────────────────────────────────────────────────

export type V3 = [number, number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

const TAU = Math.PI * 2;

export interface WingColors { inner: string; outer: string; edge: string; dots: string }
export const WING_COLORS: WingColors[] = [
  { inner: '#a8e4ff', outer: '#2f77d8', edge: '#16244a', dots: '#ffffff' }, // sky blue
  { inner: '#ffd27a', outer: '#ee6a1c', edge: '#2a160c', dots: '#fff4dc' }, // monarch
  { inner: '#fff6b0', outer: '#f2c230', edge: '#3a2a10', dots: '#ffffff' }, // lemon
  { inner: '#ffe0f0', outer: '#ff78b2', edge: '#5a1f3a', dots: '#ffffff' }, // rose
  { inner: '#efe2ff', outer: '#9a78e6', edge: '#2e1f4a', dots: '#ffffff' }, // lilac
  { inner: '#dcfff2', outer: '#3fc79a', edge: '#123a2c', dots: '#ffffff' }, // mint
];
export const SPRITE = 64;    // one wing, in sprite units (body axis at x = 0, head towards −y)
const RES = 2;               // sprite pixels per unit

function paintWing(c: WingColors): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = SPRITE * RES;
  cv.height = SPRITE * RES;
  const g = cv.getContext('2d')!;
  g.scale(RES, RES);
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
    g.lineWidth = 1.4;
    g.strokeStyle = c.edge;
    g.stroke(p);
  }
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
  g.globalAlpha = 0.35;
  g.strokeStyle = c.edge;
  g.lineWidth = 0.8;
  g.stroke(new Path2D('M2,-1 C16,-12 30,-20 50,-24 M2,0 C18,-4 30,-6 44,-8 M2,3 C14,8 24,14 32,24'));
  // a little fuzz near the body, like real scales
  g.globalAlpha = 0.25;
  g.fillStyle = c.edge;
  g.beginPath();
  g.ellipse(4, 0, 6, 4, 0, 0, TAU);
  g.fill();
  return cv;
}

function paintBody(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 12 * RES;
  cv.height = 40 * RES;
  const g = cv.getContext('2d')!;
  g.scale(RES, RES);
  g.translate(6, 20);
  g.fillStyle = '#2a1d16';
  g.beginPath(); g.ellipse(0, 4, 2.4, 13, 0, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, -10, 3, 0, TAU); g.fill();
  g.strokeStyle = '#2a1d16';
  g.lineWidth = 0.9;
  g.beginPath(); g.moveTo(-1, -12); g.quadraticCurveTo(-4, -18, -5, -19); g.moveTo(1, -12); g.quadraticCurveTo(4, -18, 5, -19); g.stroke();
  return cv;
}

const base: HTMLCanvasElement[] = [];
let body: HTMLCanvasElement | null = null;
const baseWing = (i: number) => (base[i] ??= paintWing(WING_COLORS[i]));

// Lit versions: the wing multiplied by a colour (the light of the hour × how the wing faces the sun).
const lit = new Map<string, HTMLCanvasElement>();
function litWing(i: number, r: number, gg: number, b: number): HTMLCanvasElement {
  const q = (v: number) => Math.round(Math.min(1.6, Math.max(0, v)) * 20); // 0.05 steps
  const key = `${i}|${q(r)}|${q(gg)}|${q(b)}`;
  let c = lit.get(key);
  if (c) return c;
  if (lit.size > 400) lit.clear();
  const src = baseWing(i);
  c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const R = q(r) / 20, G = q(gg) / 20, B = q(b) / 20;
  // multiply (for darker than 1), then add (for brighter, e.g. the sun shining through)
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgb(${Math.min(255, R * 255) | 0},${Math.min(255, G * 255) | 0},${Math.min(255, B * 255) | 0})`;
  g.fillRect(0, 0, c.width, c.height);
  if (R > 1 || G > 1 || B > 1) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5;
    g.drawImage(src, 0, 0);
    g.globalAlpha = 1;
  }
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(src, 0, 0);
  lit.set(key, c);
  return c;
}

export interface Light {
  /** the colour of the light at this hour (multiplier) */
  tint: V3;
  /** towards the sun (x right, y up, z away), normalised */
  sun: V3;
  /** 0 → 1: how strong direct sunlight is */
  sunlight: number;
}
export const NEUTRAL: Light = { tint: [1, 1, 1], sun: norm([0.4, 0.8, 0.3]), sunlight: 1 };

/** Projects a direction (metres) at the butterfly to screen pixels: 2 rows × 3 columns. */
export type Jacobian = [[number, number, number], [number, number, number]];
const jv = (J: Jacobian, v: V3): [number, number] => [J[0][0] * v[0] + J[0][1] * v[1] + J[0][2] * v[2], J[1][0] * v[0] + J[1][1] * v[1] + J[1][2] * v[2]];

/**
 * One butterfly.
 * at: its place on screen (px) · J: projection of world directions to screen px
 * fwd, up: which way its head and back point (world, unit) · span: wingspan (world units)
 * open: wing angle above level (radians: ~0.1 spread flat, ~1.4 closed above the back)
 * view: towards the viewer (world, unit) for the shine-through
 */
export function drawButterfly3D(
  g: CanvasRenderingContext2D, dpr: number, at: [number, number], J: Jacobian,
  fwd: V3, up: V3, span: number, open: number, colour: number, light: Light, alpha = 1, view: V3 = [0, 0, -1],
) {
  body ??= paintBody();
  const right = norm(cross(up, fwd));
  const k = span / 112;                     // world units per sprite unit
  const back = mul(fwd, -1);
  const bk = jv(J, mul(back, k));
  g.globalAlpha = alpha;
  // the wing further from us first
  const wingsDir: V3[] = [
    add(mul(right, Math.cos(open)), mul(up, Math.sin(open))),
    add(mul(right, -Math.cos(open)), mul(up, Math.sin(open))),
  ];
  const order = dot(wingsDir[0], view) < dot(wingsDir[1], view) ? [0, 1] : [1, 0];
  const drawWing = (s: V3) => {
    const n = norm(cross(s, fwd));
    const ndl = dot(n, light.sun), ndv = dot(n, view);
    const facing = Math.abs(ndl);
    const through = ndl * ndv < 0 ? facing : 0;         // sun behind the wing, as we see it
    const shade = 0.62 + 0.38 * light.sunlight * facing + 0.35 * light.sunlight * through;
    const warm = 1 + 0.12 * light.sunlight * through;
    const img = litWing(colour, light.tint[0] * shade * warm, light.tint[1] * shade, light.tint[2] * shade / warm);
    const sp = jv(J, mul(s, k));
    g.setTransform(sp[0] * dpr, sp[1] * dpr, bk[0] * dpr, bk[1] * dpr, at[0] * dpr, at[1] * dpr);
    g.drawImage(img, -2, -SPRITE / 2, SPRITE, SPRITE);
  };
  drawWing(wingsDir[order[0]]);
  // the body, between the wings
  const r = jv(J, mul(right, k));
  g.setTransform(r[0] * dpr, r[1] * dpr, bk[0] * dpr, bk[1] * dpr, at[0] * dpr, at[1] * dpr);
  g.drawImage(body, -6, -20, 12, 40);
  drawWing(wingsDir[order[1]]);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalAlpha = 1;
}

/** Flat-ish butterfly (for small icons): a 3D one seen from slightly above. */
export function wingSprite(i: number): HTMLCanvasElement { return baseWing(i); }
