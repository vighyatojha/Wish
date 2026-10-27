// ─────────────────────────────────────────────────────────────
//  The very end: his little book, "what everything here means".
//  It opens over her flowers (they stay there, dimmed, behind it), like a
//  comic: each page is one framed picture cut from the scene she just
//  watched, with a caption and a speech balloon from him.
//  He appears as her guide: a crumpled ball of paper drops onto the book,
//  opens, and unfolds (like a letter folded in three) into his portrait.
//  Page 1: the hidden messages she didn't find (she can read them there).
//  Then a page for each thing in the scene and what it meant, his thanks,
//  and a P.S. When she closes it, he folds back up and the book shuts.
// ─────────────────────────────────────────────────────────────
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { content } from '../content';
import { AnimalArt } from './Animals';
import { GrainPattern } from './CuteBird';
import guideUrl from '../assets/guide.webp';
import { Unfurl } from '../lib/unfurl';
import { TypeGarden } from '../lib/typegarden';
import dayUrl from '../assets/meaning-day.webp';
import nightUrl from '../assets/meaning-night.webp';
import './meaning.css';

export type HiddenKind = 'moon' | 'stars' | 'fireflies' | 'lamp' | 'birds';
const HIDDEN: HiddenKind[] = ['moon', 'stars', 'fireflies', 'lamp', 'birds'];

/** Start fetching the pictures early (they're small): call once the end is near. */
export function preloadMeaning(): void {
  fetchPictures();
  const g = new Image(); g.decoding = 'async'; g.src = guideUrl;
}

// Each panel is a piece of one of the two pictures of the scene (day, night: 1600×900),
// given as [x0, y0, x1, y1], shares of the picture.
type Crop = { img: 'day' | 'night'; r: [number, number, number, number]; extra?: 'birds' | 'bunny' };
const PANELS: Record<string, Crop> = {
  stop: { img: 'day', r: [0, 0.08, 1, 0.92] },
  sky: { img: 'day', r: [0, 0, 0.62, 0.36], extra: 'birds' },
  clouds: { img: 'day', r: [0.6, 0, 1, 0.52] },
  bus: { img: 'day', r: [0.03, 0.3, 0.6, 0.76] },
  door: { img: 'day', r: [0.4, 0.36, 0.68, 0.76], extra: 'bunny' },
  lamp: { img: 'night', r: [0.5, 0.28, 0.78, 0.92] },
  moon: { img: 'night', r: [0.34, 0, 0.66, 0.3] },
  fireflies: { img: 'night', r: [0, 0.55, 1, 1] },
  colours: { img: 'day', r: [0.06, 0.36, 0.6, 0.72] },
  end: { img: 'night', r: [0, 0, 1, 1] },
  // the little panels for the hidden messages she missed
  h_moon: { img: 'night', r: [0.4, 0.02, 0.6, 0.24] },
  h_stars: { img: 'night', r: [0.04, 0, 0.3, 0.26] },
  h_fireflies: { img: 'night', r: [0.1, 0.7, 0.4, 0.98] },
  h_lamp: { img: 'night', r: [0.56, 0.3, 0.74, 0.62] },
  h_birds: { img: 'day', r: [0.1, 0, 0.42, 0.26], extra: 'birds' },
};

/** whether each of the two pictures has arrived (they're small, but on a slow connection it can take a moment) */
const arrived: Record<'day' | 'night', boolean> = { day: false, night: false };
const waiting = new Set<() => void>();
let fetching = false;
/** starts fetching the two pictures (once); only called near the end, never while the scene loads */
function fetchPictures() {
  if (fetching) return;
  fetching = true;
  for (const [k, u] of [['day', dayUrl], ['night', nightUrl]] as const) {
    const i = new Image();
    i.decoding = 'async';
    i.onload = () => { arrived[k] = true; waiting.forEach((f) => f()); };
    i.onerror = () => { arrived[k] = true; waiting.forEach((f) => f()); }; // (don't shimmer forever)
    i.src = u;
  }
}
function useArrived(k: 'day' | 'night') {
  const [ok, setOk] = useState(arrived[k]);
  useLayoutEffect(() => {
    if (ok) return;
    fetchPictures();
    const f = () => { if (arrived[k]) setOk(true); };
    waiting.add(f); f();
    return () => { waiting.delete(f); };
  }, [k, ok]);
  return ok;
}

function Panel({ crop, tilt = 0, className = '', children }: { crop: Crop; tilt?: number; className?: string; children?: React.ReactNode }) {
  const ready = useArrived(crop.img);
  const [x0, y0, x1, y1] = crop.r, w = x1 - x0, h = y1 - y0;
  const style: CSSProperties = {
    backgroundImage: `url(${crop.img === 'day' ? dayUrl : nightUrl})`,
    backgroundSize: `${100 / w}% ${100 / h}%`,
    backgroundPosition: `${w >= 1 ? 0 : (x0 / (1 - w)) * 100}% ${h >= 1 ? 0 : (y0 / (1 - h)) * 100}%`,
    ['--ar' as string]: `${(w * 1600) / (h * 900)}`,
    rotate: `${tilt}deg`,
  };
  return (
    <div className={`book__panel ${ready ? '' : 'is-loading '}${className}`} style={style}>
      {crop.extra === 'birds' && (
        <div className="book__birds" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <svg key={i} className={`book__bird${i % 2 ? ' is-dark' : ''}`} viewBox="0 0 40 16" style={{ top: `${10 + (i * 37) % 55}%`, animationDelay: `${-i * 1.9}s` }}>
              <path d="M2,10 Q10,1 20,9 Q30,1 38,10 Q30,6 20,13 Q10,6 2,10Z" />
            </svg>
          ))}
        </div>
      )}
      {crop.extra === 'bunny' && (
        <svg className="book__bunny" viewBox="0 0 200 200" aria-hidden="true">
          <defs><GrainPattern id="grain-book" /></defs>
          <AnimalArt kind="bunny" grain="grain-book" />
        </svg>
      )}
      {children}
    </div>
  );
}

/** "Thank you", growing in roses on the page: ink letters, red roses, green stems, on the book's paper */
function GardenWords({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    let tg: TypeGarden | null = null, gone = false;
    const timers: number[] = [];
    void document.fonts.load('700 100px "Playfair Display"').catch(() => {}).then(() => {
      if (gone || !ref.current) return;
      tg = new TypeGarden(ref.current, {
        palette: ['paper', 'transparent', '#e3344c', '#3f8a4a', '#fff4ea', '#2b2420', '#1d4a26'],
        flowers: ['#e3344c', '#f2789f', '#f2b92e', '#f39a6b', '#a77fd8'],
        transparent: true, interactive: false, caret: false, scale: 0.42, density: 0.75, legible: true,
        maxDpr: 2, font: '"Playfair Display",Georgia,serif',
      });
      tg.start();
      let at = 350;
      for (const ch of text) { timers.push(window.setTimeout(() => tg?.type(ch), at)); at += ch === ' ' ? 300 : 210; }
    });
    return () => { gone = true; timers.forEach(clearTimeout); tg?.destroy(); };
  }, [text]);
  return <canvas ref={ref} className="book__garden" aria-label={text} role="img" />;
}

interface Props {
  /** how many times she opened each hidden message */
  found: Record<HiddenKind, number>;
  onClose: () => void;
  onReplay: () => void;
}

export function Meaning({ found, onClose, onReplay }: Props) {
  const M = content.meaning;
  const missed = useMemo(() => HIDDEN.filter((k) => !found[k]), [found]);
  // pages: 0 = what she missed, 1…n = what it meant, n+1 = thank you
  // pages: what each thing means (one page each; he arrives on the last of them, the bus's colours),
  // then his thanks, then a P.S.: the hidden messages she missed
  const S = M.steps.length, thanksPage = S, last = S + 1;
  const [page, setPage] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const busy = useRef(false);


  // he only appears for the last pages: from "today, I'm the bus that came to wish you" to the end
  const himFrom = M.steps.findIndex((st) => st.at === 'colours');
  const [shown, setShown] = useState(false);

  // ── the book opens: it rises softly into view over her flowers ──
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.book', { autoAlpha: 0, y: 40, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, delay: 0.35, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, []);

  // ── he arrives: a crumpled ball of paper drops onto the page and slowly opens out, its hole
  //    widening to reveal him, until he's standing on the smoothed-out sheet ──
  const unfurl = useRef<Unfurl | null>(null);
  const paperCanvas = useRef<HTMLCanvasElement>(null);
  const openness = useRef({ t: 0, paper: 1 });
  useLayoutEffect(() => {
    if (!shown || !guide.current || !paperCanvas.current) return;
    const g = guide.current, sig = g.parentElement!.querySelector('.book__sig')!;
    const img = new Image();
    img.src = guideUrl;
    const u = (unfurl.current = new Unfurl(paperCanvas.current, img));
    if (location.search.includes('debug')) Object.assign(window, { __unfurl: u }); // (tests can draw any moment of it)
    const fit = () => { u.resize(); u.draw(openness.current.t, openness.current.paper); };
    const ro = new ResizeObserver(fit);
    ro.observe(paperCanvas.current);
    openness.current.t = 0; openness.current.paper = 1;
    gsap.set(sig, { autoAlpha: 0 });
    gsap.set(paperCanvas.current, { autoAlpha: 0, y: -50, rotate: -18 });
    let tl: gsap.core.Timeline | null = null;
    const go = () => {
      fit();
      tl = gsap.timeline({ delay: 0.25 })
        // the ball drops softly onto the page…
        .to(paperCanvas.current, { autoAlpha: 1, y: 0, rotate: 0, duration: 0.8, ease: 'power2.out' })
        // …and opens out, slowly at first, then all the way
        .to(openness.current, { t: 1, duration: 2.6, ease: 'none', onUpdate: () => u.draw(openness.current.t, openness.current.paper) }, '-=0.25')
        .to(sig, { autoAlpha: 1, duration: 0.7, ease: 'power1.out' }, '-=0.3')
        // …and once he's out, the paper fades away, leaving just him
        .to(openness.current, { paper: 0, duration: 0.8, ease: 'power1.inOut', onUpdate: () => u.draw(openness.current.t, openness.current.paper) }, '-=0.2');
    };
    if (img.complete) go(); else img.onload = go;
    return () => { tl?.kill(); ro.disconnect(); };
  }, [shown]);

  /** he folds back up: the sheet crumples back into a ball around him, and it drifts away */
  const foldAway = () => {
    const tl = gsap.timeline();
    const u = unfurl.current, c = paperCanvas.current, g = guide.current;
    if (!u || !c || !g) return tl;
    return tl
      .to(g.parentElement!.querySelector('.book__sig'), { autoAlpha: 0, duration: 0.3 })
      .to(openness.current, { paper: 1, duration: 0.4, ease: 'power1.out', onUpdate: () => u.draw(openness.current.t, openness.current.paper) })
      .to(openness.current, { t: 0.12, duration: 1.5, ease: 'power1.inOut', onUpdate: () => u.draw(openness.current.t, openness.current.paper) })
      .to(c, { autoAlpha: 0, y: -40, rotate: 14, duration: 0.5, ease: 'power1.in' });
  };

  // ── turning a page: the old page slides softly away, the next slides in ──
  const turn = (to: number) => {
    if (busy.current || to < 0 || to > last || to === page) return;
    busy.current = true;
    const dir = to > page ? 1 : -1, him = to >= himFrom;
    const tl = gsap.timeline({ onComplete: () => { busy.current = false; } });
    if (shown && !him) tl.add(foldAway());   // (going back before his pages: he folds away first)
    tl.to(sheet.current, { autoAlpha: 0, x: -28 * dir, duration: 0.32, ease: 'power1.in' })
      .add(() => { setPage(to); if (him !== shown) setShown(him); })
      .fromTo(sheet.current, { autoAlpha: 0, x: 28 * dir }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'power2.out', delay: 0.04 });
  };

  // ── it closes: (if he's there) he folds back up, and the book sinks softly away ──
  const leave = (then: () => void) => {
    if (busy.current) return;
    busy.current = true;
    const tl = gsap.timeline({ onComplete: then }).to(sheet.current, { autoAlpha: 0, duration: 0.35, ease: 'power1.in' });
    if (shown) tl.add(foldAway(), '<');
    tl.to(root.current!.querySelector('.book'), { autoAlpha: 0, y: 30, scale: 0.97, duration: 0.6, ease: 'power2.in' })
      .to(root.current, { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, '-=0.3');
  };

  const step = page < S ? M.steps[page] : null;
  const n = missed.length;

  return (
    <div ref={root} className="bookveil" role="dialog" aria-label={M.cover}>
      <div className="book">
        <button type="button" className="book__x" aria-label={M.close} onClick={() => leave(onClose)}>×</button>
        <p className="book__cover">{M.cover}</p>

        <div className={`book__spread${shown ? ' book__spread--him' : ''}${page === thanksPage ? ' book__spread--end' : ''}${page === last ? ' book__spread--ps' : ''}`}>
          {/* him (only on the last pages): a crumpled paper that unfolds into his portrait, and his name */}
          {shown && (
            <div className="book__narrator">
              <div ref={guide} className="book__guide" aria-hidden="true">
                <canvas ref={paperCanvas} className="book__unfurl" />
              </div>
              <p className="book__sig">{M.signature}</p>
            </div>
          )}

          {/* the page */}
          <div ref={sheet} className="book__sheet" aria-live="polite">
            {step && (
              <>
                <Panel crop={PANELS[step.at]} tilt={page % 2 ? 1.2 : -1.2}>
                  <p className="book__caption book__caption--on">{step.title}</p>
                </Panel>
                <div className="book__balloon">
                  <p>{step.text}</p>
                  {step.at === 'colours' && (
                    <ul className="book__colours">
                      {M.colours.map(([col, name, feel]) => (
                        <li key={name}><span style={{ background: col }} /><b>{name}</b> {feel}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
            {page === thanksPage && (
              <>
                <GardenWords text={M.thanksGarden} />
                <p className="book__balloon book__balloon--thanks">{M.thanks}</p>
              </>
            )}
            {page === last && (
              <>
                <p className="book__caption">{n ? M.missedTitle : M.foundAll}</p>
                {n > 0 && (
                  <>
                    <div className="book__grid">
                      {missed.map((k, i) => (
                        <div key={k} className="book__thumb">
                          <Panel crop={PANELS[`h_${k}`]} tilt={i % 2 ? 1.2 : -1.2} />
                          <span>{M.hidden[k]}</span>
                        </div>
                      ))}
                    </div>
                    <p className="book__balloon">{M.missedText}</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="book__nav">
          <span className="book__dots" aria-hidden="true">
            {Array.from({ length: last + 1 }, (_, i) => <i key={i} className={i === page ? 'is-on' : ''} />)}
          </span>
          {page > 0 && <button type="button" className="book__back" onClick={() => turn(page - 1)}>{M.back}</button>}
          {page < last ? (
            <button type="button" className="book__next" onClick={() => turn(page + 1)}>{M.next} ›</button>
          ) : (
            <>
              <button type="button" className="book__back" onClick={() => leave(onReplay)}>{content.finale.replay}</button>
              <button type="button" className="book__next" onClick={() => leave(onClose)}>{M.close}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
