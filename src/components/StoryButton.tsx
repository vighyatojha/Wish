// His picture, popping up at the very end with a little note.
//  • asking: "would you like to know the story behind all of this?" with two buttons
//  • otherwise: "whenever you visit again, just tap on me…" (tapping him opens his storybook)
// Also on the first page when she visits again.
import guideUrl from '../assets/guide.webp';
import { content } from '../content';
import './story-button.css';

/** Resolves once his picture can be shown (or after a while regardless), so he never pops up as an empty note. */
export function guideReady(ms = 12000): Promise<void> {
  return new Promise((res) => {
    const i = new Image();
    i.onload = i.onerror = () => res();
    i.src = guideUrl;
    if (i.complete) res();
    setTimeout(res, ms);
  });
}

interface Props {
  place: 'end' | 'start';
  note: string;
  onOpen: () => void;
  /** asking whether she'd like the story: yes opens it, later just leaves him here with his note */
  asking?: boolean;
  onLater?: () => void;
}

export function StoryButton({ place, note, onOpen, asking = false, onLater }: Props) {
  const M = content.meaning;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  if (asking) {
    return (
      <div className={`storybtn storybtn--${place} is-asking`} role="dialog" aria-label={M.ask} onPointerDown={stop} onClick={stop}>
        <img src={guideUrl} alt="" draggable={false} />
        <span>
          {M.ask}
          <span className="storybtn__buttons">
            <button type="button" className="storybtn__yes" onClick={onOpen}>{M.askYes}</button>
            <button type="button" className="storybtn__later" onClick={onLater}>{M.askLater}</button>
          </span>
        </span>
      </div>
    );
  }
  return (
    <button type="button" className={`storybtn storybtn--${place}`} onClick={(e) => { e.stopPropagation(); onOpen(); }} onPointerDown={stop}>
      <img src={guideUrl} alt="" draggable={false} />
      <span key={note}>{note}</span>
    </button>
  );
}
