// A test page: every character on one screen (open with ?scene=gallery).
import { useEffect, useRef } from 'react';
import { AnimalArt, AnimalRig, type AnimalKind } from '../components/Animals';
import { FairyArt, FairyRig, FAIRIES } from '../components/Fairy';
import { GrainPattern } from '../components/CuteBird';
import { gsap } from '../lib/motion';

const KINDS: AnimalKind[] = ['bunny', 'fox', 'hedgehog', 'squirrel', 'duckling'];

export function Gallery() {
  const animals = useRef<(SVGGElement | null)[]>([]);
  const fairies = useRef<(SVGGElement | null)[]>([]);
  useEffect(() => {
    const a = animals.current.map((g) => new AnimalRig(g!));
    const f = fairies.current.map((g) => new FairyRig(g!));
    const tick = (t: number) => {
      a.forEach((r, i) => r.pose({ squash: Math.sin(t * 3 + i) * 0.015, lean: 0, head: Math.sin(t + i) * 4, earL: Math.sin(t * 2 + i) * 4, earR: 0, tail: Math.sin(t * 1.5 + i) * 6, blink: 1, offer: 0.5 + 0.5 * Math.sin(t + i) }));
      f.forEach((r, i) => r.pose(t * 30 + i, 0, t, 1, i * 1.7));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return (
    <svg viewBox="0 -60 1200 620" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', background: '#cfe3c4' }}>
      <defs><GrainPattern id="grain-gallery" /></defs>
      {KINDS.map((k, i) => (
        <g key={k} transform={`translate(${20 + i * 236} -20) scale(1.05)`} ref={(el) => { animals.current[i] = el; }}>
          <AnimalArt kind={k} grain="grain-gallery" />
        </g>
      ))}
      {FAIRIES.map((look, i) => (
        <g key={i} transform={`translate(${i * 200} 260) scale(1.1)`} ref={(el) => { fairies.current[i] = el; }}>
          <FairyArt look={look} grain="grain-gallery" />
        </g>
      ))}
    </svg>
  );
}
