// ─────────────────────────────────────────────────────────────
//  The bus stop, alive (WebGL2)
//
//  One picture of the stop, painted three ways and blended:
//  the empty stop, the bus arriving (the video, frame by frame) and
//  the bus parked (whose door can fold open). On top of it:
//  • weather: rain (grey sky, wet road with reflections, haze)
//    clearing to a bright day;
//  • time of day: day → golden hour → sunset → blue hour → night,
//    with stars, a moon, the vending machine and the bus windows
//    glowing, and light spilling onto the ground;
//  • life: clouds drifting, grass swaying in the wind;
//  • a camera (pan / zoom) and depth of field that can keep one spot sharp.
//
//  Masks (painted from the picture): stop-masks R sky · G lights · B road;
//  stop-masks2 R bus silhouette · G grass.
// ─────────────────────────────────────────────────────────────
import { createProgram, createTexture, loseContext, uniforms } from './gl';
import { makeFogNoise } from './noise';
import type { CoverLayout, Vec2 } from './camera';

// The bus door in the picture (0–1): its two folding leaves meet at DOOR.mid.
export const DOOR = { x0: 0.4985, mid: 0.5202, x1: 0.5419, y0: 0.4735, y1: 0.6932 };
export const MOON: Vec2 = [0.5, 0.12];
export const MOON_R = 0.052; // radius, share of the picture height
// The street lamp just past the shelter: its sprite's place in the picture.
const LAMP_H = 0.375, LAMP_X = 0.6425, LAMP_BASE = 0.705;
const LAMP_W = (LAMP_H * (80 / 680)) * (906 / 1611);
export const LAMP = { x0: LAMP_X - LAMP_W / 2, x1: LAMP_X + LAMP_W / 2, y0: LAMP_BASE - LAMP_H, y1: LAMP_BASE };

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uEmpty, uBus, uVideo, uMask, uMask2, uNoise, uLamp, uMoonTex;
uniform vec3  uW;               // weights: empty stop · video · parked bus
uniform vec2  uOffset, uSpan, uZoomC;
uniform float uZoom, uTime, uAspect, uScreenAspect;
uniform float uLod;             // depth-of-field blur
uniform vec4  uFocus;           // sharp spot: x, y, sharp radius, soft radius (0 = off)
uniform float uRain;            // 0 clear · 1 pouring
uniform float uNight;           // 0 day · 1 golden · 2 sunset · 3 blue hour · 4 night
uniform float uDoor;            // 0 shut → 1 open
uniform float uWind;            // grass sway
uniform float uCloud;           // cloud drift
uniform vec2  uMoon;
uniform vec4  uDoorRect;        // x0, x1, y0, y1
uniform float uDoorMid;
uniform vec4  uLampRect;        // x0, y0, x1, y1 in the picture
uniform float uLampOn;          // 0 off → 1 lit
uniform float uMoonR;

float gLod;
float noise(vec2 p) { return texture(uNoise, p).r; }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec3 img(sampler2D t, vec2 uv) {
  if (gLod < 0.05) return texture(t, uv).rgb;
  vec2 px = exp2(gLod) / vec2(1611.0, 906.0) * 0.6;
  return 0.25 * (textureLod(t, uv + vec2( px.x,  px.y * 0.4), gLod).rgb
               + textureLod(t, uv + vec2(-px.x, -px.y * 0.4), gLod).rgb
               + textureLod(t, uv + vec2( px.x * 0.4, -px.y), gLod).rgb
               + textureLod(t, uv + vec2(-px.x * 0.4,  px.y), gLod).rgb);
}

// The parked bus, with its folding door opening.
vec3 parked(vec2 uv) {
  if (uDoor > 0.001 && uv.x > uDoorRect.x && uv.x < uDoorRect.y && uv.y > uDoorRect.z && uv.y < uDoorRect.w) {
    float k = 1.0 - 0.82 * uDoor;                        // how wide each folded leaf still is
    float wl = (uDoorMid - uDoorRect.x) * k, wr = (uDoorRect.y - uDoorMid) * k;
    if (uv.x < uDoorRect.x + wl) {
      float sx = uDoorRect.x + (uv.x - uDoorRect.x) / k;
      return img(uBus, vec2(sx, uv.y)) * (1.0 - 0.3 * uDoor);
    }
    if (uv.x > uDoorRect.y - wr) {
      float sx = uDoorRect.y - (uDoorRect.y - uv.x) / k;
      return img(uBus, vec2(sx, uv.y)) * (1.0 - 0.3 * uDoor);
    }
    // inside: dim aisle, a handrail, and the step
    float v = (uv.y - uDoorRect.z) / (uDoorRect.w - uDoorRect.z);
    float u = (uv.x - uDoorRect.x) / (uDoorRect.y - uDoorRect.x);
    vec3 inside = mix(vec3(0.16, 0.15, 0.14), vec3(0.09, 0.085, 0.08), v);
    inside = mix(inside, vec3(0.42, 0.4, 0.37), smoothstep(0.86, 0.9, v) * (1.0 - smoothstep(0.95, 0.97, v)));
    inside += vec3(0.25, 0.24, 0.2) * smoothstep(0.012, 0.0, abs(u - 0.5)) * step(v, 0.86);
    inside += vec3(0.9, 0.7, 0.45) * 0.35 * smoothstep(2.4, 3.6, uNight) * (1.0 - v * 0.6);
    return inside;
  }
  return img(uBus, uv);
}

vec3 pic(vec2 uv) {
  vec3 c = vec3(0.0);
  if (uW.x > 0.001) c += uW.x * img(uEmpty, uv);
  if (uW.y > 0.001) c += uW.y * texture(uVideo, uv).rgb;
  if (uW.z > 0.001) c += uW.z * parked(uv);
  return c;
}

vec3 flowed(vec2 uv, vec2 flow, float cycle, float jitter) {
  float t = uTime / cycle + jitter;
  float p0 = fract(t), p1 = fract(t + 0.5);
  vec3 a = pic(uv - flow * (p0 - 0.5));
  vec3 b = pic(uv - flow * (p1 - 0.5));
  return mix(b, a, 1.0 - abs(1.0 - 2.0 * p0));
}

// One "look" for each time of day.
vec3 look(int k, vec3 col, vec2 uv, float sky) {
  float l = luma(col);
  float cloud = smoothstep(0.5, 0.85, l);
  float h = smoothstep(0.0, 0.48, uv.y); // 0 top of the sky → 1 horizon
  if (k <= 0) return col;
  if (k == 1) { // golden hour
    vec3 land = col * vec3(1.1, 0.96, 0.78);
    vec3 s = mix(col * vec3(1.02, 0.95, 0.9), col * vec3(1.15, 0.9, 0.72) + vec3(0.06, 0.02, 0.0), h);
    return mix(land, s, sky);
  }
  if (k == 2) { // sunset
    vec3 land = col * vec3(0.95, 0.68, 0.56) * 0.85 + vec3(0.04, 0.0, 0.03);
    vec3 grad = mix(vec3(0.34, 0.38, 0.72), vec3(1.0, 0.58, 0.4), h);
    vec3 cl = mix(vec3(0.6, 0.38, 0.52), vec3(1.0, 0.76, 0.64), l);
    return mix(land, mix(grad, cl, cloud), sky);
  }
  if (k == 3) { // blue hour
    vec3 land = col * vec3(0.36, 0.4, 0.62) + vec3(0.0, 0.0, 0.02);
    vec3 grad = mix(vec3(0.08, 0.12, 0.3), vec3(0.52, 0.4, 0.55), h);
    vec3 cl = mix(vec3(0.2, 0.19, 0.32), vec3(0.58, 0.47, 0.6), l);
    return mix(land, mix(grad, cl, cloud), sky);
  }
  // night
  vec3 land = vec3(l) * vec3(0.1, 0.13, 0.25) + col * 0.035;
  vec3 grad = mix(vec3(0.012, 0.02, 0.07), vec3(0.055, 0.075, 0.17), h);
  vec3 cl = mix(vec3(0.045, 0.055, 0.11), vec3(0.2, 0.22, 0.34), l);
  vec3 s = mix(grad, cl, cloud);
  // stars where the sky is clear
  vec2 g = uv * vec2(uAspect, 1.0) * 160.0;
  vec2 id = floor(g);
  float r = hash(id);
  if (r < 0.06) {
    vec2 c = fract(g) - 0.5 - (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
    float tw = 0.55 + 0.45 * sin(uTime * (1.0 + r * 30.0) + r * 60.0);
    s += vec3(0.85, 0.9, 1.0) * smoothstep(0.12, 0.0, length(c)) * tw * (1.0 - cloud) * (1.0 - h * 0.6);
  }
  return mix(land, s, sky);
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
  vec3 m2 = texture(uMask2, uv).rgb;
  float t = uTime;
  float sky = m.r * (1.0 - m2.r * uW.z);   // the parked bus is never sky

  // grass bending in the wind
  if (m2.g > 0.02 && uWind > 0.0) {
    float n = noise(uv * vec2(3.0, 2.0) + vec2(t * 0.05, 0.0));
    float sway = sin(t * 1.9 + uv.x * 55.0 + n * 6.0) * 0.6 + sin(t * 0.7 + uv.x * 13.0) * 0.4;
    uv.x += sway * 0.0018 * m2.g * uWind;
  }

  vec3 col = pic(uv);
  // clouds drifting
  if (sky > 0.01 && uCloud > 0.0) {
    float v = noise(uv * vec2(2.0, 3.0) + vec2(t * 0.003, 0.0));
    vec2 flow = vec2(0.014, 0.001) * (0.55 + 0.9 * v) * (1.25 - uv.y * 1.5) * uCloud;
    col = mix(col, flowed(uv, flow, 10.0, noise(uv * 3.1) * 0.6), sky);
  }
  // the street lamp, standing in the scene (graded with it below)
  vec2 luv = (uv - uLampRect.xy) / (uLampRect.zw - uLampRect.xy);
  float lampA = 0.0;
  if (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0) {
    vec4 L = texture(uLamp, luv);
    lampA = L.a;
    col = mix(col, L.rgb, L.a);
  }
  vec3 orig = col;

  // ── rain: overcast, wet, hazy ──
  if (uRain > 0.001) {
    float l = luma(col);
    vec3 wet = mix(vec3(l), col, 0.45) * 0.66 * vec3(0.93, 0.97, 1.05);
    wet = mix(wet, vec3(l) * vec3(0.78, 0.82, 0.88) * 0.95 + 0.05, sky * 0.9);   // grey sky
    wet = mix(wet, vec3(0.62, 0.66, 0.7), smoothstep(0.62, 0.42, uv.y) * (1.0 - sky) * 0.35); // haze on the hills
    if (m.b > 0.01) {
      // the wet road mirrors what stands on it
      float top = 0.735;
      vec2 ruv = vec2(uv.x + (noise(uv * vec2(8.0, 40.0) + vec2(0.0, t * 0.4)) - 0.5) * 0.006, 2.0 * top - uv.y + 0.01);
      vec3 refl = pic(ruv) * 0.5;
      wet = mix(wet * 0.72, wet * 0.6 + refl * 0.55, m.b * 0.75);
    }
    col = mix(col, wet, uRain);
  }

  // ── time of day ──
  if (uNight > 0.001) {
    int i = int(floor(uNight));
    float f = fract(uNight);
    col = mix(look(i, col, uv, sky), look(min(i + 1, 4), col, uv, sky), f);
  }

  // ── lights coming on as it gets dark ──
  float dark = smoothstep(2.3, 3.6, uNight);
  if (dark > 0.001) {
    bool vending = uv.x > 0.53;
    float spill = textureLod(uMask, uv, 5.0).g;
    if (vending) {
      col = mix(col, orig * 1.25 + vec3(0.18, 0.22, 0.28) * m.g, m.g * dark * 0.92);
      col += vec3(0.6, 0.78, 1.0) * spill * 0.4 * dark * (1.0 - m.g);
    } else {
      col = mix(col, vec3(1.0, 0.8, 0.5) * (0.45 + 0.6 * luma(orig)), m.g * uW.z * dark * 0.85);
      col += vec3(1.0, 0.75, 0.45) * spill * 0.22 * uW.z * dark * (1.0 - m.g);
    }
    // the open door throws a pool of warm light onto the ground
    if (uDoor > 0.0) {
      vec2 d = (uv - vec2((uDoorRect.x + uDoorRect.y) * 0.5, uDoorRect.w + 0.025)) * vec2(uAspect * 1.4, 4.0);
      col += vec3(1.0, 0.72, 0.42) * exp(-dot(d, d) * 18.0) * 0.32 * uDoor * dark;
    }
  }

  // ── the moon: a textured full moon, its glow, and moonlight on clouds and hills ──
  float moon = smoothstep(3.0, 4.0, uNight);
  if (moon > 0.001) {
    vec2 d = (uv - uMoon) * vec2(uAspect, 1.0);
    float r = length(d);
    float R = uMoonR;
    float clear = 1.0 - smoothstep(0.55, 0.85, luma(orig)) * 0.75;
    // her moon picture (with its own soft glow): the disk fills 280 of its 360-pixel half-width
    vec2 mq = d / (R * (360.0 / 280.0)) * 0.5 + 0.5;
    if (mq.x > 0.0 && mq.x < 1.0 && mq.y > 0.0 && mq.y < 1.0) {
      vec4 M = texture(uMoonTex, mq);
      col = mix(col, M.rgb, M.a * moon * mix(1.0, clear, 0.6) * sky);
    }
    float halo = exp(-max(0.0, r - R * 1.25) * 14.0) * 0.12 + exp(-r * 4.5) * 0.08;
    col += vec3(0.62, 0.68, 0.85) * halo * moon * sky;
    // the edges of nearby clouds catch the moonlight
    float cl = smoothstep(0.45, 0.8, luma(orig)) * sky;
    col += vec3(0.22, 0.25, 0.36) * cl * exp(-r * 3.2) * moon;
    // the hills shine softly under the full moon
    float hills = smoothstep(0.42, 0.47, uv.y) * smoothstep(0.62, 0.54, uv.y) * (1.0 - sky) * (1.0 - m2.r * uW.z)
                * clamp((orig.b - orig.r) * 3.5, 0.0, 1.0);
    col += vec3(0.16, 0.2, 0.32) * hills * (0.4 + luma(orig)) * moon;
  }

  // ── the street lamp coming on ──
  if (uLampOn > 0.001) {
    vec2 head = vec2((uLampRect.x + uLampRect.z) * 0.5, uLampRect.y + (uLampRect.w - uLampRect.y) * 0.11);
    float glass = 0.0;
    if (luv.x > 0.27 && luv.x < 0.73 && luv.y > 0.07 && luv.y < 0.15) glass = lampA;
    col = mix(col, vec3(1.0, 0.86, 0.58) * 1.25, glass * uLampOn);
    vec2 dh = (uv - head) * vec2(uAspect, 1.0);
    col += vec3(1.0, 0.78, 0.45) * (exp(-length(dh) * 55.0) * 0.55 + exp(-length(dh) * 14.0) * 0.12) * uLampOn;
    // a soft cone of light and a warm pool on the ground beneath it
    float below = uv.y - head.y;
    float cone = below > 0.0 ? exp(-pow(abs(uv.x - head.x) * uAspect / (0.02 + below * 0.32), 2.0)) * exp(-below * 4.5) : 0.0;
    col += vec3(1.0, 0.8, 0.5) * cone * 0.07 * uLampOn * (1.0 - lampA);
    vec2 dp = (uv - vec2(head.x, uLampRect.w + 0.02)) * vec2(uAspect * 1.1, 3.6);
    col += vec3(1.0, 0.76, 0.46) * exp(-dot(dp, dp) * 30.0) * 0.28 * uLampOn * (1.0 - sky);
  }

  outColor = vec4(col, 1.0);
}`;

export interface StageFrame {
  time: number;
  layout: CoverLayout;
  zoom: number;
  zoomCenter: Vec2;
  blur: number;
  focus?: { x: number; y: number; sharp: number; soft: number };
  weights: [number, number, number]; // empty · video · parked bus
  rain: number;
  night: number;
  door: number;
  wind: number;
  cloud: number;
  lamp: number;       // 0 off → 1 lit
}

export interface StagePictures {
  empty: string;
  bus: string;
  masks: string;
  masks2: string;
  lamp: string;
  moon: string;
  width: number;
  height: number;
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

export class Stage {
  private program: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null>;
  private textures: WebGLTexture[];
  private videoTex: WebGLTexture;
  private lastVideoTime = -1;
  /** true once the bus film has given us a real frame */
  videoHasFrame = false;
  /** set when drawing has failed (context lost, or the picture comes out black) */
  broken = '';
  /** for the ?debug panel */
  stats = { renderer: '', glError: 0, probe: '', frames: 0, blackProbes: 0 };
  private probeBuf = new Uint8Array(4 * 3);
  private lastProbe = 0;

  /** Returns null when the phone has no WebGL2 (the still picture is shown instead). */
  static async create(canvas: HTMLCanvasElement, pics: StagePictures, video: HTMLVideoElement, maxDpr = 1.5): Promise<Stage | null> {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return null;
    try {
      const imgs = await Promise.all([pics.empty, pics.bus, pics.masks, pics.masks2, pics.lamp, pics.moon].map(loadImage));
      return new Stage(canvas, gl, pics, imgs, video, maxDpr);
    } catch (err) {
      console.warn('Animated background unavailable, showing the still picture:', err);
      return null;
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    private gl: WebGL2RenderingContext,
    pics: StagePictures,
    [empty, bus, masks, masks2, lamp, moonTex]: HTMLImageElement[],
    private video: HTMLVideoElement,
    private maxDpr: number,
  ) {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    this.stats.renderer = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.broken = 'graphics context lost'; });
    this.program = createProgram(gl, FRAG);
    gl.useProgram(this.program);
    this.u = uniforms(gl, this.program, [
      'uEmpty', 'uBus', 'uVideo', 'uMask', 'uMask2', 'uNoise', 'uW', 'uOffset', 'uSpan', 'uZoomC', 'uZoom', 'uTime',
      'uAspect', 'uScreenAspect', 'uLod', 'uFocus', 'uRain', 'uNight', 'uDoor', 'uWind', 'uCloud', 'uMoon', 'uDoorRect', 'uDoorMid',
      'uLamp', 'uLampRect', 'uLampOn', 'uMoonR', 'uMoonTex',
    ] as const);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.textures = [
      createTexture(gl, 0, empty, { mipmaps: true }),
      createTexture(gl, 1, bus, { mipmaps: true }),
      createTexture(gl, 3, masks, { mipmaps: true }),
      createTexture(gl, 4, masks2),
      createTexture(gl, 5, makeFogNoise(256), { repeat: true }),
      createTexture(gl, 6, lamp),
      createTexture(gl, 7, moonTex, { mipmaps: true }),
    ];
    this.videoTex = createTexture(gl, 2, null);
    const u = this.u;
    gl.uniform1i(u.uEmpty, 0);
    gl.uniform1i(u.uBus, 1);
    gl.uniform1i(u.uVideo, 2);
    gl.uniform1i(u.uMask, 3);
    gl.uniform1i(u.uMask2, 4);
    gl.uniform1i(u.uNoise, 5);
    gl.uniform1i(u.uLamp, 6);
    gl.uniform1i(u.uMoonTex, 7);
    gl.uniform4f(u.uLampRect, LAMP.x0, LAMP.y0, LAMP.x1, LAMP.y1);
    gl.uniform1f(u.uMoonR, MOON_R);
    gl.uniform1f(u.uAspect, pics.width / pics.height);
    gl.uniform2f(u.uMoon, MOON[0], MOON[1]);
    gl.uniform4f(u.uDoorRect, DOOR.x0, DOOR.x1, DOOR.y0, DOOR.y1);
    gl.uniform1f(u.uDoorMid, DOOR.mid);
    gl.bindVertexArray(gl.createVertexArray());
  }

  private W = 1;
  private H = 1;

  /** Lower (or raise) the drawing resolution, e.g. on a slow device. */
  setMaxDpr(v: number): void {
    this.maxDpr = v;
    this.resize(this.W, this.H);
  }

  resize(W: number, H: number): void {
    this.W = W;
    this.H = H;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.canvas.width = Math.max(1, Math.round(W * dpr));
    this.canvas.height = Math.max(1, Math.round(H * dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(f: StageFrame): void {
    const { gl, u, video } = this;
    // copy the newest video frame across while the bus is arriving
    if (f.weights[1] > 0.001 && video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        if (video.videoWidth > 0) this.videoHasFrame = true;
      } catch { /* not decodable yet */ }
    }
    // until the film has a real frame, show the empty stop in its place (never black)
    const w = f.weights;
    if (this.videoHasFrame) gl.uniform3f(u.uW, w[0], w[1], w[2]);
    else gl.uniform3f(u.uW, w[0] + w[1], 0, w[2]);
    gl.uniform2f(u.uOffset, f.layout.offset[0], f.layout.offset[1]);
    gl.uniform2f(u.uSpan, f.layout.span[0], f.layout.span[1]);
    gl.uniform2f(u.uZoomC, f.zoomCenter[0], f.zoomCenter[1]);
    gl.uniform1f(u.uZoom, f.zoom);
    gl.uniform1f(u.uTime, f.time);
    gl.uniform1f(u.uLod, f.blur);
    const fo = f.focus;
    gl.uniform4f(u.uFocus, fo?.x ?? 0, fo?.y ?? 0, fo?.sharp ?? 0, fo?.soft ?? 0);
    gl.uniform1f(u.uScreenAspect, this.canvas.width / Math.max(1, this.canvas.height));
    gl.uniform1f(u.uRain, f.rain);
    gl.uniform1f(u.uNight, f.night);
    gl.uniform1f(u.uDoor, f.door);
    gl.uniform1f(u.uWind, f.wind);
    gl.uniform1f(u.uCloud, f.cloud);
    gl.uniform1f(u.uLampOn, f.lamp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // self-check, about once a second: read three pixels of what was just drawn.
    // In daylight the picture is never pure black; if it is, drawing has failed
    // on this device, and the scene switches to the still pictures.
    this.stats.frames++;
    const now = performance.now();
    if (now - this.lastProbe > 1000) {
      this.lastProbe = now;
      const err = gl.getError();
      if (err) this.stats.glError = err;
      const w2 = this.canvas.width, h2 = this.canvas.height;
      const pts = [[0.5, 0.35], [0.25, 0.6], [0.75, 0.8]];
      let sum = 0;
      const out: string[] = [];
      pts.forEach(([x, y], k) => {
        gl.readPixels(Math.floor(w2 * x), Math.floor(h2 * (1 - y)), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.probeBuf.subarray(k * 4, k * 4 + 4));
        const b = this.probeBuf.subarray(k * 4, k * 4 + 3);
        sum += b[0] + b[1] + b[2];
        out.push(`${b[0]},${b[1]},${b[2]}`);
      });
      this.stats.probe = out.join(' · ');
      if (sum < 6 && f.night < 3.2 && f.blur < 3) {
        this.stats.blackProbes++;
        if (this.stats.blackProbes >= 2) this.broken = `picture came out black (gl error ${err || 'none'})`;
      } else this.stats.blackProbes = 0;
    }
  }

  destroy(): void {
    [...this.textures, this.videoTex].forEach((t) => this.gl.deleteTexture(t));
    this.gl.deleteProgram(this.program);
    loseContext(this.gl);
  }
}
