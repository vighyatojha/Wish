// Tileable noise textures built once on the CPU, so the GPU only has
// to look values up. Used by the wet paper, the fog and the valley.

export interface NoiseTexture {
  data: Uint8Array;
  size: number;
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tileableFbm(size: number, periods: number[], seed: number): Float32Array {
  const rand = rng(seed);
  const out = new Float32Array(size * size);
  let total = 0;
  periods.forEach((p, octave) => {
    const amp = Math.pow(0.55, octave);
    total += amp;
    const grid = new Float32Array(p * p).map(() => rand());
    const cell = size / p;
    for (let y = 0; y < size; y++) {
      const gy = y / cell, y0 = Math.floor(gy), fy = gy - y0;
      const sy = fy * fy * (3 - 2 * fy);
      const r0 = (y0 % p) * p, r1 = ((y0 + 1) % p) * p;
      for (let x = 0; x < size; x++) {
        const gx = x / cell, x0 = Math.floor(gx), fx = gx - x0;
        const sx = fx * fx * (3 - 2 * fx);
        const c0 = x0 % p, c1 = (x0 + 1) % p;
        const a = grid[r0 + c0], b = grid[r0 + c1], c = grid[r1 + c0], d = grid[r1 + c1];
        out[y * size + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
      }
    }
  });
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function fibres(size: number, seed: number): Uint8ClampedArray {
  const rand = rng(seed);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.lineCap = 'round';
  for (let i = 0; i < 1100; i++) {
    const x = rand() * size, y = rand() * size;
    const a = rand() * Math.PI * 2;
    const len = 4 + rand() * 16;
    const bend = (rand() - 0.5) * len * 0.8;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    const mx = (x + ex) / 2 - Math.sin(a) * bend, my = (y + ey) / 2 + Math.cos(a) * bend;
    g.strokeStyle = `rgba(255,255,255,${0.12 + rand() * 0.38})`;
    g.lineWidth = 0.5 + rand() * 0.8;
    // nine copies so fibres wrap across the tile edges seamlessly
    for (let ox = -size; ox <= size; ox += size) {
      for (let oy = -size; oy <= size; oy += size) {
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.quadraticCurveTo(mx + ox, my + oy, ex + ox, ey + oy);
        g.stroke();
      }
    }
  }
  return g.getImageData(0, 0, size, size).data;
}

// R blotches · G paper fibres · B fine grain · A second blotches
export function makePaperNoise(size = 256): NoiseTexture {
  const r = tileableFbm(size, [4, 8, 16, 32], 11);
  const b = tileableFbm(size, [32, 64, 128], 23);
  const a = tileableFbm(size, [8, 16, 32], 37);
  const g = fibres(size, 51);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.round(r[i] * 255);
    data[i * 4 + 1] = g[i * 4];
    data[i * 4 + 2] = Math.round(b[i] * 255);
    data[i * 4 + 3] = Math.round(a[i] * 255);
  }
  return { data, size };
}

// Four independent layers of soft billows, each stretched to 0–1.
let fogCache: NoiseTexture | null = null;
export function makeFogNoise(size = 256): NoiseTexture {
  if (fogCache && fogCache.size === size) return fogCache;
  const chans = [
    tileableFbm(size, [2, 4, 8, 16, 32], 101),
    tileableFbm(size, [4, 8, 16, 32], 202),
    tileableFbm(size, [8, 16, 32, 64], 303),
    tileableFbm(size, [3, 6, 12, 24], 404),
  ];
  const data = new Uint8Array(size * size * 4);
  chans.forEach((c, ch) => {
    const sorted = Float32Array.from(c).sort();
    const lo = sorted[Math.floor(sorted.length * 0.01)];
    const hi = sorted[Math.floor(sorted.length * 0.99)];
    for (let i = 0; i < c.length; i++) {
      data[i * 4 + ch] = Math.round(Math.min(1, Math.max(0, (c[i] - lo) / (hi - lo))) * 255);
    }
  });
  fogCache = { data, size };
  return fogCache;
}
