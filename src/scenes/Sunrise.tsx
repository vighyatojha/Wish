// ─────────────────────────────────────────────────────────────
//  Page 2: through the fog to the valley, and the treasure trail
//
//  On its own:
//  • The wet paper falls away into deep, storm-grey fog.
//  • The camera flies through the fog into the valley, now in
//    late-morning light: clouds drift, mist creeps, the river
//    glitters, birds fly across.
//  • A little bird lands on a branch, says hello in close-up and
//    asks her to ring the bell; then a flock flies in with
//    HAPPY BIRTHDAY bunting and her name (see Greeting.tsx).
//  • A small card tells her how to scroll.
//
//  As she scrolls (one GSAP ScrollTrigger timeline):
//  • a treasure trail draws itself across the valley, a compass
//    spins in and an X marks the spot;
//  • the camera glides down towards the riverbank, the background
//    softens like a lens focusing close, and a 3D tree stump rises
//    into the foreground;
//  • a thick old treasure map unrolls on the stump and the first
//    message writes itself in, letter by letter;
//  • each further message is written in turn while the day moves
//    on towards golden hour (night comes in the next scene).
// ─────────────────────────────────────────────────────────────
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { content } from '../content';
import { gsap, ScrollTrigger, SplitText, useGSAP, ease, dur } from '../lib/motion';
import { buzz, isTouch, prefersReducedMotion } from '../lib/device';
import { createWindSound, playRustle, type LiveSound } from '../lib/audio';
import { Fog } from '../lib/fog';
import { Valley, coverLayout, toScreen, type CoverLayout, type ValleyPicture, type Vec2 } from '../lib/valley';
import { Birds } from '../lib/birds';
import { TreasureMap } from '../components/TreasureMap';
import { Greeting, type GreetShared } from './Greeting';
import type { StumpState } from '../three/StumpScene';
import valleyUrl from '../assets/valley.webp';
import masksUrl from '../assets/valley-masks.png';
import ambientUrl from '../assets/valley-morning.m4a';
import './sunrise.css';

// The 3D stump is its own download, fetched while the fog clears.
const loadStump = () => import('../three/StumpScene');
const StumpScene = lazy(loadStump);

const copy = content.sunrise;
const N = copy.messages.length;

// The picture, and where its painted (dawn) sun is (0–1 across, 0–1 down).
const PICTURE: ValleyPicture = { image: valleyUrl, masks: masksUrl, width: 2048, height: 1153, sun: [0.761, 0.315] };
// Which part of the picture a narrow phone keeps in view (sun + river).
const PICTURE_FOCUS: Vec2 = [0.72, 0.45];
// The point on screen the camera flies towards through the fog.
const FLY_TO: Vec2 = [0.55, 0.45];
const ZOOM_END = 1.04;
// Where the camera glides as she scrolls: down to the riverbank.
const GLIDE_TO: Vec2 = [0.5, 0.86];
// Phones zoom further; wide screens less, so a strip of sky (and the sun) stays in view.
const glideZoom = (aspect: number) => (aspect > 1 ? 1.2 : 1.45);
// The far point in the valley where the treasure trail starts.
const TRAIL_START: Vec2 = [0.7, 0.56];
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
// How far through the day this section of the story goes. The rest
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

// Scroll timeline layout (in timeline seconds; scrubbed by scrolling).
const T = {
  instructionOut: 0,
  trail: 0.04,
  mark: 0.5,
  glide: 0.45,
  unroll: 1.3,
  firstMessage: 1.6,
  nextMessages: 2.7,
  perMessage: 1.25,
};
const TIMELINE_LENGTH = T.nextMessages + (N - 1) * T.perMessage + 0.2;

interface Props {
  flying: boolean;  // start the flight through the fog
  entered: boolean; // page 1 is gone; this scene is in charge
}

export function Sunrise({ flying, entered }: Props) {
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const still = useRef<HTMLImageElement>(null);
  const valleyCanvas = useRef<HTMLCanvasElement>(null);
  const birdsCanvas = useRef<HTMLCanvasElement>(null);
  const fogCanvas = useRef<HTMLCanvasElement>(null);
  const fogSimple = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<{ dots: SVGPathElement | null; mask: SVGPathElement | null; compass: SVGGElement | null; mark: SVGGElement | null }>({
    dots: null, mask: null, compass: null, mark: null,
  });
  const [arrived, setArrived] = useState(false);
  const [noValley, setNoValley] = useState(false);
  // the valley picture is loaded and drawable (or we fell back to the still)
  const [pictureReady, setPictureReady] = useState(false);
  // the 3D meadow only renders every frame once she starts scrolling
  const [stumpRunning, setStumpRunning] = useState(false);
  const stumpLayer = useRef<HTMLDivElement>(null);
  const [noFog, setNoFog] = useState(false);
  // the bird on the branch has said hello and the bunting is up
  const [greeted, setGreeted] = useState(false);
  const greet = useRef<GreetShared>({ focus: 0, away: 0 }).current;

  // GSAP animates these numbers; the frame loop draws from them.
  const cam = useRef({
    // the flight through the fog
    travel: 0, haze: 1, light: 0, zoom: 1, life: 0,
    // the scroll story
    glide: 0, day: DAY_START, trail: 0, compass: 0, mark: 0, overlay: 1,
  }).current;
  const stump = useRef<StumpState>({ arrive: 0, day: 1, sunX: 0.3, sunY: 0.07, topX: 0, topY: 0, topWidth: 0 }).current;
  const wind = useRef<LiveSound | null>(null);
  const ambient = useRef<HTMLAudioElement | null>(null);
  const scrollingForward = useRef(true);

  // ── Effects: created once, fully cleaned up when the scene goes ──
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let valley: Valley | null = null;
    const fog = Fog.create(fogCanvas.current!);
    const birds = new Birds(birdsCanvas.current!);
    if (!fog) setNoFog(true);

    let W = 1, H = 1;
    let layout: CoverLayout = coverLayout(1, 1, PICTURE.width, PICTURE.height, PICTURE_FOCUS);
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      layout = coverLayout(W, H, PICTURE.width, PICTURE.height, PICTURE_FOCUS);
      valley?.resize(W, H);
      fog?.resize();
      birds.resize(W, H);
      if (track.current) track.current.style.height = `${Math.round(H * (1 + TIMELINE_LENGTH * 0.9))}px`;
      ScrollTrigger.refresh();
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

    let last = 0, lastTravel = 0, lastZoom = -1, lastMap = '';
    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
      last = now;
      const time = now / 1000;

      // the camera: flight zoom, then the glide down to the riverbank
      const g = cam.glide;
      // (the close-up on the bird pushes in a touch and softens the valley)
      const zoom = mix(cam.zoom, glideZoom(W / H), g) * (1 + greet.focus * 0.05);
      const center: Vec2 = [mix(FLY_TO[0], GLIDE_TO[0], g), mix(FLY_TO[1], GLIDE_TO[1], g)];
      const map = (uv: Vec2) => toScreen(uv, layout, zoom, center);
      const sunScreen = sunAt(cam.day, map(PICTURE.sun));
      stump.sunX = sunScreen[0];
      stump.sunY = sunScreen[1];

      if (valley) {
        // the moving sun: from its place on screen back to a point in the picture
        const sunUv: Vec2 = [
          layout.offset[0] + layout.span[0] * (center[0] + (sunScreen[0] - center[0]) / zoom),
          layout.offset[1] + layout.span[1] * (center[1] + (sunScreen[1] - center[1]) / zoom),
        ];
        valley.render({
          time, layout, zoom, zoomCenter: center, blur: g * 2.4 + greet.focus * 2.6, day: cam.day,
          sun: sunUv,
          sunAmount: cam.light * (1 - cam.haze) * (1 - clamp((cam.day - 2.6) / 0.4)),
          sunWarm: clamp((cam.day - 1.3) / 1.5),
        });
      } else if (still.current && Math.abs(zoom - lastZoom) > 0.00005) {
        still.current.style.transformOrigin = `${center[0] * 100}% ${center[1] * 100}%`;
        still.current.style.transform = `scale(${zoom.toFixed(5)})`;
        still.current.style.filter = greet.focus > 0.01 ? `blur(${(greet.focus * 6).toFixed(1)}px)` : '';
        lastZoom = zoom;
      }

      birds.render({ time, dt, toScreen: map, scale: (H / layout.span[1] / 941) * zoom, visible: cam.life * (1 - g) * (1 - greet.focus) });

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

      // the treasure trail: from a far point in the valley to the stump
      const tr = trailRefs.current;
      if (tr.dots && cam.overlay > 0.001) {
        const s = map(TRAIL_START);
        const sx = s[0] * W, sy = s[1] * H;
        const ex = W * 0.5, ey = H * 0.74;
        const d = `M${sx.toFixed(1)},${sy.toFixed(1)} C${(sx - W * 0.3).toFixed(1)},${(sy + H * 0.1).toFixed(1)} ${(ex + W * 0.38).toFixed(1)},${(ey - H * 0.16).toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
        tr.dots.setAttribute('d', d);
        tr.mask!.setAttribute('d', d);
        tr.mask!.style.strokeDashoffset = String(1 - cam.trail);
        tr.compass!.setAttribute('transform', `translate(${sx.toFixed(1)},${sy.toFixed(1)}) rotate(${(-200 * (1 - cam.compass) + time * 4).toFixed(1)}) scale(${cam.compass.toFixed(3)})`);
        tr.mark!.setAttribute('transform', `translate(${ex.toFixed(1)},${ey.toFixed(1)}) scale(${cam.mark.toFixed(3)})`);
      }

      // the 3D meadow stays invisible until the camera starts gliding down to it
      if (stumpLayer.current) stumpLayer.current.style.opacity = clamp(stump.arrive * 4).toFixed(3);

      // the map sits on the stump's sawn top
      stump.day = cam.day;
      const m = mapRef.current;
      if (m && stump.topWidth > 0) {
        const w = m.offsetWidth, h = m.offsetHeight;
        const x = stump.topX - w / 2;
        const y = stump.topY - h + stump.topWidth * 0.16;
        const tf = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) perspective(900px) rotateX(7deg) rotate(-1.2deg)`;
        if (tf !== lastMap) { m.style.transform = tf; lastMap = tf; }
      }

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
  }, [cam, stump, greet]);

  // ── The flight through the fog (automatic) ──────────────────
  useGSAP(
    () => {
      if (!flying) return;
      void loadStump(); // make sure the 3D meadow is on its way
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

  const live = arrived && entered && greeted;

  // ── The scroll story (one ScrollTrigger timeline) ───────────
  useGSAP(
    () => {
      if (!live) return;
      const reduced = prefersReducedMotion();
      const rise = (v: number) => (reduced ? 0 : v);

      // the instruction card comes in on its own; scrolling takes it away
      // (the card fades in on its inner layer; the scroll fades out the outer one,
      // so the two never fight over the same element)
      gsap.fromTo('.sunrise__instruction-card', { autoAlpha: 0, y: rise(12) }, { autoAlpha: 1, y: 0, duration: dur.text, ease: ease.enter, delay: 0.3 });

      const msgs = gsap.utils.toArray<HTMLElement>('.map__msg');
      const numerals = gsap.utils.toArray<HTMLElement>('.map__numeral');
      const bodies = msgs.map((m) => new SplitText(m.querySelector('.map__body'), { type: 'words,chars', charsClass: 'map__char' }));
      const caps = msgs.map((m) => m.querySelector('.map__dropcap'));

      ScrollTrigger.refresh();
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: track.current,
          scroller: scroller.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: reduced ? true : 1,
          onUpdate: (self) => {
            scrollingForward.current = self.direction >= 0;
            if (self.progress > 0.001) setStumpRunning(true);
          },
        },
      });

      // 1. the instruction leaves
      tl.fromTo('.sunrise__instruction', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: rise(-10), duration: 0.06, ease: ease.exit, immediateRender: false }, T.instructionOut);

      // the birds carry the bunting up and away
      tl.to(greet, { away: 1, duration: 0.5 }, 0);

      // 2. motion graphics: compass, trail, X
      tl.to(cam, { compass: 1, duration: 0.18, ease: 'back.out(1.6)' }, T.trail)
        .to(cam, { trail: 1, duration: 0.46, ease: 'sine.inOut' }, T.trail + 0.04)
        .to(cam, { mark: 1, duration: 0.12, ease: 'back.out(2.2)' }, T.mark);

      // 3. the camera glides down to the riverbank; the stump rises into view
      tl.to(cam, { glide: 1, duration: 0.85, ease: 'power2.inOut' }, T.glide)
        .to(stump, { arrive: 1, duration: 0.75, ease: 'power2.out' }, T.glide + 0.1)
        .to(cam, { overlay: 0, duration: 0.3, ease: ease.exit }, T.glide + 0.5)
        .to('.trail', { autoAlpha: 0, duration: 0.3, ease: ease.exit }, T.glide + 0.5);

      // 4. the map unrolls on the stump
      tl.set('.map', { autoAlpha: 1 }, T.unroll)
        .call(() => { if (scrollingForward.current) playRustle(); }, [], T.unroll + 0.01)
        .fromTo('.map__clip', { yPercent: 100 }, { yPercent: 0, duration: 0.36, ease: 'power2.out' }, T.unroll)
        .fromTo('.map__inner', { yPercent: -100 }, { yPercent: 0, duration: 0.36, ease: 'power2.out' }, T.unroll)
        .fromTo('.map__roll', { autoAlpha: 1, y: () => mapRef.current?.offsetHeight ?? 0 }, { y: 0, duration: 0.36, ease: 'power2.out' }, T.unroll)
        .to('.map__roll', { autoAlpha: 0, scaleY: 0.4, duration: 0.08, ease: ease.exit }, T.unroll + 0.34);

      // 5. the messages, written in letter by letter
      const write = (i: number, at: number) => {
        tl.set([msgs[i], numerals[i]], { visibility: 'visible' }, at)
          .from(numerals[i], { autoAlpha: 0, y: rise(-6), duration: 0.12, ease: ease.enter }, at)
          .from(caps[i], { autoAlpha: 0, scale: reduced ? 1 : 1.25, transformOrigin: '50% 60%', duration: 0.14, ease: ease.enter }, at + 0.04)
          .from(bodies[i].chars, {
            autoAlpha: 0,
            y: rise(3),
            duration: 0.1,
            ease: ease.enter,
            stagger: { amount: 0.42 },
            onComplete: () => buzz(8),
          }, at + 0.1);
      };
      const erase = (i: number, at: number) => {
        tl.to(bodies[i].chars, { autoAlpha: 0, duration: 0.06, ease: ease.exit, stagger: { amount: 0.1, from: 'end' } }, at)
          .to([caps[i], numerals[i]], { autoAlpha: 0, duration: 0.1, ease: ease.exit }, at + 0.06)
          .set([msgs[i], numerals[i]], { visibility: 'hidden' }, at + 0.18);
      };

      // the sun keeps moving the whole time she scrolls through the messages
      tl.fromTo(cam, { day: DAY_START }, { day: DAY_END, duration: TIMELINE_LENGTH - T.unroll, ease: 'none' }, T.unroll);

      write(0, T.firstMessage);
      for (let i = 1; i < N; i++) {
        const at = T.nextMessages + (i - 1) * T.perMessage;
        erase(i - 1, at);
        write(i, at + 0.2);
      }
      tl.to({}, { duration: TIMELINE_LENGTH - tl.duration() > 0 ? TIMELINE_LENGTH - tl.duration() : 0.01 });
      // When the night scene is built, it starts at the end of this scroll.
    },
    { scope: root, dependencies: [live] },
  );

  const instruction = useMemo(() => (isTouch ? copy.instruction.touch : copy.instruction.mouse), []);

  return (
    <section ref={root} className="scene sunrise" aria-label="The valley">
      <div ref={scroller} className={`sunrise__scroller${live ? ' is-live' : ''}`}>
        <div ref={track} className="sunrise__track">
          <div className="sunrise__stage">
            <div className="layer" aria-hidden="true">
              <img ref={still} className="layer sunrise__still" src={valleyUrl} alt=""
                style={{ objectPosition: `${PICTURE_FOCUS[0] * 100}% ${PICTURE_FOCUS[1] * 100}%` }} />
              <canvas ref={valleyCanvas} className="layer" hidden={noValley} />
              <canvas ref={birdsCanvas} className="layer" />
              <canvas ref={fogCanvas} className="layer" hidden={noFog} />
              <div ref={fogSimple} className="layer sunrise__fog-simple" hidden={!noFog} />

              {/* motion graphics: the treasure trail across the valley */}
              <svg className="layer trail">
                <defs>
                  <mask id="trail-reveal" maskUnits="userSpaceOnUse">
                    <path ref={(el) => { trailRefs.current.mask = el; }} pathLength={1} fill="none" stroke="#fff" strokeWidth={14} strokeDasharray="1 1" strokeDashoffset={1} />
                  </mask>
                </defs>
                <g mask="url(#trail-reveal)">
                  <path ref={(el) => { trailRefs.current.dots = el; }} className="trail__dots" />
                </g>
                <g ref={(el) => { trailRefs.current.compass = el; }} className="trail__compass">
                  <circle r="17" />
                  <path d="M0,-15 L4,0 L0,15 L-4,0Z" />
                  <path d="M-15,0 L0,-3 L15,0 L0,3Z" opacity="0.6" />
                  <path d="M0,-15 L4,0 L-4,0Z" className="trail__needle" />
                </g>
                <g ref={(el) => { trailRefs.current.mark = el; }} className="trail__mark">
                  <path d="M-11,-11 L11,11 M11,-11 L-11,11" />
                </g>
              </svg>
            </div>

            {/* mounted during the fog flight so its setup happens out of sight */}
            {flying && (
              <div ref={stumpLayer} className="layer" style={{ opacity: 0 }}>
                <Suspense fallback={null}>
                  <StumpScene state={stump} running={stumpRunning} />
                </Suspense>
              </div>
            )}

            <Greeting active={arrived && entered} shared={greet} onDone={() => setGreeted(true)} />

            <TreasureMap ref={mapRef} messages={copy.messages} initial={content.name.charAt(0)} />

            <div className="sunrise__instruction" role="note">
              <div className="sunrise__instruction-card">
                <span className="sunrise__instruction-icon" aria-hidden="true" />
                <p>{instruction}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
