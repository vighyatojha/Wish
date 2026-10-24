// ─────────────────────────────────────────────────────────────
//  The very end: his little storybook, "the story behind your surprise".
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
import paperUrl from '../assets/guide-paper.webp';
import dayUrl from '../assets/meaning-day.webp';
import nightUrl from '../assets/meaning-night.webp';
import './meaning.css';

export type HiddenKind = 'moon' | 'stars' | 'fireflies' | 'lamp' | 'birds';
const HIDDEN: HiddenKind[] = ['moon', 'stars', 'fireflies', 'lamp', 'birds'];

/** Start fetching the pictures early (they're small): call once the end is near. */
export function preloadMeaning(): void {
  for (const u of [guideUrl, paperUrl, dayUrl, nightUrl]) { const i = new Image(); i.decoding = 'async'; i.src = u; }
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

function Panel({ crop, tilt = 0, className = '', children }: { crop: Crop; tilt?: number; className?: string; children?: React.ReactNode }) {
  const [x0, y0, x1, y1] = crop.r, w = x1 - x0, h = y1 - y0;
  const style: CSSProperties = {
    backgroundImage: `url(${crop.img === 'day' ? dayUrl : nightUrl})`,
    backgroundSize: `${100 / w}% ${100 / h}%`,
    backgroundPosition: `${w >= 1 ? 0 : (x0 / (1 - w)) * 100}% ${h >= 1 ? 0 : (y0 / (1 - h)) * 100}%`,
    ['--ar' as string]: `${(w * 1600) / (h * 900)}`,
    rotate: `${tilt}deg`,
  };
  return (
    <div className={`book__panel ${className}`} style={style}>
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

interface Props {
  /** how many times she opened each hidden message */
  found: Record<HiddenKind, number>;
  /** a hidden message's text (its first line) */
  read: (kind: HiddenKind) => { title: string; line: string };
  onClose: () => void;
  onReplay: () => void;
}

export function Meaning({ found, read, onClose, onReplay }: Props) {
  const M = content.meaning;
  const missed = useMemo(() => HIDDEN.filter((k) => !found[k]), [found]);
  // pages: 0 = what she missed, 1…n = what it meant, n+1 = thank you
  const last = M.steps.length + 1;
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<HiddenKind | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const busy = useRef(false);


  // he only appears for the last pages: from "today, I'm the bus that came to wish you" to the end
  const himFrom = M.steps.findIndex((st) => st.at === 'colours') + 1;
  const [shown, setShown] = useState(false);

  // ── the book opens: it rises softly into view over her flowers ──
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.book', { autoAlpha: 0, y: 40, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, delay: 0.35, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, []);

  // ── he arrives: a ball of paper settles onto the page, opens out into a folded letter,
  //    and the letter unfolds into him, all in one smooth movement ──
  useLayoutEffect(() => {
    if (!shown || !guide.current) return;
    const g = guide.current;
    const ball = g.querySelector('.book__ball')!, letter = g.querySelector('.book__letter')!;
    const folds = g.querySelectorAll('.book__fold'), whole = g.querySelector('.book__whole')!;
    const sig = g.parentElement!.querySelector('.book__sig')!;
    gsap.set(ball, { autoAlpha: 0, y: -40, scale: 0.5, rotate: -12 });
    gsap.set([letter, whole, sig], { autoAlpha: 0 });
    gsap.set(letter, { scale: 0.88 });
    gsap.set(folds[0], { rotateX: -178 }); gsap.set(folds[2], { rotateX: 178 });
    const tl = gsap.timeline({ delay: 0.3 })
      // the paper ball drifts down onto the page…
      .to(ball, { autoAlpha: 1, y: 0, scale: 0.62, rotate: 0, duration: 0.8, ease: 'power2.out' })
      // …loosens a little…
      .to(ball, { scale: 0.7, rotate: 4, duration: 0.5, ease: 'sine.inOut' })
      // …and opens out into a folded letter (the two cross-fade as one)
      .to(ball, { scale: 0.98, rotate: 0, autoAlpha: 0, duration: 0.6, ease: 'power1.inOut' })
      .to(letter, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power1.inOut' }, '<')
      // the letter unfolds: the top third and the bottom third open together, gently
      .to(folds[0], { rotateX: 0, duration: 1.1, ease: 'power2.inOut' }, '-=0.1')
      .to(folds[2], { rotateX: 0, duration: 1.1, ease: 'power2.inOut' }, '<0.12')
      // (then the three panels give way to the one whole picture: it looks the same, but has no seams)
      .to(whole, { autoAlpha: 1, duration: 0.25 })
      .set(letter, { autoAlpha: 0 })
      .to(sig, { autoAlpha: 1, duration: 0.7, ease: 'power1.out' }, '-=0.1');
    return () => { tl.kill(); };
  }, [shown]);

  /** he folds back up into a letter, closes into a ball of paper, and drifts away */
  const foldAway = () => {
    const g = guide.current;
    const tl = gsap.timeline();
    if (!g) return tl;
    const ball = g.querySelector('.book__ball')!, letter = g.querySelector('.book__letter')!;
    const folds = g.querySelectorAll('.book__fold'), whole = g.querySelector('.book__whole')!;
    return tl
      .to(g.parentElement!.querySelector('.book__sig'), { autoAlpha: 0, duration: 0.3 })
      .set(letter, { autoAlpha: 1, scale: 1 })
      .set(whole, { autoAlpha: 0 })
      .to(folds[2], { rotateX: 178, duration: 0.85, ease: 'power2.inOut' })
      .to(folds[0], { rotateX: -178, duration: 0.85, ease: 'power2.inOut' }, '<0.1')
      .fromTo(ball, { autoAlpha: 0, scale: 0.98, y: 0, rotate: 0 }, { autoAlpha: 1, scale: 0.68, rotate: 6, duration: 0.5, ease: 'power1.inOut' })
      .to(letter, { autoAlpha: 0, scale: 0.88, duration: 0.5, ease: 'power1.inOut' }, '<')
      .to(ball, { autoAlpha: 0, y: -36, scale: 0.5, rotate: 14, duration: 0.6, ease: 'power1.in' });
  };

  // ── turning a page: the old page slides softly away, the next slides in ──
  const turn = (to: number) => {
    if (busy.current || to < 0 || to > last || to === page) return;
    busy.current = true;
    const dir = to > page ? 1 : -1, him = to >= himFrom;
    const tl = gsap.timeline({ onComplete: () => { busy.current = false; } });
    if (shown && !him) tl.add(foldAway());   // (going back before his pages: he folds away first)
    tl.to(sheet.current, { autoAlpha: 0, x: -28 * dir, duration: 0.32, ease: 'power1.in' })
      .add(() => { setPage(to); setOpen(null); if (him !== shown) setShown(him); })
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

  const step = page >= 1 && page < last ? M.steps[page - 1] : null;
  const n = missed.length;

  return (
    <div ref={root} className="bookveil" role="dialog" aria-label={M.cover}>
      <div className="book">
        <button type="button" className="book__x" aria-label={M.close} onClick={() => leave(onClose)}>×</button>
        <p className="book__cover">{M.cover}</p>

        <div className={`book__spread${shown ? ' book__spread--him' : ''}${page === last ? ' book__spread--end' : ''}`}>
          {/* him (only on the last pages): a crumpled paper that unfolds into his portrait, and his name */}
          {shown && (
            <div className="book__narrator">
              <div ref={guide} className="book__guide" aria-hidden="true">
                <img className="book__ball" src={paperUrl} alt="" draggable={false} />
                <img className="book__whole" src={guideUrl} alt="" draggable={false} />
                <div className="book__letter">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`book__fold book__fold--${i}`}>
                      <div className="book__face" style={{ backgroundImage: `url(${guideUrl})` }} />
                      <div className="book__paperback" style={{ WebkitMaskImage: `url(${guideUrl})`, maskImage: `url(${guideUrl})` }} />
                    </div>
                  ))}
                </div>
              </div>
              <p className="book__sig">{M.signature}</p>
            </div>
          )}

          {/* the page */}
          <div ref={sheet} className="book__sheet" aria-live="polite">
            {page === 0 && (
              <>
                <p className="book__caption">{n ? M.missedTitle : M.foundAll}</p>
                {n > 0 && (
                  <>
                    <div className="book__grid">
                      {missed.map((k, i) => (
                        <button key={k} type="button" className={`book__thumb${open === k ? ' is-on' : ''}`} onClick={() => setOpen(open === k ? null : k)}>
                          <Panel crop={PANELS[`h_${k}`]} tilt={i % 2 ? 1.2 : -1.2} />
                          <span>{M.hidden[k]}</span>
                        </button>
                      ))}
                    </div>
                    <p className="book__balloon">
                      {open ? <><strong>{read(open).title}</strong> {read(open).line}</> : M.missedText}
                    </p>
                  </>
                )}
                {n === 0 && <Panel crop={PANELS.end} tilt={-1} />}
              </>
            )}
            {step && (
              <>
                <Panel crop={PANELS[step.at]} tilt={page % 2 ? -1.2 : 1.2}>
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
            {page === last && (
              <>
                <p className="book__caption">{M.thanks}</p>
                <div className="book__balloon">
                  <p>{M.endNote}</p>
                  <p className="book__ps">{n ? M.psMissed.replace('{n}', String(n)) : M.psFound}</p>
                </div>
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
