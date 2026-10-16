// ─────────────────────────────────────────────────────────────
//  The living valley (WebGL2)
//  Brings the still picture to life:
//    • clouds drift across the sky
//    • mist creeps through the valley
//    • the river flows and glitters
//    • the sun glows and gently shimmers
//  It also sets the time of day (the photo is dawn; the shader turns
//  it into late morning, then lets it warm back to golden hour) and
//  can soften the background like a camera focusing on something near.
//  Each effect only touches its own area, using a mask picture
//  (red = sky, green = mist, blue = river).
//
//  The picture is cropped to fill any screen: a laptop sees the
//  whole valley, a phone sees the part around the sun.
// ─────────────────────────────────────────────────────────────
import { createProgram, createTexture, loseContext, uniforms } from './gl';
import { makeFogNoise } from './noise';

export type Vec2 = readonly [number, number];

export interface CoverLayout {
  offset: Vec2; // top-left of the visible part, in picture 0–1
  span: Vec2;   // size of the visible part, in picture 0–1
}

// Which part of the picture to show on a W×H screen, keeping `focus`
// (a point in the picture, 0–1) in view.
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

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uImg;
uniform sampler2D uMask;
uniform sampler2D uNoise;
uniform vec2  uOffset, uSpan;   // visible part of the picture
uniform vec2  uZoomC;           // zoom centre on screen
uniform float uZoom;
uniform float uTime;
uniform vec2  uSun;             // the sun painted in the picture, picture coordinates
uniform float uAspect;          // picture width / height
uniform float uLod;             // depth-of-field blur (0 = sharp)
uniform vec4  uFocus;           // sharp spot on screen: x, y, sharp radius, fully-soft radius (0 = off)
uniform float uScreenAspect;    // screen width / height
float gLod;                     // blur at this pixel (uLod, eased around the sharp spot)
uniform float uDay;             // 0 dawn (the photo) · 1 late morning · 2 afternoon · 3 golden hour
uniform vec2  uSunNow;          // where the sun is right now, picture coordinates
uniform float uSunAmt;          // 0 → 1 how much of the moving sun to draw
uniform float uSunWarm;         // 0 white midday sun → 1 orange evening sun

float noise(vec2 p) { return texture(uNoise, p).r; }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Soft-focus sample: four taps spread around the point at the chosen blur level.
vec3 img(vec2 uv) {
  if (gLod < 0.05) return texture(uImg, uv).rgb;
  vec2 px = exp2(gLod) / vec2(2048.0, 1153.0) * 0.6;
  return 0.25 * (textureLod(uImg, uv + vec2( px.x,  px.y * 0.4), gLod).rgb
               + textureLod(uImg, uv + vec2(-px.x, -px.y * 0.4), gLod).rgb
               + textureLod(uImg, uv + vec2( px.x * 0.4, -px.y), gLod).rgb
               + textureLod(uImg, uv + vec2(-px.x * 0.4,  px.y), gLod).rgb);
}

// Moves the picture along a flow without ever "running out":
// two copies shifted half a cycle apart, cross-faded.
vec3 flowed(vec2 uv, vec2 flow, float cycle, float jitter) {
  float t = uTime / cycle + jitter;
  float p0 = fract(t), p1 = fract(t + 0.5);
  vec3 a = img(uv - flow * (p0 - 0.5));
  vec3 b = img(uv - flow * (p1 - 0.5));
  return mix(b, a, 1.0 - abs(1.0 - 2.0 * p0));
}

// ── Time of day ─────────────────────────────────────────────
// The photo was taken at dawn. "Daylight" (1 at late morning, fading
// back to 0 by golden hour) turns it into a bright, clear day.
vec3 grade(vec3 c, vec2 uv, vec3 m, float daylight) {
  float l = luma(c);
  float sunDist = length((uv - uSun) * vec2(uAspect, 1.0));

  // land and mountains: neutral daylight instead of orange dawn
  vec3 land = c * vec3(0.9, 1.03, 1.1);
  land = mix(vec3(luma(land)), land, 1.15);                     // a little more colour
  land = land * 1.12 + 0.02;                                    // brighter
  land = mix(land, land * vec3(0.92, 0.97, 1.1), smoothstep(0.42, 0.25, uv.y) * 0.5); // distant hills turn blue-hazy

  // sky: dawn glow becomes clear blue; clouds become white
  float lAvg = luma(textureLod(uImg, uv, 6.0).rgb);
  float cloud = smoothstep(-0.02, 0.12, l - lAvg + 0.04) * smoothstep(0.25, 0.55, l);
  vec3 blue = mix(vec3(0.62, 0.78, 0.95), vec3(0.32, 0.55, 0.9), smoothstep(0.3, 0.02, uv.y));
  vec3 white = vec3(0.97, 0.98, 1.0) * (0.78 + 0.3 * l);
  vec3 shadow = vec3(0.62, 0.68, 0.78) * (0.7 + 0.5 * l);
  vec3 sky = mix(blue * (0.9 + 0.25 * l), mix(shadow, white, smoothstep(0.35, 0.75, l)), cloud * 0.85);
  sky = mix(sky, vec3(0.86, 0.91, 0.97), exp(-sunDist * 7.0) * 0.8);  // the low dawn sun becomes bright haze
  sky = mix(sky, vec3(0.8, 0.87, 0.95), smoothstep(0.18, 0.3, uv.y) * 0.45); // pale near the horizon

  // the dawn sun and its orange rays on the hills fade into daylight haze
  float near = exp(-sunDist * 3.5);
  land = mix(land, vec3(luma(land)) * vec3(0.93, 1.0, 1.08) * 0.88, near * 0.85);
  sky = mix(sky, vec3(0.8, 0.87, 0.95), exp(-sunDist * 7.0) * 0.95);

  vec3 day = mix(land, sky, m.r);
  day *= 1.0 - near * 0.22;                                        // the dawn glow on the hills dims
  day = min(day, vec3(0.96, 0.97, 0.99) + (1.0 - near) * 0.2);   // no burnt-out sun disk
  // mist and the river turn silvery-white instead of peach
  day = mix(day, vec3(luma(day)) * vec3(1.02, 1.04, 1.07), m.g * 0.55);
  day = mix(day, vec3(luma(day)) * vec3(0.86, 0.98, 1.08), m.b * 0.6);
  return mix(c, day, daylight);
}

void main() {
  gLod = uLod;
  if (uFocus.w > 0.0) {
    float fd = length((vUv - uFocus.xy) * vec2(uScreenAspect, 1.0));
    gLod = uLod * smoothstep(uFocus.z, uFocus.w, fd);
  }
  vec2 s  = uZoomC + (vUv - uZoomC) / uZoom;
  vec2 uv = uOffset + s * uSpan;
  vec3 m  = texture(uMask, uv).rgb;
  vec3 col = img(uv);
  float t = uTime;
  // full daylight from late morning through the afternoon, warming to the photo's own light by golden hour
  float daylight = uDay <= 1.0 ? uDay : 1.0 - smoothstep(2.0, 3.0, uDay);

  // clouds: drift right, a little faster up high, never uniform
  if (m.r > 0.004) {
    float v = noise(uv * vec2(2.0, 3.0) + vec2(t * 0.003, 0.0));
    vec2 flow = vec2(0.016, 0.0012) * (0.55 + 0.9 * v) * (1.25 - uv.y * 1.5);
    col = mix(col, flowed(uv, flow, 9.0, noise(uv * 3.1) * 0.6), m.r);
  }

  // mist in the valley: slow sideways creep, sinking slightly
  if (m.g > 0.004) {
    float v = noise(uv * vec2(3.0, 5.0) + vec2(0.3, t * 0.002));
    vec2 flow = vec2(0.012, 0.0035) * (0.6 + 0.8 * v);
    col = mix(col, flowed(uv, flow, 11.0, noise(uv * 2.3 + 0.5) * 0.6), m.g);
  }

  // river: flows towards us
  float glint = 0.0;
  if (m.b > 0.004) {
    float v = noise(uv * vec2(6.0, 9.0));
    vec2 flow = vec2(-0.0015, 0.006) * (0.7 + 0.6 * v);
    vec3 w = flowed(uv, flow, 2.6, v * 0.5);
    col = mix(col, w, m.b);
    // sparkles: tiny points where two drifting, rotated noise fields both peak
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    float g1 = noise(rot * (uv * vec2(41.0, 77.0)) + vec2(0.13, -t * 0.05));
    float g2 = noise(rot * rot * (uv * vec2(57.0, 103.0)) + vec2(t * 0.02, -t * 0.07) + 0.37);
    glint = smoothstep(0.55, 0.76, g1 * g2) * smoothstep(0.42, 0.75, luma(w)) * m.b * (1.0 - gLod * 0.3);
  }

  col = grade(col, uv, m, daylight);

  // wisps of fog drifting over the mist (thinner in full daylight)
  if (m.g > 0.004) {
    float n = noise(uv * vec2(2.6, 6.0) + vec2(t * 0.006, -t * 0.0015)) * 0.65
            + noise(uv * vec2(5.0, 11.0) + vec2(-t * 0.004, t * 0.001)) * 0.35;
    float wisp = smoothstep(0.45, 0.85, n) * m.g;
    col = mix(col, mix(vec3(0.93, 0.9, 0.86), vec3(0.96, 0.97, 0.99), daylight), wisp * (0.32 - 0.14 * daylight));
  }
  col += mix(vec3(1.0, 0.9, 0.72), vec3(1.0), daylight) * glint * 0.85;

  // the low sun painted in the photo glows only when the day is ending
  float dusk = 1.0 - daylight;
  vec2 d = (uv - uSun) * vec2(uAspect, 1.0);
  float r = length(d);
  float breathe = 0.85 + 0.15 * sin(t * 1.1) * sin(t * 0.37 + 1.3);
  float glow = exp(-r * 22.0) * 0.45 * breathe + exp(-r * 6.0) * 0.14;
  float ang = atan(d.y, d.x);
  glow += pow(abs(sin(ang * 9.0 + t * 0.12)), 12.0) * pow(abs(sin(ang * 5.0 - t * 0.08 + 1.0)), 6.0) * exp(-r * 9.0) * 0.18 * breathe;
  col += vec3(1.0, 0.82, 0.55) * glow * dusk;

  // afternoon warmth creeping in
  col *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), smoothstep(1.3, 2.4, uDay) * daylight);

  // the moving sun: a bright disk in the sky (hidden behind ridges) and a halo of light
  vec2 ds = (uv - uSunNow) * vec2(uAspect, 1.0);
  float rs = length(ds);
  float skyVis = clamp(m.r * 1.6, 0.0, 1.0);
  vec3 sunCol = mix(vec3(1.0, 0.98, 0.93), vec3(1.0, 0.76, 0.45), uSunWarm);
  float soft = 0.003 + gLod * 0.0025;               // out of focus, the sun becomes a soft bright disk
  float disk = 1.0 - smoothstep(0.02 - soft, 0.02 + soft, rs);
  float halo = exp(-rs * 14.0) * 0.75 + exp(-rs * 4.0) * 0.22;
  col = mix(col, sunCol * 1.15, disk * skyVis * uSunAmt);
  col += sunCol * halo * uSunAmt * mix(0.45, 1.0, skyVis);
  // a broad wash of light from that side of the sky
  col += sunCol * smoothstep(0.9, 0.0, length((uv - uSunNow) * vec2(1.0, 1.6))) * 0.08 * uSunAmt;

  outColor = vec4(col, 1.0);
}`;

export interface ValleyFrame {
  time: number;
  layout: CoverLayout;
  zoom: number;
  zoomCenter: Vec2;
  blur: number; // depth-of-field blur, 0 = sharp, ~2.5 = soft background
  day: number;  // 0 dawn · 1 late morning · 2 afternoon · 3 golden hour
  sun: Vec2;          // where the moving sun is, in picture coordinates
  sunAmount: number;  // 0 → 1 how strongly to draw it
  sunWarm: number;    // 0 white → 1 orange
  // keep this spot sharp (screen 0–1; radii in screen heights) while the rest blurs
  focus?: { x: number; y: number; sharp: number; soft: number };
}

export interface ValleyPicture {
  image: string;  // URL
  masks: string;  // URL
  width: number;
  height: number;
  sun: Vec2;      // where the sun is in the picture, 0–1
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export class Valley {
  private program: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null>;
  private textures: WebGLTexture[];

  // Returns null when the phone has no WebGL2 (the still picture is shown instead).
  static async create(canvas: HTMLCanvasElement, picture: ValleyPicture, maxDpr = 1.5): Promise<Valley | null> {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return null;
    try {
      const [img, masks] = await Promise.all([loadImage(picture.image), loadImage(picture.masks)]);
      return new Valley(canvas, gl, picture, img, masks, maxDpr);
    } catch (err) {
      console.warn('Valley animation unavailable, showing the still picture:', err);
      return null;
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    private gl: WebGL2RenderingContext,
    picture: ValleyPicture,
    img: HTMLImageElement,
    masks: HTMLImageElement,
    private maxDpr: number,
  ) {
    this.program = createProgram(gl, FRAG);
    gl.useProgram(this.program);
    this.u = uniforms(gl, this.program, ['uImg', 'uMask', 'uNoise', 'uOffset', 'uSpan', 'uZoomC', 'uZoom', 'uTime', 'uSun', 'uAspect', 'uLod', 'uDay', 'uSunNow', 'uSunAmt', 'uSunWarm', 'uFocus', 'uScreenAspect'] as const);
    this.textures = [
      createTexture(gl, 0, img, { mipmaps: true }),
      createTexture(gl, 1, masks),
      createTexture(gl, 2, makeFogNoise(256), { repeat: true }),
    ];
    gl.uniform1i(this.u.uImg, 0);
    gl.uniform1i(this.u.uMask, 1);
    gl.uniform1i(this.u.uNoise, 2);
    gl.uniform2f(this.u.uSun, picture.sun[0], picture.sun[1]);
    gl.uniform1f(this.u.uAspect, picture.width / picture.height);
    gl.bindVertexArray(gl.createVertexArray());
  }

  resize(W: number, H: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.canvas.width = Math.max(1, Math.round(W * dpr));
    this.canvas.height = Math.max(1, Math.round(H * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(f: ValleyFrame): void {
    const { gl, u } = this;
    gl.uniform2f(u.uOffset, f.layout.offset[0], f.layout.offset[1]);
    gl.uniform2f(u.uSpan, f.layout.span[0], f.layout.span[1]);
    gl.uniform2f(u.uZoomC, f.zoomCenter[0], f.zoomCenter[1]);
    gl.uniform1f(u.uZoom, f.zoom);
    gl.uniform1f(u.uTime, f.time);
    gl.uniform1f(u.uLod, f.blur);
    gl.uniform1f(u.uDay, f.day);
    gl.uniform2f(u.uSunNow, f.sun[0], f.sun[1]);
    gl.uniform1f(u.uSunAmt, f.sunAmount);
    gl.uniform1f(u.uSunWarm, f.sunWarm);
    const fo = f.focus;
    gl.uniform4f(u.uFocus, fo?.x ?? 0, fo?.y ?? 0, fo?.sharp ?? 0, fo?.soft ?? 0);
    gl.uniform1f(u.uScreenAspect, this.canvas.width / Math.max(1, this.canvas.height));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy(): void {
    this.textures.forEach((t) => this.gl.deleteTexture(t));
    this.gl.deleteProgram(this.program);
    loseContext(this.gl);
  }
}
