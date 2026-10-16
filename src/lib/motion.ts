// ─────────────────────────────────────────────────────────────
//  Animation setup shared by every scene.
//
//  Motion rules used across the site:
//    • things that ENTER ease out (fast start, gentle landing)
//    • things that LEAVE ease in (gentle start, quick exit)
//    • taps and small feedback: 100–200 ms
//    • interface changes (hints, buttons, text): 200–400 ms
//    • only transform and opacity are animated, so the phone's
//      graphics chip does the work
//  The long cinematic moments (rain, fog flight) are the exception:
//  they are scenery, not interface, so they take their time.
// ─────────────────────────────────────────────────────────────
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export const ease = {
  enter: 'power2.out',
  exit: 'power2.in',
  scenery: 'sine.inOut',
} as const;

export const dur = {
  tap: 0.12,
  micro: 0.18,
  ui: 0.3,
  text: 0.4,
} as const;

export { gsap, ScrollTrigger, SplitText, useGSAP };
