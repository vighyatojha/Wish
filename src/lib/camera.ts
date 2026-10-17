// ─────────────────────────────────────────────────────────────
//  Fitting a picture to the screen, and the camera on top of it.
// ─────────────────────────────────────────────────────────────
export type Vec2 = [number, number];

export interface CoverLayout {
  offset: Vec2; // top-left of the visible part, picture 0–1
  span: Vec2;   // size of the visible part, picture 0–1
}

// Cover the screen with the picture, keeping `focus` (picture 0–1) as central as it can.
export function coverLayout(W: number, H: number, imgW: number, imgH: number, focus: Vec2): CoverLayout {
  const scale = Math.max(W / imgW, H / imgH);
  const span: Vec2 = [W / (imgW * scale), H / (imgH * scale)];
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  return {
    span,
    offset: [clamp(focus[0] - span[0] / 2, 0, 1 - span[0]), clamp(focus[1] - span[1] / 2, 0, 1 - span[1])],
  };
}

// Picture point (0–1) → screen point (0–1), including the camera zoom.
export function toScreen(uv: Vec2, layout: CoverLayout, zoom: number, zoomCenter: Vec2): Vec2 {
  const sx = (uv[0] - layout.offset[0]) / layout.span[0];
  const sy = (uv[1] - layout.offset[1]) / layout.span[1];
  return [zoomCenter[0] + (sx - zoomCenter[0]) * zoom, zoomCenter[1] + (sy - zoomCenter[1]) * zoom];
}

// Screen point (0–1) → picture point (0–1).
export function toPicture(s: Vec2, layout: CoverLayout, zoom: number, zoomCenter: Vec2): Vec2 {
  const sx = zoomCenter[0] + (s[0] - zoomCenter[0]) / zoom;
  const sy = zoomCenter[1] + (s[1] - zoomCenter[1]) / zoom;
  return [layout.offset[0] + sx * layout.span[0], layout.offset[1] + sy * layout.span[1]];
}
