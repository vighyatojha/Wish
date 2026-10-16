// ─────────────────────────────────────────────────────────────
//  Little flower fairies, drawn in SVG (sharp at any size).
//
//  Six of them, each with her own hair, flower crown, petal
//  dress, wings and shoes. They fly holding the bunting's twine
//  in both hands; FairyRig flutters the wings, swings the legs,
//  sways the hair and makes them blink, once per frame.
//
//  Coordinates: a 200 × 260 box; hands (where the twine is held)
//  at (100, 160).
// ─────────────────────────────────────────────────────────────
import { useId } from 'react';

export const FAIRY_HOLD = [100, 160] as const;
export const FAIRY_TOP = 8; // top of the hair, for spacing rows

type HairStyle = 'bob' | 'wavy' | 'bun' | 'topknot' | 'long' | 'braid';
type Crown = 'headband' | 'daisies' | 'stars' | 'rose' | 'pearls' | 'acorn';

export interface FairyLook {
  skin: string;
  hair: string;
  hairShade: string;
  style: HairStyle;
  crown: Crown;
  eyes: string;     // iris colour
  dress: string;
  dressLight: string;
  dressShade: string;
  bodice?: string;
  wing: string;
  wingEdge: string;
  spots?: boolean;  // butterfly-wing spots
  shoes: string;
  wink?: boolean;
}

export const FAIRIES: FairyLook[] = [
  // spring green: auburn hair, leaf-green headband with yellow blossoms
  { skin: '#fcdcc6', hair: '#7a2f22', hairShade: '#4f1c14', style: 'bob', crown: 'headband', eyes: '#4f9fd6',
    dress: '#8cc43c', dressLight: '#b9e06a', dressShade: '#5d8f22', wing: '#9ed65a', wingEdge: '#5d8f22', shoes: '#f0c228' },
  // daisy yellow: golden waves, daisy crown, white-and-yellow petals
  { skin: '#fde0cb', hair: '#f2c94c', hairShade: '#c9952a', style: 'wavy', crown: 'daisies', eyes: '#4f9fd6',
    dress: '#f6cf3a', dressLight: '#fff6dc', dressShade: '#d49e18', wing: '#f7d25c', wingEdge: '#c9952a', spots: true, shoes: '#f0c228' },
  // lilac: dark curls in a bun with little gold stars
  { skin: '#b97f5c', hair: '#4b2378', hairShade: '#2c1150', style: 'bun', crown: 'stars', eyes: '#8b4fc9',
    dress: '#b48be6', dressLight: '#d8c2f5', dressShade: '#7b52b8', wing: '#a77ee0', wingEdge: '#6a3fa8', spots: true, shoes: '#9b6bd6' },
  // rose pink: pink top-knot with a rosebud, leaf bodice, a wink
  { skin: '#fddcc8', hair: '#f08aa6', hairShade: '#c95a7c', style: 'topknot', crown: 'rose', eyes: '#5fa86a',
    dress: '#f48fb1', dressLight: '#fbc4d6', dressShade: '#d0607f', bodice: '#3f5a37', wing: '#f9b3c8', wingEdge: '#d0607f', shoes: '#4f7a3f', wink: true },
  // water blue: long teal hair with a string of pearls, flowing dress
  { skin: '#fde0cf', hair: '#1f8a95', hairShade: '#11606a', style: 'long', crown: 'pearls', eyes: '#3a9fd0',
    dress: '#8fdaea', dressLight: '#d6f4fa', dressShade: '#4fb2c9', wing: '#b5e8f5', wingEdge: '#4fb2c9', shoes: '#2f9fb5' },
  // autumn: copper braid with an acorn, a dress of autumn leaves
  { skin: '#fcdcc4', hair: '#d4581f', hairShade: '#9c3a12', style: 'braid', crown: 'acorn', eyes: '#a9652a',
    dress: '#e8742a', dressLight: '#f6b04a', dressShade: '#b2461a', wing: '#f6b04a', wingEdge: '#c9701f', shoes: '#7a4423' },
];

const INK = '#5b3b29';

// ── Shapes ────────────────────────────────────────────────────
const WING_UP = 'M104,124 C118,92 148,50 180,54 C200,58 198,94 180,112 C164,126 134,132 104,130Z';
const WING_LO = 'M104,132 C130,134 158,142 166,164 C172,184 150,194 134,182 C120,172 108,152 104,136Z';
const WING_VEINS = 'M106,128 C128,110 152,82 174,66 M106,128 C138,122 164,112 182,98 M106,134 C124,148 140,162 150,178';
const SKIRT = 'M82,146 C70,164 58,180 52,196 Q62,208 74,200 Q84,212 96,202 Q106,212 117,202 Q128,210 139,200 Q150,206 148,194 C142,178 130,162 118,146Z';
const SKIRT_PETALS = 'M90,150 C86,168 80,184 74,198 M100,150 L100,202 M110,150 C114,168 120,184 127,200';
const BODICE = 'M84,118 Q100,112 116,118 L119,148 Q100,152 81,148Z';
const HEAD = 'M100,28 C126,28 142,48 142,74 C142,100 124,116 100,116 C76,116 58,100 58,74 C58,48 74,28 100,28Z';
const leg = (x: number) => `M${x - 6},194 L${x - 7},234 Q${x - 7},240 ${x - 1},240 L${x + 2},240 Q${x + 5},240 ${x + 5},234 L${x + 6},194Z`;
const shoe = (x: number) => `M${x - 10},236 Q${x - 11},248 ${x},250 Q${x + 9},250 ${x + 8},240 L${x + 6},232 L${x - 8},232Z`;

function hairBack(style: HairStyle): string {
  switch (style) {
    case 'long': return 'M54,74 C50,30 150,30 146,74 C150,110 156,150 146,176 C134,170 128,150 124,128 L76,128 C72,150 66,170 54,176 C44,150 50,110 54,74Z';
    case 'wavy': return 'M54,74 C50,30 150,30 146,74 C154,96 150,118 158,136 C146,146 132,138 126,124 L74,124 C68,138 54,146 42,136 C50,118 46,96 54,74Z';
    case 'braid': return 'M56,74 C52,30 148,30 144,74 C146,96 140,112 128,118 L72,118 C60,112 54,96 56,74Z';
    case 'bob': return 'M54,76 C48,30 152,30 146,76 C150,96 146,110 136,116 L64,116 C54,110 50,96 54,76Z';
    default: return 'M58,74 C54,34 146,34 142,74 C144,92 138,104 128,110 L72,110 C62,104 56,92 58,74Z';
  }
}
function hairFront(style: HairStyle): string {
  // bangs over the forehead, slightly different for each style
  if (style === 'long' || style === 'wavy')
    return 'M58,74 C56,38 80,22 100,22 C124,22 146,38 142,76 C136,58 124,48 110,46 C112,54 106,60 100,62 C96,52 86,50 78,54 C70,58 62,66 58,74Z';
  if (style === 'bob')
    return 'M56,78 C52,36 80,22 100,22 C126,22 150,38 144,80 C138,62 128,52 116,50 C100,58 82,56 72,48 C64,56 58,66 56,78Z';
  return 'M60,72 C58,40 80,26 100,26 C122,26 144,40 140,74 C134,58 122,50 106,50 C96,56 84,54 76,52 C68,58 62,64 60,72Z';
}

export function FairyArt({ look: f, grain }: { look: FairyLook; grain: string }) {
  const u = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${u}`;
  const url = (n: string) => `url(#${id(n)})`;
  const eye = (x: number, right: boolean) =>
    f.wink && right ? (
      <path d={`M${x - 10},80 Q${x},72 ${x + 10},80`} fill="none" stroke="#2b1a10" strokeWidth="2.6" strokeLinecap="round" />
    ) : (
      <g data-part="eye" data-x={x} data-y={80}>
        <ellipse cx={x} cy="80" rx="10" ry="12" fill="#fff" />
        <ellipse cx={x} cy="81" rx="8.6" ry="10.4" fill={url('iris')} />
        <circle cx={x} cy="82" r="4.6" fill="#1d120a" />
        <circle cx={x - 3.5} cy="76" r="3.4" fill="#fff" />
        <circle cx={x + 3} cy="85" r="1.6" fill="#fff" opacity="0.9" />
        <path d={`M${x - 10.5},76 Q${x},66 ${x + 10.5},76`} fill="none" stroke="#2b1a10" strokeWidth="2" strokeLinecap="round" />
        <path d={right ? `M${x + 9},71 l5,-3 M${x + 11},75 l5,-1` : `M${x - 9},71 l-5,-3 M${x - 11},75 l-5,-1`} stroke="#2b1a10" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    );

  return (
    <g data-part="body">
      <defs>
        <radialGradient id={id('skin')} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor={f.skin} />
          <stop offset="1" stopColor={f.skin} stopOpacity="1" />
        </radialGradient>
        <linearGradient id={id('dress')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={f.dressLight} />
          <stop offset="0.45" stopColor={f.dress} />
          <stop offset="1" stopColor={f.dressShade} />
        </linearGradient>
        <radialGradient id={id('wing')} cx="0.15" cy="0.55" r="0.95">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.45" stopColor={f.wing} stopOpacity="0.7" />
          <stop offset="1" stopColor={f.wing} stopOpacity="0.45" />
        </radialGradient>
        <linearGradient id={id('hair')} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor={f.hair} />
          <stop offset="1" stopColor={f.hairShade} />
        </linearGradient>
        <radialGradient id={id('iris')} cx="0.5" cy="0.7" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.35" stopColor={f.eyes} />
          <stop offset="1" stopColor="#1d1a2a" />
        </radialGradient>
        <radialGradient id={id('blush')}>
          <stop offset="0" stopColor="#f58fa0" stopOpacity="0.75" />
          <stop offset="1" stopColor="#f58fa0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* wings (behind everything) */}
      {[false, true].map((left) => (
        <g key={String(left)} transform={left ? 'translate(200,0) scale(-1,1)' : undefined}>
          <g data-part={left ? 'wing-l' : 'wing-r'}>
            <path d={WING_UP} fill={url('wing')} stroke={f.wingEdge} strokeWidth="1.8" strokeLinejoin="round" />
            <path d={WING_LO} fill={url('wing')} stroke={f.wingEdge} strokeWidth="1.8" strokeLinejoin="round" />
            <path d={WING_VEINS} fill="none" stroke={f.wingEdge} strokeWidth="1" opacity="0.6" />
            {f.spots && (
              <g fill={f.wingEdge} opacity="0.55">
                <circle cx="168" cy="72" r="5" /><circle cx="180" cy="92" r="3.5" /><circle cx="152" cy="172" r="4" />
              </g>
            )}
            <path d={WING_UP} fill={`url(#${grain})`} opacity="0.6" />
          </g>
        </g>
      ))}

      {/* hair behind the head */}
      <g data-part="hair">
        <path d={hairBack(f.style)} fill={url('hair')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        {f.style === 'braid' && (
          <path d="M132,110 C146,126 140,146 150,162 C156,172 150,184 144,186 C140,176 132,170 134,158 C128,144 122,128 124,114Z" fill={url('hair')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        )}
      </g>

      {/* legs and shoes, swinging */}
      {[92, 108].map((x, i) => (
        <g key={x} data-part={i ? 'leg-r' : 'leg-l'} data-x={x} data-y={194}>
          <path d={leg(x)} fill={f.skin} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d={shoe(x)} fill={f.shoes} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </g>
      ))}

      {/* dress */}
      <g data-part="skirt">
        <path d={SKIRT} fill={url('dress')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d={SKIRT_PETALS} fill="none" stroke={f.dressShade} strokeWidth="1.4" opacity="0.8" strokeLinecap="round" />
        <path d={SKIRT} fill={`url(#${grain})`} />
      </g>
      <path d={BODICE} fill={f.bodice ?? f.dress} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M82,145 Q100,150 118,145 L118,151 Q100,156 82,151Z" fill={f.dressShade} />
      <rect x="95.5" y="104" width="9" height="16" rx="4" fill={f.skin} />

      {/* arms, hands together holding the twine */}
      <g fill="none" strokeLinecap="round">
        <path d="M84,122 C74,134 78,152 95,160" stroke={INK} strokeWidth="11" />
        <path d="M116,122 C126,134 122,152 105,160" stroke={INK} strokeWidth="11" />
        <path d="M84,122 C74,134 78,152 95,160" stroke={f.skin} strokeWidth="7.5" />
        <path d="M116,122 C126,134 122,152 105,160" stroke={f.skin} strokeWidth="7.5" />
      </g>
      <circle cx="96" cy="160" r="5.6" fill={f.skin} stroke={INK} strokeWidth="1.6" />
      <circle cx="104" cy="160" r="5.6" fill={f.skin} stroke={INK} strokeWidth="1.6" />

      {/* head */}
      <g data-part="head">
        <circle cx="58" cy="80" r="6.5" fill={f.skin} stroke={INK} strokeWidth="1.8" />
        <circle cx="142" cy="80" r="6.5" fill={f.skin} stroke={INK} strokeWidth="1.8" />
        <path d={HEAD} fill={url('skin')} stroke={INK} strokeWidth="2.2" />
        <path d={HEAD} fill={`url(#${grain})`} opacity="0.5" />
        <ellipse cx="74" cy="96" rx="9" ry="5.5" fill={url('blush')} />
        <ellipse cx="126" cy="96" rx="9" ry="5.5" fill={url('blush')} />
        {eye(84, false)}
        {eye(116, true)}
        <path d="M77,58 Q84,52 91,56 M109,56 Q116,52 123,58" fill="none" stroke={f.hairShade} strokeWidth="2" strokeLinecap="round" />
        <path d="M99,92 q1,2 2,0" fill="none" stroke="#c98a6e" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M91,99 Q100,111 109,99 Q100,103 91,99Z" fill="#d9536a" stroke="#8a3a2a" strokeWidth="1.3" strokeLinejoin="round" />

        {/* hair on top */}
        <path d={hairFront(f.style)} fill={url('hair')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        {(f.style === 'bun' || f.style === 'topknot') && (
          <g>
            <circle cx="100" cy={f.style === 'bun' ? 22 : 18} r={f.style === 'bun' ? 20 : 16} fill={url('hair')} stroke={INK} strokeWidth="2" />
            <path d={f.style === 'bun' ? 'M86,16 C94,8 108,8 114,18 M84,26 C94,20 106,22 116,28' : 'M88,14 C96,6 108,8 112,16'} fill="none" stroke={f.hairShade} strokeWidth="1.6" strokeLinecap="round" />
          </g>
        )}
        <path d="M76,36 C86,30 98,30 108,34" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.35" strokeLinecap="round" />

        {/* crowns and hair ornaments */}
        {f.crown === 'headband' && (
          <g>
            <path d="M60,58 C74,36 126,36 140,58" fill="none" stroke="#6fae2c" strokeWidth="6" strokeLinecap="round" />
            <path d="M60,58 C74,36 126,36 140,58" fill="none" stroke={INK} strokeWidth="1.2" opacity="0.5" />
            {[[70, 46], [126, 44]].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-5" rx="3.4" ry="5" fill="#f4d03f" stroke="#b8860b" strokeWidth="0.8" transform={`rotate(${a})`} />)}
                <circle r="2.6" fill="#e08a1e" />
              </g>
            ))}
          </g>
        )}
        {f.crown === 'daisies' && [[62, 58], [74, 42], [92, 34], [110, 34], [128, 42], [140, 58]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <ellipse key={a} cx="0" cy="-4.5" rx="2" ry="4" fill="#fff" stroke="#c9b28a" strokeWidth="0.6" transform={`rotate(${a})`} />)}
            <circle r="2.4" fill="#f2b632" />
          </g>
        ))}
        {f.crown === 'stars' && [[82, 18], [100, 8], [118, 18], [114, 34], [86, 32]].map(([x, y], i) => (
          <path key={i} transform={`translate(${x} ${y}) scale(0.9)`} d="M0,-6 L1.8,-1.8 L6,0 L1.8,1.8 L0,6 L-1.8,1.8 L-6,0 L-1.8,-1.8Z" fill="#f6c945" stroke="#a5781a" strokeWidth="0.8" />
        ))}
        {f.crown === 'rose' && (
          <g transform="translate(118 14)">
            <path d="M-12,4 C-16,-6 -6,-12 0,-8 C6,-12 16,-6 12,4 C8,12 -8,12 -12,4Z" fill="#f6a1b8" stroke="#b04a6a" strokeWidth="1.2" />
            <path d="M-6,0 C-2,-6 6,-4 4,2" fill="none" stroke="#b04a6a" strokeWidth="1.2" />
            <path d="M-14,8 C-22,6 -24,14 -18,16 C-12,16 -10,12 -14,8Z" fill="#5f9a4a" stroke="#2f5a2a" strokeWidth="1" />
          </g>
        )}
        {f.crown === 'pearls' && (
          <g>
            <path d="M60,62 C72,40 128,40 140,62" fill="none" stroke="#e8eef2" strokeWidth="1" />
            {Array.from({ length: 11 }, (_, i) => {
              const t = i / 10, x = 60 + 80 * t, y = 62 - Math.sin(t * Math.PI) * 20;
              return <circle key={i} cx={x} cy={y} r="2.8" fill="#f8fbff" stroke="#9fb7c4" strokeWidth="0.8" />;
            })}
            <g transform="translate(130 46)">
              {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="0" cy="-4" rx="2.6" ry="4" fill="#bfe9f5" stroke="#4fb2c9" strokeWidth="0.7" transform={`rotate(${a})`} />)}
              <circle r="2.2" fill="#ffffff" />
            </g>
          </g>
        )}
        {f.crown === 'acorn' && (
          <g transform="translate(124 34) rotate(18)">
            <path d="M-14,2 C-24,-10 -10,-20 -2,-10 C2,-22 18,-18 12,-4 C22,-6 22,8 10,8Z" fill="#e0882a" stroke="#8a4a14" strokeWidth="1.2" />
            <ellipse cx="0" cy="10" rx="7" ry="8" fill="#a8652a" stroke="#5c3412" strokeWidth="1.2" />
            <path d="M-8,6 Q0,0 8,6 L8,9 Q0,4 -8,9Z" fill="#6d4220" />
          </g>
        )}
      </g>
    </g>
  );
}

/** Moves one drawn fairy. Give it the <g> that wraps a <FairyArt>. */
export class FairyRig {
  private wingR: SVGGElement;
  private wingL: SVGGElement;
  private legs: { el: SVGGElement; x: number; y: number }[];
  private skirt: SVGGElement;
  private hair: SVGGElement;
  private body: SVGGElement;
  private head: SVGGElement;
  private eyes: { el: SVGGElement; x: number; y: number }[];

  constructor(root: SVGGElement) {
    const q = (p: string) => root.querySelector<SVGGElement>(`[data-part="${p}"]`)!;
    this.body = q('body');
    this.wingR = q('wing-r');
    this.wingL = q('wing-l');
    this.skirt = q('skirt');
    this.hair = q('hair');
    this.head = q('head');
    const withPivot = (el: SVGGElement) => ({ el, x: Number(el.dataset.x), y: Number(el.dataset.y) });
    this.legs = [q('leg-l'), q('leg-r')].map(withPivot);
    this.eyes = [...root.querySelectorAll<SVGGElement>('[data-part="eye"]')].map(withPivot);
  }

  /** beat: wing phase (radians) · tilt: lean (deg) · time: seconds · blink: 1 open → 0 shut */
  pose(beat: number, tilt: number, time: number, blink: number, seed: number) {
    // wings flutter: they fold in towards the body and open again, very fast
    const k = 0.42 + 0.58 * Math.abs(Math.cos(beat));
    const wing = `translate(104 130) scale(${k.toFixed(3)} ${(0.94 + 0.06 * k).toFixed(3)}) translate(-104 -130)`;
    this.wingR.setAttribute('transform', wing);
    this.wingL.setAttribute('transform', wing);
    // legs dangle and kick gently, one after the other
    this.legs.forEach((l, i) => {
      const a = Math.sin(time * 2.4 + seed + i * 1.9) * 9;
      l.el.setAttribute('transform', `rotate(${a.toFixed(1)} ${l.x} ${l.y})`);
    });
    // the skirt and hair trail a little behind the motion
    const sway = Math.sin(time * 2.4 + seed + 0.6) * 2.5 - tilt * 0.35;
    this.skirt.setAttribute('transform', `rotate(${sway.toFixed(2)} 100 148)`);
    this.hair.setAttribute('transform', `rotate(${(sway * 0.6).toFixed(2)} 100 74)`);
    this.head.setAttribute('transform', `rotate(${(Math.sin(time * 1.3 + seed) * 3).toFixed(2)} 100 112)`);
    this.body.setAttribute('transform', `rotate(${tilt.toFixed(2)} ${FAIRY_HOLD[0]} ${FAIRY_HOLD[1]})`);
    const b = Math.max(0.08, blink);
    for (const e of this.eyes) e.el.setAttribute('transform', `translate(${e.x} ${e.y}) scale(1 ${b.toFixed(2)}) translate(${-e.x} ${-e.y})`);
  }
}
