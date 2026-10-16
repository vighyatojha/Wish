// ─────────────────────────────────────────────────────────────
//  Ink
//  The rain needs the page's words as a picture so they can get
//  wet and run. paintInk() redraws every [data-ink] element (word
//  by word, at the exact spot the browser placed it) and every
//  [data-ink-input] box onto a canvas, so the swap from page to
//  paper is invisible.
// ─────────────────────────────────────────────────────────────

const fontOf = (cs: CSSStyleDeclaration) => `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

function drawBorders(g: CanvasRenderingContext2D, el: Element, cs: CSSStyleDeclaration): void {
  const r = el.getBoundingClientRect();
  const t = parseFloat(cs.borderTopWidth), b = parseFloat(cs.borderBottomWidth);
  const l = parseFloat(cs.borderLeftWidth), rt = parseFloat(cs.borderRightWidth);
  if (t > 0 && b > 0 && l > 0 && rt > 0) {
    const radius = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.height / 2);
    g.strokeStyle = cs.borderTopColor;
    g.lineWidth = t;
    g.beginPath();
    g.roundRect(r.left + t / 2, r.top + t / 2, r.width - t, r.height - t, Math.max(0, radius - t / 2));
    g.stroke();
  } else if (b > 0) {
    g.fillStyle = cs.borderBottomColor;
    g.fillRect(r.left, r.bottom - b, r.width, b);
  }
}

export function paintInk(root: HTMLElement, width: number, height: number, dpr: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const g = canvas.getContext('2d')!;
  g.scale(canvas.width / width, canvas.height / height);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, width, height);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';

  // browsers snap text to whole device pixels, so we do the same
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const baseline = (text: string, top: number, h: number) => {
    const m = g.measureText(text || 'Hg');
    return snap(top + (h - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent);
  };

  for (const el of root.querySelectorAll<HTMLElement>('[data-ink]')) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    drawBorders(g, el, cs);
    g.font = fontOf(cs);
    g.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    g.fillStyle = cs.color;
    for (const w of el.querySelectorAll<HTMLElement>('.w')) {
      const r = w.getBoundingClientRect();
      const text = w.textContent ?? '';
      g.fillText(text, r.left, baseline(text, r.top, r.height));
    }
  }

  for (const input of root.querySelectorAll<HTMLInputElement>('[data-ink-input]')) {
    if (!input.getClientRects().length) continue;
    const cs = getComputedStyle(input);
    drawBorders(g, input, cs);
    if (!input.value) continue;
    const r = input.getBoundingClientRect();
    const padT = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
    const padB = parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
    const padL = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    g.font = fontOf(cs);
    g.letterSpacing = '0px';
    g.fillStyle = cs.color;
    g.fillText(input.value, r.left + padL, baseline(input.value, r.top + padT, r.height - padT - padB));
  }
  return canvas;
}
