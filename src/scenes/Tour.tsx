// ─────────────────────────────────────────────────────────────
//  Page 2b: animals with cards, around the valley
//
//  The camera glides from place to place: the big rock in front,
//  the farmhouse, the rocks in the middle of the river, the far
//  bank. At each one:
//  • the camera settles and the valley softens around the spot
//    (a shallow depth of field, so the animal is the sharp thing);
//  • a little animal pops up from behind the rock or grass with a
//    squash-and-stretch bounce and a few sparkles;
//  • it lifts its rolled card, which opens into a message;
//  • she taps: the card rolls back up, the animal hops happily and
//    ducks out of sight, and the camera moves on;
//  • the sun moves on a little with every card.
//  At the end the camera pulls back to the whole valley.
//
//  The animals are pinned to the picture: Sunrise calls frame()
//  every frame with its camera, so they stay put on their rock as
//  the camera moves.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { content } from '../content';
import { gsap, ease } from '../lib/motion';
import { buzz, prefersReducedMotion } from '../lib/device';
import { playPop, playRustle } from '../lib/audio';
import { AnimalArt, AnimalRig, ANIMAL_FEET, CARD_ROLL, type AnimalKind } from '../components/Animals';
import { GrainPattern, blinker } from '../components/CuteBird';
import type { Vec2 } from '../lib/valley';
import './tour.css';

const copy = content.tour;
const CARDS = copy.cards;

// Where each animal stands in the picture (0–1 across and down, at its
// feet) and how tall it is there, as a share of the picture's height.
const SPOTS: Record<AnimalKind, { at: Vec2; size: number }> = {
  bunny: { at: [0.33, 0.832], size: 0.12 },      // on the big rock in front
  fox: { at: [0.245, 0.575], size: 0.065 },      // on the lawn by the farmhouse
  duckling: { at: [0.494, 0.825], size: 0.072 }, // on a rock in the river
  hedgehog: { at: [0.672, 0.818], size: 0.078 }, // on the big rock mid-river
  squirrel: { at: [0.8, 0.796], size: 0.068 },   // among the stones on the far bank
};
const MAX_ZOOM = 2.6;

/** Shared with the valley: the camera, the focus spot, the time of day. */
export interface TourShared {
  mix: number;                // 0 the valley's own camera · 1 this tour's camera
  cx: number; cy: number; z: number; // camera: picture point at screen centre, and zoom
  base: { cx: number; cy: number; z: number }; // the valley's own camera (written by Sunrise)
  dof: number;                // background blur
  day: number;
  frame: ((f: TourFrame) => { x: number; y: number; sharp: number; soft: number } | null) | null;
}
export interface TourFrame {
  time: number;
  dt: number;
  W: number;
  H: number;
  map: (uv: Vec2) => Vec2;    // picture → screen (0–1), with the current camera
  pxPerPicture: number;       // screen px per picture-height, with the current camera
}

interface Props {
  active: boolean;
  shared: TourShared;
  dayStart: number;
  dayEnd: number;
  onDone: () => void;
}

interface Actor {
  rise: number;   // 1 hidden below the ground line → 0 up
  squash: number;
  offer: number;
  hop: number;
  head: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function Tour({ active, shared, dayStart, dayEnd, onDone }: Props) {
  const outer = useRef<(SVGGElement | null)[]>([]);
  const riser = useRef<(SVGGElement | null)[]>([]);
  const rigRoot = useRef<(SVGGElement | null)[]>([]);
  const shadow = useRef<(SVGEllipseElement | null)[]>([]);
  const sparkles = useRef<(SVGGElement | null)[]>([]);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const actors = useRef<Actor[]>(CARDS.map(() => ({ rise: 1, squash: 0, offer: 0, hop: 0, head: 0 }))).current;
  const current = useRef(-1);
  const busy = useRef(false);
  const [waiting, setWaiting] = useState(false);

  // ── per-frame drawing, called by the valley with its camera ───
  useEffect(() => {
    if (!active) return;
    const rigs = rigRoot.current.map((g) => new AnimalRig(g!));
    const blinks = CARDS.map((_, i) => blinker(i * 0.5));
    const twitch = CARDS.map((_, i) => blinker(i * 0.9 + 0.4));
    shared.frame = ({ time, W, H, map, pxPerPicture }) => {
      let focus: { x: number; y: number; sharp: number; soft: number } | null = null;
      CARDS.forEach((c, i) => {
        const g = outer.current[i];
        if (!g) return;
        const a = actors[i];
        if (a.rise >= 0.999) {
          if (g.style.visibility !== 'hidden') g.style.visibility = 'hidden';
          return;
        }
        g.style.visibility = 'visible';
        const spot = SPOTS[c.animal];
        const [sx, sy] = map(spot.at);
        const h = spot.size * pxPerPicture;            // the animal's height on screen
        const sc = h / 200;
        const x = sx * W, y = sy * H - a.hop * h * 0.12;
        g.setAttribute('transform', `translate(${(x - ANIMAL_FEET[0] * sc).toFixed(1)} ${(y - ANIMAL_FEET[1] * sc).toFixed(1)}) scale(${sc.toFixed(4)})`);
        riser.current[i]!.setAttribute('transform', `translate(0 ${(a.rise * 250).toFixed(1)})`);
        shadow.current[i]!.setAttribute('opacity', ((1 - a.rise) * (1 - a.hop * 0.5) * 0.45).toFixed(3));
        // idle life: breathing, blinking, ears twitching, tail swaying, a curious head tilt
        const tw = 1 - twitch[i](time);
        rigs[i].pose({
          squash: a.squash + Math.sin(time * 2.6 + i) * 0.012,
          lean: Math.sin(time * 0.8 + i * 2) * 1.2,
          head: a.head + Math.sin(time * 0.9 + i) * 3,
          earL: tw * 14 + Math.sin(time * 1.7 + i) * 2,
          earR: Math.sin(time * 1.3 + i * 3) * 2,
          tail: Math.sin(time * 2.2 + i) * (c.animal === 'hedgehog' ? 1.5 : 7),
          blink: blinks[i](time),
          offer: a.offer,
        });
        if (i === current.current) focus = { x: sx, y: sy - (h * 0.45) / H, sharp: (h / H) * 0.75, soft: (h / H) * 0.75 + 0.42 };
      });
      return focus;
    };
    return () => { shared.frame = null; };
  }, [active, shared, actors]);

  // ── the camera for each spot ─────────────────────────────────
  function cameraFor(i: number) {
    const W = window.innerWidth, H = window.innerHeight;
    const wide = W / H > 1.05;
    const spot = SPOTS[CARDS[i].animal];
    // the picture's visible span at zoom 1 (as the valley lays it out)
    const scale = Math.max(W / 2048, H / 1153);
    const span: Vec2 = [W / (2048 * scale), H / (1153 * scale)];
    const want = wide ? 0.32 : 0.25;                          // animal height, share of screen
    const z = clamp((want * span[1]) / spot.size, 1.15, MAX_ZOOM);
    const target: Vec2 = wide ? [0.34, 0.84] : [0.5, 0.86]; // where its feet go on screen
    return {
      cx: spot.at[0] - ((target[0] - 0.5) * span[0]) / z,
      cy: spot.at[1] - ((target[1] - 0.5) * span[1]) / z,
      z,
    };
  }

  // ── the tour ─────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    shared.cx = shared.base.cx;
    shared.cy = shared.base.cy;
    shared.z = shared.base.z;
    shared.day = dayStart;
    shared.mix = 1;
    visit(0);
    return () => { gsap.killTweensOf(shared); };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  function travel(to: { cx: number; cy: number; z: number }, d: number) {
    const mid = Math.max(1.05, Math.min(shared.z, to.z) * 0.72);
    const tl = gsap.timeline();
    tl.to(shared, { cx: to.cx, cy: to.cy, duration: d, ease: 'sine.inOut' }, 0)
      .to(shared, { keyframes: [{ z: mid, duration: d * 0.5, ease: 'sine.inOut' }, { z: to.z, duration: d * 0.5, ease: 'sine.inOut' }] }, 0)
      .to(shared, { dof: 0.35, duration: d * 0.4, ease: 'sine.out' }, 0)
      .to(shared, { dof: 1.25, duration: 0.8, ease: 'sine.inOut' }, d - 0.3);
    return tl;
  }

  function visit(i: number) {
    busy.current = true;
    const reduced = prefersReducedMotion();
    const d = reduced ? 1.2 : i === 0 ? 3.0 : 2.6;
    const a = actors[i];
    const tl = travel(cameraFor(i), d);
    tl.call(() => { current.current = i; }, [], d - 0.6)
      // pop up from behind the rock: stretch on the way up, squash on landing
      .call(() => { playPop(1 + i * 0.06); buzz(10); }, [], d - 0.1)
      .fromTo(a, { rise: 1, squash: -0.14 }, { rise: 0, duration: 0.42, ease: 'power3.out' }, d - 0.1)
      .to(a, { squash: 0.13, duration: 0.09, ease: 'power2.out' }, d + 0.28)
      .to(a, { squash: 0, duration: 0.5, ease: 'elastic.out(1, 0.45)' }, d + 0.37)
      .call(() => burst(i), [], d + 0.2)
      // it lifts its card and the card opens
      .to(a, { offer: 1, duration: 0.45, ease: 'back.out(1.8)' }, d + 0.9)
      .to(a, { head: -6, duration: 0.5, ease: 'sine.inOut' }, d + 0.9)
      .call(() => openCard(i), [], d + 1.15);
  }

  function burst(i: number) {
    const g = sparkles.current[i];
    if (!g) return;
    const stars = [...g.children] as SVGElement[];
    stars.forEach((s, k) => {
      const ang = -Math.PI * (0.15 + 0.7 * (k / Math.max(1, stars.length - 1)));
      const r = 80 + (k % 3) * 22;
      gsap.fromTo(s, { x: 0, y: 0, scale: 0.2, autoAlpha: 1, rotate: 0, transformOrigin: '50% 50%' },
        { x: Math.cos(ang) * r, y: Math.sin(ang) * r, scale: 1, rotate: 90, duration: 0.7, ease: 'power2.out' });
      gsap.to(s, { autoAlpha: 0, scale: 0.4, duration: 0.35, ease: ease.exit, delay: 0.45 });
    });
  }

  function rollPoint(i: number): Vec2 {
    const g = rigRoot.current[i]?.querySelector('[data-part="arms"] rect');
    const r = g?.getBoundingClientRect();
    return r ? [r.left + r.width / 2, r.top + r.height / 2] : [window.innerWidth / 2, window.innerHeight * 0.7];
  }

  function openCard(i: number) {
    const el = cards.current[i]!;
    const W = window.innerWidth, H = window.innerHeight;
    const wide = W / H > 1.05;
    const animal = outer.current[i]!.getBoundingClientRect();
    const cw = el.offsetWidth, ch = el.offsetHeight;
    let left: number, top: number;
    if (wide) {
      const right = animal.right + 28 + cw < W - 16;
      left = right ? Math.min(animal.right + 28, W - cw - 16) : Math.max(16, animal.left - 28 - cw);
      top = clamp(animal.top + animal.height * 0.4 - ch / 2, 16, H - ch - 16);
    } else {
      left = clamp(animal.left + animal.width / 2 - cw / 2, 16, W - cw - 16);
      top = Math.max(16, animal.top - ch - 18);
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    const [rx, ry] = rollPoint(i);
    playRustle();
    gsap.timeline({ onComplete: () => { busy.current = false; setWaiting(true); } })
      .fromTo(el,
        { autoAlpha: 0, x: rx - (left + cw / 2), y: ry - (top + ch / 2), scale: 0.1, rotate: -10 },
        { autoAlpha: 1, x: 0, y: 0, scale: 1, rotate: 0, duration: 0.62, ease: 'back.out(1.25)' })
      .from(el.querySelectorAll('.tour__word'), { autoAlpha: 0, y: 4, duration: 0.25, ease: ease.enter, stagger: 0.035 }, 0.35)
      .from(el.querySelector('.tour__hint'), { autoAlpha: 0, duration: 0.3, ease: ease.enter }, '+=0.3');
  }

  function next() {
    if (busy.current || current.current < 0) return;
    busy.current = true;
    setWaiting(false);
    buzz(8);
    const i = current.current;
    const a = actors[i];
    const el = cards.current[i]!;
    const [rx, ry] = rollPoint(i);
    const r = el.getBoundingClientRect();
    const last = i === CARDS.length - 1;
    const step = (dayEnd - dayStart) / CARDS.length;
    gsap.timeline({ onComplete: () => (last ? finish() : visit(i + 1)) })
      // the card rolls back up into its paws
      .to(el, { x: rx - (r.left + r.width / 2), y: ry - (r.top + r.height / 2), scale: 0.1, rotate: 8, autoAlpha: 0, duration: 0.38, ease: 'power2.in' }, 0)
      .to(a, { offer: 0, head: 6, duration: 0.35, ease: 'sine.inOut' }, 0.25)
      // a happy hop, then it ducks out of sight
      .to(a, { hop: 1, duration: 0.2, ease: 'power2.out' }, 0.5)
      .to(a, { hop: 0, duration: 0.24, ease: 'power2.in' }, 0.7)
      .to(a, { squash: 0.12, duration: 0.08, ease: 'power2.out' }, 0.94)
      .to(a, { squash: -0.1, rise: 1, duration: 0.36, ease: 'power2.in' }, 1.02)
      .call(() => playPop(0.8 + i * 0.05), [], 1.05)
      .set(a, { squash: 0, head: 0 }, 1.4)
      .call(() => { current.current = -1; }, [], 1.3)
      // the sun moves on a little
      .to(shared, { day: dayStart + step * (i + 1), duration: last ? 3 : 2.6, ease: 'sine.inOut' }, 1.0);
  }

  function finish() {
    const tl = gsap.timeline({ onComplete: () => { shared.mix = 0; onDone(); } });
    const b = shared.base;
    tl.to(shared, { cx: b.cx, cy: b.cy, z: b.z, duration: 2.6, ease: 'sine.inOut' }, 0)
      .to(shared, { dof: 0, duration: 1.6, ease: 'sine.inOut' }, 0);
  }

  const words = (text: string) => text.split(' ').map((w, k) => <span key={k} className="tour__word">{w} </span>);

  return (
    <div className="layer tour" hidden={!active}>
      <svg className="layer tour__animals" aria-hidden="true">
        <defs>
          <GrainPattern id="grain-tour" />
          {/* everything below the feet is hidden: they pop up from behind the ground */}
          <clipPath id="tour-ground" clipPathUnits="userSpaceOnUse">
            <rect x="-300" y="-400" width="800" height="596" />
          </clipPath>
        </defs>
        {CARDS.map((c, i) => (
          <g key={i} ref={(el) => { outer.current[i] = el; }} style={{ visibility: 'hidden' }}>
            <ellipse ref={(el) => { shadow.current[i] = el; }} cx="100" cy="193" rx="58" ry="9" fill="#1d140b" opacity="0" />
            <g clipPath="url(#tour-ground)">
              <g ref={(el) => { riser.current[i] = el; }}>
                <g ref={(el) => { rigRoot.current[i] = el; }}>
                  <AnimalArt kind={c.animal} grain="grain-tour" />
                </g>
              </g>
            </g>
            <g ref={(el) => { sparkles.current[i] = el; }} transform={`translate(${CARD_ROLL[0]} 120)`}>
              {Array.from({ length: 7 }, (_, k) => (
                <path key={k} d="M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4Z"
                  fill={k % 2 ? '#fff6c8' : '#ffd86b'} stroke="#c9952a" strokeWidth="0.8" opacity="0" />
              ))}
            </g>
          </g>
        ))}
      </svg>

      {CARDS.map((c, i) => (
        <div key={i} ref={(el) => { cards.current[i] = el; }} className="tour__card" role="note">
          <p className="tour__from">{c.from}</p>
          <p className="tour__message">{words(c.message)}</p>
          <p className="tour__hint">{copy.tapHint} ›</p>
        </div>
      ))}

      {waiting && (
        <button type="button" className="layer tour__tap" aria-label={copy.tapHint} autoFocus
          onPointerDown={next} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') next(); }} />
      )}
    </div>
  );
}
