// ─────────────────────────────────────────────────────────────
//  Butterflies living in the picture, in 3D.
//  The painting is treated as a photo taken by a camera 1.2 m above
//  the road, looking at the horizon: a point (x right, y up, z away,
//  in metres) lands on the picture where that camera would see it.
//  Butterflies fly between spots in the part of the scene on screen,
//  sometimes settle on a flower, cast soft shadows when the sun is
//  out, get smaller and hazier with distance, and at dusk they fly
//  off towards the horizon, one by one.
// ─────────────────────────────────────────────────────────────
import type { Vec2 } from './camera';
import { add, sub, mul, norm, cross, drawButterfly3D, WING_COLORS, type V3, type Jacobian, type Light } from './wings';

export const HORIZON = 0.6;            // picture v of the horizon
export const FOCAL = 1.33;             // focal length, in picture heights
export const CAM_H = 1.2;              // camera height, metres
const ASPECT = 1611 / 906;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** world (m) → picture (0–1) */
export function toPic(p: V3): Vec2 {
  const z = Math.max(0.3, p[2]);
  return [0.5 + (FOCAL * p[0]) / z / ASPECT, HORIZON + (FOCAL * (CAM_H - p[1])) / z];
}
/** picture u at depth z → world x */
const xAt = (u: number, z: number) => ((u - 0.5) * z * ASPECT) / FOCAL;

interface Fly {
  p: V3; v: V3; target: V3; retarget: number;
  phase: number; rate: number; span: number; colour: number;
  fwd: V3; landed: number; landing: boolean; glide: number;
  leaving: boolean; leaveAt: number; gone: boolean; appear: number;
}

const SHADOW = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(20,16,10,0.55)');
  grd.addColorStop(0.6, 'rgba(20,16,10,0.2)');
  grd.addColorStop(1, 'rgba(20,16,10,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return c;
})();

export class Meadow {
  private flies: Fly[] = [];
  /** the part of the picture on screen (u), so they stay where she can see them */
  view: [number, number] = [0.2, 0.8];

  constructor(count: number) {
    for (let i = 0; i < count; i++) this.flies.push({ ...this.spawn(i), leaving: true, gone: true }); // (until called for)
  }

  private spot(near: boolean): V3 {
    const z = near ? rand(4.2, 7.5) : rand(7.5, 16);
    const [u0, u1] = this.view;
    const u = rand(u0 + 0.04, u1 - 0.04);
    return [xAt(u, z), near ? rand(0.6, 1.6) : rand(0.4, 2.4), z];
  }

  private spawn(i: number): Fly {
    const near = i % 5 < 2;   // two in five fly close by, over the road
    const p = this.spot(near);
    return {
      p, v: [rand(-0.5, 0.5), 0, rand(-0.3, 0.3)], target: this.spot(near), retarget: rand(2, 6),
      // (storybook butterflies: bigger than life, so she can see them properly)
      phase: rand(0, 6), rate: rand(7, 9.5), span: rand(0.26, 0.36), colour: i % WING_COLORS.length,
      fwd: [1, 0, 0], landed: 0, landing: false, glide: 0, leaving: false, leaveAt: Math.random() * 0.9, gone: false, appear: 0,
    };
  }

  /**
   * amount: 1 → all here; as it falls (dusk), each one leaves at its own moment.
   * map: picture → screen (0–1); ppp: screen px per picture height.
   */
  frame(g: CanvasRenderingContext2D, dpr: number, W: number, H: number, time: number, dt: number,
    amount: number, map: (uv: Vec2) => Vec2, ppp: number, light: Light) {
    const shown: { f: Fly; z: number }[] = [];
    for (const f of this.flies) {
      // leaving at dusk, coming back if it's day again (e.g. a restart)
      if (!f.leaving && amount < f.leaveAt) { f.leaving = true; f.landed = 0; f.landing = false; f.target = [f.p[0] + rand(-6, 6), rand(4, 9), f.p[2] + rand(20, 40)]; }
      if (f.leaving && amount > f.leaveAt + 0.05) {
        // (back again: it fades in where it is, if it never left the screen; otherwise somewhere new)
        const keep = !f.gone && f.appear > 0.5;
        const fresh = this.spawn(this.flies.indexOf(f));
        if (keep) { fresh.p = f.p; fresh.appear = f.appear; }
        Object.assign(f, fresh);
      }
      if (!f.leaving) f.appear = Math.min(1, f.appear + dt / 1.6);
      if (f.gone) continue;
      this.step(f, time, dt);
      if (f.leaving && (f.p[2] > 45 || f.p[1] > 9)) { f.gone = true; continue; }
      shown.push({ f, z: f.p[2] });
    }
    shown.sort((a, b) => b.z - a.z);

    const s = light.sun;
    for (const { f } of shown) {
      const z = Math.max(0.5, f.p[2]);
      const uv = toPic(f.p);
      const [sx, sy] = map(uv);
      const x = sx * W, y = sy * H;
      if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;
      const k = (ppp * FOCAL) / z;      // px per metre here
      // perspective: screen px per metre along x, y, z at this point
      const J: Jacobian = [[k, 0, -k * f.p[0] / z], [0, -k, -k * (CAM_H - f.p[1]) / z]];
      const haze = clamp((z - 10) / 30) * 0.45;
      const fade = f.leaving ? clamp((45 - f.p[2]) / 20) * clamp((9 - f.p[1]) / 4) : 1;

      // a soft shadow on the ground, cast away from the sun
      if (light.sunlight > 0.05 && f.p[1] < 1.6 && s[1] > 0.05) {
        const t = f.p[1] / s[1];
        const gp: V3 = [f.p[0] - s[0] * t, 0, f.p[2] - s[2] * t];
        if (gp[2] > 1) {
          const [gx, gy] = map(toPic(gp));
          const kz = (ppp * FOCAL) / gp[2];
          const r = f.span * 0.45 * kz;
          g.globalAlpha = 0.5 * light.sunlight * clamp(1 - f.p[1] / 1.6) * fade;
          g.drawImage(SHADOW, gx * W - r, gy * H - r * (CAM_H / gp[2]) * 1.4, r * 2, r * 2 * (CAM_H / gp[2]) * 1.4);
        }
      }

      // the wings: open/closed with each beat; settled ones fan slowly
      let open: number;
      if (f.landed > 0) open = 0.55 + 0.75 * (0.5 + 0.5 * Math.sin(time * 1.6 + f.phase));
      else if (f.glide > 0) open = 0.22;
      else open = 0.55 + 0.85 * Math.sin(f.phase);
      const up: V3 = norm(cross(f.fwd, norm(cross([0, 1, 0], f.fwd))));
      const tint: V3 = [
        light.tint[0] * (1 - haze) + 0.78 * haze, light.tint[1] * (1 - haze) + 0.84 * haze, light.tint[2] * (1 - haze) + 0.95 * haze,
      ];
      drawButterfly3D(g, dpr, [x, y], J, f.fwd, up, f.span, open, f.colour, { ...light, tint }, (1 - haze * 0.5) * fade * f.appear);
    }
    g.globalAlpha = 1;
  }

  private step(f: Fly, time: number, dt: number) {
    if (f.landed > 0) {
      f.landed -= dt;
      if (f.landed <= 0) { f.target = this.spot(f.p[2] < 7.5); f.retarget = rand(3, 6); f.v = [rand(-0.3, 0.3), 0.8, 0]; }
      return;
    }
    f.retarget -= dt;
    const to = sub(f.target, f.p);
    const dist = Math.hypot(to[0], to[1], to[2]);
    if (!f.leaving && (dist < 0.35 || f.retarget <= 0)) {
      if (f.landing && dist < 0.35) { f.landed = rand(2.5, 5); f.landing = false; f.v = [0, 0, 0]; return; }
      // now and then, settle on a flower in the grass
      f.landing = Math.random() < 0.22;
      const near = f.p[2] < 7.5;
      f.target = f.landing ? (() => { const t = this.spot(near); t[1] = rand(0.2, 0.35); return t; })() : this.spot(near);
      f.retarget = rand(3, 7);
    }
    // fly towards the target, fluttering, with a gentle wander
    const speed = f.leaving ? 2.2 : f.landing && dist < 1.5 ? 0.5 : 1.15;
    const wander: V3 = [Math.sin(time * 1.3 + f.phase * 3) * 0.6, Math.sin(time * 2.1 + f.phase) * 0.35, Math.cos(time * 1.1 + f.phase * 2) * 0.6];
    const want = add(mul(norm(to), speed), wander);
    const kk = Math.min(1, dt * 1.6);
    f.v = add(f.v, mul(sub(want, f.v), kk));
    f.p = add(f.p, mul(f.v, dt));
    // each downbeat lifts it a little: the bobbing flight of a butterfly
    f.p[1] += Math.cos(f.phase) * 0.18 * dt * (f.glide > 0 ? 0 : 1);
    if (!f.leaving) f.p[1] = Math.max(0.12, f.p[1]);
    f.p[2] = Math.max(4, f.p[2]);
    // short glides between bursts of beats
    if (f.glide > 0) f.glide -= dt;
    else if (Math.random() < dt * 0.25) f.glide = rand(0.25, 0.6);
    else f.phase += dt * f.rate * Math.PI;
    // face where it's going (head slightly up)
    const hv = Math.hypot(f.v[0], f.v[2]);
    if (hv > 0.05) f.fwd = norm([f.v[0], f.v[1] * 0.4 + 0.25 * hv, f.v[2]]);
  }

  /** for tests */
  get count() { return this.flies.filter((f) => !f.gone).length; }
}
