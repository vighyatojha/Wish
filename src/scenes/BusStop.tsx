// ─────────────────────────────────────────────────────────────
//  Page 2: the bus stop
//
//   1. Through the fog: a quiet country bus stop in the rain.
//   2. The rain stops; the sky clears to a bright summer day and a
//      tulip opens in the grass.
//   3. A swarm of butterflies sweeps across the screen; one of them
//      lands on the tulip. Close-up: "How was the surprise?…"
//   4. She plucks the tulip: it flies at the screen, bursts into
//      petals, and the garden comes back with butterflies about the
//      stop and white and black birds in the sky (tap one…).
//   5. The bus arrives (the film, with its sound), the brakes sigh,
//      and the door folds open with a hiss of air.
//   6. One by one, five animals step off the bus in stop-motion and
//      walk up to her with a scroll. It flies up and unrolls; she taps
//      it closed; the animal dissolves into golden dust. The day
//      turns to night as they go.
//   7. Fireflies. Then the animals come back to ask one question.
//
//  While building, ?scene=stop | pluck | bus | animals | question
//  jumps straight to a step (sound needs a tap first, so it's silent).
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react';
import { content } from '../content';
import { gsap, useGSAP, ease } from '../lib/motion';
import { buzz, prefersReducedMotion } from '../lib/device';
import {
  createRainSound, createWindSound, createCrickets, playWhoosh, playSnap, playAirRelease, playDoor, playStep,
  playShimmer, playChime, playPop, type LiveSound,
} from '../lib/audio';
import { saveResponse } from '../lib/firebase';
import { Fog } from '../lib/fog';
import { Rain } from '../lib/rain';
import { Stage, DOOR, MOON, MOON_R } from '../lib/stage';
import { Life } from '../lib/life';
import { Banner, type BannerBird } from '../lib/bunting';
import { dissolveNoise } from '../lib/dissolve';
import { coverLayout, toScreen, toPicture, type CoverLayout, type Vec2 } from '../lib/camera';
import { GrainPattern, blinker } from '../components/CuteBird';
import { ButterflyArt, ButterflyRig, TulipArt, TulipRig, TULIP_TOP, TULIP_HEAD } from '../components/Garden';
import { AnimalArt, AnimalRig, ANIMAL_FEET } from '../components/Animals';
import { Note, type NoteHandle } from '../components/Note';
import { FairyArt, FairyRig, FAIRIES } from '../components/Fairy';
import { loadedPictures, loadedFilm, loadedBirdsong, onProgress, progress, type Pictures } from '../lib/preload';
import './busstop.css';

const PIC_W = 1611, PIC_H = 906;
const ASPECT_INV = PIC_H / PIC_W;
// The part of the picture a narrow phone keeps in view: the shelter, the bus door, the lamp.
const FOCUS: Vec2 = [0.525, 0.5];
// The tulip grows in the grass in front; 420 drawing units tall.
const TULIP_BASE: Vec2 = [0.455, 1.03];
const TULIP_H = 0.34;
// The butterfly's wingspan (176 drawing units), share of the picture height.
const BF_SPAN = 0.1;
// Animals step off at the door, then down onto the ground.
const DOOR_X = (DOOR.x0 + DOOR.x1) / 2;
const DOOR_FEET: Vec2 = [DOOR_X, DOOR.y1 - 0.006];
const STEP_DOWN: Vec2 = [DOOR_X + 0.012, 0.736];
const EXIT_SIZE = 0.085;   // an animal's height in the doorway, share of the picture height
const STOP_FPS = 8;        // stop-motion frame rate
// how dark it gets after each animal: golden hour, sunset, blue hour, dusk, night
// Day-to-night is a scene clock, not a reward timer: note reading and animal pacing never control it.
const DAY_NIGHT_SECONDS = 180;

const CARDS = content.animals;
const NAME = content.name.toUpperCase();
const BUNTING = { wide: [content.banner.text.toUpperCase(), NAME], tall: [...content.banner.text.toUpperCase().split(' '), NAME] };
const DISSOLVE = 4.2; // seconds for an animal to turn to dust
const NOISE = dissolveNoise();
// The dissolve mask covers the animal drawing's box (local units).
const MASK_BOX = { x: -60, y: -60, w: 320, h: 270 };

// How the characters are lit at each time of day (to sit in the painting):
// a colour they're multiplied by, how saturated they stay, and their rim light.
const LIGHTS = [
  { tint: [1.0, 1.0, 0.97], sat: 0.96, rim: [255, 241, 201] },  // day
  { tint: [1.08, 0.95, 0.78], sat: 0.98, rim: [255, 206, 140] }, // golden hour
  { tint: [0.96, 0.74, 0.66], sat: 0.88, rim: [255, 170, 120] }, // sunset
  { tint: [0.56, 0.6, 0.84], sat: 0.72, rim: [180, 196, 255] },  // blue hour
  { tint: [0.5, 0.56, 0.8], sat: 0.6, rim: [205, 222, 255] },    // moonlit night
];
function sceneLight(night: number, rain: number) {
  const i = Math.min(3, Math.floor(night)), f = Math.min(1, night - i);
  const A = LIGHTS[i], B = LIGHTS[Math.min(4, i + 1)];
  const lerp = (a: number, b: number) => a + (b - a) * f;
  const dim = 1 - rain * 0.22;
  const tint = A.tint.map((v, k) => lerp(v, B.tint[k]) * dim);
  const sat = lerp(A.sat, B.sat) * (1 - rain * 0.4);
  const rim = A.rim.map((v, k) => Math.round(lerp(v, B.rim[k])));
  // saturation matrix, then each row tinted
  const lr = 0.2126, lg = 0.7152, lb = 0.0722;
  const m = [
    [lr + (1 - lr) * sat, lg - lg * sat, lb - lb * sat],
    [lr - lr * sat, lg + (1 - lg) * sat, lb - lb * sat],
    [lr - lr * sat, lg - lg * sat, lb + (1 - lb) * sat],
  ].map((row, r) => row.map((v) => v * tint[r]));
  const values = `${m[0].join(' ')} 0 0 ${m[1].join(' ')} 0 0 ${m[2].join(' ')} 0 0 0 0 0 1 0`;
  return { values, rim: `rgb(${rim.join(',')})`, shadow: 0.42 - Math.min(1, night / 4) * 0.2 };
}
const skip = new URLSearchParams(location.search).get('scene');
const showDebug = new URLSearchParams(location.search).has('debug');

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const bez = (p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};
/** a point on the tulip drawing → picture coordinates (with the flower's sway) */
function tulipPoint(lx: number, ly: number, swayDeg: number): Vec2 {
  const a = (swayDeg * Math.PI) / 180;
  const dx = lx - 102, dy = ly - 420;
  const x = 102 + dx * Math.cos(a) - dy * Math.sin(a);
  const y = 420 + dx * Math.sin(a) + dy * Math.cos(a);
  const k = TULIP_H / 420;
  return [TULIP_BASE[0] + (x - 100) * k * ASPECT_INV, TULIP_BASE[1] - (420 - y) * k];
}

class Cancelled extends Error {}

type ActorMode = 'off' | 'door' | 'walk' | 'stand' | 'row';
interface Actor {
  mode: ActorMode;
  x: number; y: number; size: number;  // feet on screen (px), height (px)
  jx: number; jy: number;              // stop-motion jitter
  lean: number; squash: number; head: number;
  footL: number; footR: number;
  offer: number;
  clip: boolean;                       // only visible through the bus door
  dust: number;                        // golden-dust threshold, −1 off, −0.15 → 1.05
}

interface Props {
  flying: boolean;  // start the flight through the fog
  entered: boolean; // page 1 is gone; this scene is in charge
}

export function BusStop({ flying, entered }: Props) {
  const stageCanvas = useRef<HTMLCanvasElement>(null);
  const lifeCanvas = useRef<HTMLCanvasElement>(null);
  const rainCanvas = useRef<HTMLCanvasElement>(null);
  const fogCanvas = useRef<HTMLCanvasElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const tulipG = useRef<SVGGElement>(null);
  const bfG = useRef<SVGGElement>(null);
  const actorG = useRef<(SVGGElement | null)[]>([]);
  const actorRig = useRef<(SVGGElement | null)[]>([]);
  const dustFuncs = useRef<(SVGFEFuncRElement | null)[][]>(CARDS.map(() => []));
  const shadows = useRef<(SVGEllipseElement | null)[]>([]);
  const frontCanvas = useRef<HTMLCanvasElement>(null);
  const buntingCanvas = useRef<HTMLCanvasElement>(null);
  const fairyG = useRef<(SVGGElement | null)[]>([]);
  const lightMatrix = useRef<SVGFEColorMatrixElement>(null);
  const doorClip = useRef<SVGRectElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const pluckBtn = useRef<HTMLButtonElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const note = useRef<NoteHandle>(null);
  const noteReading = useRef(false);
  const lifeRef = useRef<Life | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const debug = useRef<HTMLPreElement>(null);
  const mapRef = useRef<{ map: (uv: Vec2) => Vec2; ppp: number; W: number; H: number }>({ map: (u) => u, ppp: 1, W: 1, H: 1 });
  const alive = useRef(true);
  const waiters = useRef<{ pluck?: () => void; note?: () => void; answer?: (a: string) => void; go?: () => void }>({});
  const bannerRef = useRef<Banner | null>(null);

  const [arrived, setArrived] = useState(false);
  const [pictureReady, setPictureReady] = useState(false);
  const [noStage, setNoStage] = useState(false);
  const [noFog, setNoFog] = useState(false);
  // a gentle loading card in the fog while page 2's pictures (or later the bus film) are still arriving
  const [loading, setLoading] = useState<null | 'scene' | 'bus'>(null);
  const [loaded, setLoaded] = useState({ pictures: 0, film: 0 });
  const pics = useRef<Pictures | null>(null);
  const [noteIndex, setNoteIndex] = useState(0);
  const [ui, setUi] = useState({ bubble: false, pluck: false, question: false, answer: '', bird: false, moon: false, go: false });

  // GSAP animates these; the frame loop draws from them.
  const S = useRef({
    px: 0, py: 0, z: 1, blur: 0, focus: 0, vignette: 0,                 // camera
    travel: 0, haze: 1, light: 0, fogGone: false,                      // fog
    rain: 1, rainFall: 0, wind: 0.8, cloud: 0.3, night: 0, door: 0,    // weather, time, bus
    weights: [1, 0, 0] as [number, number, number],
    tulip: 0, bloom: 0, lift: { x: 0, y: 0, rot: 0, scale: 1 },        // tulip
    bf: { mode: 'off' as 'off' | 'in' | 'perch' | 'away', t: 0, from: [0, 0] as Vec2, to: [0, 0] as Vec2, x: 0, y: 0, tilt: 0 },
    garden: 0, fore: 0, birds: 0, fireflies: 0, lamp: 0,
    banner: false, row0: 0, row1: 0, row2: 0, away: 0,                // the fairies' bunting
  }).current;
  const actors = useRef<Actor[]>(CARDS.map(() => ({
    mode: 'off', x: 0, y: 0, size: 0, jx: 0, jy: 0, lean: 0, squash: 0, head: 0, footL: 0, footR: 0, offer: 0, clip: false, dust: -1,
  }))).current;
  const sounds = useRef<{ rain?: LiveSound; wind?: LiveSound; crickets?: LiveSound; birdsong?: HTMLAudioElement }>({}).current;

  // ── Everything that draws, created once ─────────────────────
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    let raf = 0;
    let stage: Stage | null = null;
    let brokenReason = '';
    const fog = Fog.create(fogCanvas.current!);
    if (!fog) setNoFog(true);
    const life = new Life(lifeCanvas.current!, frontCanvas.current!);
    let banner: Banner | null = null;
    let bannerTop = 14;
    void document.fonts.load('400 50px "Patrick Hand"').finally(() => {
      if (cancelled) return;
      const carriers: BannerBird[] = fairyG.current.map((g) => ({ g: g!, rig: new FairyRig(g!) }));
      banner = new Banner(buntingCanvas.current!, carriers, BUNTING);
      banner.resize(W, H, bannerTop);
      bannerRef.current = banner;
    });
    let bannerHidden = false;
    lifeRef.current = life;
    if (skip) (window as unknown as { __life: Life }).__life = life; // for testing the shortcuts
    const rain = new Rain(rainCanvas.current!, undefined, prefersReducedMotion() ? 0.5 : 0.9);
    const tulip = new TulipRig(tulipG.current!);
    const bf = new ButterflyRig(bfG.current!);
    const rigs = actorRig.current.map((g) => new AnimalRig(g!));
    const blinks = CARDS.map((_, i) => blinker(i * 0.5));
    const twitch = CARDS.map((_, i) => blinker(i * 0.9 + 0.4));
    const bfBlink = blinker(0.3);

    let W = 1, H = 1;
    let base: CoverLayout = coverLayout(1, 1, PIC_W, PIC_H, FOCUS);
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      base = coverLayout(W, H, PIC_W, PIC_H, FOCUS);
      stage?.resize(W, H);
      fog?.resize();
      life.resize(W, H);
      bannerTop = Math.max(14, H * 0.04);
      banner?.resize(W, H, bannerTop);
      if (still.current) {
        const pos = (i: 0 | 1) => (base.span[i] >= 1 ? 50 : (base.offset[i] / (1 - base.span[i])) * 100);
        still.current.style.objectPosition = `${pos(0)}% ${pos(1)}%`;
        if (film.current) film.current.style.objectPosition = still.current.style.objectPosition;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // The scene is only revealed once its pictures have arrived and been drawn
    // (or, if animated drawing fails, the still picture is ready). Never black.
    let stillMode = false;      // drawing with the plain <img> instead of WebGL
    let stageShown = false;
    let announced = false;
    const announce = () => { if (!announced && !cancelled) { announced = true; setPictureReady(true); } };
    const useStill = (why: string) => {
      if (why) console.warn('[stage] using the still pictures:', why);
      brokenReason = why;
      stage = null;
      stageRef.current = null;
      stillMode = true;
      setNoStage(true);
      announce();
    };
    void loadedPictures().then(async (p) => {
      if (cancelled) return;
      pics.current = p;
      still.current!.src = p.empty;
      const s = await Stage.create(stageCanvas.current!, { ...p, width: PIC_W, height: PIC_H }, film.current!);
      if (cancelled) return s?.destroy();
      if (!s) return useStill('');
      stage = s;
      stageRef.current = s;
      stage.resize(W, H);
      // (for testing the fallback: ?stagefail)
      if (new URLSearchParams(location.search).has('stagefail')) s.broken = 'simulated for testing';
    });
    // the bus film and the birdsong arrive later (after the pictures)
    void loadedFilm().then((u) => {
      const v = film.current;
      if (cancelled || !v) return;
      v.src = u;
      v.load();
    });

    // if the device is struggling, draw at a lower resolution until it keeps up
    const QUALITY = [1.5, 1.1, 0.8, 0.6];
    let quality = 0, slowFrames = 0, slowTime = 0;
    const adapt = (rawDt: number) => {
      if (rawDt > 1 / 24) { slowFrames++; slowTime += rawDt; } else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 30 && slowTime > 1.5 && quality < QUALITY.length - 1) {
        quality++;
        slowFrames = 0;
        slowTime = 0;
        stage?.setMaxDpr(QUALITY[quality]);
        life.maxDpr = Math.min(1.75, QUALITY[quality]);
        life.resize(W, H);
      }
    };

    // ── ?debug: a small panel showing what the graphics are doing ──
    let debugTick = 0;
    const debugPanel = debug.current;
    const writeDebug = (fps: number) => {
      if (!debugPanel) return;
      const v = film.current!;
      const st = stage?.stats;
      debugPanel.textContent = [
        `renderer: ${st?.renderer ?? '—'}`,
        `background: ${stage ? (stage.ready ? 'animated (WebGL2)' : 'animated, checking first frame') : stillMode ? `still pictures${brokenReason ? ` — ${brokenReason}` : ''}` : `loading pictures ${Math.round(progress().pictures * 100)}%`}`,
        `self-check pixels: ${st?.probe ?? '—'}  black: ${st?.blackProbes ?? 0}  gl error: ${st?.glError ?? 0}`,
        `fps: ${fps.toFixed(0)}  quality: ${QUALITY[quality]}  size: ${W}×${H} @${window.devicePixelRatio}`,
        `story: night ${S.night.toFixed(2)} rain ${S.rain.toFixed(2)} haze ${S.haze.toFixed(2)} weights ${S.weights.map((x) => x.toFixed(2)).join('/')}`,
        `film: ready ${v.readyState} t ${v.currentTime.toFixed(1)} frame ${stage?.videoHasFrame ?? false}`,
      ].join('\n');
    };
    let fpsAcc = 0, fpsN = 0;

    let last = 0;
    const frame = (now: number) => {
      const rawDt = last ? (now - last) / 1000 : 0.016;
      const dt = Math.min(0.05, rawDt);
      last = now;
      const time = now / 1000;
      if (rawDt < 1) adapt(rawDt);
      if (debugPanel) { fpsAcc += rawDt; fpsN++; if (++debugTick % 20 === 0) { writeDebug(fpsN / Math.max(0.001, fpsAcc)); fpsAcc = 0; fpsN = 0; } }

      // ── camera ──
      const z = S.z;
      const c0: Vec2 = [base.offset[0] + base.span[0] / 2, base.offset[1] + base.span[1] / 2];
      const hx = base.span[0] / (2 * z), hy = base.span[1] / (2 * z);
      const cx = clamp(c0[0] + S.px, hx, 1 - hx), cy = clamp(c0[1] + S.py, hy, 1 - hy);
      const layout: CoverLayout = { span: base.span, offset: [cx - base.span[0] / 2, cy - base.span[1] / 2] };
      const center: Vec2 = [0.5, 0.5];
      const map = (uv: Vec2) => toScreen(uv, layout, z, center);
      const ppp = (H / base.span[1]) * z; // screen px per picture height
      mapRef.current = { map, ppp, W, H };

      // ── tulip ──
      const sway = Math.sin(time * 1.3) * 2.2 * S.wind + Math.sin(time * 2.9) * 0.6;
      let headScreen: Vec2 = [0, 0];
      if (S.tulip > 0.001) {
        const [bx, by] = map(TULIP_BASE);
        const sc = (TULIP_H / 420) * ppp;
        tulipG.current!.style.visibility = 'visible';
        tulipG.current!.style.opacity = S.tulip.toFixed(3);
        tulipG.current!.setAttribute('transform', `translate(${(bx * W - 100 * sc).toFixed(1)} ${(by * H - 420 * sc).toFixed(1)}) scale(${sc.toFixed(4)})`);
        tulip.pose(S.bloom, sway, S.lift);
        headScreen = map(tulipPoint(TULIP_HEAD[0], TULIP_HEAD[1], sway));
        const pb = pluckBtn.current;
        if (pb) { pb.style.left = `${headScreen[0] * W}px`; pb.style.top = `${headScreen[1] * H}px`; }
      } else tulipG.current!.style.visibility = 'hidden';

      // ── the butterfly ──
      const b = S.bf;
      if (b.mode !== 'off') {
        const perch = tulipPoint(TULIP_TOP[0], TULIP_TOP[1], sway);
        let p: Vec2, open: number;
        if (b.mode === 'perch') {
          p = perch;
          open = 0.6 + 0.4 * Math.sin(time * 1.5);
          b.tilt += (sway * 0.6 - b.tilt) * Math.min(1, dt * 4);
        } else {
          const to = b.mode === 'in' ? perch : b.to;
          const from = b.from;
          const c1: Vec2 = [from[0] - 0.12, from[1] + 0.14];
          const c2: Vec2 = b.mode === 'in' ? [to[0] + 0.12, to[1] - 0.16] : [to[0] + 0.05, to[1] + 0.1];
          p = bez(from, c1, c2, to, b.t);
          const vx = (p[0] - b.x) / Math.max(dt, 0.001);
          b.tilt += (clamp(vx * 120, -25, 25) - b.tilt) * Math.min(1, dt * 6);
          const landing = b.mode === 'in' ? clamp((b.t - 0.85) / 0.15) : 0;
          open = (0.12 + 0.88 * Math.abs(Math.cos(time * 15))) * (1 - landing) + 0.9 * landing;
        }
        b.x = p[0];
        b.y = p[1];
        const [sx, sy] = map(p);
        const s = (BF_SPAN / 176) * ppp;
        bfG.current!.style.visibility = 'visible';
        bfG.current!.setAttribute('transform', `translate(${(sx * W).toFixed(1)} ${(sy * H).toFixed(1)}) rotate(${b.tilt.toFixed(1)}) scale(${s.toFixed(4)}) translate(-100 -150)`);
        bf.pose(open, bfBlink(time));
      } else bfG.current!.style.visibility = 'hidden';

      // ── the bus door's opening, for animals stepping out ──
      if (doorClip.current) {
        const k = 1 - 0.82 * S.door;
        const [lx, ty] = map([DOOR.x0 + (DOOR.mid - DOOR.x0) * k, DOOR.y0]);
        const [rx, by] = map([DOOR.x1 - (DOOR.x1 - DOOR.mid) * k, DOOR.y1]);
        doorClip.current.setAttribute('x', (lx * W).toFixed(1));
        doorClip.current.setAttribute('y', (ty * H).toFixed(1));
        doorClip.current.setAttribute('width', Math.max(0, (rx - lx) * W).toFixed(1));
        doorClip.current.setAttribute('height', ((by - ty) * H + 2).toFixed(1));
        doorClip.current.nextElementSibling?.setAttribute('y', (by * H).toFixed(1));
      }

      // ── light the characters like the scene around them ──
      const light = sceneLight(S.night, S.rain);
      if (lightMatrix.current && lightMatrix.current.getAttribute('values') !== light.values) {
        lightMatrix.current.setAttribute('values', light.values);
        svg.current!.style.setProperty('--rim', light.rim);
      }

      // ── the animals ──
      actors.forEach((a, i) => {
        const g = actorG.current[i]!;
        if (a.mode === 'off') { g.style.visibility = 'hidden'; return; }
        g.style.visibility = 'visible';
        const sc = a.size / 200;
        g.setAttribute('transform', `translate(${(a.x + a.jx - ANIMAL_FEET[0] * sc).toFixed(1)} ${(a.y + a.jy - ANIMAL_FEET[1] * sc).toFixed(1)}) scale(${sc.toFixed(4)})`);
        const clipEl = g.lastElementChild as SVGGElement; // (the first child is the shadow)
        const clipNow = a.clip ? 'url(#door-opening)' : '';
        if ((clipEl.getAttribute('clip-path') ?? '') !== clipNow) {
          if (clipNow) clipEl.setAttribute('clip-path', clipNow); else clipEl.removeAttribute('clip-path');
        }
        const masked = a.dust > -0.99;
        const maskEl = clipEl.firstElementChild as SVGGElement;
        if (masked) {
          maskEl.setAttribute('mask', `url(#dust-${i})`);
          const k = 7, b = (-a.dust * k).toFixed(3);
          for (const fn of dustFuncs.current[i]) fn?.setAttribute('intercept', b);
        } else if (maskEl.hasAttribute('mask')) maskEl.removeAttribute('mask');
        const sh = shadows.current[i];
        if (sh) sh.setAttribute('opacity', (light.shadow * (masked ? clamp(1 - (a.dust + 0.15) / 1.2) : 1) * (a.mode === 'door' && a.clip ? 0 : 1)).toFixed(3));
        const idle = a.mode === 'stand' || a.mode === 'row';
        const tw = idle ? 1 - twitch[i](time) : 0;
        rigs[i].pose({
          squash: a.squash + (idle ? Math.sin(time * 2.6 + i) * 0.012 : 0),
          lean: a.lean + (idle ? Math.sin(time * 0.8 + i * 2) * 1.2 : 0),
          head: a.head + (idle ? Math.sin(time * 0.9 + i) * 3 : 0),
          earL: tw * 14,
          earR: idle ? Math.sin(time * 1.3 + i * 3) * 2 : 0,
          tail: idle ? Math.sin(time * 2.2 + i) * (CARDS[i].animal === 'hedgehog' ? 1.5 : 7) : 0,
          blink: idle ? blinks[i](time) : 1,
          offer: a.offer,
          footL: a.footL,
          footR: a.footR,
        });
      });

      // ── the background ──
      let focus: { x: number; y: number; sharp: number; soft: number } | undefined;
      if (S.focus > 0.001) focus = { x: headScreen[0], y: headScreen[1] - 0.03, sharp: 0.16, soft: 0.5 };
      if (stage && stage.broken) {
        stage.destroy();
        useStill(stage.broken);
      }
      if (stage) {
        stage.render({
          time, layout, zoom: z, zoomCenter: center, blur: S.blur, focus,
          weights: S.weights, rain: S.rain, night: S.night, door: S.door, wind: S.wind, cloud: S.cloud, lamp: S.lamp,
        });
        // shown only once a frame has been checked and is a real picture
        if (stage.ready && !stageShown) {
          stageShown = true;
          stageCanvas.current!.style.opacity = '1';
          announce();
        }
      } else if (stillMode && still.current && pics.current) {
        const s = still.current;
        s.style.visibility = 'visible';
        const fv = film.current!;
        fv.classList.add('is-shown');
        fv.style.opacity = S.weights[1].toFixed(3);
        const src = S.weights[2] > 0.5 ? pics.current.bus : pics.current.empty;
        if (s.src !== src) s.src = src;
        const tx = (0.5 + ((base.offset[0] - layout.offset[0]) / base.span[0] - 0.5) * z) * W;
        const ty = (0.5 + ((base.offset[1] - layout.offset[1]) / base.span[1] - 0.5) * z) * H;
        s.style.transformOrigin = '0 0';
        s.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${z.toFixed(4)})`;
        s.style.filter = `brightness(${(1 - S.rain * 0.3 - S.night * 0.17).toFixed(2)}) saturate(${(1 - S.rain * 0.4).toFixed(2)}) blur(${(S.blur * 2).toFixed(1)}px)`;
      }

      // ── life, rain, fog ──
      // Keep decorative 2D butterflies out of the reading layer; the background stays alive.
      life.amount.garden = noteReading.current ? 0 : S.garden;
      life.amount.fore = noteReading.current ? 0 : S.fore;
      life.amount.birds = S.birds;
      life.amount.fireflies = S.fireflies;
      life.frame(time, dt, map, ppp);
      if (banner && S.banner) {
        if (S.away < 1) { banner.update(time, dt, [S.row0, S.row1, S.row2], S.away); bannerHidden = false; }
        else if (!bannerHidden) { banner.hideAll(); bannerHidden = true; S.banner = false; }
      }
      rain.update(dt, S.rainFall, false);
      rain.draw(0);
      sounds.rain?.setLevel(S.rainFall * 0.75);
      if (S.fogGone && fogCanvas.current && fogCanvas.current.style.display !== 'none') fogCanvas.current.style.display = 'none';
      if (fog && !S.fogGone) {
        fog.render({ time, travel: S.travel, haze: S.haze, light: S.light, mist: 0, sun: [0.55, 0.16], focus: [0.5, 0.48] });
      }
      if (vignette.current) vignette.current.style.opacity = S.vignette.toFixed(3);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // tapping a bird (there is no hint that she can)
    const onSky = (e: PointerEvent) => {
      const { map, ppp, W: w, H: h } = mapRef.current;
      const [mx, my] = map(MOON);
      const onMoon = S.night > 3.2 && Math.hypot(mx * w - e.clientX, my * h - e.clientY) < Math.max(34, MOON_R * ppp * 1.3);
      const onBird = S.birds > 0.2 && life.hitBird(e.clientX, e.clientY);
      if (!onMoon && !onBird) return;
      e.stopPropagation();
      e.preventDefault();
      buzz(10);
      setUi((u) => ({ ...u, bird: onBird && !onMoon, moon: onMoon }));
    };
    window.addEventListener('pointerdown', onSky, true);

    return () => {
      cancelled = true;
      alive.current = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onSky, true);
      stage?.destroy();
      fog?.destroy();
      rain.destroy();
      sounds.rain?.stop(0.5);
      sounds.wind?.stop(0.5);
      sounds.crickets?.stop(0.5);
      sounds.birdsong?.pause();
      film.current?.pause();
    };
  }, [S, actors, sounds]);

  // how far along the downloads are (for the loading card)
  useEffect(() => (loading ? onProgress(setLoaded) : undefined), [loading]);

  // ── The flight through the fog, in the rain ─────────────────
  useGSAP(() => {
    if (!flying || skip === 'pluck' || skip === 'bus' || skip === 'animals' || skip === 'question') return;
    sounds.wind ??= createWindSound();
    sounds.rain ??= createRainSound();
    gsap.to(S, { rainFall: 0.85, duration: 3, ease: 'sine.out' });
    if (!pictureReady) {
      // the pictures are still on their way: the fog glows and drifts gently,
      // and (if it takes more than a moment) a loading card appears in it
      gsap.to(S, { light: 0.5, duration: 3, ease: ease.scenery });
      gsap.to(S, { travel: 1.2, duration: 40, ease: 'sine.out' });
      const id = window.setTimeout(() => setLoading('scene'), 700);
      return () => clearTimeout(id);
    }
    setLoading(null);
    // the flight through the fog: about 7 seconds (4.5 on a phone)
    const k = window.innerWidth / window.innerHeight < 1 ? 0.64 : 1;
    const tl = gsap.timeline({ onComplete: () => { sounds.wind?.stop(1.2); sounds.wind = undefined; setArrived(true); } });
    tl.to(S, { light: 1, duration: 3 * k, ease: ease.scenery, overwrite: 'auto' }, 0)
      .to(S, { travel: 8.2, duration: 6.8 * k, ease: 'sine.inOut', overwrite: 'auto' }, 0)
      .to(S, { haze: 0, duration: 4 * k, ease: ease.scenery }, 2.6 * k)
      .set(S, { fogGone: true }, 7 * k);
    const windLoop = () => sounds.wind?.setLevel(0.18 * S.haze + 0.5 * clamp(1 - Math.abs(S.travel - 4) / 4));
    gsap.ticker.add(windLoop);
    if (prefersReducedMotion()) tl.timeScale(2);
    return () => gsap.ticker.remove(windLoop);
  }, { dependencies: [flying, pictureReady] });

  // ── The story, step by step ─────────────────────────────────
  const started = useRef(false);
  useEffect(() => {
    const jump = skip === 'pluck' || skip === 'bus' || skip === 'animals' || skip === 'question';
    if (started.current || !pictureReady || !(jump || (arrived && entered))) return;
    started.current = true;
    story().catch((e) => { if (!(e instanceof Cancelled)) console.error(e); });
  }, [arrived, entered, pictureReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // small helpers that stop when the scene goes away
  const live = <T,>(v: T): T => { if (!alive.current) throw new Cancelled(); return v; };
  const wait = (s: number) => new Promise<void>((r) => gsap.delayedCall(s, r)).then(live);
  const play = (t: gsap.core.Tween | gsap.core.Timeline) => new Promise<void>((r) => { t.eventCallback('onComplete', () => r()); }).then(live);
  const tapPluck = () => new Promise<void>((r) => { waiters.current.pluck = r; }).then(live);
  const tapNote = () => new Promise<void>((r) => { waiters.current.note = r; }).then(live);
  const chosen = () => new Promise<string>((r) => { waiters.current.answer = r; }).then(live);

  async function story() {
    const reduced = prefersReducedMotion();
    if (skip === 'pluck' || skip === 'bus' || skip === 'animals' || skip === 'question') {
      Object.assign(S, { haze: 0, travel: 8.2, light: 1, fogGone: true, rain: 0, rainFall: 0, wind: 0.35, cloud: 1, tulip: 1, bloom: 1 });
    }
    if (skip === 'bus' || skip === 'animals' || skip === 'question') Object.assign(S, { tulip: 0, garden: 1, fore: 1, birds: 1 });
    if (skip === 'animals' || skip === 'question') { S.weights = [0, 0, 1]; S.door = 1; }

    if (!skip || skip === 'stop' || skip === 'pluck') {
      if (!skip || skip === 'stop') {
        // ── the rain stops; the day clears ──
        await wait(1.5);
        gsap.to(S, { tulip: 1, duration: 1.2, ease: ease.enter });
        gsap.to(S, { rainFall: 0, duration: 4.5, ease: 'sine.inOut' });
        gsap.to(S, { wind: 0.35, cloud: 1, duration: 6, ease: 'sine.inOut' });
        gsap.delayedCall(2.5, startBirdsong);
        await play(gsap.to(S, { rain: 0, duration: 6, ease: 'sine.inOut' }));
        sounds.rain?.stop(1);
        // ── the tulip opens, the butterflies come ──
        gsap.to(S, { bloom: 1, duration: 2.6, ease: 'sine.out' });
        await wait(0.6);
        playWhoosh(2.4, 260, 1700, 0.28);
        const swarm = lifeRef.current!.swarm(reduced ? 24 : 64);
        await wait(1.6);
        await Promise.all([swarm, flyButterflyIn()]).then(live);
      } else {
        Object.assign(S.bf, { mode: 'perch' });
      }
      // ── close-up on the butterfly ──
      await closeUp(true);
      showBubble();
      await tapPluck();
      await pluck();
      // ── the garden, and the fairies with the bunting ──
      gsap.to(S, { garden: 1, fore: 1, birds: 1, duration: 2, ease: ease.enter });
      await wait(1.2);
      await bunting();
    }

    if (skip !== 'animals' && skip !== 'question') {
      await busArrives();
      await wait(0.6);
      playDoor();
      await play(gsap.to(S, { door: 1, duration: 0.95, ease: 'power2.out', delay: 0.15 }));
      await wait(0.5);
    }

    if (skip !== 'question') {
      // Start the full day-to-night cycle as soon as the bus has arrived.
      // It runs for three minutes regardless of how long each note is read.
      startDayNightCycle();
      for (let i = 0; i < CARDS.length; i++) await visit(i);
      // Let the twilight-to-firefly transition breathe before the final question,
      // but do not make the clock wait for the animals or their notes.
      await wait(2.5);
    } else {
      Object.assign(S, { night: 4, garden: 0, fore: 0, birds: 0, fireflies: 1, lamp: 1 });
      sounds.crickets ??= createCrickets();
      sounds.crickets.setLevel(1);
    }
    await question();
  }

  function startDayNightCycle() {
    const crickets = (sounds.crickets ??= createCrickets());
    crickets.setLevel(0);
    const cricketLevel = { value: 0 };
    const tl = gsap.timeline();
    tl.to(S, { night: 4, duration: DAY_NIGHT_SECONDS, ease: 'none' }, 0)
      // Evening arrives gradually; butterflies retreat before the fireflies appear.
      .to(S, { garden: 0, fore: 0, birds: 0, duration: 26, ease: 'sine.inOut' }, 96)
      .to(S, { fireflies: 1, duration: 24, ease: 'sine.inOut' }, 108)
      .to(S, { lamp: 1, duration: 9, ease: 'sine.inOut' }, 111)
      .to(cricketLevel, { value: 1, duration: 22, ease: 'sine.inOut', onUpdate: () => crickets.setLevel(cricketLevel.value) }, 112)
      .call(fadeBirdsong, [], 96);
    if (prefersReducedMotion()) tl.timeScale(2);
  }

  function startBirdsong() {
    // (it downloads after the bus film; it fades in whenever it arrives)
    void loadedBirdsong().then((src) => {
      if (!alive.current || sounds.birdsong) return;
      const a = (sounds.birdsong = new Audio(src));
      a.loop = true;
      a.volume = 0;
      a.play().then(() => gsap.to(a, { volume: 0.55, duration: 4, ease: ease.scenery })).catch(() => {});
    });
  }

  /** The bus film must be ready to play before the bus can come; on a slow connection, wait for it (with the loading card). */
  async function filmReady() {
    const v = film.current!;
    const playable = () => v.readyState >= 3;
    if (playable()) return;
    const card = window.setTimeout(() => setLoading('bus'), 400);
    await loadedFilm().then(live);
    await new Promise<void>((r) => {
      if (playable()) return r();
      const done = () => { v.removeEventListener('canplay', done); v.removeEventListener('error', done); clearTimeout(t); r(); };
      v.addEventListener('canplay', done);
      v.addEventListener('error', done);
      const t = window.setTimeout(done, 20000);
    }).then(live);
    clearTimeout(card);
    setLoading(null);
  }

  async function flyButterflyIn() {
    const from = toPicture([1.15, 0.12], screenLayout(), S.z, [0.5, 0.5]);
    Object.assign(S.bf, { mode: 'in', t: 0, from, x: from[0], y: from[1] });
    await play(gsap.to(S.bf, { t: 1, duration: 2.6, ease: 'sine.inOut' }));
    S.bf.mode = 'perch';
  }

  /** the current camera's layout (for screen → picture) */
  function screenLayout(): CoverLayout {
    const { W, H } = mapRef.current;
    const base = coverLayout(W, H, PIC_W, PIC_H, FOCUS);
    const z = S.z;
    const c0: Vec2 = [base.offset[0] + base.span[0] / 2, base.offset[1] + base.span[1] / 2];
    const hx = base.span[0] / (2 * z), hy = base.span[1] / (2 * z);
    const cx = clamp(c0[0] + S.px, hx, 1 - hx), cy = clamp(c0[1] + S.py, hy, 1 - hy);
    return { span: base.span, offset: [cx - base.span[0] / 2, cy - base.span[1] / 2] };
  }

  async function closeUp(on: boolean) {
    const { W, H } = mapRef.current;
    const wide = W / H > 1.05;
    const base = coverLayout(W, H, PIC_W, PIC_H, FOCUS);
    const c0: Vec2 = [base.offset[0] + base.span[0] / 2, base.offset[1] + base.span[1] / 2];
    const z = on ? (wide ? 1.6 : 1.9) : 1;
    const head = tulipPoint(TULIP_HEAD[0], TULIP_HEAD[1] - 30, 0);
    const target: Vec2 = wide ? [0.42, 0.66] : [0.5, 0.68];   // where the flower sits on screen
    const c: Vec2 = [head[0] - ((target[0] - 0.5) * base.span[0]) / z, head[1] - ((target[1] - 0.5) * base.span[1]) / z];
    const d = prefersReducedMotion() ? 0.8 : 2;
    const tl = gsap.timeline();
    tl.to(S, { px: on ? c[0] - c0[0] : 0, py: on ? c[1] - c0[1] : 0, z, duration: d, ease: 'power2.inOut' }, 0)
      .to(S, { blur: on ? 2.4 : 0, focus: on ? 1 : 0, vignette: on ? 1 : 0, duration: d, ease: 'power2.inOut' }, 0);
    await play(tl);
  }

  function showBubble() {
    setUi((u) => ({ ...u, bubble: true, pluck: true }));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = bubble.current!;
      const r = bfG.current!.getBoundingClientRect();
      const W = window.innerWidth;
      const bw = el.offsetWidth, bh = el.offsetHeight;
      const cx = r.left + r.width / 2;
      const left = clamp(cx - bw / 2, 16, W - bw - 16);
      const top = Math.max(12, r.top - bh - 16);
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.setProperty('--tail-x', `${clamp(cx - left, 28, bw - 28)}px`);
      gsap.timeline()
        .fromTo(el, { autoAlpha: 0, scale: 0.85, y: 12, transformOrigin: `${cx - left}px 110%` }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.42, ease: 'back.out(1.7)' })
        .from(el.querySelectorAll('.stop__word'), { autoAlpha: 0, y: 5, duration: 0.24, ease: ease.enter, stagger: 0.07 }, 0.15)
        .fromTo(pluckBtn.current, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, '+=0.2');
    }));
  }

  async function pluck() {
    const { W, H, ppp } = mapRef.current;
    buzz(20);
    gsap.to([bubble.current, pluckBtn.current], { autoAlpha: 0, scale: 0.9, duration: 0.2, ease: ease.exit });
    setTimeout(() => setUi((u) => ({ ...u, bubble: false, pluck: false })), 250);
    // the butterfly takes off
    const away = toPicture([-0.25, -0.15], screenLayout(), S.z, [0.5, 0.5]);
    Object.assign(S.bf, { mode: 'away', t: 0, from: [S.bf.x, S.bf.y] as Vec2, to: away });
    gsap.to(S.bf, { t: 1, duration: 1.6, ease: 'power1.in', onComplete: () => { S.bf.mode = 'off'; } });
    // the stem snaps and the flower comes up out of the grass
    playSnap();
    const base = mapRef.current.map(TULIP_BASE);
    lifeRef.current!.leafBits(base[0] * W, Math.min(H - 10, base[1] * H));
    await play(gsap.to(S.lift, { y: -60, rot: -6, duration: 0.4, ease: 'back.out(2)' }));
    // …and flies at the screen
    const sc = (TULIP_H / 420) * ppp;
    const head = mapRef.current.map(tulipPoint(TULIP_HEAD[0], TULIP_HEAD[1], 0));
    const dx = (W / 2 - head[0] * W) / sc, dy = (H / 2 - head[1] * H) / sc;
    const cover = (Math.max(W, H) * 1.8) / (90 * sc);
    playWhoosh(1.3, 200, 3200, 0.4);
    await play(gsap.to(S.lift, { x: dx, y: dy - 60, rot: 14, scale: cover, duration: 1.15, ease: 'power2.in' }));
    // a burst of petals, and the garden comes back
    gsap.timeline().to(flash.current, { autoAlpha: 0.85, duration: 0.12, ease: 'power1.out' }).to(flash.current, { autoAlpha: 0, duration: 0.9, ease: 'sine.out' });
    lifeRef.current!.petalBurst(W / 2, H / 2, 70);
    playPop(0.7);
    S.tulip = 0;
    await closeUp(false);
  }

  async function bunting() {
    // wait for the flags to be painted (fonts)
    for (let k = 0; k < 40 && !bannerRef.current; k++) await wait(0.1);
    if (!bannerRef.current) return;
    Object.assign(S, { banner: true, away: 0, row0: 0, row1: 0, row2: 0 });
    gsap.to(S, { row0: 1, duration: 2.6, ease: 'power3.out' });
    gsap.to(S, { row1: 1, duration: 2.6, ease: 'power3.out', delay: 0.55 });
    gsap.to(S, { row2: 1, duration: 2.6, ease: 'power3.out', delay: 1.1 });
    gsap.delayedCall(1.6, () => playShimmer(1.4));
    await wait(5.4);
    setUi((u) => ({ ...u, go: true }));
    await new Promise<void>((r) => { waiters.current.go = r; }).then(live);
    setUi((u) => ({ ...u, go: false }));
    buzz(12);
    gsap.to(S, { away: 1, duration: 2.6, ease: 'power1.in' });
    await wait(1.6);
  }

  async function busArrives() {
    await filmReady();
    const v = film.current!;
    v.currentTime = 0;
    v.volume = 1;
    try { await v.play(); } catch { v.muted = true; await v.play().catch(() => {}); }
    live(0);
    await new Promise<void>((r) => {
      const anyV = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => void };
      if (anyV.requestVideoFrameCallback) anyV.requestVideoFrameCallback(() => r());
      else setTimeout(r, 150);
    }).then(live);
    // if this browser can't show the film, the bus simply fades in at the stop
    await wait(0.4);
    if (!stageRef.current) {
      // still pictures: the film itself is shown on top while it plays
      gsap.to(S.weights, { 0: 0, 1: 1, duration: 0.35, ease: 'none' });
      await wait(Math.max(0, 4.3 - v.currentTime));
      playAirRelease(1.4, 0.38);
      await wait(Math.max(0, 6.2 - v.currentTime));
      gsap.to(S.weights, { 1: 0, 2: 1, duration: 0.5, ease: 'none' });
      gsap.to(v, { volume: 0, duration: 0.9, ease: 'sine.in', onComplete: () => v.pause() });
      await wait(0.6);
      return;
    }
    if (!stageRef.current.videoHasFrame) {
      await wait(1.2);
      if (!stageRef.current.videoHasFrame) {
        v.pause();
        playAirRelease(1.4, 0.38);
        await play(gsap.to(S.weights, { 0: 0, 1: 0, 2: 1, duration: 1.4, ease: 'sine.inOut' }));
        await wait(0.6);
        return;
      }
    }
    gsap.to(S, { cloud: 0, duration: 0.3 });
    gsap.to(S.weights, { 0: 0, 1: 1, duration: 0.35, ease: 'none' });
    // the brakes sigh as it stops
    await wait(Math.max(0, 4.3 - v.currentTime));
    playAirRelease(1.4, 0.38);
    await wait(Math.max(0, 6.2 - v.currentTime));
    gsap.to(S.weights, { 1: 0, 2: 1, duration: 0.5, ease: 'none' });
    gsap.to(v, { volume: 0, duration: 0.9, ease: 'sine.in', onComplete: () => v.pause() });
    gsap.to(S, { cloud: 1, duration: 2, ease: 'sine.inOut' });
    await wait(0.6);
  }

  // ── one animal: off the bus, up to her, a scroll, golden dust ──
  async function visit(i: number) {
    const a = actors[i];
    const rig = () => actorRig.current[i]!;
    const f = 1 / STOP_FPS;
    const { W, H } = mapRef.current;
    const wide = W / H > 1.05;
    const at = (u: Vec2, scale = 1, dy = 0) => {
      const { map, ppp } = mapRef.current;
      const [sx, sy] = map(u);
      a.x = sx * W;
      a.y = sy * H + dy;
      a.size = EXIT_SIZE * ppp * scale;
    };
    const jitter = (k = 1) => { a.jx = rand(-1, 1) * k; a.jy = rand(-1, 1) * k; a.lean = rand(-1.5, 1.5) * k; };
    Object.assign(a, { mode: 'door', offer: 0, squash: 0, head: 0, footL: 0, footR: 0, clip: true, dust: -1 });
    setNoteIndex(i);
    rig().querySelector<SVGGElement>('[data-part="scroll"]')!.style.visibility = 'visible';

    // stepping out of the door, a frame at a time
    const frames: (() => void)[] = [
      () => { at([DOOR_FEET[0] - 0.004, DOOR_FEET[1]], 0.94); jitter(); },
      () => { at(DOOR_FEET, 0.97); jitter(); },
      () => { at(DOOR_FEET); jitter(); a.footL = 8; },
      () => { at(DOOR_FEET); jitter(); a.footL = 0; a.squash = 0.12; },
      () => { at([(DOOR_FEET[0] + STEP_DOWN[0]) / 2, DOOR_FEET[1] - 0.02], 1.02); a.squash = -0.1; a.lean = 4; },
      () => { at(STEP_DOWN, 1.04); a.squash = 0.1; a.clip = false; playStep(1.2); },
      () => { at(STEP_DOWN, 1.04); jitter(); a.squash = 0; },
    ];
    for (const fr of frames) { fr(); await wait(f); }

    // walking up to her, stop-motion
    const x0 = a.x, y0 = a.y, s0 = a.size;
    const x1 = wide ? W * 0.16 : W * 0.5, y1 = H * 0.99, s1 = H * (wide ? 0.56 : 0.44);
    const n = reduced() ? 10 : 22;
    for (let k = 1; k <= n; k++) {
      const d = k / n;
      const size = 1 / ((1 - d) / s0 + d / s1);           // perspective: grows faster as it nears
      const w = (size - s0) / (s1 - s0);
      a.size = size;
      a.x = x0 + (x1 - x0) * w;
      a.y = y0 + (y1 - y0) * w - (k % 2) * size * 0.025;
      a.footL = k % 2 ? 12 : 0;
      a.footR = k % 2 ? 0 : 12;
      jitter(0.8);
      a.lean += k % 2 ? 4 : -4;
      a.squash = k % 2 ? -0.02 : 0.03;
      if (k % 2 === 0) playStep(0.7 + (1 - d) * 0.6);
      await wait(f);
    }
    Object.assign(a, { footL: 0, footR: 0, lean: 0, squash: 0.06, jx: 0, jy: 0 });
    await wait(f);
    a.squash = 0;
    a.mode = 'stand';

    // it holds up its scroll, which flies up and unrolls
    await play(gsap.to(a, { offer: 1, head: -5, duration: 0.5, ease: 'back.out(1.6)' }));
    const held = rig().querySelector<SVGGElement>('[data-part="scroll"]')!;
    const rect = held.getBoundingClientRect();
    held.style.visibility = 'hidden';
    noteReading.current = true;
    await note.current!.open(rect).then(live);
    await tapNote();
    buzz(8);
    await note.current!.close().then(live);
    noteReading.current = false;
    gsap.to(a, { offer: 0, head: 0, duration: 0.4, ease: 'sine.inOut' });

    // The environment clock runs independently; note completion only triggers the character dissolve.
    await dissolve(i);
  }

  const reduced = () => prefersReducedMotion();

  function fadeBirdsong() {
    const b = sounds.birdsong;
    if (b) gsap.to(b, { volume: 0, duration: 5, ease: 'sine.in', onComplete: () => b.pause() });
  }

  async function dissolve(i: number) {
    const a = actors[i];
    const g = actorG.current[i]!;
    const r = g.getBoundingClientRect();
    const pts = await sampleActor(i, r).catch(() => []);
    live(0);
    a.dust = -0.15;
    lifeRef.current!.dust(pts);
    playShimmer(DISSOLVE);
    // the threshold rises at a steady pace: the same amount of it vanishes every moment
    await play(gsap.to(a, { dust: 1.05, duration: DISSOLVE, ease: 'none' }));
    a.mode = 'off';
    a.dust = -1;
  }

  /** where the animal's pixels are and their colours, and when each one turns to dust */
  async function sampleActor(i: number, r: DOMRect) {
    const { W, H } = mapRef.current;
    const a = actors[i];
    const clone = svg.current!.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('[data-actor]').forEach((el) => { if (el.getAttribute('data-actor') !== String(i)) el.remove(); });
    clone.querySelectorAll('[mask],[clip-path]').forEach((el) => { el.removeAttribute('mask'); el.removeAttribute('clip-path'); });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(W));
    clone.setAttribute('height', String(H));
    clone.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    await img.decode();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, -r.left, -r.top);
    const data = g.getImageData(0, 0, w, h).data;
    const step = Math.max(2, Math.round(Math.sqrt((w * h) / 3200)));
    const sc = a.size / 200;
    const tx = a.x + a.jx - ANIMAL_FEET[0] * sc, ty = a.y + a.jy - ANIMAL_FEET[1] * sc;
    const pts: { x: number; y: number; r: number; g: number; b: number; delay: number }[] = [];
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const o = (y * w + x) * 4;
        if (data[o + 3] < 140) continue;
        // the noise value under this pixel decides when it goes
        const lx = (r.left + x - tx) / sc, ly = (r.top + y - ty) / sc;
        const v = NOISE.sample((lx - MASK_BOX.x) / MASK_BOX.w, (ly - MASK_BOX.y) / MASK_BOX.h);
        pts.push({ x: r.left + x, y: r.top + y, r: data[o], g: data[o + 1], b: data[o + 2], delay: ((v + 0.08) / 1.2) * DISSOLVE });
      }
    }
    return pts;
  }

  // ── the question at the end ──
  async function question() {
    const { W, H } = mapRef.current;
    const wide = W / H > 1.05;
    const n = CARDS.length;
    const size = wide ? H * 0.2 : Math.min((W / n) * 1.05, H * 0.17);
    const spread = wide ? Math.min(W * 0.7, size * n * 1.1) : W * 0.96;
    for (let i = 0; i < n; i++) {
      const a = actors[i];
      const x = W / 2 - spread / 2 + (spread / n) * (i + 0.5);
      Object.assign(a, { mode: 'row', x, y: H * 0.95, size: 0, offer: 0, clip: false, dust: -1, squash: 0, lean: 0, head: 0, jx: 0, jy: 0 });
      actorRig.current[i]!.querySelector<SVGGElement>('[data-part="scroll"]')!.style.visibility = 'hidden';
      gsap.to(a, { size, duration: 0.55, ease: 'back.out(2)', delay: i * 0.18 });
      gsap.delayedCall(i * 0.18, () => {
        playPop(1 + i * 0.08);
        lifeRef.current!.dust(Array.from({ length: 40 }, () => ({
          x: x + rand(-0.4, 0.4) * size, y: H * 0.95 - rand(0, 1) * size, r: 255, g: 220, b: 120, delay: rand(0, 0.25),
        })));
      });
    }
    await wait(n * 0.18 + 0.6);
    setUi((u) => ({ ...u, question: true }));
    const answer = await chosen();
    playChime();
    buzz(15);
    setUi((u) => ({ ...u, answer }));
    void saveResponse({ scene: 'bus-stop', question: content.question.ask, answer, correct: true, attempt: 1 });
    actors.forEach((a, i) => {
      gsap.timeline({ delay: i * 0.08 })
        .to(a, { squash: 0.12, duration: 0.1 })
        .to(a, { squash: -0.08, y: a.y - a.size * 0.18, duration: 0.2, ease: 'power2.out' })
        .to(a, { squash: 0, y: a.y, duration: 0.25, ease: 'power2.in' });
    });
  }

  const flowers = useMemo(() => ({
    Tulip: <path d="M20,40 C10,40 8,26 10,14 L16,22 L20,10 L24,22 L30,14 C32,26 30,40 20,40Z M19,40 L19,56 L21,56 L21,40Z" />,
    Lily: <path d="M20,34 C14,20 4,16 2,18 C6,24 12,30 18,36Z M20,34 C26,20 36,16 38,18 C34,24 28,30 22,36Z M20,36 C16,22 18,8 20,4 C22,8 24,22 20,36Z M19,36 L19,56 L21,56 L21,36Z" />,
    Lotus: <path d="M20,44 C12,36 12,22 20,10 C28,22 28,36 20,44Z M20,44 C8,42 2,32 2,24 C10,26 16,34 20,44Z M20,44 C32,42 38,32 38,24 C30,26 24,34 20,44Z M6,48 C14,52 26,52 34,48 C26,46 14,46 6,48Z" />,
  }), []);

  const words = (line: string) => line.split(' ').map((w, k) => <span key={k} className="stop__word">{w} </span>);

  return (
    <section className="scene stop" aria-label="The bus stop">
      <video ref={film} className="stop__film" playsInline preload="auto" aria-hidden="true" />
      <div className="layer" aria-hidden="true">
        <img ref={still} className="layer stop__still" alt="" />
        <canvas ref={stageCanvas} className="layer stop__stage" hidden={noStage} />
        <canvas ref={lifeCanvas} className="layer" />
        <canvas ref={buntingCanvas} className="layer" />
      </div>

      <svg ref={svg} className="layer stop__cast" aria-hidden="true">
        <defs>
          <GrainPattern id="grain-stop" />
          {/* the scene's light on the characters */}
          <filter id="scene-light" colorInterpolationFilters="sRGB">
            <feColorMatrix ref={lightMatrix} type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0" />
          </filter>
          <radialGradient id="contact-shadow">
            <stop offset="0" stopColor="#0d0a06" stopOpacity="0.9" />
            <stop offset="1" stopColor="#0d0a06" stopOpacity="0" />
          </radialGradient>
          <clipPath id="door-opening" clipPathUnits="userSpaceOnUse">
            <rect ref={doorClip} x="0" y="0" width="0" height="0" />
            <rect x="-5000" y="0" width="20000" height="20000" />
          </clipPath>
          {CARDS.map((_, i) => (
            <g key={i}>
              <filter id={`dust-edge-${i}`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
                <feComponentTransfer>
                  <feFuncR ref={(el) => { dustFuncs.current[i][0] = el; }} type="linear" slope="7" intercept="1" />
                  <feFuncG ref={(el) => { dustFuncs.current[i][1] = el as unknown as SVGFEFuncRElement; }} type="linear" slope="7" intercept="1" />
                  <feFuncB ref={(el) => { dustFuncs.current[i][2] = el as unknown as SVGFEFuncRElement; }} type="linear" slope="7" intercept="1" />
                </feComponentTransfer>
              </filter>
              <mask id={`dust-${i}`} maskUnits="userSpaceOnUse" x="-200" y="-200" width="600" height="600">
                <image href={NOISE.url} x={MASK_BOX.x} y={MASK_BOX.y} width={MASK_BOX.w} height={MASK_BOX.h} preserveAspectRatio="none" filter={`url(#dust-edge-${i})`} />
              </mask>
            </g>
          ))}
        </defs>
        <g ref={tulipG} data-actor="tulip" style={{ visibility: 'hidden' }} filter="url(#scene-light)">
          <TulipArt grain="grain-stop" />
        </g>
        {CARDS.map((c, i) => (
          <g key={i} ref={(el) => { actorG.current[i] = el; }} data-actor={String(i)} style={{ visibility: 'hidden' }}>
            <ellipse ref={(el) => { shadows.current[i] = el; }} cx="100" cy="193" rx="66" ry="11" fill="url(#contact-shadow)" opacity="0.4" />
            <g>
              <g>
                <g ref={(el) => { actorRig.current[i] = el; }} filter="url(#scene-light)">
                  <AnimalArt kind={c.animal} grain="grain-stop" />
                </g>
              </g>
            </g>
          </g>
        ))}
        {FAIRIES.map((look, i) => (
          <g key={`f${i}`} ref={(el) => { fairyG.current[i] = el; }} data-actor={`fairy${i}`} style={{ visibility: 'hidden' }} filter="url(#scene-light)">
            <FairyArt look={look} grain="grain-stop" />
          </g>
        ))}
        <g ref={bfG} data-actor="butterfly" style={{ visibility: 'hidden' }} filter="url(#scene-light)">
          <ButterflyArt grain="grain-stop" />
        </g>
      </svg>

      <canvas ref={frontCanvas} className="layer stop__front" aria-hidden="true" />
      <canvas ref={rainCanvas} className="layer stop__rain" aria-hidden="true" />
      <canvas ref={fogCanvas} className="layer" hidden={noFog} aria-hidden="true" />
      <div ref={vignette} className="layer stop__vignette" />
      <div ref={flash} className="layer stop__flash" />

      {/* while the pictures (or the bus film) are still arriving */}
      {loading && (
        <div className={`stop__loading stop__loading--${loading}`} role="status" aria-live="polite">
          <svg className="stop__loadfly" viewBox="-30 -24 60 48" aria-hidden="true">
            <g className="stop__loadwing stop__loadwing--l"><path d="M-2,-2 C-14,-22 -30,-18 -26,-4 C-24,4 -12,6 -2,2Z" /><path d="M-2,2 C-12,6 -22,16 -14,20 C-8,22 -3,12 -1,4Z" /></g>
            <g className="stop__loadwing stop__loadwing--r"><path d="M2,-2 C14,-22 30,-18 26,-4 C24,4 12,6 2,2Z" /><path d="M2,2 C12,6 22,16 14,20 C8,22 3,12 1,4Z" /></g>
            <rect x="-1.6" y="-8" width="3.2" height="22" rx="1.6" className="stop__loadbody" />
          </svg>
          <p className="stop__loadtext">{loading === 'scene' ? content.loading.scene : content.loading.bus}</p>
          <div className="stop__loadbar"><i style={{ transform: `scaleX(${Math.max(0.03, loading === 'scene' ? loaded.pictures : loaded.film).toFixed(3)})` }} /></div>
          <p className="stop__loadslow">{content.loading.slow} · {Math.round((loading === 'scene' ? loaded.pictures : loaded.film) * 100)}%</p>
        </div>
      )}

      {/* the butterfly speaks */}
      <div ref={bubble} className="stop__bubble" hidden={!ui.bubble} aria-live="polite">
        {content.butterfly.lines.map((l, i) => <p key={i} className={i === 0 ? 'stop__hi' : undefined}>{words(l)}</p>)}
        <p className="stop__hint">{words(content.butterfly.hint)}</p>
      </div>
      <button ref={pluckBtn} type="button" className="stop__pluck" hidden={!ui.pluck} aria-label={content.butterfly.tapLabel}
        onPointerDown={() => waiters.current.pluck?.()}>
        <span className="stop__ring" />
        <svg className="stop__hand" viewBox="0 0 40 48" aria-hidden="true">
          <path d="M14,46 C8,40 4,32 6,28 C8,25 11,27 13,30 L13,8 C13,4 18,4 18,8 L18,22 C18,19 23,19 23,22 L23,24 C23,21 28,21 28,24 L28,26 C28,23 33,23 33,27 L33,36 C33,42 30,46 26,46Z"
            fill="#fff8ec" stroke="#5b3b29" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </button>

      <Note ref={note} message={CARDS[noteIndex].message} hint={content.noteHint} onTap={() => waiters.current.note?.()} />

      {/* under the bunting: tap anywhere to go on */}
      {ui.go && (
        <button type="button" className="layer stop__go" autoFocus onPointerDown={() => waiters.current.go?.()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') waiters.current.go?.(); }}>
          <span className="stop__gohint">{content.banner.continueHint}</span>
        </button>
      )}

      {/* tapping a bird, or the moon */}
      {(ui.bird || ui.moon) && (
        <button type="button" className="layer stop__veil" onPointerDown={() => setUi((u) => ({ ...u, bird: false, moon: false }))}>
          <span className={`stop__birdcard${ui.moon ? ' stop__birdcard--moon' : ''}`} role="note">
            <strong>{ui.moon ? content.moon.title : content.birds.title}</strong>
            <span>{ui.moon ? content.moon.meaning : content.birds.meaning}</span>
            <em>{ui.moon ? content.moon.close : content.birds.close}</em>
          </span>
        </button>
      )}

      {/* the question at the end */}
      {ui.question && (
        <div className="stop__question" role="group" aria-label={content.question.ask}>
          <p className="stop__lead">{content.question.lead}</p>
          <p className="stop__ask">{content.question.ask}</p>
          <div className="stop__options">
            {content.question.options.map((o) => (
              <button key={o} type="button" className={`stop__option${ui.answer === o ? ' is-chosen' : ''}`} disabled={!!ui.answer}
                onClick={() => waiters.current.answer?.(o)}>
                <svg viewBox="0 0 40 58" aria-hidden="true">{flowers[o]}</svg>
                <span>{o}</span>
              </button>
            ))}
          </div>
          {ui.answer && <p className="stop__thanks">{content.question.thanks}</p>}
        </div>
      )}
      {showDebug && <pre ref={debug} className="stop__debug" />}
    </section>
  );
}
