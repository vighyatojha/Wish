// Renders text with every word in its own <span class="w">, so the
// wet-paper effect can redraw each word exactly where the browser
// placed it, and so words can be animated in one by one.
import type { ElementType, HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLElement> {
  type?: 'submit' | 'button';
  text: string;
  as?: ElementType;
  htmlFor?: string;
}

export function InkText({ text, as: Tag = 'p', ...rest }: Props) {
  const parts = text.split(/(\s+)/).filter(Boolean);
  return (
    <Tag data-ink="" {...rest}>
      {parts.map((part, i) =>
        /^\s+$/.test(part) ? ' ' : (
          <span className="w" key={i}>
            {part}
          </span>
        ),
      )}
    </Tag>
  );
}
