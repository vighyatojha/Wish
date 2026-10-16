// ─────────────────────────────────────────────────────────────
//  The treasure map: a thick, old, hand-drawn sheet that unrolls
//  on the stump and carries the messages.
//
//  • Paper: torn, slightly scorched edges, grain, tea stains and
//    fold creases (SVG filters, drawn once).
//  • Map craft: double ruled border with corner flourishes, compass
//    rose with rhumb lines, hill glyphs, a dotted trail to an X, and
//    a wax seal with her initial.
//  • Words: IM Fell English (a typeface cut in the 1670s) with a
//    two-line drop cap. All messages share one grid cell, so the
//    map's size never jumps when the text changes.
// ─────────────────────────────────────────────────────────────
import { forwardRef, useMemo } from 'react';
import './treasure-map.css';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

// A torn outline around a 400×520 sheet: small irregular bites, a few deeper tears.
function tornEdge(seed: number): string {
  const rand = rng(seed);
  const pts: [number, number][] = [];
  const W = 400, H = 520, m = 6;
  const side = (x0: number, y0: number, x1: number, y1: number, n: number, nx: number, ny: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      let d = (rand() - 0.5) * 5;
      if (rand() < 0.08) d -= 4 + rand() * 7; // an occasional tear
      pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]);
    }
  };
  side(m, m, W - m, m, 34, 0, 1);
  side(W - m, m, W - m, H - m, 42, -1, 0);
  side(W - m, H - m, m, H - m, 34, 0, -1);
  side(m, H - m, m, m, 42, 1, 0);
  return `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`;
}

function CompassRose() {
  const ticks = Array.from({ length: 32 }, (_, i) => i * 11.25);
  return (
    <svg className="map__compass" viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="44" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
      {ticks.map((a) => (
        <line key={a} x1="0" y1={a % 45 === 0 ? -40 : -42} x2="0" y2="-44" stroke="currentColor" strokeWidth="0.6" transform={`rotate(${a})`} />
      ))}
      {/* eight-point star: each point has a dark and a light half */}
      {[0, 90, 180, 270, 45, 135, 225, 315].map((a, i) => {
        const len = i < 4 ? 38 : 24;
        const w = i < 4 ? 7 : 5;
        return (
          <g key={a} transform={`rotate(${a})`}>
            <path d={`M0,0 L0,${-len} L${w},${-w}Z`} fill="currentColor" />
            <path d={`M0,0 L0,${-len} L${-w},${-w}Z`} fill="var(--paper-light)" stroke="currentColor" strokeWidth="0.6" />
          </g>
        );
      })}
      <circle r="3.2" fill="var(--seal)" stroke="currentColor" strokeWidth="0.6" />
      <text y="-46.5" textAnchor="middle" className="map__compass-n">N</text>
    </svg>
  );
}

function WaxSeal({ initial }: { initial: string }) {
  // a blob of wax with an uneven rim
  const rand = rng(91);
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = 30 + (rand() - 0.5) * 5 + (i % 7 === 0 ? 3 : 0);
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  });
  return (
    <svg className="map__seal" viewBox="-36 -36 72 72" aria-hidden="true">
      <defs>
        <radialGradient id="wax" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#c23a2a" />
          <stop offset="0.6" stopColor="#962015" />
          <stop offset="1" stopColor="#5e110a" />
        </radialGradient>
      </defs>
      <path d={`M${pts.join('L')}Z`} fill="url(#wax)" />
      <circle r="21" fill="none" stroke="#5a0f08" strokeWidth="1.6" opacity="0.7" />
      <circle r="19.5" fill="none" stroke="#e0786a" strokeWidth="0.6" opacity="0.35" />
      <text y="9" textAnchor="middle" className="map__seal-letter">{initial}</text>
      <ellipse cx="-10" cy="-14" rx="8" ry="4" fill="#fff" opacity="0.18" transform="rotate(-30)" />
    </svg>
  );
}

function Flourish({ className }: { className: string }) {
  return (
    <svg className={`map__flourish ${className}`} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M4,36 C4,18 12,8 30,5 M4,36 C10,30 14,24 13,17 C12,12 7,13 8,18 C9,22 14,21 15,17" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M30,5 C25,9 26,14 30,13 C33,12 33,8 30,5" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="4" cy="36" r="1.6" fill="currentColor" />
    </svg>
  );
}

interface Props {
  messages: readonly string[];
  initial: string;
}

export const TreasureMap = forwardRef<HTMLDivElement, Props>(function TreasureMap({ messages, initial }, ref) {
  const edge = useMemo(() => tornEdge(1234), []);

  return (
    <div className="map" ref={ref}>
      <div className="map__clip">
        <div className="map__inner">
          {/* the paper itself */}
          <svg className="map__paper" viewBox="0 0 400 520" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="map-shape">
                <path d={edge} />
              </clipPath>
              <radialGradient id="map-tone" cx="48%" cy="44%" r="75%">
                <stop offset="0" stopColor="#f1e1bd" />
                <stop offset="0.65" stopColor="#e2c895" />
                <stop offset="1" stopColor="#c49c62" />
              </radialGradient>
              <filter id="map-grain" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
                <feColorMatrix values="0 0 0 0 0.32  0 0 0 0 0.2  0 0 0 0 0.08  0 0 0 0.55 -0.12" />
              </filter>
              <filter id="map-stains" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.011 0.014" numOctaves="3" seed="11" />
                <feColorMatrix values="0 0 0 0 0.48  0 0 0 0 0.3  0 0 0 0 0.12  2.2 0 0 0 -1.1" />
              </filter>
              <filter id="map-burn" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="7" />
              </filter>
            </defs>
            <g clipPath="url(#map-shape)">
              <rect width="400" height="520" fill="url(#map-tone)" />
              <rect width="400" height="520" filter="url(#map-stains)" opacity="0.55" />
              <rect width="400" height="520" filter="url(#map-grain)" />
              {/* fold creases: a light ridge beside a dark valley */}
              <path d="M200,0 V520 M0,262 H400" stroke="#fff6dc" strokeWidth="1.4" opacity="0.4" />
              <path d="M201.4,0 V520 M0,263.4 H400" stroke="#6b4a26" strokeWidth="0.9" opacity="0.28" />
              {/* scorched edges */}
              <path d={edge} fill="none" stroke="#4a2408" strokeWidth="26" filter="url(#map-burn)" opacity="0.75" />
            </g>
            <path d={edge} fill="none" stroke="#2d1606" strokeWidth="1.3" opacity="0.85" />
          </svg>

          {/* map craft */}
          <div className="map__ornaments" aria-hidden="true">
            <div className="map__rule" />
            <Flourish className="is-tl" />
            <Flourish className="is-tr" />
            <Flourish className="is-bl" />
            <Flourish className="is-br" />
            <svg className="map__rhumbs" viewBox="0 0 100 100" preserveAspectRatio="none">
              {Array.from({ length: 16 }, (_, i) => {
                const a = (i / 16) * Math.PI * 2;
                return <line key={i} x1="84" y1="15" x2={84 + Math.cos(a) * 160} y2={15 + Math.sin(a) * 160} />;
              })}
            </svg>
            <CompassRose />
            <svg className="map__hills" viewBox="0 0 90 34">
              {[[10, 30, 14], [30, 30, 20], [55, 30, 15], [74, 30, 11]].map(([x, y, h], i) => (
                <g key={i}>
                  <path d={`M${x - h * 0.9},${y} L${x},${y - h} L${x + h * 0.9},${y}`} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                  <path d={`M${x},${y - h} L${x + h * 0.9},${y} M${x + 2},${y - h + 5} l3,6 M${x + 4},${y - h + 9} l3,6`} stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
                </g>
              ))}
            </svg>
            <svg className="map__trail" viewBox="0 0 120 70">
              <path d="M6,8 C30,4 40,30 22,40 C6,50 30,66 62,58 C84,52 92,40 104,44" fill="none" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 4.5" strokeLinecap="round" />
              <path d="M98,38 l10,10 M108,38 l-10,10" stroke="var(--seal)" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <WaxSeal initial={initial} />
          </div>

          {/* the words */}
          <div className="map__content">
            <div className="map__numerals" aria-hidden="true">
              {messages.map((_, i) => (
                <span className="map__numeral" key={i}>
                  {ROMAN[i] ?? i + 1}
                </span>
              ))}
            </div>
            <div className="map__texts">
              {messages.map((text, i) => (
                <p className="map__msg" key={i}>
                  <span className="map__dropcap">{text.charAt(0)}</span>
                  <span className="map__body">{text.slice(1)}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="map__roll" aria-hidden="true" />
    </div>
  );
});
