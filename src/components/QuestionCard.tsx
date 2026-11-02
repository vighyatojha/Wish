// ─────────────────────────────────────────────────────────────
//  A little question she answers by typing (three in all; the words
//  are in content.ts → questions). Short or long, the question fits:
//  a long one gets smaller until the whole card fits on the screen,
//  even with a phone's keyboard open. Her answer box grows as she
//  writes. `inline`: inside the book's page, rather than over the scene.
// ─────────────────────────────────────────────────────────────
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { content } from '../content';
import { shrinkToFit, refitOnResize } from '../lib/fit';
import './question-card.css';

interface Props {
  text: string;
  inline?: boolean;
  /** her answer, or null if she skipped it */
  onDone: (answer: string | null) => void;
}

export function QuestionCard({ text, inline = false, onDone }: Props) {
  const Q = content.questions;
  const root = useRef<HTMLFormElement>(null);
  const ask = useRef<HTMLParagraphElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);

  const fit = () => {
    const r = root.current, p = ask.current;
    if (!r || !p) return;
    const room = inline
      ? () => r.scrollHeight <= r.clientHeight + 1 || r.clientHeight === 0
      : () => r.scrollHeight <= r.clientHeight + 1 && r.getBoundingClientRect().bottom <= (window.visualViewport?.height ?? window.innerHeight) - 10;
    shrinkToFit([p], room, 0.55);
  };
  useLayoutEffect(fit, [text, inline]);
  useEffect(() => refitOnResize(fit), []);

  // (the answer box grows with what she writes, up to a point; then it scrolls)
  const grow = () => {
    const t = box.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight + 2, window.innerHeight * 0.3)}px`;
    fit();
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const a = value.trim();
    if (!a) { box.current?.focus(); return; }
    box.current?.blur();
    setSent(true);
    window.setTimeout(() => onDone(a), inline ? 0 : 1400);
  };

  return (
    <form ref={root} className={`qcard${inline ? ' qcard--inline' : ''}${sent ? ' is-sent' : ''}`} onSubmit={send}
      onPointerDown={(e) => e.stopPropagation()} aria-label={text}>
      {sent ? (
        <p className="qcard__thanks" role="status">{Q.thanks}</p>
      ) : (
        <>
          <p className="qcard__label">{Q.label}</p>
          <p ref={ask} className="qcard__ask">{text}</p>
          <textarea
            ref={box}
            className="qcard__box"
            rows={3}
            maxLength={500}
            placeholder={Q.placeholder}
            value={value}
            onChange={(e) => { setValue(e.target.value); grow(); }}
            onFocus={() => window.setTimeout(fit, 350)}
          />
          <div className="qcard__actions">
            {!inline && <button type="button" className="qcard__skip" onClick={() => onDone(null)}>{Q.skip}</button>}
            <button type="submit" className="qcard__send" disabled={!value.trim()}>{Q.send}</button>
          </div>
        </>
      )}
    </form>
  );
}
