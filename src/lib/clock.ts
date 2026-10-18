// ─────────────────────────────────────────────────────────────
//  The day at the bus stop: one clock, 6 AM → 9 PM, about three
//  and a half real minutes. Everything that depends on the time of
//  day (light, sky, mist, the lamp, the bus lights, butterflies,
//  fireflies, birds, sounds) reads it from here, so it all moves
//  together, whatever she is doing (reading a note, waiting, tapping).
// ─────────────────────────────────────────────────────────────

export const DAY_START = 6;
export const DAY_END = 21;
/** real seconds per hour of the day (15 hours ≈ 3.5 minutes) */
export const SECONDS_PER_HOUR = 14;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** 0 before a, 1 after b, smooth in between */
const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export interface DayLook {
  hour: number;
  /** 0 day · 1 golden hour · 2 sunset · 3 blue hour · 4 night (the stage's grading) */
  night: number;
  /** before sunrise: cool, dim, a pink horizon */
  dawn: number;
  /** her sunrise picture (golden light, wet road), giving way to the day picture */
  morning: number;
  /** midday clarity */
  noon: number;
  /** low mist lying over the fields in the early morning */
  mist: number;
  lamp: number;
  butterflies: number;
  fireflies: number;
  birds: number;
  birdsong: number;
  crickets: number;
  /** where the sun is (x right, y up, z away from us), and how strongly it lights things (0 at night) */
  sun: [number, number, number];
  sunlight: number;
}

/** The street lamp flickers on at six, then stays lit. */
function lamp(h: number): number {
  if (h < 18) return 0;
  const t = (h - 18) * SECONDS_PER_HOUR; // seconds since six
  if (t > 1.6) return Math.min(1, 0.85 + (t - 1.6) * 0.3);
  const flick = [0.6, 0.05, 0.8, 0.2, 0.9, 0.4][Math.floor(t / 0.2) % 6];
  return flick;
}

export function dayLook(h: number): DayLook {
  // the sky darkens through golden hour, sunset, blue hour, night
  let night = 0;
  if (h > 15) night = h < 17 ? (h - 15) / 2 : h < 18 ? 1 + (h - 17) : h < 19.5 ? 2 + (h - 18) / 1.5 : Math.min(4, 3 + (h - 19.5) / 1.5);
  const az = (Math.PI * (h - 6)) / 12;                 // 0 at sunrise (east, on the right) → π at sunset
  const elev = Math.max(0, Math.sin(az));
  return {
    hour: h,
    night,
    dawn: 1 - ss(6.0, 6.9, h),
    morning: 1 - ss(8.0, 9.0, h),
    noon: ss(10.3, 12, h) * (1 - ss(13, 14.8, h)),
    mist: 0.85 * (1 - ss(6.2, 7.8, h)),
    lamp: lamp(h),
    butterflies: 1 - ss(17.3, 18.4, h),
    fireflies: ss(17.6, 19.0, h),
    birds: 1 - ss(16.8, 18.4, h),
    birdsong: ss(6.2, 6.9, h) * (1 - ss(16.5, 18.2, h)),
    crickets: ss(18.0, 19.4, h),
    sun: [Math.cos(az), elev * 0.9 + 0.08, 0.45],
    sunlight: ss(6.2, 7.2, h) * (1 - ss(17.4, 18.6, h)),
  };
}

export function formatHour(h: number): string {
  const total = Math.floor(h * 60);
  const hh = Math.floor(total / 60) % 24, mm = total % 60;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
}
