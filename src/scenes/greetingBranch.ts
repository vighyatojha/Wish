// ─────────────────────────────────────────────────────────────
//  The branch the bird lands on, as SVG path data.
//  Drawn in a 400 × 250 box; it grows in from off the left edge,
//  thick at the base and tapering to a twiggy tip.
// ─────────────────────────────────────────────────────────────
type P = [number, number];

const bez = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

function sample(segs: [P, P, P, P][], steps = 28): P[] {
  const out: P[] = [];
  segs.forEach((s, i) => {
    for (let k = i ? 1 : 0; k <= steps; k++) out.push(bez(s[0], s[1], s[2], s[3], k / steps));
  });
  return out;
}

/** A tapering ribbon along a centre line, shifted sideways by `shift` (× width). */
function ribbon(pts: P[], width: (s: number, p: P) => number, shift = 0, scale = 1): string {
  const top: P[] = [], bot: P[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const n: P = [dy, -dx]; // points "up" the branch
    const w = width(i / (pts.length - 1), p);
    const c: P = [p[0] + n[0] * w * shift, p[1] + n[1] * w * shift];
    const h = (w * scale) / 2;
    top.push([c[0] + n[0] * h, c[1] + n[1] * h]);
    bot.push([c[0] - n[0] * h, c[1] - n[1] * h]);
  });
  const f = (p: P) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  return `M${top.map(f).join(' L')} L${bot.reverse().map(f).join(' L')}Z`;
}

// The limb reaches far past the left edge (towards the trunk), so its
// end never comes into view, even in the close-up on a wide screen.
const MAIN = sample([
  [[-560, 400], [-380, 330], [-180, 262], [-40, 230]],
  [[-40, 230], [60, 198], [140, 172], [210, 164]],
  [[210, 164], [270, 158], [340, 146], [408, 124]],
]);
// thickness by position: tapering to the tip, thickening towards the trunk
const mainWidth = (_s: number, p: P) => {
  const t = Math.min(1, Math.max(0, (408 - p[0]) / 448));
  return 4 + 38 * Math.pow(t, 1.35) + Math.max(0, -40 - p[0]) * 0.06;
};
const TWIG_UP = sample([[[258, 159], [268, 142], [282, 128], [302, 114]]], 16);
const TWIG_DOWN = sample([[[112, 181], [108, 192], [100, 202], [86, 212]]], 16);
const TWIG_TIP = sample([[[352, 141], [362, 128], [370, 122], [382, 116]]], 12);
const twigWidth = (s: number) => 1.6 + 5 * (1 - s);

function yAt(x: number): [number, number] {
  let best = MAIN[0], bi = 0;
  MAIN.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) { best = p; bi = i; } });
  return [best[1], mainWidth(bi / (MAIN.length - 1), best)];
}

// bark lines: short strokes running along the limb
function barkLines(): string {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let d = '';
  for (let k = 0; k < 46; k++) {
    const i = Math.floor(MAIN.length * (0.3 + r() * 0.5));
    const p = MAIN[i], q = MAIN[Math.min(MAIN.length - 1, i + 2)];
    const w = mainWidth(0, p);
    const off = (r() - 0.5) * w * 0.75;
    let dx = q[0] - p[0], dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const n: P = [dy, -dx];
    const l = 5 + r() * 12;
    const x = p[0] + n[0] * off, y = p[1] + n[1] * off;
    d += `M${x.toFixed(1)},${y.toFixed(1)} q${(dx * l * 0.5 + n[0] * 1.2).toFixed(1)},${(dy * l * 0.5 + n[1] * 1.2).toFixed(1)} ${(dx * l).toFixed(1)},${(dy * l).toFixed(1)} `;
  }
  return d;
}

export const BRANCH = {
  limb: ribbon(MAIN, mainWidth),
  shadow: ribbon(MAIN, mainWidth, -0.28, 0.5),
  light: ribbon(MAIN, mainWidth, 0.2, 0.45),
  rim: ribbon(MAIN, mainWidth, 0.4, 0.13),
  twigs: [ribbon(TWIG_UP, twigWidth), ribbon(TWIG_DOWN, twigWidth), ribbon(TWIG_TIP, (s) => 1.2 + 2.4 * (1 - s))].join(' '),
  lines: barkLines(),
};

// where the bird's feet go: on top of the limb
const [birdY, birdW] = yAt(196);
export const BIRD_SPOT: P = [196, birdY - birdW / 2 + 1];
// where the bell's ribbon is tied: under the limb, to the bird's right
const [bellY, bellW] = yAt(268);
export const BELL: P = [268, bellY + bellW / 2 - 1];
// the point the camera pushes in on: between the bird and the bell
export const ZOOM_ON: P = [228, BIRD_SPOT[1] - 18];

// leaves: x, y (stem), angle (deg), length, sunlit?
export const LEAVES: [number, number, number, number, number][] = [
  // a big, shady cluster near the base (foreground)
  [8, 216, 150, 34, 0], [22, 208, -118, 36, 0], [36, 204, -72, 40, 1], [54, 200, -32, 32, 1],
  [46, 214, 112, 34, 0], [74, 196, -98, 28, 1], [-4, 224, -150, 30, 0],
  // the drooping twig on the left
  [94, 208, 130, 24, 0], [88, 211, 60, 22, 1], [104, 200, 160, 20, 0],
  // along the limb, above and hanging below
  [118, 182, -110, 26, 1], [130, 176, -132, 24, 1], [146, 173, -158, 22, 0], [150, 184, 92, 24, 0],
  [166, 182, 118, 20, 0], [126, 190, 70, 22, 0], [214, 172, 76, 20, 0], [236, 170, 102, 18, 0],
  [252, 158, -40, 18, 1], [322, 150, 96, 18, 0], [316, 142, -82, 20, 1],
  // round the bell and the upward twig
  [244, 160, -62, 20, 1], [302, 115, -48, 22, 1], [292, 123, -128, 20, 1],
  [306, 121, 12, 18, 1], [284, 132, -20, 16, 0],
  // the tip
  [336, 146, -64, 22, 1], [352, 142, 18, 22, 1], [374, 125, -40, 20, 1], [384, 117, 4, 20, 1],
  [380, 132, 66, 18, 0], [360, 147, 104, 18, 0],
];

/** A pointed leaf lying along +x from its stem. */
export const leafPath = (l: number) =>
  `M0,0 C${(l * 0.22).toFixed(1)},${(-l * 0.34).toFixed(1)} ${(l * 0.7).toFixed(1)},${(-l * 0.32).toFixed(1)} ${l},0 C${(l * 0.7).toFixed(1)},${(l * 0.3).toFixed(1)} ${(l * 0.22).toFixed(1)},${(l * 0.3).toFixed(1)} 0,0Z`;
