// ─────────────────────────────────────────────────────────────
//  Ink
//  The rain needs the page's words as a picture so they can get
//  wet and run. paintInk() redraws every [data-ink] element (word
//  by word, at the exact spot the browser placed it) and every
//  [data-ink-input] box onto a canvas, so the swap from page to
//  paper is invisible. Also: [data-ink-box] (a coloured sheet, like
//  the note paper), [data-ink-img] (a photo in its white frame) and
//  any tilt an element has; words keep their own colours, and text
//  inside a [data-ink-clip] box (a scrolling note) stays inside it.
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

/** an element's own rotation (radians), from its computed transform */
function tilt(el: Element): number {
  const cs = getComputedStyle(el);
  let a = 0;
  const m = cs.transform && cs.transform !== 'none' ? cs.transform.match(/matrix\(([^)]+)\)/) : null;
  if (m) { const [ma, mb] = m[1].split(',').map(Number); a += Math.atan2(mb, ma); }
  // (the separate CSS `rotate` property, used for the page's wonky bits)
  const rot = cs.rotate && cs.rotate !== 'none' ? parseFloat(cs.rotate) : 0;
  if (rot) a += (cs.rotate.endsWith('rad') ? rot : (rot * Math.PI) / 180);
  return a;
}
/** rotate the canvas about an element's centre by its own tilt (and its parent's) */
function turn(g: CanvasRenderingContext2D, el: HTMLElement): boolean {
  const a = tilt(el) + (el.parentElement ? tilt(el.parentElement) : 0);
  if (!a) return false;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  g.translate(cx, cy); g.rotate(a); g.translate(-cx, -cy);
  return true;
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

  // coloured sheets (the note paper): their colour, and a margin line down the left
  for (const el of root.querySelectorAll<HTMLElement>('[data-ink-box]')) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    g.save();
    // (the unrotated box, turned by its tilt, so it lands exactly where the page showed it)
    const w = el.offsetWidth, h = el.offsetHeight, r = el.getBoundingClientRect();
    g.translate(r.left + r.width / 2, r.top + r.height / 2);
    g.rotate(tilt(el));
    g.fillStyle = cs.backgroundColor;
    g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, parseFloat(cs.borderTopLeftRadius) || 0); g.fill();
    // (ruled lines, like an exercise book, if it has them)
    const rule = parseFloat(cs.getPropertyValue('--rule'));
    if (rule > 4) {
      g.save(); g.beginPath(); g.rect(-w / 2, -h / 2, w, h); g.clip();
      g.fillStyle = 'rgba(70, 130, 220, 0.35)';
      const first = parseFloat(cs.getPropertyValue('--rule-top')) || rule;
      for (let y = -h / 2 + first - (el.scrollTop % rule); y < h / 2; y += rule) g.fillRect(-w / 2, y, w, 1);
      g.restore();
    }
    const bl = parseFloat(cs.borderLeftWidth);
    if (bl > 0) { g.fillStyle = cs.borderLeftColor; g.fillRect(-w / 2 + parseFloat(cs.paddingLeft) * 0.55, -h / 2, bl, h); }
    g.restore();
  }

  // photos, in their white frames
  for (const el of root.querySelectorAll<HTMLImageElement>('img[data-ink-img]')) {
    if (!el.getClientRects().length || !el.complete || !el.naturalWidth) continue;
    const cs = getComputedStyle(el);
    const w = el.offsetWidth, h = el.offsetHeight, r = el.getBoundingClientRect();
    const pl = parseFloat(cs.paddingLeft), pt = parseFloat(cs.paddingTop), pr = parseFloat(cs.paddingRight), pb = parseFloat(cs.paddingBottom);
    g.save();
    g.translate(r.left + r.width / 2, r.top + r.height / 2);
    g.rotate(tilt(el) + (el.parentElement ? tilt(el.parentElement) : 0));
    g.fillStyle = cs.backgroundColor;
    g.fillRect(-w / 2, -h / 2, w, h);
    g.drawImage(el, -w / 2 + pl, -h / 2 + pt, w - pl - pr, h - pt - pb);
    g.restore();
  }

  for (const el of root.querySelectorAll<HTMLElement>('[data-ink]')) {
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    g.save();
    const clipEl = el.closest<HTMLElement>('[data-ink-clip]');
    if (clipEl) { const c = clipEl.getBoundingClientRect(); g.beginPath(); g.rect(c.left, c.top, c.width, c.height); g.clip(); }
    const turned = turn(g, el);
    // (a filled button, like "Submit!!": its colour and its little drop shadow)
    const bg = cs.backgroundColor;
    if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) {
      const er = el.getBoundingClientRect();
      const w = turned ? el.offsetWidth : er.width, h = turned ? el.offsetHeight : er.height;
      const x = er.left + (er.width - w) / 2, y = er.top + (er.height - h) / 2;
      const rad = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, h / 2);
      const sh = cs.boxShadow.match(/(rgba?\([^)]+\)|#\w+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px/);
      if (sh) { g.fillStyle = sh[1]; g.beginPath(); g.roundRect(x + +sh[2], y + +sh[3], w, h, rad); g.fill(); }
      g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, w, h, rad); g.fill();
    }
    drawBorders(g, el, cs);
    g.font = fontOf(cs);
    g.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    for (const w of el.querySelectorAll<HTMLElement>('.w')) {
      // (with a tilt, the word's place is measured without it, from its offset within the element)
      let left: number, top: number, height: number;
      if (turned) {
        const er = el.getBoundingClientRect();
        left = er.left + (er.width - el.offsetWidth) / 2 + w.offsetLeft;
        top = er.top + (er.height - el.offsetHeight) / 2 + w.offsetTop;
        height = w.offsetHeight;
      } else {
        const r = w.getBoundingClientRect();
        left = r.left; top = r.top; height = r.height;
      }
      const text = w.textContent ?? '';
      g.fillStyle = getComputedStyle(w).color;  // (each word keeps its own colour)
      g.fillText(text, left, baseline(text, top, height));
    }
    g.restore();
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
