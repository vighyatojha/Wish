// ─────────────────────────────────────────────────────────────
//  The butterfly who talks to her, and the tulip it lands on.
//  SVG, in the same painted style as the animals (soft gradients,
//  pencil grain, brown ink), so they stay sharp in the close-up.
// ─────────────────────────────────────────────────────────────
import { useId } from 'react';

const INK = '#4a2f22';

// ── Butterfly: 200 × 200, body on x = 100 ─────────────────────
// Wings are drawn for the right side and mirrored for the left.
const FORE = 'M104,92 C118,48 156,14 188,22 C200,38 190,74 168,92 C150,104 124,104 104,100Z';
const HIND = 'M104,104 C126,106 154,116 164,140 C170,162 150,176 132,168 C116,160 106,134 104,110Z';
const FORE_EDGE = 'M150,26 C170,16 196,22 190,52 C186,70 176,84 166,92';
const FORE_VEINS = 'M106,96 C130,74 152,52 176,32 M106,98 C136,90 160,80 182,62 M106,100 C134,98 154,96 168,92';
const HIND_VEINS = 'M106,108 C126,120 142,138 150,160 M106,106 C130,110 150,122 160,138';

export const BUTTERFLY_FEET = [100, 150] as const; // where it stands on the flower

export function ButterflyArt({ grain }: { grain: string }) {
  const u = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${u}`;
  const url = (n: string) => `url(#${id(n)})`;
  const wing = (
    <>
      <path d={HIND} fill={url('hind')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={HIND_VEINS} fill="none" stroke="#1d2f5a" strokeWidth="1" opacity="0.35" />
      <path d={FORE} fill={url('fore')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d={FORE_EDGE} fill="none" stroke="#1b2c55" strokeWidth="7" strokeLinecap="round" opacity="0.85" />
      <path d={FORE_VEINS} fill="none" stroke="#1d2f5a" strokeWidth="1" opacity="0.35" />
      {[[178, 34, 2.6], [186, 48, 2.2], [182, 62, 2], [158, 22, 2.2], [150, 160, 2.2], [160, 150, 1.8]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" />
      ))}
      <ellipse cx="140" cy="62" rx="12" ry="9" fill="#ffffff" opacity="0.28" transform="rotate(-30 140 62)" />
      <path d={FORE} fill={`url(#${grain})`} opacity="0.7" />
      <path d={HIND} fill={`url(#${grain})`} opacity="0.7" />
    </>
  );
  return (
    <g data-part="body">
      <defs>
        <radialGradient id={id('fore')} cx="0.05" cy="0.9" r="1.05">
          <stop offset="0" stopColor="#e7f7ff" />
          <stop offset="0.35" stopColor="#8fd2ff" />
          <stop offset="0.8" stopColor="#3f7fe0" />
          <stop offset="1" stopColor="#5b4ad0" />
        </radialGradient>
        <radialGradient id={id('hind')} cx="0.05" cy="0.1" r="1">
          <stop offset="0" stopColor="#e7f7ff" />
          <stop offset="0.45" stopColor="#9fc8ff" />
          <stop offset="1" stopColor="#8b6ae0" />
        </radialGradient>
        <radialGradient id={id('head')} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#5a4a7a" />
          <stop offset="1" stopColor="#2a2040" />
        </radialGradient>
        <radialGradient id={id('cheek')}>
          <stop offset="0" stopColor="#ff9fb4" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff9fb4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g data-part="wing-r">{wing}</g>
      <g transform="translate(200,0) scale(-1,1)"><g data-part="wing-l">{wing}</g></g>
      {/* body */}
      <path d="M100,96 C108,96 110,112 108,130 C106,146 102,152 100,152 C98,152 94,146 92,130 C90,112 92,96 100,96Z" fill="#3b2d55" stroke={INK} strokeWidth="1.6" />
      <path d="M93,116 Q100,119 107,116 M93,126 Q100,129 107,126 M95,136 Q100,139 105,136" fill="none" stroke="#6b5a90" strokeWidth="1.2" />
      {/* antennae */}
      <path d="M94,56 C88,40 80,30 72,30 C66,30 66,38 72,38 M106,56 C112,40 120,30 128,30 C134,30 134,38 128,38" fill="none" stroke="#2a2040" strokeWidth="2.2" strokeLinecap="round" />
      {/* head with a face */}
      <circle cx="100" cy="74" r="21" fill={url('head')} stroke={INK} strokeWidth="1.8" />
      {[[92, 72], [108, 72]].map(([x, y], i) => (
        <g key={i} data-part="eye" data-x={x} data-y={y}>
          <ellipse cx={x} cy={y} rx="5.4" ry="6.4" fill="#ffffff" />
          <circle cx={x} cy={y + 1} r="3.6" fill="#1b1222" />
          <circle cx={x - 1.3} cy={y - 1} r="1.4" fill="#ffffff" />
        </g>
      ))}
      <ellipse cx="86" cy="82" rx="5" ry="3" fill={url('cheek')} />
      <ellipse cx="114" cy="82" rx="5" ry="3" fill={url('cheek')} />
      <path d="M95,84 Q100,89 105,84" fill="none" stroke="#ffd6e0" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

export class ButterflyRig {
  private wingR: SVGGElement;
  private wingL: SVGGElement;
  private eyes: { el: SVGGElement; x: number; y: number }[];
  constructor(root: SVGGElement) {
    this.wingR = root.querySelector('[data-part="wing-r"]')!;
    this.wingL = root.querySelector('[data-part="wing-l"]')!;
    this.eyes = [...root.querySelectorAll<SVGGElement>('[data-part="eye"]')].map((el) => ({ el, x: Number(el.dataset.x), y: Number(el.dataset.y) }));
  }
  /** open: 1 wings flat open → 0.1 nearly closed. */
  pose(open: number, blink: number) {
    const t = `translate(100 0) scale(${open.toFixed(3)} 1) translate(-100 0)`;
    this.wingR.setAttribute('transform', t);
    this.wingL.setAttribute('transform', t);
    const b = Math.max(0.1, blink);
    for (const e of this.eyes) e.el.setAttribute('transform', `translate(${e.x} ${e.y}) scale(1 ${b.toFixed(2)}) translate(${-e.x} ${-e.y})`);
  }
}

// ── Tulip: 200 × 420, the stem rises from (100, 420) ──────────
export const TULIP_TOP = [104, 74] as const;   // where the butterfly lands
export const TULIP_HEAD = [104, 116] as const; // middle of the flower

export function TulipArt({ grain }: { grain: string }) {
  const u = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${u}`;
  const url = (n: string) => `url(#${id(n)})`;
  return (
    <g>
      <defs>
        <linearGradient id={id('petal')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc2d0" />
          <stop offset="0.35" stopColor="#ff5f86" />
          <stop offset="1" stopColor="#c81e48" />
        </linearGradient>
        <linearGradient id={id('petalBack')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9ab4" />
          <stop offset="1" stopColor="#a5163c" />
        </linearGradient>
        <linearGradient id={id('stem')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3f7a2c" />
          <stop offset="0.5" stopColor="#7fbf4a" />
          <stop offset="1" stopColor="#2f5f22" />
        </linearGradient>
        <linearGradient id={id('leaf')} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2f5f22" />
          <stop offset="0.6" stopColor="#6aa83e" />
          <stop offset="1" stopColor="#a9d36a" />
        </linearGradient>
      </defs>
      {/* leaves stay in the ground when the flower is plucked */}
      <g data-part="leaves">
        <path d="M96,420 C70,380 46,320 40,236 C62,292 86,340 104,410Z" fill={url('leaf')} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M100,420 C126,384 150,336 162,262 C140,316 118,350 98,404Z" fill={url('leaf')} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M60,300 C74,340 88,376 100,410 M150,300 C136,340 120,372 102,408" fill="none" stroke="#2c4f1c" strokeWidth="1" opacity="0.5" />
      </g>
      {/* the flower on its stem: this part comes away */}
      <g data-part="flower">
        <path d="M98,420 C96,340 102,250 104,150 L110,150 C108,250 104,340 106,420Z" fill={url('stem')} stroke={INK} strokeWidth="1.4" />
        <g data-part="head">
          <path d="M80,132 C70,100 84,70 104,64 C124,70 138,100 128,132Z" fill={url('petalBack')} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <g data-part="petal-l">
            <path d="M104,158 C80,158 66,140 66,112 C66,92 74,78 82,72 C92,90 102,108 108,150Z" fill={url('petal')} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          </g>
          <g data-part="petal-r">
            <path d="M104,158 C128,158 142,140 142,112 C142,92 134,78 126,72 C116,90 106,108 100,150Z" fill={url('petal')} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          </g>
          <path d="M104,158 C92,150 88,122 92,96 C96,80 104,74 104,74 C104,74 112,80 116,96 C120,122 116,150 104,158Z" fill={url('petal')} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M98,100 C98,120 100,140 104,152 M110,100 C110,120 108,140 104,152" fill="none" stroke="#ffe1e8" strokeWidth="1.4" opacity="0.6" strokeLinecap="round" />
          <path d="M66,112 C66,92 74,78 82,72 C92,90 102,108 108,150 C100,150 66,140 66,112Z" fill={`url(#${grain})`} opacity="0.6" />
          <path d="M80,132 C70,100 84,70 104,64 C124,70 138,100 128,132Z" fill={`url(#${grain})`} opacity="0.5" />
        </g>
      </g>
      {/* grass blades in front of the stem's foot */}
      <path d="M70,420 C74,396 80,382 90,372 C84,388 82,404 82,420Z M112,420 C116,392 126,378 138,370 C128,388 124,404 124,420Z M88,420 C92,404 98,394 106,388 C100,400 98,410 98,420Z"
        fill="#4f8a32" stroke="#2c4f1c" strokeWidth="1" />
    </g>
  );
}

export class TulipRig {
  private petalL: SVGGElement;
  private petalR: SVGGElement;
  private flower: SVGGElement;
  private head: SVGGElement;
  constructor(root: SVGGElement) {
    const q = (p: string) => root.querySelector<SVGGElement>(`[data-part="${p}"]`)!;
    this.petalL = q('petal-l');
    this.petalR = q('petal-r');
    this.flower = q('flower');
    this.head = q('head');
  }
  /** bloom 0 bud → 1 open · sway (deg) · lift: plucked flower's offset (units) and spin */
  pose(bloom: number, sway: number, lift = { x: 0, y: 0, rot: 0, scale: 1 }) {
    const open = bloom * 16 - 6;
    this.petalL.setAttribute('transform', `rotate(${(-open).toFixed(2)} 104 156)`);
    this.petalR.setAttribute('transform', `rotate(${open.toFixed(2)} 104 156)`);
    this.head.setAttribute('transform', `translate(104 150) scale(${(0.85 + bloom * 0.15).toFixed(3)}) translate(-104 -150)`);
    const [hx, hy] = TULIP_HEAD;
    this.flower.setAttribute('transform',
      `translate(${lift.x.toFixed(1)} ${lift.y.toFixed(1)}) rotate(${(sway + lift.rot).toFixed(2)} 102 420) translate(${hx} ${hy}) scale(${lift.scale.toFixed(3)}) translate(${-hx} ${-hy})`);
  }
}
