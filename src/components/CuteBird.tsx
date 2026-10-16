// ─────────────────────────────────────────────────────────────
//  A small round songbird, drawn in SVG so it stays sharp at any
//  zoom and can be recoloured.
//
//  • Painted look to sit inside the valley picture: soft colour
//    gradients, warm sunlight on its right side (where the sun is
//    in the valley), and a coloured-pencil grain over everything.
//  • No SVG filters: the texture is a repeating pattern, so moving
//    wings stay cheap on a phone.
//  • BirdRig moves the parts (wings, blink, squash, tilt) directly,
//    once per frame, without React.
//
//  Coordinates: a 200 × 200 box, feet at (100, 178).
// ─────────────────────────────────────────────────────────────
import { useId } from 'react';

export interface BirdColors {
  light: string;
  base: string;
  shade: string;
  wing: string;
  wingShade: string;
}

const toRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mixHex = (a: string, b: string, t: number) => {
  const x = toRgb(a), y = toRgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};

/** All the tones of a bird from one feather colour. */
export function birdColors(base: string): BirdColors {
  return {
    light: mixHex(base, '#ffffff', 0.4),
    base,
    shade: mixHex(base, '#283054', 0.3),
    wing: mixHex(base, '#ffffff', 0.1),
    wingShade: mixHex(base, '#283054', 0.42),
  };
}

export const FEATHERS = {
  blue: '#7cb0ea',
  pink: '#f2a0bd',
  yellow: '#f4cc5c',
  mint: '#86cfa2',
  lavender: '#b3a0e6',
  coral: '#f59f78',
} as const;

// ── Shapes ────────────────────────────────────────────────────
const BODY = 'M100,38 C142,38 168,70 168,110 C168,150 140,174 100,174 C60,174 32,150 32,110 C32,70 58,38 100,38Z';
const FACE = 'M56,120 C54,99 73,90 100,92 C127,90 146,99 144,120 C144,152 126,172 100,172 C74,172 56,152 56,120Z';
const WING = 'M146,106 C166,98 190,108 198,128 C190,128 194,138 186,142 C180,140 182,150 170,152 C162,156 150,150 144,140 C140,130 140,114 146,106Z';
const WING_LINES = 'M156,116 C170,120 182,128 190,132 M150,128 C162,134 172,140 178,146';
const TAIL = 'M130,156 C148,160 168,156 186,146 C184,156 178,160 186,166 C172,172 156,175 136,170Z';
const TUFT = 'M92,44 C88,32 92,22 103,19 C99,27 102,33 106,38 C108,28 116,23 125,25 C118,31 116,39 112,46Z';
const TUFT_LINE = 'M100,40 C99,33 100,28 103,23';
const BROWS = 'M67,81 Q73,76 80,79 M120,79 Q127,76 133,81';
const BEAK_TOP = 'M89,113 Q100,105 111,113 Q103,120 100,122 Q97,120 89,113Z';
const MOUTH = 'M93,117 Q100,130 107,117 Q100,122 93,117Z';
const BELLY_MARKS = 'M86,148 q4,4 8,0 M104,151 q4,4 8,0 M95,160 q4,4 8,0 M78,138 q3,3 6,0 M114,140 q3,3 6,0';
export const WING_PIVOT = [148, 112] as const;
export const FEET_POINT = [100, 178] as const;
const EYES = [[78, 103], [122, 103]] as const;
const INK = '#5b3b29';

const toes = (x: number) => `M${x},166 l-6,12 M${x},166 l0,14 M${x},166 l6,12`;

// ── Pencil grain: one small tile, generated once ──────────────
let grainUrl = '';
export function pencilGrain(): string {
  if (grainUrl) return grainUrl;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 1400; i++) {
    const dark = Math.random() < 0.55;
    g.fillStyle = dark ? `rgba(55,35,20,${(Math.random() * 0.16).toFixed(3)})` : `rgba(255,255,250,${(Math.random() * 0.22).toFixed(3)})`;
    g.fillRect(Math.random() * 96, Math.random() * 96, 1, 1);
  }
  // short hatching strokes, like coloured pencil
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 96, y = Math.random() * 96, l = 3 + Math.random() * 6;
    g.strokeStyle = Math.random() < 0.5 ? 'rgba(40,28,18,0.07)' : 'rgba(255,255,255,0.1)';
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + l * 0.8, y - l * 0.6);
    g.stroke();
  }
  grainUrl = c.toDataURL('image/png');
  return grainUrl;
}

/** Put this once inside any <svg> that draws birds or the branch. */
export function GrainPattern({ id }: { id: string }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width="48" height="48">
      <image href={pencilGrain()} width="48" height="48" />
    </pattern>
  );
}

interface ArtProps {
  colors: BirdColors;
  grain: string; // id of a GrainPattern in the same <svg>
}

/** The drawing. Place it inside a <g> that positions and scales it. */
export function BirdArt({ colors: c, grain }: ArtProps) {
  const u = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${u}`;
  const url = (n: string) => `url(#${id(n)})`;
  const grainFill = `url(#${grain})`;
  return (
    <g data-part="body">
      <defs>
        <radialGradient id={id('body')} cx="0.38" cy="0.3" r="0.78">
          <stop offset="0" stopColor={c.light} />
          <stop offset="0.55" stopColor={c.base} />
          <stop offset="1" stopColor={c.shade} />
        </radialGradient>
        {/* warm sunlight from the upper right */}
        <linearGradient id={id('rim')} x1="0.45" y1="0.55" x2="1" y2="0.2">
          <stop offset="0" stopColor="#fff1c9" stopOpacity="0" />
          <stop offset="1" stopColor="#fff1c9" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={id('wing')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={c.wing} />
          <stop offset="1" stopColor={c.wingShade} />
        </linearGradient>
        <radialGradient id={id('face')} cx="0.5" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.7" stopColor="#f8ecd4" />
          <stop offset="1" stopColor="#ead6b0" />
        </radialGradient>
        <radialGradient id={id('cheek')}>
          <stop offset="0" stopColor="#f39aa3" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f39aa3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('eye')} cx="0.5" cy="0.75" r="0.75">
          <stop offset="0" stopColor="#7a4a28" />
          <stop offset="0.6" stopColor="#3b2112" />
          <stop offset="1" stopColor="#24130a" />
        </radialGradient>
        <linearGradient id={id('beak')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc860" />
          <stop offset="1" stopColor="#e8872a" />
        </linearGradient>
      </defs>

      {/* far wing, tucked behind the body */}
      <g transform="translate(200,0) scale(-1,1)">
        <g data-part="wing-l">
          <path d={WING} fill={url('wing')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d={WING} fill={grainFill} />
        </g>
      </g>

      {/* feet, then the tail, both behind the body */}
      <g fill="none" strokeLinecap="round">
        <path d={toes(88) + toes(112)} stroke="#6b3d16" strokeWidth="6.5" />
        <path d={toes(88) + toes(112)} stroke="#f2a541" strokeWidth="4" />
      </g>
      <path d={TAIL} fill={c.wingShade} stroke={INK} strokeWidth="2" strokeLinejoin="round" />

      {/* body: colour, sunlight, grain, outline */}
      <path d={BODY} fill={url('body')} />
      <path d={BODY} fill={url('rim')} />
      <path d={BODY} fill={grainFill} />
      <path d={TUFT} fill={url('body')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={TUFT_LINE} fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <path d={BODY} fill="none" stroke={INK} strokeWidth="2.3" />

      {/* cream face and belly */}
      <path d={FACE} fill={url('face')} />
      <path d={FACE} fill={grainFill} opacity="0.8" />
      <path d={BELLY_MARKS} fill="none" stroke="#dcc196" strokeWidth="1.6" strokeLinecap="round" />

      <path d={BROWS} fill="none" stroke="#3b2a20" strokeWidth="2.2" strokeLinecap="round" />
      {EYES.map(([x, y], i) => (
        <g key={i} data-part="eye" data-x={x} data-y={y}>
          <ellipse cx={x} cy={y} rx="13.5" ry="15" fill={url('eye')} />
          <circle cx={x - 4.5} cy={y - 6} r="4.8" fill="#fff" />
          <circle cx={x + 4} cy={y + 5} r="2.2" fill="#fff" opacity="0.9" />
          <path d={i === 0 ? `M${x - 13},${y - 5} l-5,-3 M${x - 13.5},${y} l-5,-1` : `M${x + 13},${y - 5} l5,-3 M${x + 13.5},${y} l5,-1`}
            stroke="#2b1a10" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
      <ellipse cx="60" cy="125" rx="13" ry="8" fill={url('cheek')} />
      <ellipse cx="140" cy="125" rx="13" ry="8" fill={url('cheek')} />

      <path d={MOUTH} fill="#e46a6d" stroke="#8a4a1a" strokeWidth="1.3" strokeLinejoin="round" />
      <path d={BEAK_TOP} fill={url('beak')} stroke="#8a4a1a" strokeWidth="1.4" strokeLinejoin="round" />

      {/* near wing, in front */}
      <g data-part="wing-r">
        <path d={WING} fill={url('wing')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d={WING} fill={url('rim')} />
        <path d={WING} fill={grainFill} />
        <path d={WING_LINES} fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
      </g>
    </g>
  );
}

export interface BirdPose {
  wingR: number;  // degrees; 0 = folded at its side, negative = raised
  wingL: number;
  tilt: number;   // degrees, the whole bird rocks on its feet
  squash: number; // + squashes down, − stretches up
  blink: number;  // 1 open, 0 shut
}

/** Moves one drawn bird. Give it the <g> that wraps a <BirdArt>. */
export class BirdRig {
  private body: SVGGElement;
  private wingR: SVGGElement;
  private wingL: SVGGElement;
  private eyes: { el: SVGGElement; x: number; y: number }[];
  private last = '';

  constructor(root: SVGGElement) {
    this.body = root.querySelector('[data-part="body"]')!;
    this.wingR = root.querySelector('[data-part="wing-r"]')!;
    this.wingL = root.querySelector('[data-part="wing-l"]')!;
    this.eyes = [...root.querySelectorAll<SVGGElement>('[data-part="eye"]')].map((el) => ({
      el, x: Number(el.dataset.x), y: Number(el.dataset.y),
    }));
  }

  pose(p: BirdPose) {
    const key = `${p.wingR.toFixed(1)}|${p.wingL.toFixed(1)}|${p.tilt.toFixed(2)}|${p.squash.toFixed(3)}|${p.blink.toFixed(2)}`;
    if (key === this.last) return;
    this.last = key;
    const [px, py] = WING_PIVOT;
    const [fx, fy] = FEET_POINT;
    this.wingR.setAttribute('transform', `rotate(${p.wingR.toFixed(1)} ${px} ${py})`);
    this.wingL.setAttribute('transform', `rotate(${p.wingL.toFixed(1)} ${px} ${py})`);
    const sx = 1 + p.squash * 0.6, sy = 1 - p.squash;
    this.body.setAttribute('transform', `rotate(${p.tilt.toFixed(2)} ${fx} ${fy}) translate(${fx} ${fy}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(${-fx} ${-fy})`);
    const b = Math.max(0.08, p.blink);
    for (const e of this.eyes) {
      e.el.setAttribute('transform', `translate(${e.x} ${e.y}) scale(1 ${b.toFixed(2)}) translate(${-e.x} ${-e.y})`);
    }
  }
}

/** Natural blinking: returns 1 (open) most of the time, a quick shut now and then. */
export function blinker(seed: number) {
  let next = 1.5 + seed * 2.3;
  return (time: number) => {
    if (time > next + 0.16) next = time + 2.2 + Math.random() * 3.2;
    const d = time - next;
    return d < 0 || d > 0.16 ? 1 : Math.abs(d - 0.08) / 0.08;
  };
}
