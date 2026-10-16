// ─────────────────────────────────────────────────────────────
//  Page 1: the white page
//
//  1. "Tap to begin"  → sound on, fullscreen, portrait lock
//  2. Greeting + question, written in word by word
//  3. Right answer    → rain starts, the paper soaks, the ink
//                       runs, and the sheet falls apart to reveal
//                       the fog scene underneath.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { content } from '../content';
import { InkText } from '../components/InkText';
import { gsap, useGSAP, ease, dur } from '../lib/motion';
import { unlockAudio, createRainSound } from '../lib/audio';
import { enterImmersive, keepAwake, buzz, settleViewport, prefersReducedMotion } from '../lib/device';
import { Paper } from '../lib/paper';
import { Rain, WetMap } from '../lib/rain';
import { paintInk } from '../lib/ink';
import { saveResponse } from '../lib/firebase';
import './intro.css';

const copy = content.intro;

// Ignore capitals, accents, punctuation and extra spaces.
const normalise = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ऀ-ॿ]+/g, ' ').trim();
const accepted = new Set<string>(copy.answers.map(normalise));

interface Props {
  onRainStart: () => void;      // put the next scene underneath
  onPaperBreaking: () => void;  // the fog flight can begin
  onDone: () => void;           // page 1 is gone
}

type Phase = 'tap' | 'question' | 'rain';

export function Intro({ onRainStart, onPaperBreaking, onDone }: Props) {
  const root = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const paperCanvas = useRef<HTMLCanvasElement>(null);
  const rainCanvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('tap');
  const [feedback, setFeedback] = useState('');
  const [wet, setWet] = useState(false);
  const attempts = useRef(0);
  const busy = useRef(false);
  const stopEffects = useRef<(() => void) | null>(null);

  const { contextSafe } = useGSAP({ scope: root });

  // ── 1. First tap ───────────────────────────────────────────
  const begin = () => {
    // these must run while the tap is still "fresh"
    unlockAudio();
    void enterImmersive();
    void keepAwake();
    buzz(12);
    setPhase('question');
  };

  // ── 2. The page writes itself in ───────────────────────────
  useGSAP(
    () => {
      if (phase !== 'question') return;
      const reduced = prefersReducedMotion();
      gsap
        .timeline()
        .to('.intro__tap', { autoAlpha: 0, duration: dur.ui, ease: ease.exit })
        .set('.intro__page', { autoAlpha: 1 })
        .from('.intro__greeting .w', {
          autoAlpha: 0,
          y: reduced ? 0 : 14,
          duration: dur.text,
          ease: ease.enter,
          stagger: 0.08,
          clearProps: 'transform',
        })
        .from(
          '.intro__form > *',
          { autoAlpha: 0, y: reduced ? 0 : 10, duration: dur.text, ease: ease.enter, stagger: 0.07, clearProps: 'transform' },
          '-=0.15',
        );
    },
    { scope: root, dependencies: [phase] },
  );

  // a new hint or message fades in softly
  useGSAP(
    () => {
      if (feedback) gsap.from('.intro__feedback .w', { autoAlpha: 0, y: 4, duration: dur.ui, ease: ease.enter, stagger: 0.02 });
    },
    { scope: root, dependencies: [feedback] },
  );

  // ── 3. Answer ──────────────────────────────────────────────
  const onSubmit = contextSafe((event: FormEvent) => {
    event.preventDefault();
    const input = inputRef.current!;
    if (busy.current) return;
    const raw = input.value;
    const answer = normalise(raw);
    if (!answer) {
      input.focus();
      return;
    }

    attempts.current += 1;
    const n = attempts.current;
    const correct = accepted.has(answer);
    void saveResponse({ scene: 'intro', question: copy.question, answer: raw.trim(), correct, attempt: n });

    if (correct) return void letIn();
    if (n >= copy.letInAfter) {
      setFeedback(copy.letInMessage);
      busy.current = true;
      window.setTimeout(letIn, 1400);
      return;
    }

    buzz(45);
    // a small "no" shake (a quick micro-interaction, transform only)
    gsap.fromTo(input, { x: 0 }, { keyframes: { x: [0, -7, 6, -4, 2, 0] }, duration: 0.32, ease: ease.enter });
    const hint = copy.hints[n - 2];
    setFeedback(n === 1 || !hint ? copy.wrongMessage : hint);
    input.select();
  });

  async function letIn() {
    busy.current = true;
    buzz([18, 70, 18]);
    const input = inputRef.current!;
    input.readOnly = true;
    input.blur(); // closes the keyboard
    setFeedback('');
    await settleViewport(); // wait until the page stops resizing
    await document.fonts.ready;
    requestAnimationFrame(() => startRain());
  }

  // ── 4. Rain, soak, dissolve ─────────────────────────────────
  const startRain = contextSafe(() => {
    setPhase('rain');
    const reduced = prefersReducedMotion();
    const W = window.innerWidth;
    const H = window.innerHeight;
    // full sharpness while dry so the swap is invisible, lighter once the ink blurs
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const wetDpr = Math.min(dpr, 1.5);
    let lowRes = dpr <= wetDpr;

    let paper = Paper.create(paperCanvas.current!);
    const wetMap = new WetMap(W / H);
    const rain = new Rain(rainCanvas.current!, (u, v, depth) => wetMap.add(u, v, depth), reduced ? 0.5 : 1);
    const sound = createRainSound();

    onRainStart();

    const st = { rain: 0, soak: 0, dissolve: 0, tint: 0, dim: 0 };
    if (paper) {
      paper.resize(W, H, dpr);
      paper.setInk(paintInk(pageRef.current!, W, H, dpr));
      paper.setWet(wetMap.canvas);
      paper.render({ time: 0, ...st });
      // swap page → paper in the same frame, so nothing flickers
      setWet(true);
      pageRef.current!.style.visibility = 'hidden';
    }

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(st, { rain: 0.22, dim: 0.035, duration: 1.6, ease: 'sine.out' }, 0.2)    // first drops
      .to(st, { rain: 1, duration: 3.2, ease: 'power1.in' }, 2.4)                  // downpour
      .to(st, { soak: 1, duration: 5.2, ease: ease.scenery }, 3.4)                 // the sheet soaks through
      .to(st, { dissolve: 1, duration: 5.0, ease: 'power1.in' }, 8.2)              // and falls apart
      .call(onPaperBreaking, [], 8.8)                                              // the fog flight can begin
      .to(st, { tint: 1, duration: 2.5, ease: 'none' }, 9.4)                       // rain turns pale against the fog
      .to(st, { rain: 0, duration: 3.4, ease: ease.scenery }, 11.4);               // and eases off
    if (!paper) {
      // simple version for phones without WebGL2: the page just fades
      tl.to(pageRef.current, { autoAlpha: 0, duration: 4, ease: 'power1.in' }, 8.2)
        .to(root.current, { backgroundColor: 'rgba(255,255,255,0)', duration: 4, ease: 'power1.in' }, 8.2);
    }
    if (reduced) tl.timeScale(1.6);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      rain.update(dt, st.rain, st.dissolve < 0.85);
      rain.draw(st.tint);
      sound.setLevel(st.rain);
      if (paper) {
        if (!lowRes && st.soak > 0.25) {
          paper.resize(W, H, wetDpr);
          lowRes = true;
        }
        wetMap.update(now);
        paper.setWet(wetMap.canvas);
        paper.render({ time: now / 1000, soak: st.soak, dissolve: st.dissolve, dim: st.dim });
        if (st.dissolve >= 1) {
          root.current?.classList.add('is-gone'); // let touches reach the next scene
          paperCanvas.current!.style.display = 'none';
          paper.destroy();
          paper = null;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // full cleanup: stop the loop, free the GPU, empty the particle arrays
    stopEffects.current = () => {
      cancelAnimationFrame(raf);
      paper?.destroy();
      paper = null;
      rain.destroy();
      wetMap.destroy();
      sound.stop(1.2);
    };

    function finish() {
      stopEffects.current?.();
      stopEffects.current = null;
      onDone();
    }
  });

  // if page 1 is removed early, still clean everything up
  useEffect(() => () => stopEffects.current?.(), []);

  return (
    <section ref={root} className={`scene intro${wet ? ' is-wet' : ''}`} aria-label="Opening">
      {phase === 'tap' || phase === 'question' ? (
        <button className="intro__tap" type="button" onClick={begin} disabled={phase !== 'tap'}>
          <span className="intro__tap-text">{copy.tapPrompt}</span>
        </button>
      ) : null}

      <div className="intro__page" ref={pageRef} style={{ visibility: 'hidden' }}>
        <header className="intro__greeting">
          <InkText className="intro__hello" text={copy.greeting} />
          <InkText as="h1" className="intro__name" text={content.name} />
        </header>

        <form className="intro__form" autoComplete="off" noValidate onSubmit={onSubmit}>
          <InkText as="label" className="intro__question" htmlFor="intro-answer" text={copy.question} />
          <input
            ref={inputRef}
            id="intro-answer"
            className="intro__input"
            name="answer"
            type="text"
            data-ink-input=""
            placeholder={copy.placeholder}
            enterKeyHint="go"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={80}
          />
          <InkText as="button" className="intro__submit" type="submit" text={copy.button} />
          <InkText className="intro__feedback" role="status" aria-live="polite" text={feedback} />
        </form>
      </div>

      <canvas ref={paperCanvas} className="layer intro__paper" aria-hidden="true" />
      <canvas ref={rainCanvas} className="layer intro__rain" aria-hidden="true" />
    </section>
  );
}
