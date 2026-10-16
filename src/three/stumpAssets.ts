// ─────────────────────────────────────────────────────────────
//  The tree stump, made entirely in code (no model files):
//  an irregular sawn trunk with root flares, bark and growth-ring
//  textures painted on canvases, and a soft contact shadow.
//  Everything here must be disposed of when the scene ends
//  (see disposeStumpAssets).
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A smooth wobble that wraps around the circle (so the trunk has no seam).
function periodic(rand: () => number, harmonics: number[]) {
  const terms = harmonics.map((k) => ({ k, amp: (rand() * 0.8 + 0.2) / k, ph: rand() * Math.PI * 2 }));
  const norm = terms.reduce((s, t) => s + t.amp, 0);
  return (a: number) => terms.reduce((s, t) => s + t.amp * Math.sin(t.k * a + t.ph), 0) / norm;
}

export const STUMP = { radius: 0.62, height: 0.72 };

export interface StumpAssets {
  side: THREE.BufferGeometry;
  top: THREE.BufferGeometry;
  barkMap: THREE.CanvasTexture;
  barkBump: THREE.CanvasTexture;
  ringMap: THREE.CanvasTexture;
  ringBump: THREE.CanvasTexture;
  shadowMap: THREE.CanvasTexture;
}

// ── Geometry ─────────────────────────────────────────────────
function buildGeometry() {
  const rand = rng(7);
  const { radius: R, height: H } = STUMP;
  const radial = 96;
  const rows = 16;
  const side = new THREE.CylinderGeometry(R, R * 1.1, H, radial, rows, true);
  const pos = side.attributes.position as THREE.BufferAttribute;
  const wobble = periodic(rand, [2, 3, 5, 7]);
  const lobes = periodic(rand, [3, 4, 5]);
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.z, v.x);
    const h = Math.min(1, Math.max(0, (v.y + H / 2) / H)); // 0 bottom → 1 top
    let r = Math.hypot(v.x, v.z);
    r *= 1 + wobble(a) * 0.06;
    r *= 1 + Math.sin(a * 41 + Math.sin(a * 7) * 2.2) * 0.012;        // bark ridges
    const flare = Math.pow(1 - h, 3.2) * 0.55 * Math.pow(Math.max(0, lobes(a) + 0.15), 1.4); // root flares
    r *= 1 + flare;
    const y = v.y - flare * 0.12;                                       // roots dip into the ground
    pos.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
  }
  side.computeVertexNormals();

  // The sawn top follows the exact outline of the trunk's top ring.
  const ring: THREE.Vector2[] = [];
  let maxR = 0;
  for (let i = 0; i < radial; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    ring.push(new THREE.Vector2(x, -z));
    maxR = Math.max(maxR, Math.hypot(x, z));
  }
  const top = new THREE.ShapeGeometry(new THREE.Shape(ring), 1);
  top.rotateX(-Math.PI / 2);
  top.translate(0, H / 2 + 0.002, 0);
  const tp = top.attributes.position as THREE.BufferAttribute;
  const uv = top.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < tp.count; i++) uv.setXY(i, tp.getX(i) / (2 * maxR) + 0.5, -tp.getZ(i) / (2 * maxR) + 0.5);
  top.computeVertexNormals();

  return { side, top };
}

// ── Textures ─────────────────────────────────────────────────
function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function valueNoise(rand: () => number, size: number) {
  const grid = new Float32Array(size * size).map(() => rand());
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (i: number, j: number) => grid[(((j % size) + size) % size) * size + (((i % size) + size) % size)];
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  };
}

function fbm(n: (x: number, y: number) => number, x: number, y: number, oct = 4) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * n(x * f, y * f);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / norm;
}

function barkTextures() {
  const W = 512, H = 256;
  const rand = rng(21);
  const n = valueNoise(rand, 64);
  const { c, g } = canvas(W, H);
  const { c: bc, g: bg } = canvas(W, H);
  const img = g.createImageData(W, H);
  const bump = bg.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      // vertical furrows that wander and split, like oak/sal bark
      const warp = fbm(n, u * 6, v * 3) * 2.2;
      const fur = Math.abs(Math.sin((u * 26 + warp) * Math.PI));
      const plates = Math.pow(fur, 0.45);
      const cross = smooth(0.62, 0.7, fbm(n, u * 18, v * 40 + 3));     // horizontal cracks between plates
      let h = plates * (1 - cross * 0.55);
      const grain = fbm(n, u * 120, v * 30, 2);
      h = h * 0.85 + grain * 0.15;
      // colour: deep brown furrows, grey-brown weathered plates
      let r = 38 + h * 82, gg = 27 + h * 62, b = 18 + h * 46;
      const grey = smooth(0.55, 0.8, fbm(n, u * 4 + 7, v * 3));        // sun-bleached patches
      r += grey * h * 26; gg += grey * h * 26; b += grey * h * 24;
      // moss creeping up from the roots on one side
      const moss = smooth(0.52, 0.75, fbm(n, u * 9 + 2, v * 6) + (1 - v) * 0.0 + v * 0.35) * smooth(0.25, 0.9, v) * (1 - h * 0.6);
      r = r * (1 - moss) + 62 * moss; gg = gg * (1 - moss) + 92 * moss; b = b * (1 - moss) + 34 * moss;
      const k = (y * W + x) * 4;
      img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
      const hv = Math.round(h * 255);
      bump.data[k] = bump.data[k + 1] = bump.data[k + 2] = hv; bump.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  bg.putImageData(bump, 0, 0);
  return { map: tex(c, true, [3, 1]), bump: tex(bc, false, [3, 1]) };
}

function ringTextures() {
  const S = 384;
  const rand = rng(33);
  const n = valueNoise(rand, 64);
  const { c, g } = canvas(S, S);
  const { c: bc, g: bg } = canvas(S, S);
  const img = g.createImageData(S, S);
  const bump = bg.createImageData(S, S);
  const cracks = [0.6, 2.1, 3.9, 5.2].map((a) => a + rand() * 0.3);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const px = x / S - 0.5 + 0.03, py = y / S - 0.5 - 0.02;      // the heart sits a little off centre
      const ang = Math.atan2(py, px);
      let r = Math.hypot(px, py) * 2;
      r += (fbm(n, Math.cos(ang) * 2 + 5, Math.sin(ang) * 2 + 5) - 0.5) * 0.06; // rings wobble
      // growth rings: wide pale early wood, thin dark late wood
      const ringPos = r * 34 + fbm(n, x / 30, y / 30) * 0.8;
      const ring = Math.pow(Math.abs(Math.sin(ringPos * Math.PI)), 4);
      const band = fbm(n, r * 9, 3.3) - 0.5;                        // some years darker than others
      let rr = 204 - r * 46 + band * 40, gg = 160 - r * 44 + band * 32, bb = 108 - r * 38 + band * 22;
      rr -= ring * 70; gg -= ring * 60; bb -= ring * 44;
      // saw marks and weathering
      const saw = Math.sin((px * 0.8 + py) * 240 + fbm(n, x / 15, y / 15) * 3) * 0.5 + 0.5;
      rr -= saw * 7; gg -= saw * 7; bb -= saw * 6;
      const weather = smooth(0.55, 0.85, fbm(n, x / 52 + 9, y / 52));
      rr = rr * (1 - weather * 0.3) + 150 * weather * 0.3; gg = gg * (1 - weather * 0.3) + 140 * weather * 0.3; bb = bb * (1 - weather * 0.3) + 128 * weather * 0.3;
      // dark pith at the heart
      const pith = smooth(0.05, 0.0, r);
      rr -= pith * 80; gg -= pith * 70; bb -= pith * 50;
      // radial drying cracks
      let crack = 0;
      for (const a of cracks) {
        let d = Math.abs(((ang - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        d = Math.min(d, Math.PI * 2 - d);
        crack = Math.max(crack, smooth(0.035 * (1 - r) + 0.004, 0, d) * smooth(0.08, 0.25, r) * smooth(0.82, 0.55, r));
      }
      rr -= crack * 110; gg -= crack * 95; bb -= crack * 70;
      // pale sapwood, then the bark rim
      const sap = smooth(0.8, 0.88, r) * smooth(0.97, 0.92, r);
      rr += sap * 18; gg += sap * 14; bb += sap * 8;
      const bark = smooth(0.92, 0.97, r);
      rr = rr * (1 - bark) + 58 * bark; gg = gg * (1 - bark) + 41 * bark; bb = bb * (1 - bark) + 28 * bark;
      const k = (y * S + x) * 4;
      img.data[k] = rr; img.data[k + 1] = gg; img.data[k + 2] = bb; img.data[k + 3] = 255;
      const hv = 150 + (1 - ring) * 60 - crack * 140 - bark * 60 + saw * 10;
      bump.data[k] = bump.data[k + 1] = bump.data[k + 2] = Math.max(0, Math.min(255, hv)); bump.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  bg.putImageData(bump, 0, 0);
  return { map: tex(c, true), bump: tex(bc, false) };
}

function shadowTexture() {
  const { c, g } = canvas(256, 128);
  const grad = g.createRadialGradient(128, 64, 4, 128, 64, 126);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.setTransform(1, 0, 0, 0.5, 0, 32);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return tex(c, false);
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function tex(c: HTMLCanvasElement, color: boolean, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

export function createStumpAssets(): StumpAssets {
  const { side, top } = buildGeometry();
  const bark = barkTextures();
  const rings = ringTextures();
  return {
    side, top,
    barkMap: bark.map, barkBump: bark.bump,
    ringMap: rings.map, ringBump: rings.bump,
    shadowMap: shadowTexture(),
  };
}

export function disposeStumpAssets(a: StumpAssets): void {
  [a.side, a.top].forEach((g) => g.dispose());
  [a.barkMap, a.barkBump, a.ringMap, a.ringBump, a.shadowMap].forEach((t) => t.dispose());
}
