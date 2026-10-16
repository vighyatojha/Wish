// ─────────────────────────────────────────────────────────────
//  The wet paper (WebGL2)
//  Draws the page as a sheet of paper that soaks, cockles, bleeds
//  its ink and finally falls apart, revealing what's underneath.
//
//    time      seconds, for water running down the sheet
//    soak      0 → 1   how wet the whole sheet is
//    dissolve  0 → 1   how far it has fallen apart
//    dim       0 → 1   storm light
// ─────────────────────────────────────────────────────────────
import { createProgram, createTexture, loseContext, uniforms } from './gl';
import { makePaperNoise } from './noise';

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uInk;     // the page as it looked: white paper + ink
uniform sampler2D uWet;     // where raindrops have landed (red channel)
uniform sampler2D uNoise;   // R blotches, G fibres, B grain, A blotches 2
uniform vec2  uNoiseScale;
uniform float uTime;
uniform float uSoak;
uniform float uDissolve;
uniform float uDim;

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec2 uv  = vUv;
  vec2 nuv = uv * uNoiseScale;
  vec4 n   = texture(uNoise, nuv);
  vec4 n2  = texture(uNoise, nuv * 2.3 + vec2(0.31, 0.17));

  // ── how wet is this spot? ─────────────────────────────────
  float spots   = texture(uWet, uv + (n.ra - 0.5) * 0.02).r;
  float spotWet = smoothstep(0.10, 0.42, spots * (0.8 + 0.4 * n.a));
  float wet     = clamp(max(spotWet, uSoak * (0.80 + 0.28 * n.r)), 0.0, 1.0);
  // darker "tide line" at the edge of each drop while it is still a spot
  float tide = smoothstep(0.05, 0.14, spots) * (1.0 - smoothstep(0.16, 0.34, spots)) * (1.0 - uSoak);

  // ── wet paper buckles ─────────────────────────────────────
  vec2  cuv = nuv * 0.5;
  float h   = texture(uNoise, cuv).r;
  vec2  grad = vec2(texture(uNoise, cuv + vec2(0.03, 0.0)).r - h,
                    texture(uNoise, cuv + vec2(0.0, 0.03)).r - h) * 7.0 * wet;

  // the sheet sags and slides down as it gives way
  float sag = uDissolve * uDissolve * (0.05 + 0.09 * n.r);
  vec2  puv = uv - vec2(0.0, sag) + grad * 0.003;

  // ── ink: sharp when dry, blurred and running when wet ────
  float run   = wet * wet * (0.006 + 0.016 * n2.g);
  vec3  cSharp = texture(uInk, puv).rgb;
  float lod    = wet * 2.1;
  vec3  cBlur  = textureLod(uInk, puv - vec2(0.0, run * 0.35) + (n2.rb - 0.5) * 0.002 * wet, lod).rgb;
  vec3  cRun   = textureLod(uInk, puv - vec2(0.0, run), lod + 1.3).rgb;
  float aWet   = clamp(max((1.0 - lum(cBlur)) * 1.45, (1.0 - lum(cRun)) * 1.05), 0.0, 1.0)
                 * mix(1.0, 0.78, wet);

  // ── the paper itself ──────────────────────────────────────
  float fib = n.g;
  vec3 dryPaper = vec3(1.0 - uDim);
  vec3 wetPaper = (vec3(0.85, 0.86, 0.875) - fib * 0.045 - n2.b * 0.025) * (1.0 - uDim * 0.6);
  vec3 paper = mix(dryPaper, wetPaper, wet);
  paper -= tide * 0.07;

  float shade = clamp(-(grad.x * 0.7 + grad.y), -1.0, 1.0);
  paper += shade * 0.02;

  // water running down the soaked sheet
  float rv  = texture(uNoise, vec2(nuv.x * 3.5, nuv.y * 0.2 - uTime * 0.05)).a;
  float riv = smoothstep(0.64, 0.70, rv) * smoothstep(0.35, 1.0, uSoak);
  paper -= riv * 0.03;

  vec3  inkWet = vec3(0.19, 0.27, 0.47);         // blue-black ink bleeds blue
  float k = smoothstep(0.0, 0.6, wet);
  vec3  col = mix(cSharp * paper, mix(paper, inkWet, aWet), k);

  // wet paper turns slightly see-through
  float alpha = mix(1.0, 0.88 - fib * 0.08, wet * wet);
  alpha = max(alpha, aWet * k * 0.9);

  // ── falling apart ─────────────────────────────────────────
  // big soft regions decide where it gives way first; fibres make the edges ragged
  float field = texture(uNoise, nuv * 0.6 + 0.5).r * 0.64 + n2.b * 0.07 + fib * 0.15 + n.a * 0.12 + spots * 0.06;
  float thr   = 0.66 - uDissolve * 0.42;
  float on    = step(0.001, uDissolve);
  float hole  = smoothstep(thr - 0.012, thr + 0.012, field);
  float strands = smoothstep(0.5, 0.8, n2.g) * (1.0 - smoothstep(thr, thr + 0.03, field));
  float keep  = clamp(1.0 - hole + strands * 0.7, 0.0, 1.0);

  // the sheet goes thin and see-through just before it breaks
  float thin = smoothstep(thr - 0.09, thr, field) * on;
  float rim  = smoothstep(thr - 0.02, thr, field) * (1.0 - hole) * on;
  col = mix(col, vec3(0.94, 0.945, 0.955) * (1.0 - uDim * 0.5), rim * 0.55);  // fluffy torn edge
  float ring = smoothstep(thr - 0.06, thr - 0.025, field) * (1.0 - rim) * on;
  col *= 1.0 - ring * 0.06;                                                 // water line inside it

  alpha *= 1.0 - thin * 0.5 * (1.0 - rim);
  alpha *= keep;
  alpha *= 1.0 - smoothstep(0.9, 1.0, uDissolve);
  alpha = clamp(alpha, 0.0, 1.0);
  outColor = vec4(col * alpha, alpha);
}`;

export interface PaperState {
  time: number;
  soak: number;
  dissolve: number;
  dim: number;
}

export class Paper {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null>;
  private inkTex: WebGLTexture;
  private wetTex: WebGLTexture;
  private noiseTex: WebGLTexture;
  private cssW = 1;
  private cssH = 1;

  // Returns null when the phone has no WebGL2 (the page then fades instead).
  static create(canvas: HTMLCanvasElement): Paper | null {
    const gl = canvas.getContext('webgl2', {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return null;
    try {
      return new Paper(canvas, gl);
    } catch (err) {
      console.warn('Paper effect unavailable, using a simple fade:', err);
      return null;
    }
  }

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgram(gl, FRAG);
    gl.useProgram(this.program);
    this.u = uniforms(gl, this.program, ['uInk', 'uWet', 'uNoise', 'uNoiseScale', 'uTime', 'uSoak', 'uDissolve', 'uDim'] as const);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.inkTex = createTexture(gl, 0, null);
    this.wetTex = createTexture(gl, 1, null);
    this.noiseTex = createTexture(gl, 2, makePaperNoise(256), { repeat: true });
    gl.uniform1i(this.u.uInk, 0);
    gl.uniform1i(this.u.uWet, 1);
    gl.uniform1i(this.u.uNoise, 2);
    gl.bindVertexArray(gl.createVertexArray());
    gl.disable(gl.BLEND);
  }

  resize(w: number, h: number, dpr: number): void {
    this.cssW = w;
    this.cssH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  // The page as a picture (a canvas the same size as the screen).
  setInk(source: TexImageSource): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.inkTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  // Where raindrops have landed (a small canvas, updated every frame).
  setWet(source: TexImageSource): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.wetTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  render({ time, soak, dissolve, dim }: PaperState): void {
    const { gl, u } = this;
    gl.uniform2f(u.uNoiseScale, this.cssW / 280, this.cssH / 280);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uSoak, soak);
    gl.uniform1f(u.uDissolve, dissolve);
    gl.uniform1f(u.uDim, dim);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy(): void {
    const { gl } = this;
    gl.deleteTexture(this.inkTex);
    gl.deleteTexture(this.wetTex);
    gl.deleteTexture(this.noiseTex);
    gl.deleteProgram(this.program);
    loseContext(gl);
  }
}
