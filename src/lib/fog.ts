// ─────────────────────────────────────────────────────────────
//  Fog (WebGL2)
//  A bank of fog sheets at different distances. Moving the camera
//  forward ("travel") makes the near sheets swell and rush past,
//  which feels like flying through fog, not a picture zooming.
//  Drawn on a transparent canvas at reduced resolution (fog has no
//  sharp detail), so it is light work for a phone.
//
//    travel  0 → 8   how far into the fog bank the camera is
//    haze    0 → 1   solid fog filling every gap (1 = whiteout)
//    light   0 → 1   storm grey → glowing, sunlit fog
//    mist    0 → 1   thin mist left drifting afterwards
// ─────────────────────────────────────────────────────────────
import { createProgram, createTexture, loseContext, uniforms } from './gl';
import { makeFogNoise } from './noise';

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uNoise;
uniform vec2  uRes;
uniform float uTime;
uniform float uTravel;
uniform float uHaze;
uniform float uLight;
uniform float uMist;
uniform vec2  uSun;
uniform vec2  uFocus;

const int SHEETS = 8;

float cloud(vec2 q, float seed) {
  vec4 a = texture(uNoise, q + vec2(0.37, 0.71) * seed);
  vec4 b = texture(uNoise, q * 2.7 + vec2(-0.21, 0.43) * seed);
  return a.r * 0.58 + a.g * 0.24 + b.b * 0.18;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - uFocus) * vec2(aspect, 1.0);
  vec2 s = (uSun - uFocus) * vec2(aspect, 1.0);
  float sd = length(p - s);

  // colour of the fog: storm grey, then lit warm by the sun
  vec3 storm = vec3(0.55, 0.59, 0.66);
  vec3 day   = vec3(0.95, 0.95, 0.94);
  vec3 warm  = vec3(1.0, 0.87, 0.68);
  // in thick fog the sun is only a soft brighter patch; it sharpens as the fog thins
  float veil = 1.0 - uHaze * 0.7;
  float glow = exp(-sd * mix(1.8, 2.6, veil));
  vec3 fogCol = mix(storm, day, uLight);
  fogCol = mix(fogCol, warm, glow * uLight * mix(0.3, 0.7, veil));
  fogCol += vec3(1.0, 0.95, 0.84) * exp(-sd * 8.0) * uLight * 0.5 * veil * veil;

  vec3 C = vec3(0.0);
  float A = 0.0;
  float drift = uTime * 0.02;

  // the fog bank, nearest sheet first
  for (int i = 0; i < SHEETS; i++) {
    float fi = float(i);
    float d = 0.7 + fi - uTravel;           // distance to this sheet
    if (d < 0.04) continue;                 // already flown through
    vec2 q = p * d * 0.42 + vec2(fi * 0.173, fi * 0.311) + vec2(drift, drift * 0.35) * (1.0 + fi * 0.2);
    float n = cloud(q, fi);
    float dens = smoothstep(0.34, 0.78, n);
    float a = dens * 0.82;
    a *= smoothstep(0.04, 0.9, d);          // thins as it rushes past
    a *= 1.0 - smoothstep(5.5, 7.5, d);     // far sheets vanish into the haze
    vec3 col = fogCol * (0.76 + 0.27 * n);
    col *= mix(1.0, 0.8, dens * (1.0 - glow * uLight * 0.6));   // thick billows are shadier
    C += (1.0 - A) * a * col;
    A += (1.0 - A) * a;
  }

  // solid fog filling the gaps, with its own slow, large swirls
  float hn = cloud(p * 0.3 + vec2(drift * 0.6, drift * 0.15), 21.0);
  vec3 hazeCol = fogCol * (0.86 + 0.16 * hn);
  C += (1.0 - A) * uHaze * hazeCol;
  A += (1.0 - A) * uHaze;

  // thin mist that keeps drifting over the valley afterwards
  if (uMist > 0.001) {
    float band = smoothstep(0.30, 0.42, vUv.y) * (1.0 - smoothstep(0.58, 0.74, vUv.y));
    for (int j = 0; j < 2; j++) {
      float fj = float(j);
      vec2 q = vec2(p.x * (0.5 + fj * 0.3) + uTime * (0.004 + fj * 0.003), p.y * 1.4 + fj * 0.37);
      float n = cloud(q, 9.0 + fj * 4.0);
      float a = smoothstep(0.42, 0.85, n) * band * uMist * 0.32;
      C += (1.0 - A) * a * fogCol;
      A += (1.0 - A) * a;
    }
  }

  outColor = vec4(C, A);
}`;

export interface FogState {
  time: number;
  travel: number;
  haze: number;
  light: number;
  mist: number;
  sun: readonly [number, number];   // screen 0–1
  focus: readonly [number, number]; // screen 0–1
}

export class Fog {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null>;
  private tex: WebGLTexture;
  private W = 1;
  private H = 1;

  static create(canvas: HTMLCanvasElement, resolution = 0.6): Fog | null {
    const gl = canvas.getContext('webgl2', {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
    });
    if (!gl) return null;
    try {
      return new Fog(canvas, gl, resolution);
    } catch (err) {
      console.warn('Fog shader unavailable, using the simple fog:', err);
      return null;
    }
  }

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, private resolution: number) {
    this.gl = gl;
    this.program = createProgram(gl, FRAG);
    gl.useProgram(this.program);
    this.u = uniforms(gl, this.program, ['uNoise', 'uRes', 'uTime', 'uTravel', 'uHaze', 'uLight', 'uMist', 'uSun', 'uFocus'] as const);
    this.tex = createTexture(gl, 0, makeFogNoise(256), { repeat: true });
    gl.uniform1i(this.u.uNoise, 0);
    gl.bindVertexArray(gl.createVertexArray());
    gl.disable(gl.BLEND);
  }

  // Recalculates the drawing size from the element's real size, so
  // the fog never stretches out of shape.
  resize(): void {
    this.W = this.canvas.clientWidth || window.innerWidth;
    this.H = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.max(1, Math.round(this.W * this.resolution));
    this.canvas.height = Math.max(1, Math.round(this.H * this.resolution));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(s: FogState): void {
    const { gl, u } = this;
    gl.uniform2f(u.uRes, this.W, this.H);
    gl.uniform1f(u.uTime, s.time);
    gl.uniform1f(u.uTravel, s.travel);
    gl.uniform1f(u.uHaze, s.haze);
    gl.uniform1f(u.uLight, s.light);
    gl.uniform1f(u.uMist, s.mist);
    gl.uniform2f(u.uSun, s.sun[0], s.sun[1]);
    gl.uniform2f(u.uFocus, s.focus[0], s.focus[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy(): void {
    this.gl.deleteTexture(this.tex);
    this.gl.deleteProgram(this.program);
    loseContext(this.gl);
  }
}
