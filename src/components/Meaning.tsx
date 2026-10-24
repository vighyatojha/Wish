// ─────────────────────────────────────────────────────────────
//  The last screen: "the story behind your surprise".
//  He appears as her guide: a crumpled ball of paper drops in, opens,
//  and unfolds (like a letter folded in three) into his portrait.
//  First he shows her the hidden messages she didn't find (she can read
//  them right here), then he walks her through the scene: the camera
//  moves to each thing (the sky, the clouds, the bus, the lamp, the moon,
//  the fireflies…) and he says, in a line or two, what it meant.
//  At the end he folds back up into paper and is gone.
// ─────────────────────────────────────────────────────────────
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

// the two pictures are 1600×900 captures of the scene (u, v: 0–1 across them)
const IW = 1600, IH = 900;
type Shot = { img: 'day' | 'night'; u: number; v: number; zoom: number; spot: number };
const SHOTS: Record<string, Shot> = {
  missed: { img: 'night', u: 0.5, v: 0.45, zoom: 1.04, spot: 0 },
  stop: { img: 'day', u: 0.42, v: 0.5, zoom: 1.05, spot: 0 },
  sky: { img: 'day', u: 0.5, v: 0.2, zoom: 1.15, spot: 0.5 },
  clouds: { img: 'day', u: 0.79, v: 0.25, zoom: 1.35, spot: 0.34 },
  bus: { img: 'day', u: 0.33, v: 0.56, zoom: 1.3, spot: 0.36 },
  door: { img: 'day', u: 0.535, v: 0.62, zoom: 1.7, spot: 0.24 },
  lamp: { img: 'night', u: 0.641, v: 0.5, zoom: 1.5, spot: 0.3 },
  moon: { img: 'night', u: 0.5, v: 0.12, zoom: 1.5, spot: 0.2 },
  fireflies: { img: 'night', u: 0.5, v: 0.84, zoom: 1.12, spot: 0.46 },
  colours: { img: 'day', u: 0.33, v: 0.56, zoom: 1.25, spot: 0.38 },
  end: { img: 'night', u: 0.5, v: 0.45, zoom: 1.0, spot: 0 },
};
const DOOR_FOOT: [number, number] = [0.535, 0.7];

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
  // pages: 0 = what she missed, 1…n = the meanings, n+1 = thank you
  const last = M.steps.length + 1;
  const [page, setPage] = useState(0);
  const [typing, setTyping] = useState(true);
  const [open, setOpen] = useState<HiddenKind | null>(null);
  const [size, setSize] = useState({ W: window.innerWidth, H: window.innerHeight });
  const root = useRef<HTMLDivElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);

  useEffect(() => {
    const r = () => setSize({ W: window.innerWidth, H: window.innerHeight });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  // ── where the camera looks for this page ──
  const at = page === 0 ? 'missed' : page === last ? 'end' : M.steps[page - 1].at;
  const shot = SHOTS[at];
  const portrait = size.W / size.H < 1;
  const cam = (sh: Shot) => {
    const { W, H } = size;
    // (the thing he's talking about sits clear of him and his words)
    const fx = portrait ? W * 0.5 : W * 0.64, fy = portrait ? H * 0.28 : H < 520 ? H * 0.24 : H * 0.38;
    const s = Math.max(W / IW, H / IH) * sh.zoom;
    const tx = Math.min(0, Math.max(W - IW * s, fx - sh.u * IW * s));
    const ty = Math.min(0, Math.max(H - IH * s, fy - sh.v * IH * s));
    return { s, tx, ty, sx: tx + sh.u * IW * s, sy: ty + sh.v * IH * s };
  };
  const c = cam(shot);
  const spotR = shot.spot ? shot.spot * Math.min(size.W, size.H) * Math.min(1.4, shot.zoom) : Math.hypot(size.W, size.H);

  // ── each page: he "types" for a moment, then his words appear ──
  useEffect(() => {
    setTyping(true);
    setOpen(null);
    const t = window.setTimeout(() => setTyping(false), page === 0 ? 900 : 550);
    return () => clearTimeout(t);
  }, [page]);

  // ── he arrives: a ball of paper drops in, opens, and unfolds into him ──
  useLayoutEffect(() => {
    const g = guide.current!;
    const ball = g.querySelector('.meaning__ball')!, folds = g.querySelectorAll('.meaning__fold');
    const [top, mid, bot] = [folds[0], folds[1], folds[2]];
    const ctx = gsap.context(() => {
      gsap.set(root.current!.querySelector('.meaning__bubble'), { autoAlpha: 0, y: 16 });
      gsap.set(ball, { autoAlpha: 0, scale: 0.35, rotate: -35, y: -80 });
      gsap.set([top, mid, bot], { autoAlpha: 0 });
      gsap.set(top, { rotateX: -178 }); gsap.set(bot, { rotateX: 178 });
      gsap.timeline({ delay: 0.5 })
        .to(ball, { autoAlpha: 1, scale: 0.62, rotate: 6, y: 0, duration: 0.7, ease: 'back.out(1.7)' })
        .to(ball, { rotate: -4, duration: 0.09, repeat: 3, yoyo: true, ease: 'sine.inOut' })          // (it crinkles…)
        .to(ball, { scale: 0.9, rotate: 0, duration: 0.45, ease: 'power2.out' })                       // (…and opens out)
        .to(ball, { autoAlpha: 0, scale: 1.02, duration: 0.3, ease: 'sine.in' })
        .to(mid, { autoAlpha: 1, duration: 0.25 }, '<')
        .set([top, bot], { autoAlpha: 1 })
        .to(top, { rotateX: 0, duration: 0.75, ease: 'power3.out' })                                    // the top third unfolds
        .to(bot, { rotateX: 0, duration: 0.75, ease: 'power3.out' }, '-=0.35')                          // then the bottom
        .to(g.querySelectorAll('.meaning__crease'), { autoAlpha: 0, duration: 1.2 }, '-=0.2')
        .to(root.current!.querySelector('.meaning__bubble'), { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.9');
    }, root);
    return () => ctx.revert();
  }, []);

  // ── he leaves: folds back up into paper, crumples, and is gone ──
  const leave = (then: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    const g = guide.current!;
    const folds = g.querySelectorAll('.meaning__fold');
    gsap.timeline({ onComplete: then })
      .to(root.current!.querySelector('.meaning__bubble'), { autoAlpha: 0, y: 16, duration: 0.35 })
      .to(g.querySelectorAll('.meaning__crease'), { autoAlpha: 1, duration: 0.2 }, '<')
      .to(folds[2], { rotateX: 178, duration: 0.5, ease: 'power2.in' })
      .to(folds[0], { rotateX: -178, duration: 0.5, ease: 'power2.in' }, '-=0.2')
      .set(folds, { autoAlpha: 0 })
      .fromTo(g.querySelector('.meaning__ball'), { autoAlpha: 1, scale: 0.9 }, { scale: 0.5, rotate: 20, duration: 0.35, ease: 'power2.in' })
      .to(g.querySelector('.meaning__ball'), { autoAlpha: 0, y: -60, scale: 0.3, duration: 0.35 })
      .to(root.current, { autoAlpha: 0, duration: 0.6 });
  };

  const go = (d: number) => setPage((p) => Math.max(0, Math.min(last, p + d)));
  const step = page >= 1 && page < last ? M.steps[page - 1] : null;
  const doorFoot = cam({ ...shot, u: DOOR_FOOT[0], v: DOOR_FOOT[1] });
  const n = missed.length;

  return (
    <div ref={root} className="meaning" role="dialog" aria-label={M.steps[0].title}>
      {/* the scene, and a soft light on the part he's talking about */}
      <div className="meaning__bg" aria-hidden="true">
        {(['day', 'night'] as const).map((k) => (
          <img key={k} src={k === 'day' ? dayUrl : nightUrl} alt="" draggable={false}
            style={{ opacity: shot.img === k ? 1 : 0, transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.s})` }} />
        ))}
        <div className="meaning__spot" style={{ '--sx': `${c.sx}px`, '--sy': `${c.sy}px`, '--sr': `${spotR}px` } as React.CSSProperties} />
        {at === 'sky' && (
          <div className="meaning__birds">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <svg key={i} className={`meaning__bird${i % 2 ? ' is-dark' : ''}`} viewBox="0 0 40 16" style={{ top: `${8 + (i * 37) % 30}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${9 + (i % 3) * 2}s` }}>
                <path d="M2,10 Q10,1 20,9 Q30,1 38,10 Q30,6 20,13 Q10,6 2,10Z" />
              </svg>
            ))}
          </div>
        )}
        {at === 'door' && (
          <svg className="meaning__bunny" viewBox="0 0 200 200" style={{ left: doorFoot.sx, top: doorFoot.sy, width: IH * c.s * 0.2, height: IH * c.s * 0.2 }}>
            <defs><GrainPattern id="grain-meaning" /></defs>
            <AnimalArt kind="bunny" grain="grain-meaning" />
          </svg>
        )}
      </div>

      <button type="button" className="meaning__x" aria-label={M.close} onClick={() => leave(onClose)}>×</button>

      <div className="meaning__dock">
        {/* him: a crumpled paper that unfolds into his portrait */}
        <div ref={guide} className="meaning__guide" aria-hidden="true">
          <img className="meaning__ball" src={paperUrl} alt="" draggable={false} />
          {[0, 1, 2].map((i) => (
            <div key={i} className={`meaning__fold meaning__fold--${i}`}>
              <div className="meaning__face" style={{ backgroundImage: `url(${guideUrl})` }} />
              <div className="meaning__back" style={{ WebkitMaskImage: `url(${guideUrl})`, maskImage: `url(${guideUrl})` }} />
              {i !== 1 && <div className="meaning__crease" />}
            </div>
          ))}
        </div>

        <div className="meaning__bubble" aria-live="polite">
          <p className="meaning__sig">{M.signature}</p>
          {typing ? (
            <p className="meaning__typing" aria-label="…"><i /><i /><i /></p>
          ) : (
            <div key={page} className="meaning__words">
              {page === 0 && (
                <>
                  <h2>{n ? M.missedTitle : M.foundAll}</h2>
                  {n > 0 && <p>{M.missedText}</p>}
                  {n > 0 && (
                    <div className="meaning__chips">
                      {missed.map((k) => (
                        <button key={k} type="button" className={`meaning__chip${open === k ? ' is-on' : ''}`} onClick={() => setOpen(open === k ? null : k)}>
                          {M.hidden[k]}
                        </button>
                      ))}
                    </div>
                  )}
                  {open && (
                    <p className="meaning__secret"><strong>{read(open).title}</strong> {read(open).line}</p>
                  )}
                </>
              )}
              {step && (
                <>
                  <h2>{step.title}</h2>
                  <p>{step.text}</p>
                  {step.at === 'colours' && (
                    <ul className="meaning__colours">
                      {M.colours.map(([col, name, feel]) => (
                        <li key={name}><span style={{ background: col }} /><b>{name}</b> {feel}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {page === last && (
                <>
                  <h2>{M.thanks}</h2>
                  <p className="meaning__sign">{M.signature}</p>
                  <p className="meaning__ps">{n ? M.psMissed.replace('{n}', String(n)) : M.psFound}</p>
                </>
              )}
            </div>
          )}
          <div className="meaning__nav">
            <span className="meaning__dots" aria-hidden="true">
              {Array.from({ length: last + 1 }, (_, i) => <i key={i} className={i === page ? 'is-on' : ''} />)}
            </span>
            {page > 0 && <button type="button" className="meaning__back" onClick={() => go(-1)}>{M.back}</button>}
            {page < last ? (
              <button type="button" className="meaning__next" onClick={() => go(1)}>{M.next} ›</button>
            ) : (
              <>
                <button type="button" className="meaning__back" onClick={() => leave(onReplay)}>{content.finale.replay}</button>
                <button type="button" className="meaning__next" onClick={() => leave(onClose)}>{M.close}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
