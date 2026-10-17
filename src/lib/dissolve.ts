// ─────────────────────────────────────────────────────────────
//  A soft, blotchy noise for dissolving a character into dust.
//  Its values are spread evenly from 0 to 1, so as the threshold
//  rises at a steady pace, the character disappears at a steady
//  pace too (the same amount of it every moment, all over).
// ─────────────────────────────────────────────────────────────
export interface DissolveNoise {
  url: string;                          // greyscale image for an SVG mask
  sample(u: number, v: number): number; // value at 0–1 coordinates
}

let cached: DissolveNoise | null = null;

export function dissolveNoise(): DissolveNoise {
  if (cached) return cached;
  const N = 128;
  const val = new Float32Array(N * N);
  // a few octaves of smooth value noise
  const octave = (cells: number, amp: number) => {
    const grid = Array.from({ length: (cells + 1) * (cells + 1) }, () => Math.random());
    const at = (x: number, y: number) => grid[y * (cells + 1) + x];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const fx = (x / N) * cells, fy = (y / N) * cells;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        let tx = fx - ix, ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx);
        ty = ty * ty * (3 - 2 * ty);
        const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
        const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
        val[y * N + x] += (a + (b - a) * ty) * amp;
      }
    }
  };
  octave(5, 0.55);
  octave(11, 0.3);
  octave(27, 0.15);
  // even out: rank every value, so all levels are equally common
  const order = Array.from(val.keys()).sort((a, b) => val[a] - val[b]);
  const even = new Float32Array(N * N);
  order.forEach((idx, rank) => { even[idx] = rank / (N * N - 1); });

  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d')!;
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = Math.round(even[i] * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  cached = {
    url: c.toDataURL('image/png'),
    sample(u, v) {
      const x = Math.min(N - 1, Math.max(0, Math.round(u * (N - 1))));
      const y = Math.min(N - 1, Math.max(0, Math.round(v * (N - 1))));
      return even[y * N + x];
    },
  };
  return cached;
}
