// ─────────────────────────────────────────────────────────────
//  The scroll an animal hands her: two wooden rollers and old
//  parchment, with the message in a flowing hand.
//  open(): flies from the little rolled scroll in the animal's paws
//  to the middle of the screen (about 40% of it) and unrolls.
//  close(): rolls back up and flies up off the screen.
//  A long message shrinks to fit the paper.
// ─────────────────────────────────────────────────────────────
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { gsap, ease } from '../lib/motion';
import { playRustle } from '../lib/audio';
import './note.css';

export interface NoteHandle {
  open(from: DOMRect): Promise<void>;
  close(): Promise<void>;
}

interface Props {
  message: string;
  hint: string;
  onTap: () => void;
}

const done = (tl: gsap.core.Timeline) => new Promise<void>((r) => { tl.eventCallback('onComplete', () => r()); });

/** Unrolled by `u` (0 rolled up → 1 open): the paper shows from the middle out, and each wooden roller
 *  sits exactly on its edge, so the rollers carry the paper open (and roll it back up) together. */
function unroll(paper: HTMLElement, top: HTMLElement, bottom: HTMLElement, half: number, u: number) {
  const hidden = (50 * (1 - u)).toFixed(3);
  paper.style.clipPath = `inset(${hidden}% 0% ${hidden}% 0%)`;
  const off = half * (1 - u);
  top.style.transform = `translate3d(0, ${off.toFixed(2)}px, 0)`;
  bottom.style.transform = `translate3d(0, ${(-off).toFixed(2)}px, 0)`;
}

export const Note = forwardRef<NoteHandle, Props>(function Note({ message, hint, onTap }, ref) {
  /** a long message shrinks (a step at a time) until it fits the paper */
  const fitText = () => {
    const p = paper.current, t = p?.querySelector<HTMLElement>('.note__text');
    if (!p || !t) return;
    t.style.fontSize = '';
    let size = parseFloat(getComputedStyle(t).fontSize);
    for (let i = 0; i < 30 && p.scrollHeight > p.clientHeight + 1 && size > 12; i++) {
      size *= 0.93; t.style.fontSize = `${size}px`;
    }
  };
  const root = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    open(from) {
      const el = root.current!;
      const r = el.getBoundingClientRect();
      const half = paper.current!.offsetHeight / 2;
      fitText();
      const words = el.querySelectorAll('.note__word');
      // start as the rolled scroll in the animal's paws
      const sx = from.width / r.width;
      const dx = from.left + from.width / 2 - (r.left + r.width / 2);
      const dy = from.top + from.height / 2 - (r.top + r.height / 2);
      gsap.set(el, { autoAlpha: 1, x: dx, y: dy, scale: sx, rotation: -6 });
      const roll = { u: 0 };
      const draw = () => unroll(paper.current!, top.current!, bottom.current!, half, roll.u);
      draw();
      gsap.set(words, { autoAlpha: 0, y: 8 });
      gsap.set(el.querySelector('.note__hint'), { autoAlpha: 0 });
      const tl = gsap.timeline();
      tl.to(el, { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.7, ease: 'power3.inOut' })
        .call(playRustle, [], 0.62)
        .to(roll, { u: 1, duration: 1.0, ease: 'power2.inOut', onUpdate: draw }, 0.66)
        .to(words, { autoAlpha: 1, y: 0, duration: 0.5, ease: ease.enter, stagger: 0.07 }, 1.35)
        .to(el.querySelector('.note__hint'), { autoAlpha: 1, duration: 0.4, ease: ease.enter }, '+=0.2');
      return done(tl);
    },
    close() {
      const el = root.current!;
      const half = paper.current!.offsetHeight / 2;
      const roll = { u: 1 };
      const draw = () => unroll(paper.current!, top.current!, bottom.current!, half, roll.u);
      const tl = gsap.timeline();
      tl.to(el.querySelectorAll('.note__word, .note__hint'), { autoAlpha: 0, duration: 0.25, ease: ease.exit }, 0)
        .call(playRustle, [], 0.1)
        .to(roll, { u: 0, duration: 0.6, ease: 'power2.inOut', onUpdate: draw }, 0.1)
        .to(el, { y: -window.innerHeight * 0.95, rotation: 8, scale: 0.7, duration: 0.75, ease: 'power2.in' }, 0.7)
        .set(el, { autoAlpha: 0 });
      return done(tl);
    },
  }));

  return (
    <div ref={root} className="note" role="dialog" aria-label={message} onPointerDown={onTap}>
      <div ref={paper} className="note__paper">
        <svg className="note__flourish note__flourish--top" viewBox="0 0 120 20" aria-hidden="true">
          <path d="M4,10 C24,2 40,18 60,10 C80,2 96,18 116,10 M60,10 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0" />
        </svg>
        <p className="note__text">
          {message.split(' ').map((w, i) => <span key={i} className="note__word">{w} </span>)}
        </p>
        <svg className="note__flourish" viewBox="0 0 120 20" aria-hidden="true">
          <path d="M4,10 C24,18 40,2 60,10 C80,18 96,2 116,10 M60,10 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0" />
        </svg>
        <span className="note__hint">{hint}</span>
      </div>
      <div ref={top} className="note__roller note__roller--top" />
      <div ref={bottom} className="note__roller note__roller--bottom" />
    </div>
  );
});
