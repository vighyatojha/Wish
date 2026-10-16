// ─────────────────────────────────────────────────────────────
//  Little woodland animals holding a rolled-up card.
//  Bunny, fox, hedgehog, squirrel and duckling, drawn in SVG in
//  the same painted style as the bluebird: soft gradients, warm
//  sunlight on their right side, coloured-pencil grain, brown ink.
//
//  Every animal shares one skeleton so one AnimalRig can move them
//  all: body (squash), head (tilt), ears (twitch), tail (sway),
//  eyes (blink) and paws + card (raised to offer it).
//
//  Coordinates: a 200-wide box, feet on the ground at (100, 192).
// ─────────────────────────────────────────────────────────────
import { useId, type ReactNode } from 'react';

export type AnimalKind = 'bunny' | 'fox' | 'hedgehog' | 'squirrel' | 'duckling';
export const ANIMAL_FEET = [100, 192] as const;
/** where the rolled card sits (local units), for growing the card out of it */
export const CARD_ROLL = [100, 146] as const;

const INK = '#5b3b29';
const BODY = 'M100,112 C136,112 152,140 152,166 C152,186 136,194 100,194 C64,194 48,186 48,166 C48,140 64,112 100,112Z';

const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${200 - Number(x)},${y}`);

interface Palette { fur: string; light: string; shade: string; cream: string; accent?: string }
const PALETTES: Record<AnimalKind, Palette> = {
  bunny: { fur: '#cfa982', light: '#f0dcc2', shade: '#9c7553', cream: '#f9efe1', accent: '#f2b4b0' },
  fox: { fur: '#e8813a', light: '#f8b56f', shade: '#b4561f', cream: '#fdf5ea', accent: '#3d281b' },
  hedgehog: { fur: '#e3c08f', light: '#f8e8cc', shade: '#b8915f', cream: '#fbf0dc', accent: '#6b4a33' },
  squirrel: { fur: '#cf6a2c', light: '#f0a263', shade: '#8c4218', cream: '#fbeedb' },
  duckling: { fur: '#f6d25a', light: '#fdeca4', shade: '#d6a233', cream: '#fff6cf', accent: '#f39a33' },
};

function Eyes({ y, gap, url }: { y: number; gap: number; url: (n: string) => string }) {
  return (
    <>
      {[100 - gap, 100 + gap].map((x, i) => (
        <g key={i} data-part="eye" data-x={x} data-y={y}>
          <ellipse cx={x} cy={y} rx="11" ry="12.5" fill={url('eye')} />
          <circle cx={x - 3.8} cy={y - 5} r="4.2" fill="#fff" />
          <circle cx={x + 3.4} cy={y + 4.4} r="1.9" fill="#fff" opacity="0.9" />
        </g>
      ))}
    </>
  );
}

function Cheeks({ y, gap, url }: { y: number; gap: number; url: (n: string) => string }) {
  return (
    <>
      <ellipse cx={100 - gap} cy={y} rx="11" ry="6.5" fill={url('cheek')} />
      <ellipse cx={100 + gap} cy={y} rx="11" ry="6.5" fill={url('cheek')} />
    </>
  );
}

/** the rolled card, and the paws (or wing tips) holding it */
function HeldCard({ p, wings, url }: { p: Palette; wings?: boolean; url: (n: string) => string }) {
  const paw = (x: number) =>
    wings ? (
      <path d={`M${x - 12},${136} C${x - 2},${132} ${x + 10},${138} ${x + 10},${150} C${x + 4},${156} ${x - 8},${156} ${x - 14},${148}Z`}
        fill={p.light} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    ) : (
      <g>
        <ellipse cx={x} cy="147" rx="9.5" ry="8.5" fill={p.light} stroke={INK} strokeWidth="1.8" />
        <path d={`M${x - 3},141 l0,5 M${x + 3},141 l0,5`} stroke={INK} strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      </g>
    );
  return (
    <g data-part="arms">
      <rect x="68" y="137" width="64" height="18" rx="9" fill={url('paper')} stroke={INK} strokeWidth="1.8" />
      <ellipse cx="70" cy="146" rx="4.5" ry="9" fill="#fff8e8" stroke={INK} strokeWidth="1.4" />
      <path d="M70,142 a2.5,3 0 1 1 -0.1,0" fill="none" stroke="#b89a6a" strokeWidth="1" />
      <rect x="95" y="136.5" width="10" height="19" fill="#c0392b" stroke="#7d1a12" strokeWidth="1" />
      <path d="M100,155 l-5,9 l4,-1 l1,3 M100,155 l5,9 l-4,-1 l-1,3" fill="#c0392b" stroke="#7d1a12" strokeWidth="1" strokeLinejoin="round" />
      {paw(80)}
      {paw(120)}
    </g>
  );
}

function spikes(): string {
  // a fan of spines round the top of a hedgehog, alternating long and short
  const pts: string[] = [];
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const a = (-205 + (230 * i) / n) * (Math.PI / 180);
    const r = i % 2 ? 72 : 90 + ((i * 37) % 7);
    pts.push(`${(100 + Math.cos(a) * r).toFixed(1)},${(118 + Math.sin(a) * r * 0.92).toFixed(1)}`);
  }
  return `M100,150 L${pts.join(' L')}Z`;
}
const SPIKES = spikes();
const SPIKE_TIPS = (() => {
  let d = '';
  for (let i = 0; i < 26; i++) {
    const a = (-196 + (212 * i) / 25) * (Math.PI / 180);
    const r0 = 54 + (i % 3) * 8, r1 = r0 + 16;
    d += `M${(100 + Math.cos(a) * r0).toFixed(1)},${(118 + Math.sin(a) * r0 * 0.92).toFixed(1)} L${(100 + Math.cos(a) * r1).toFixed(1)},${(118 + Math.sin(a) * r1 * 0.92).toFixed(1)} `;
  }
  return d;
})();

export function AnimalArt({ kind, grain }: { kind: AnimalKind; grain: string }) {
  const u = useId().replace(/:/g, '');
  const id = (n: string) => `${n}-${u}`;
  const url = (n: string) => `url(#${id(n)})`;
  const g = `url(#${grain})`;
  const p = PALETTES[kind];
  const fill = (d: string, f = url('fur'), extra?: ReactNode) => (
    <>
      <path d={d} fill={f} />
      <path d={d} fill={url('rim')} />
      <path d={d} fill={g} />
      <path d={d} fill="none" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      {extra}
    </>
  );

  const defs = (
    <defs>
      <radialGradient id={id('fur')} cx="0.38" cy="0.3" r="0.8">
        <stop offset="0" stopColor={p.light} />
        <stop offset="0.55" stopColor={p.fur} />
        <stop offset="1" stopColor={p.shade} />
      </radialGradient>
      <linearGradient id={id('rim')} x1="0.45" y1="0.6" x2="1" y2="0.15">
        <stop offset="0" stopColor="#fff1c9" stopOpacity="0" />
        <stop offset="1" stopColor="#fff1c9" stopOpacity="0.5" />
      </linearGradient>
      <radialGradient id={id('cream')} cx="0.5" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor={p.cream} />
      </radialGradient>
      <radialGradient id={id('eye')} cx="0.5" cy="0.75" r="0.75">
        <stop offset="0" stopColor="#7a4a28" />
        <stop offset="0.6" stopColor="#3b2112" />
        <stop offset="1" stopColor="#1f1008" />
      </radialGradient>
      <radialGradient id={id('cheek')}>
        <stop offset="0" stopColor="#f39aa3" stopOpacity="0.8" />
        <stop offset="1" stopColor="#f39aa3" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={id('paper')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fffaf0" />
        <stop offset="1" stopColor="#e6cf9f" />
      </linearGradient>
    </defs>
  );

  let back: ReactNode = null, body: ReactNode, head: ReactNode, feet: ReactNode;

  switch (kind) {
    case 'bunny': {
      const EAR = 'M70,52 C54,14 56,-28 70,-32 C86,-34 92,8 90,48Z';
      const EAR_IN = 'M74,46 C62,14 64,-20 71,-24 C80,-25 85,8 85,42Z';
      back = (
        <g data-part="tail" data-x="138" data-y="176">
          <circle cx="148" cy="176" r="14" fill={url('cream')} stroke={INK} strokeWidth="2" />
          <path d="M140,170 q4,-4 8,0 M146,182 q4,-3 7,1" fill="none" stroke="#d9c6ad" strokeWidth="1.4" />
        </g>
      );
      body = <>{fill(BODY)}<ellipse cx="100" cy="166" rx="30" ry="23" fill={url('cream')} /></>;
      feet = [76, 124].map((x) => <ellipse key={x} cx={x} cy="190" rx="18" ry="8" fill={p.light} stroke={INK} strokeWidth="1.8" />);
      head = (
        <>
          <g data-part="ear-l" data-x="80" data-y="48">{fill(EAR)}<path d={EAR_IN} fill={p.accent} opacity="0.85" /></g>
          <g data-part="ear-r" data-x="120" data-y="48" data-rest="10">{fill(mirror(EAR))}<path d={mirror(EAR_IN)} fill={p.accent} opacity="0.85" /></g>
          {fill('M100,36 C136,36 154,58 154,84 C154,110 132,124 100,124 C68,124 46,110 46,84 C46,58 64,36 100,36Z')}
          <ellipse cx="100" cy="102" rx="21" ry="13" fill={url('cream')} />
          <Cheeks y={100} gap={34} url={url} />
          <Eyes y={80} gap={22} url={url} />
          <path d="M95,95 Q100,91 105,95 Q100,101 95,95Z" fill="#e88a94" stroke="#a65a5f" strokeWidth="1" />
          <path d="M100,99 L100,103 M93,104 Q97,108 100,103 Q103,108 107,104" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M78,101 l-16,-3 M78,105 l-16,2 M122,101 l16,-3 M122,105 l16,2" stroke={INK} strokeWidth="1" opacity="0.45" strokeLinecap="round" />
        </>
      );
      break;
    }
    case 'fox': {
      const EAR = 'M64,64 L56,8 L98,44Z';
      const EAR_IN = 'M68,56 L63,22 L88,44Z';
      const EAR_TIP = 'M56,8 L59,28 L72,20Z';
      back = (
        <g data-part="tail" data-x="130" data-y="176">
          {fill('M128,178 C168,184 198,156 190,116 C186,98 170,92 162,104 C172,126 160,152 126,160Z')}
          <path d="M190,116 C186,98 170,92 162,104 C168,112 176,118 189,124Z" fill={p.cream} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        </g>
      );
      body = <>{fill(BODY)}<path d="M76,118 C88,132 112,132 124,118 C122,142 112,160 100,164 C88,160 78,142 76,118Z" fill={url('cream')} /></>;
      feet = [76, 124].map((x) => <ellipse key={x} cx={x} cy="190" rx="17" ry="8" fill={p.accent} stroke={INK} strokeWidth="1.8" />);
      head = (
        <>
          <g data-part="ear-l" data-x="78" data-y="52">{fill(EAR)}<path d={EAR_IN} fill={p.cream} opacity="0.9" /><path d={EAR_TIP} fill={p.accent} /></g>
          <g data-part="ear-r" data-x="122" data-y="52">{fill(mirror(EAR))}<path d={mirror(EAR_IN)} fill={p.cream} opacity="0.9" /><path d={mirror(EAR_TIP)} fill={p.accent} /></g>
          {fill('M100,40 C132,40 150,60 154,84 C160,96 150,104 140,106 C130,118 116,124 100,124 C84,124 70,118 60,106 C50,104 40,96 46,84 C50,60 68,40 100,40Z')}
          <path d="M50,92 C64,104 84,106 100,100 C116,106 136,104 150,92 C142,112 122,124 100,124 C78,124 58,112 50,92Z" fill={url('cream')} />
          <Cheeks y={98} gap={36} url={url} />
          <Eyes y={80} gap={21} url={url} />
          <ellipse cx="100" cy="100" rx="6.5" ry="4.8" fill="#2b1a10" />
          <circle cx="98" cy="98.5" r="1.4" fill="#fff" opacity="0.7" />
          <path d="M100,105 L100,108 M94,109 Q100,113 106,109" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
      break;
    }
    case 'hedgehog': {
      back = (
        <g data-part="tail" data-x="100" data-y="150">
          <path d={SPIKES} fill="#6e4b33" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d={SPIKE_TIPS} stroke="#c9a57a" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
          <path d={SPIKES} fill={g} />
        </g>
      );
      body = fill('M100,124 C134,124 146,146 146,166 C146,186 132,194 100,194 C68,194 54,186 54,166 C54,146 66,124 100,124Z');
      feet = [80, 120].map((x) => <ellipse key={x} cx={x} cy="190" rx="14" ry="7" fill={p.shade} stroke={INK} strokeWidth="1.8" />);
      head = (
        <>
          <g data-part="ear-l" data-x="64" data-y="76"><circle cx="62" cy="70" r="10" fill={p.fur} stroke={INK} strokeWidth="2" /><circle cx="62" cy="71" r="5" fill="#f2b4b0" /></g>
          <g data-part="ear-r" data-x="136" data-y="76"><circle cx="138" cy="70" r="10" fill={p.fur} stroke={INK} strokeWidth="2" /><circle cx="138" cy="71" r="5" fill="#f2b4b0" /></g>
          {fill('M100,60 C130,60 148,78 148,98 C148,118 128,132 100,132 C72,132 52,118 52,98 C52,78 70,60 100,60Z', url('cream'))}
          <ellipse cx="100" cy="114" rx="17" ry="11" fill="#fffaf0" stroke={INK} strokeWidth="1.2" opacity="0.9" />
          <Cheeks y={112} gap={32} url={url} />
          <Eyes y={94} gap={19} url={url} />
          <circle cx="100" cy="108" r="6" fill="#2b1a10" />
          <circle cx="98" cy="106" r="1.6" fill="#fff" opacity="0.7" />
          <path d="M95,117 Q100,121 105,117" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
      break;
    }
    case 'squirrel': {
      const EAR = 'M66,58 C60,36 62,16 70,8 C76,18 88,36 90,48Z';
      const TUFT = 'M69,10 C66,4 69,-1 68,-6 C73,-1 76,4 74,11Z';
      back = (
        <g data-part="tail" data-x="128" data-y="176">
          {fill('M126,180 C176,176 196,128 172,92 C156,68 164,36 190,36 C176,10 130,20 138,66 C144,98 152,130 122,152Z')}
          <path d="M150,152 C170,130 172,106 160,88 M164,62 C164,48 172,42 182,42" fill="none" stroke={p.light} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
        </g>
      );
      body = <>{fill(BODY)}<ellipse cx="100" cy="164" rx="27" ry="24" fill={url('cream')} /></>;
      feet = [78, 122].map((x) => <ellipse key={x} cx={x} cy="190" rx="16" ry="7.5" fill={p.fur} stroke={INK} strokeWidth="1.8" />);
      head = (
        <>
          <g data-part="ear-l" data-x="78" data-y="52">{fill(EAR)}<path d={TUFT} fill={p.fur} stroke={INK} strokeWidth="1.2" /></g>
          <g data-part="ear-r" data-x="122" data-y="52">{fill(mirror(EAR))}<path d={mirror(TUFT)} fill={p.fur} stroke={INK} strokeWidth="1.2" /></g>
          {fill('M100,40 C134,40 152,60 152,86 C152,110 130,124 100,124 C70,124 48,110 48,86 C48,60 66,40 100,40Z')}
          <ellipse cx="100" cy="104" rx="24" ry="15" fill={url('cream')} />
          <Cheeks y={102} gap={34} url={url} />
          <Eyes y={82} gap={21} url={url} />
          <ellipse cx="100" cy="97" rx="5" ry="3.6" fill="#3b2216" />
          <path d="M100,100 L100,104 M94,105 Q97,109 100,104 Q103,109 106,105" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
      break;
    }
    case 'duckling': {
      back = (
        <g data-part="tail" data-x="140" data-y="168">
          <path d="M138,164 C152,160 160,150 164,142 C166,154 160,166 146,174Z" fill={p.shade} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </g>
      );
      body = fill('M100,116 C140,116 152,144 152,166 C152,186 136,194 100,194 C64,194 48,186 48,166 C48,144 60,116 100,116Z');
      feet = [80, 120].map((x) => (
        <path key={x} d={`M${x - 14},194 L${x - 4},182 L${x + 4},182 L${x + 14},194 Q${x + 7},190 ${x + 4},195 Q${x},190 ${x - 4},195 Q${x - 7},190 ${x - 14},194Z`}
          fill={p.accent} stroke="#a85a14" strokeWidth="1.6" strokeLinejoin="round" />
      ));
      head = (
        <>
          <g data-part="ear-l" data-x="96" data-y="40">
            <path d="M92,42 C86,30 90,20 100,17 C96,25 99,31 103,36 C105,26 113,21 122,23 C115,29 113,37 109,44Z" fill={url('fur')} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          </g>
          {fill('M100,36 C134,36 148,60 148,84 C148,110 128,126 100,126 C72,126 52,110 52,84 C52,60 66,36 100,36Z')}
          <Cheeks y={100} gap={33} url={url} />
          <Eyes y={78} gap={21} url={url} />
          <path d="M80,98 Q100,90 120,98 Q118,112 100,114 Q82,112 80,98Z" fill={p.accent} stroke="#a85a14" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M83,102 Q100,107 117,102" fill="none" stroke="#a85a14" strokeWidth="1.3" />
          <circle cx="93" cy="97" r="1.3" fill="#a85a14" /><circle cx="107" cy="97" r="1.3" fill="#a85a14" />
        </>
      );
      break;
    }
  }

  return (
    <g data-part="body">
      {defs}
      {back}
      {feet}
      {body}
      <g data-part="head" data-x="100" data-y={kind === 'hedgehog' ? 132 : 120}>{head}</g>
      <HeldCard p={p} wings={kind === 'duckling'} url={url} />
    </g>
  );
}

export interface AnimalPose {
  squash: number; // + squashes down, − stretches up
  lean: number;   // whole body (deg), rocking on its feet
  head: number;   // head tilt (deg)
  earL: number;   // ear twitch (deg)
  earR: number;
  tail: number;   // tail sway (deg)
  blink: number;  // 1 open, 0 shut
  offer: number;  // 0 → 1 raises the card to give it
}

type Pivoted = { el: SVGGElement; x: number; y: number; rest: number };

/** Moves one drawn animal. Give it the <g> that wraps an <AnimalArt>. */
export class AnimalRig {
  private body: SVGGElement;
  private head: Pivoted | null;
  private earL: Pivoted | null;
  private earR: Pivoted | null;
  private tail: Pivoted | null;
  private arms: SVGGElement;
  private eyes: Pivoted[];
  private last = '';

  constructor(root: SVGGElement) {
    const pivot = (el: SVGGElement | null): Pivoted | null =>
      el && { el, x: Number(el.dataset.x), y: Number(el.dataset.y), rest: Number(el.dataset.rest ?? 0) };
    const q = (p: string) => root.querySelector<SVGGElement>(`[data-part="${p}"]`);
    this.body = q('body')!;
    this.arms = q('arms')!;
    this.head = pivot(q('head'));
    this.earL = pivot(q('ear-l'));
    this.earR = pivot(q('ear-r'));
    this.tail = pivot(q('tail'));
    this.eyes = [...root.querySelectorAll<SVGGElement>('[data-part="eye"]')].map((el) => pivot(el)!);
  }

  pose(p: AnimalPose) {
    const key = [p.squash, p.lean, p.head, p.earL, p.earR, p.tail, p.blink, p.offer].map((v) => v.toFixed(2)).join('|');
    if (key === this.last) return;
    this.last = key;
    const [fx, fy] = ANIMAL_FEET;
    const rot = (pv: Pivoted | null, a: number) => pv?.el.setAttribute('transform', `rotate(${(a + pv.rest).toFixed(2)} ${pv.x} ${pv.y})`);
    this.body.setAttribute('transform', `rotate(${p.lean.toFixed(2)} ${fx} ${fy}) translate(${fx} ${fy}) scale(${(1 + p.squash * 0.6).toFixed(3)} ${(1 - p.squash).toFixed(3)}) translate(${-fx} ${-fy})`);
    rot(this.head, p.head);
    rot(this.earL, p.earL);
    rot(this.earR, -p.earR);
    rot(this.tail, p.tail);
    const o = p.offer;
    this.arms.setAttribute('transform', `translate(0 ${(-o * 16).toFixed(2)}) translate(100 146) scale(${(1 + o * 0.08).toFixed(3)}) rotate(${(-o * 6).toFixed(2)}) translate(-100 -146)`);
    const b = Math.max(0.08, p.blink);
    for (const e of this.eyes) e.el.setAttribute('transform', `translate(${e.x} ${e.y}) scale(1 ${b.toFixed(2)}) translate(${-e.x} ${-e.y})`);
  }
}
