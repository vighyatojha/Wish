// ─────────────────────────────────────────────────────────────
//  Page 2: through the fog to the valley
//
//  • The wet paper falls away into deep, storm-grey fog.
//  • The camera flies through the fog into the valley, now in
//    late-morning light: clouds drift, mist creeps, the river
//    glitters, birds fly across.
//  • A little bird lands on a branch, says hello in close-up and
//    asks her to ring the bell; fairies fly in with HAPPY BIRTHDAY
//    bunting and her name (Greeting.tsx).
//  • She taps on: the camera visits animals around the valley, each
//    with a card for her, while the sun moves across the sky (Tour.tsx).
//
//  The camera: during the flight and the greeting it is the valley's
//  own (a zoom towards FLY_TO); for the tour it is a free camera —
//  a point in the picture at the centre of the screen, and a zoom.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP, ease } from '../lib/motion';
import { prefersReducedMotion } from '../lib/device';
import { createWindSound, type LiveSound } from '../lib/audio';
import { Fog } from '../lib/fog';
import { Valley, coverLayout, toScreen, type CoverLayout, type ValleyPicture, type Vec2 } from '../lib/valley';
import { Birds } from '../lib/birds';
import { Greeting, type GreetShared } from './Greeting';
import { Tour, type TourShared } from './Tour';
import valleyUrl from '../assets/valley.webp';
import masksUrl from '../assets/valley-masks.png';
import ambientUrl from '../assets/valley-morning.m4a';
import './sunrise.css';

// The picture, and where its painted (dawn) sun is (0–1 across, 0–1 down).
const PICTURE: ValleyPicture = { image: valleyUrl, masks: masksUrl, width: 2048, height: 1153, sun: [0.761, 0.315] };
// Which part of the picture a narrow phone keeps in view (sun + river).
const PICTURE_FOCUS: Vec2 = [0.72, 0.45];
// The point on screen the camera flies towards through the fog.
const FLY_TO: Vec2 = [0.55, 0.45];
const ZOOM_END = 1.04;
// The sun's path across the screen as the day moves on
// (day 1 late morning → 2 afternoon → 3 golden hour, where it meets the
// low sun painted in the photo). Screen 0–1, high in the sky.
const SUN_PATH: [number, number, number][] = [
  // day,  across, down
  [1.0, 0.46, 0.09],
  [1.5, 0.58, 0.065],
  [2.0, 0.7, 0.095],
  [2.5, 0.78, 0.17],
];
// How far through the day this part of the story goes. The rest
// (golden hour, sunset, night) is saved for the scenes that follow.
const DAY_START = 1;
const DAY_END = 1.9;

function sunAt(day: number, painted: Vec2): Vec2 {
  if (day >= 2.5) {
    const t = Math.min(1, (day - 2.5) / 0.5);
    const last = SUN_PATH[SUN_PATH.length - 1];
    return [mix(last[1], painted[0], t), mix(last[2], painted[1], t)];
  }
  for (let i = 0; i < SUN_PATH.length - 1; i++) {
    const [d0, x0, y0] = SUN_PATH[i];
    const [d1, x1, y1] = SUN_PATH[i + 1];
    if (day <= d1 || i === SUN_PATH.length - 2) {
      const t = clamp((day - d0) / (d1 - d0));
      const e = t * t * (3 - 2 * t);
      return [mix(x0, x1, e), mix(y0, y1, e)];
    }
  }
  return [SUN_PATH[0][1], SUN_PATH[0][2]];
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

interface Props {
  flying: boolean;  // start the flight through the fog
  entered: boolean; // page 1 is gone; this scene is in charge
}

export function Sunrise({ flying, entered }: Props) {
  const still = useRef<HTMLImageElement>(null);
  const valleyCanvas = useRef<HTMLCanvasElement>(null);
  const birdsCanvas = useRef<HTMLCanvasElement>(null);
  const fogCanvas = useRef<HTMLCanvasElement>(null);
  const fogSimple = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(false);
  const [noValley, setNoValley] = useState(false);
  // the valley picture is loaded and drawable (or we fell back to the still)
  const [pictureReady, setPictureReady] = useState(false);
  const [noFog, setNoFog] = useState(false);
  // the bird has said hello, and she has tapped on past the bunting
  // (?scene=tour, while building: skip the bird and the bunting)
  const [greeted, setGreeted] = useState(() => new URLSearchParams(location.search).get('scene') === 'tour');
  const skipGreeting = useRef(greeted).current;
  const greet = useRef<GreetShared>({ focus: 0, away: 0 }).current;
  const tour = useRef<TourShared>({
    mix: 0, cx: 0.5, cy: 0.5, z: 1, base: { cx: 0.5, cy: 0.5, z: 1 }, dof: 0, day: DAY_START, frame: null,
  }).current;

  // GSAP animates these numbers; the frame loop draws from them.
  const cam = useRef({ travel: 0, haze: 1, light: 0, zoom: 1, life: 0 }).current;
  const wind = useRef<LiveSound | null>(null);
  const ambient = useRef<HTMLAudioElement | null>(null);

  // ── Effects: created once, fully cleaned up when the scene goes ──
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let valley: Valley | null = null;
    const fog = Fog.create(fogCanvas.current!);
    const birds = new Birds(birdsCanvas.current!);
    if (!fog) setNoFog(true);

    let W = 1, H = 1;
    let base: CoverLayout = coverLayout(1, 1, PICTURE.width, PICTURE.height, PICTURE_FOCUS);
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      base = coverLayout(W, H, PICTURE.width, PICTURE.height, PICTURE_FOCUS);
      valley?.resize(W, H);
      fog?.resize();
      birds.resize(W, H);
      // the still picture (no WebGL) shows the same part of the picture
      if (still.current) {
        const pos = (i: 0 | 1) => (base.span[i] >= 1 ? 50 : (base.offset[i] / (1 - base.span[i])) * 100);
        still.current.style.objectPosition = `${pos(0)}% ${pos(1)}%`;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    void Valley.create(valleyCanvas.current!, PICTURE).then((v) => {
      if (cancelled) return v?.destroy();
      if (!v) {
        setNoValley(true);
        setPictureReady(true);
        return;
      }
      valley = v;
      valley.resize(W, H);
      setPictureReady(true);
    });

    let last = 0, lastTravel = 0, lastStill = '';
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      const time = now / 1000;

      // ── the camera ──
      // the valley's own: the flight's zoom towards FLY_TO (pushed in a touch for the bird's close-up)
      const bz = cam.zoom * (1 + greet.focus * 0.05);
      const c0: Vec2 = [
        base.offset[0] + base.span[0] * (FLY_TO[0] + (0.5 - FLY_TO[0]) / bz),
        base.offset[1] + base.span[1] * (FLY_TO[1] + (0.5 - FLY_TO[1]) / bz),
      ];
      tour.base.cx = c0[0];
      tour.base.cy = c0[1];
      tour.base.z = bz;
      // the tour's free camera, kept inside the picture
      const free = tour.mix > 0;
      const z = free ? tour.z : bz;
      const hx = base.span[0] / (2 * z), hy = base.span[1] / (2 * z);
      const cx = clamp(free ? tour.cx : c0[0], hx, 1 - hx);
      const cy = clamp(free ? tour.cy : c0[1], hy, 1 - hy);
      const layout: CoverLayout = { span: base.span, offset: [cx - base.span[0] / 2, cy - base.span[1] / 2] };
      const center: Vec2 = [0.5, 0.5];
      const map = (uv: Vec2) => toScreen(uv, layout, z, center);

      // the sun lives in the picture's sky: its path is laid out on the valley's
      // own screen, then pinned to that point of the picture
      const ownLayout: CoverLayout = { span: base.span, offset: [c0[0] - base.span[0] / 2, c0[1] - base.span[1] / 2] };
      const sunOwn = sunAt(tour.day, toScreen(PICTURE.sun, ownLayout, bz, center));
      const sunUv: Vec2 = [c0[0] + (base.span[0] * (sunOwn[0] - 0.5)) / bz, c0[1] + (base.span[1] * (sunOwn[1] - 0.5)) / bz];
      const sunScreen = map(sunUv);

      // the animals are drawn now, with exactly this camera, so they stay pinned to their rock
      const focus = tour.frame?.({ time, dt, W, H, map, pxPerPicture: (H / base.span[1]) * z }) ?? null;
      const blur = greet.focus * 2.6 + tour.dof;

      if (valley) {
        valley.render({
          time, layout, zoom: z, zoomCenter: center, blur,
          focus: focus ?? undefined,
          day: tour.day,
          sun: sunUv,
          sunAmount: cam.light * (1 - cam.haze) * (1 - clamp((tour.day - 2.6) / 0.4)),
          sunWarm: clamp((tour.day - 1.3) / 1.5),
        });
      } else if (still.current) {
        // no WebGL: move the still picture the same way
        const tx = (0.5 + ((base.offset[0] - layout.offset[0]) / base.span[0] - 0.5) * z) * W;
        const ty = (0.5 + ((base.offset[1] - layout.offset[1]) / base.span[1] - 0.5) * z) * H;
        const key = `${tx.toFixed(1)}|${ty.toFixed(1)}|${z.toFixed(4)}|${blur.toFixed(2)}`;
        if (key !== lastStill) {
          lastStill = key;
          const s = still.current;
          s.style.transformOrigin = '0 0';
          s.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${z.toFixed(4)})`;
          s.style.filter = blur > 0.05 ? `blur(${(blur * 2.2).toFixed(1)}px)` : '';
        }
      }

      birds.render({ time, dt, toScreen: map, scale: (H / layout.span[1] / 941) * z, visible: cam.life * (1 - greet.focus) });

      if (fog) {
        fog.render({ time, travel: cam.travel, haze: cam.haze, light: cam.light, mist: 0, sun: sunScreen, focus: FLY_TO });
      } else if (fogSimple.current) {
        const thick = Math.max(cam.haze, clamp(1 - cam.travel / 7.5));
        fogSimple.current.style.opacity = thick.toFixed(3);
        fogSimple.current.style.transform = `scale(${(1 + cam.travel * 0.12).toFixed(3)})`;
      }

      // wind follows how fast the camera is moving through the fog
      const speed = dt > 0 ? (cam.travel - lastTravel) / dt : 0;
      lastTravel = cam.travel;
      wind.current?.setLevel(0.18 * cam.haze + 0.8 * clamp(speed / 1.2));

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      valley?.destroy();
      fog?.destroy();
      birds.destroy();
      wind.current?.stop(0.5);
      ambient.current?.pause();
    };
  }, [cam, greet, tour]);

  // ── The flight through the fog (automatic) ──────────────────
  useGSAP(
    () => {
      if (!flying) return;
      wind.current ??= createWindSound();
      // The fog only starts to clear once the valley picture is ready.
      // Until then she sees deep, slowly glowing fog, never a black screen.
      if (!pictureReady) {
        gsap.to(cam, { light: 0.35, duration: 6, ease: ease.scenery });
        return;
      }
      const tl = gsap.timeline({
        onComplete: () => {
          wind.current?.stop(1.5);
          wind.current = null;
          setArrived(true);
        },
      });
      tl
        // the storm passes: grey fog starts to glow as the sun burns through
        .to(cam, { light: 1, duration: 7, ease: ease.scenery, overwrite: 'auto' }, 0)
        // deep fog, swirling, the camera only creeping forward
        .to(cam, { travel: 0.6, duration: 5, ease: ease.scenery }, 0)
        // the slow flight: sheets of fog swell and drift past
        .to(cam, { travel: 8.2, duration: 11, ease: ease.scenery }, 5)
        .to(cam, { zoom: ZOOM_END, duration: 11, ease: ease.scenery }, 5)
        .to(cam, { haze: 0, duration: 6, ease: ease.scenery }, 5.6)
        // birds start crossing once there is something to see
        .to(cam, { life: 1, duration: 2, ease: ease.enter }, 9)
        // birdsong and the river come in as the valley opens up
        .call(startAmbient, [], 10.5);
      if (prefersReducedMotion()) tl.timeScale(2);
    },
    { dependencies: [flying, pictureReady] },
  );

  function startAmbient() {
    const audio = (ambient.current ??= new Audio(ambientUrl));
    audio.loop = true;
    audio.volume = 0;
    audio
      .play()
      .then(() => gsap.to(audio, { volume: 0.6, duration: 4, ease: ease.scenery }))
      .catch(() => { /* sound not allowed yet (only when skipping page 1) */ });
  }

  return (
    <section className="scene sunrise" aria-label="The valley">
      <div className="sunrise__stage">
        <div className="layer" aria-hidden="true">
          <img ref={still} className="layer sunrise__still" src={valleyUrl} alt="" />
          <canvas ref={valleyCanvas} className="layer" hidden={noValley} />
          <canvas ref={birdsCanvas} className="layer" />
          <canvas ref={fogCanvas} className="layer" hidden={noFog} />
          <div ref={fogSimple} className="layer sunrise__fog-simple" hidden={!noFog} />
        </div>

        <Tour active={greeted && arrived} shared={tour} dayStart={DAY_START} dayEnd={DAY_END}
          onDone={() => { /* the next scene (golden hour → night) starts here */ }} />
        <Greeting active={arrived && entered && !skipGreeting} shared={greet} onDone={() => setGreeted(true)} />
      </div>
    </section>
  );
}
