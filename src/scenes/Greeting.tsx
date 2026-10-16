// ─────────────────────────────────────────────────────────────
//  Page 2a: the little bird on the branch
//
//  Once the valley has opened (before any scrolling):
//  • a leafy branch sways into the foreground from the left, with
//    a brass bell tied to it by a red ribbon;
//  • a bluebird flies in, flaps to a stop and lands on it;
//  • the camera pushes in close: the bird and branch grow, and the
//    valley behind melts into soft focus (like a lens at close range);
//  • the bird says hello in a speech bubble and the bell glows;
//  • she taps the bell: it rings, the bird hops and sings, the
//    camera pulls back, the focus returns, and the bird flies off
//    as the branch drifts away;
//  • six little flower fairies fly in carrying bunting:
//    HAPPY BIRTHDAY, and her name underneath;
//  • she taps to go on: the fairies carry the bunting up and away.
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import { content } from '../content';
import { gsap, useGSAP, ease } from '../lib/motion';
import { buzz, prefersReducedMotion } from '../lib/device';
import { playBell, playChirp } from '../lib/audio';
import { Banner, type BannerBird } from '../lib/bunting';
import { BirdArt, BirdRig, GrainPattern, birdColors, blinker, FEATHERS, FEET_POINT } from '../components/CuteBird';
import { FairyArt, FairyRig, FAIRIES } from '../components/Fairy';
import { BRANCH, BIRD_SPOT, BELL, LEAVES, leafPath, ZOOM_ON } from './greetingBranch';
import './greeting.css';

const copy = content.greeting;
const NAME = content.name.toUpperCase();
const WORDS = {
  wide: [`${copy.banner.toUpperCase()}`, NAME],
  tall: [...copy.banner.toUpperCase().split(' '), NAME],
};
const PERCHED_SCALE = 0.48; // the bird is 96 branch-units tall

/** Values the valley reads: how out of focus it is, and how far the bunting has flown away. */
export interface GreetShared {
  focus: number;
  away: number;
}

interface Props {
  active: boolean;   // the valley has opened and page 1 is gone
  shared: GreetShared;
  onDone: () => void; // she has seen the bunting and tapped to go on
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
type P = [number, number];
const bez = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

export function Greeting({ active, shared, onDone }: Props) {
  const perch = useRef<HTMLDivElement>(null);
  const branchG = useRef<SVGGElement>(null);
  const birdG = useRef<SVGGElement>(null);
  const bellG = useRef<SVGGElement>(null);
  const leafRefs = useRef<(SVGGElement | null)[]>([]);
  const bubble = useRef<HTMLDivElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const flockCanvas = useRef<HTMLCanvasElement>(null);
  const flockRefs = useRef<(SVGGElement | null)[]>([]);
  const ready = useRef(false);
  const [bellReady, setBellReady] = useState(false);
  const [gone, setGone] = useState(false);
  const [hint, setHint] = useState(false); // "tap to continue" under the bunting

  // GSAP animates these; the frame loop draws from them.
  const S = useRef({
    branch: 0, fly: 0, leave: 0, zoom: 0, hop: 0, squash: 0, look: 0, flutter: 0,
    row0: 0, row1: 0, row2: 0, banner: false, kickAt: -10,
  }).current;
  const L = useRef({ W: 1, H: 1, u: 1, top: 0, Z: 2, focusY: 0.62 }).current;
  const blueColors = useMemo(() => birdColors(FEATHERS.blue), []);

  // ── Frame loop ───────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const rig = new BirdRig(birdG.current!);
    const blink = blinker(0.2);
    let banner: Banner | null = null;
    let bannerHidden = false;
    let cancelled = false;

    const layout = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const wide = W / H > 1.05;
      const cw = wide ? Math.min(W * 0.56, 720) : W * 1.04;
      L.W = W;
      L.H = H;
      L.u = cw / 400;
      L.top = H * (wide ? 0.64 : 0.62) - BIRD_SPOT[1] * L.u;
      L.Z = clamp((H * 0.3) / (96 * L.u), 1.25, wide ? 1.8 : 2.4);
      if (prefersReducedMotion()) L.Z = 1 + (L.Z - 1) * 0.5;
      L.focusY = wide ? 0.62 : 0.6;
      const p = perch.current!;
      p.style.width = `${cw}px`;
      p.style.top = `${L.top}px`;
      banner?.resize(W, H, Math.max(14, H * 0.04));
    };
    layout();
    window.addEventListener('resize', layout);

    // the bunting needs its lettering font before the flags are painted
    void document.fonts.load('400 50px "Patrick Hand"').finally(() => {
      if (cancelled) return;
      const birds: BannerBird[] = flockRefs.current.map((g) => ({ g: g!, rig: new FairyRig(g!) }));
      banner = new Banner(flockCanvas.current!, birds, WORDS);
      layout();
    });

    // screen ↔ branch units (while the camera is pulled back)
    const toUnits = (sx: number, sy: number): P => [sx / L.u, (sy - L.top) / L.u];
    let last = 0, px = BIRD_SPOT[0], tilt = 0, flap = 0, lastPerch = '';

    const tick = (time: number, deltaMs: number) => {
      const dt = Math.min(0.05, deltaMs / 1000);
      const { W, H, u } = L;

      // the camera: push in on the bird (zoom 0 → 1)
      if (perch.current) {
        const e = S.zoom;
        const s = Math.pow(L.Z, e);
        const p0: P = [ZOOM_ON[0] * u, L.top + ZOOM_ON[1] * u];
        const p1: P = [W * 0.5, H * L.focusY];
        const tx = mix(p0[0], p1[0], e) - s * ZOOM_ON[0] * u;
        const ty = mix(p0[1], p1[1], e) - L.top - s * ZOOM_ON[1] * u;
        const tf = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`;
        if (tf !== lastPerch) { perch.current!.style.transform = tf; lastPerch = tf; }
      }

      // the branch: slides in from the left, then sways a little
      const b = S.branch;
      branchG.current?.setAttribute('transform',
        `translate(${(-(1 - b) * 360).toFixed(1)} ${((1 - b) * 30).toFixed(1)}) rotate(${(-(1 - b) * 9 + Math.sin(time * 0.7) * 0.5).toFixed(2)} -30 224)`);
      LEAVES.forEach((l, i) => {
        const el = leafRefs.current[i];
        if (el) el.setAttribute('transform', `translate(${l[0]} ${l[1]}) rotate(${(l[2] + Math.sin(time * 2.1 + i * 1.7) * 3 + Math.sin(time * 0.9 + i) * 2).toFixed(1)})`);
      });

      // the bell: a gentle sway, a big swing when rung
      const k = time - S.kickAt;
      const ring = k >= 0 && k < 4 ? 28 * Math.exp(-k / 0.8) * Math.sin(k * 13) : 0;
      bellG.current?.setAttribute('transform', `rotate(${(Math.sin(time * 1.7) * 3.5 + ring).toFixed(2)} ${BELL[0]} ${BELL[1]})`);

      // the bird: flying in, perched, or flying away
      let pos: P;
      let flying = false;
      if (S.leave > 0) {
        const end = toUnits(W + 140, -160);
        pos = bez(BIRD_SPOT, [BIRD_SPOT[0] + 30, BIRD_SPOT[1] - 90], [end[0] - 120, end[1] + 80], end, S.leave);
        flying = true;
      } else if (S.fly < 1) {
        const start = toUnits(W + 70, H * 0.14);
        pos = bez(start, [start[0] - 120, start[1] + 50], [BIRD_SPOT[0] + 110, BIRD_SPOT[1] - 80], BIRD_SPOT, S.fly);
        flying = S.fly > 0;
      } else {
        pos = [BIRD_SPOT[0], BIRD_SPOT[1] - S.hop * 18];
      }
      const vx = dt > 0 ? (pos[0] - px) / dt : 0;
      px = pos[0];
      const lean = flying ? clamp(vx * 0.06, -22, 22) : S.look;
      tilt += (lean - tilt) * Math.min(1, dt * 7);
      // wings: beating in flight, flared to brake, folded when perched
      const fold = S.leave > 0 ? clamp(1 - S.leave * 6) : clamp((S.fly - 0.86) / 0.14);
      const beating = (flying ? 1 - fold : 0) + S.flutter;
      flap += dt * (20 + 6 * (1 - fold));
      const beat = -30 + 46 * Math.sin(flap);
      const brake = S.fly > 0.75 && S.fly < 1 && !S.leave ? Math.sin(((S.fly - 0.75) / 0.25) * Math.PI) * -50 : 0;
      const wing = mix(0, beat, clamp(beating)) + brake * (1 - fold);
      const breathe = Math.sin(time * 3.1) * 0.012;
      rig.pose({ wingR: wing, wingL: mix(30, beat, clamp(beating)) + brake * (1 - fold), tilt, squash: S.squash + breathe, blink: blink(time) });
      const sc = PERCHED_SCALE;
      birdG.current?.setAttribute('transform', `translate(${(pos[0] - FEET_POINT[0] * sc).toFixed(2)} ${(pos[1] - FEET_POINT[1] * sc).toFixed(2)}) scale(${sc})`);

      // vignette follows the focus pull
      if (vignette.current) vignette.current.style.opacity = (shared.focus * 0.9).toFixed(3);

      // the bunting
      if (banner && S.banner) {
        if (shared.away < 1) {
          banner.update(time, last ? dt : 1 / 60, [S.row0, S.row1, S.row2], shared.away);
          bannerHidden = false;
        } else if (!bannerHidden) {
          banner.hideAll();
          bannerHidden = true;
        }
      }
      last = time;
    };
    gsap.ticker.add(tick);
    return () => {
      cancelled = true;
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', layout);
    };
  }, [active, S, L, shared]);

  // ── The arrival: branch, bird, close-up, hello ───────────────
  useGSAP(() => {
    if (!active) return;
    const reduced = prefersReducedMotion();
    const tl = gsap.timeline();
    tl.set(perch.current, { autoAlpha: 1 })
      .to(S, { branch: 1, duration: 1.7, ease: 'power3.out' }, 0.2)
      .to(S, { fly: 1, duration: 2.2, ease: 'power1.out' }, 1.1)
      .call(() => playChirp(1.05, 3), [], 1.8)
      // touchdown: a little squash and settle
      .to(S, { squash: 0.12, duration: 0.09, ease: 'power2.out' }, 3.3)
      .to(S, { squash: 0, duration: 0.45, ease: 'back.out(3)' }, 3.39)
      // the close-up: push in, the valley goes soft
      .to(S, { zoom: 1, duration: reduced ? 0.8 : 1.9, ease: 'power2.inOut' }, 3.9)
      .to(shared, { focus: 1, duration: reduced ? 0.8 : 1.9, ease: 'power2.inOut' }, 3.9)
      .call(sayHello, [], reduced ? 4.8 : 5.8);
  }, { dependencies: [active] });

  function sayHello() {
    const el = bubble.current!;
    const bird = birdG.current!.getBoundingClientRect();
    const W = window.innerWidth;
    const bw = el.offsetWidth, bh = el.offsetHeight;
    const cx = bird.left + bird.width * 0.5;
    const left = clamp(cx - bw / 2, 16, W - bw - 16);
    const top = Math.max(12, bird.top - bh - 18);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.setProperty('--tail-x', `${clamp(cx - left, 28, bw - 28)}px`);
    playChirp(1.2, 2);
    gsap.timeline({ onComplete: () => { ready.current = true; setBellReady(true); } })
      .fromTo(el, { autoAlpha: 0, scale: 0.85, y: 12, transformOrigin: `${cx - left}px 110%` },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.42, ease: 'back.out(1.7)' })
      .from(el.querySelectorAll('.greet__word'), { autoAlpha: 0, y: 5, duration: 0.24, ease: ease.enter, stagger: 0.075 }, 0.15)
      .to(S, { look: 7, duration: 0.6, ease: 'sine.inOut' }, 0.6);
  }

  // ── She rings the bell ───────────────────────────────────────
  function ringBell() {
    if (!ready.current) return;
    ready.current = false;
    setBellReady(false);
    S.kickAt = gsap.ticker.time;
    playBell();
    buzz(25);
    const reduced = prefersReducedMotion();
    gsap.timeline()
      // the bird hops and sings
      .to(S, { hop: 1, duration: 0.18, ease: 'power2.out' }, 0.08)
      .to(S, { hop: 0, duration: 0.3, ease: 'power2.in' }, 0.26)
      .to(S, { flutter: 1, duration: 0.1, yoyo: true, repeat: 1 }, 0.1)
      .call(() => playChirp(1.15, 4), [], 0.3)
      .to(bubble.current, { autoAlpha: 0, scale: 0.92, duration: 0.22, ease: ease.exit }, 0.35)
      .to(S, { look: 0, duration: 0.4, ease: 'sine.inOut' }, 0.4)
      // the camera pulls back, the valley comes into focus
      .to(S, { zoom: 0, duration: reduced ? 0.7 : 1.6, ease: 'power2.inOut' }, 0.7)
      .to(shared, { focus: 0, duration: reduced ? 0.7 : 1.6, ease: 'power2.inOut' }, 0.7)
      // off it goes, and the branch drifts out of frame
      .to(S, { leave: 1, duration: 1.5, ease: 'power1.in' }, 2.1)
      .to(S, { branch: 0, duration: 1.3, ease: 'power2.in' }, 2.4)
      .call(() => setGone(true), [], 3.8)
      // the flock arrives with the bunting, one line after another
      .set(S, { banner: true }, 2.2)
      .to(S, { row0: 1, duration: 2.6, ease: 'power3.out' }, 2.3)
      .to(S, { row1: 1, duration: 2.6, ease: 'power3.out' }, 2.85)
      .to(S, { row2: 1, duration: 2.6, ease: 'power3.out' }, 3.4)
      .call(() => playChirp(1.0, 3), [], 3.6)
      .call(() => playChirp(1.25, 2), [], 4.3)
      .call(() => playChirp(0.92, 3), [], 5.0)
      // once the bunting has settled, invite her to go on
      .call(() => setHint(true), [], 7.2);
  }

  // ── She taps to go on: the fairies fly off with the bunting ──
  function goOn() {
    if (!hint) return;
    setHint(false);
    buzz(12);
    gsap.timeline()
      .to(shared, { away: 1, duration: 2.6, ease: 'power1.in' }, 0)
      .call(onDone, [], 1.1);
  }

  const words = (line: string) =>
    line.split(' ').map((w, i) => (
      <span key={i} className={`greet__word${/^bell\b/i.test(w) ? ' greet__word--bell' : ''}`}>{w} </span>
    ));

  return (
    <div className="layer greet" aria-live="polite">
      <div ref={vignette} className="layer greet__vignette" />

      {/* the bunting and the fairies carrying it */}
      <canvas ref={flockCanvas} className="layer greet__bunting" />
      <svg className="layer greet__flock" aria-hidden="true">
        <defs><GrainPattern id="grain-flock" /></defs>
        {FAIRIES.map((look, i) => (
          <g key={i} ref={(el) => { flockRefs.current[i] = el; }} style={{ visibility: 'hidden' }}>
            <FairyArt look={look} grain="grain-flock" />
          </g>
        ))}
      </svg>
      {hint && (
        <button type="button" className="layer greet__tap" onPointerDown={goOn} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goOn(); }} autoFocus>
          <span className="greet__hint">{copy.continueHint}</span>
        </button>
      )}
      <h2 className="greet__sr">{copy.banner}, {content.name}</h2>

      {/* the branch, the bell and the bird (all scale together for the close-up) */}
      <div ref={perch} className="greet__perch" hidden={gone}>
        <svg viewBox="0 0 400 250" className="greet__perch-svg">
          <defs>
            <GrainPattern id="grain-perch" />
            <linearGradient id="leaf-lit" x1="0" y1="0" x2="1" y2="0.3">
              <stop offset="0" stopColor="#6f8f3a" />
              <stop offset="0.6" stopColor="#9fbd55" />
              <stop offset="1" stopColor="#c9d77a" />
            </linearGradient>
            <linearGradient id="leaf-shade" x1="0" y1="0" x2="1" y2="0.3">
              <stop offset="0" stopColor="#2c4520" />
              <stop offset="1" stopColor="#5f7f37" />
            </linearGradient>
            <linearGradient id="bell-gold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7a5a0e" />
              <stop offset="0.3" stopColor="#e9c25a" />
              <stop offset="0.42" stopColor="#fff2c0" />
              <stop offset="0.7" stopColor="#d4a017" />
              <stop offset="1" stopColor="#6d4f0c" />
            </linearGradient>
          </defs>
          <g ref={branchG}>
            {/* the limb: dark bark, a lit upper side, a warm sunlit edge, bark lines, grain */}
            <path d={BRANCH.shadow} fill="#24170e" opacity="0.55" />
            <path d={BRANCH.limb} fill="#4d3421" />
            <path d={BRANCH.light} fill="#7d5b3b" opacity="0.9" />
            <path d={BRANCH.rim} fill="#d2a46c" opacity="0.75" />
            <path d={BRANCH.twigs} fill="#5a3e27" />
            <path d={BRANCH.lines} fill="none" stroke="#24170e" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
            <path d={BRANCH.limb} fill="url(#grain-perch)" />
            <path d={BRANCH.twigs} fill="url(#grain-perch)" />
            <ellipse cx={BIRD_SPOT[0] + 2} cy={BIRD_SPOT[1] + 1.5} rx="21" ry="3.6" fill="#1d120a" opacity="0.4" />
            {LEAVES.map((l, i) => (
              <g key={i} ref={(el) => { leafRefs.current[i] = el; }}>
                <path d={leafPath(l[3])} fill={l[4] ? 'url(#leaf-lit)' : 'url(#leaf-shade)'} stroke="#26361a" strokeWidth="0.8" strokeOpacity="0.55" />
                <path d={leafPath(l[3])} fill="url(#grain-perch)" />
                <path d={`M0,0 L${(l[3] * 0.9).toFixed(1)},0`} stroke={l[4] ? '#5a7a2c' : '#22351a'} strokeWidth="0.8" opacity="0.8" />
              </g>
            ))}

            {/* the bell, tied on with a red ribbon */}
            <g ref={bellG}>
              <path d={`M${BELL[0]},${BELL[1]} C${BELL[0] - 3},${BELL[1] + 10} ${BELL[0] + 3},${BELL[1] + 18} ${BELL[0]},${BELL[1] + 27}`} fill="none" stroke="#a8231a" strokeWidth="2.6" strokeLinecap="round" />
              <g transform={`translate(${BELL[0]} ${BELL[1] + 27})`}>
                <circle className={`greet__bell-glow${bellReady ? ' is-ready' : ''}`} cx="0" cy="13" r="19" />
                <circle cx="0" cy="-1.5" r="2.6" fill="none" stroke="#7a5a0e" strokeWidth="1.6" />
                <path d="M0,0 C-7,0 -10,6 -10,13 C-10,18 -12,21 -15,23 L15,23 C12,21 10,18 10,13 C10,6 7,0 0,0Z" fill="url(#bell-gold)" stroke="#5e430b" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M0,0 C-7,0 -10,6 -10,13 C-10,18 -12,21 -15,23 L15,23 C12,21 10,18 10,13 C10,6 7,0 0,0Z" fill="url(#grain-perch)" />
                <ellipse cx="0" cy="23" rx="15" ry="3" fill="#b8860b" stroke="#5e430b" strokeWidth="1" />
                <circle cx="0" cy="27" r="3.2" fill="#7a5a0e" />
                <path d="M-4.5,5 C-6.5,9 -7,14 -8,19" fill="none" stroke="#fff7d0" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
              </g>
              {/* a bow where the ribbon is tied round the branch */}
              <path d={`M${BELL[0]},${BELL[1]} c-9,-7 -13,3 -6,5 z M${BELL[0]},${BELL[1]} c9,-7 13,3 6,5 z`} fill="#c0392b" stroke="#7d1a12" strokeWidth="0.8" />
              <circle
                className="greet__bell-hit"
                cx={BELL[0]} cy={BELL[1] + 40} r="30"
                role="button"
                tabIndex={bellReady ? 0 : -1}
                aria-label={copy.bellLabel}
                onPointerDown={ringBell}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') ringBell(); }}
              />
            </g>
          </g>

          <g ref={birdG}>
            <BirdArt colors={blueColors} grain="grain-perch" />
          </g>
        </svg>
      </div>

      <div ref={bubble} className="greet__bubble">
        {copy.lines.map((line, i) => (
          <p key={i} className={i === 0 ? 'greet__hi' : undefined}>{words(line)}</p>
        ))}
      </div>
    </div>
  );
}
