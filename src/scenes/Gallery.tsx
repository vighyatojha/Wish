// A test page: every character on one screen (open with ?scene=gallery).
import { useEffect, useRef } from 'react';
import { AnimalArt, AnimalRig, type AnimalKind } from '../components/Animals';
import { ButterflyArt, ButterflyRig, TulipArt, TulipRig } from '../components/Garden';
import { GrainPattern } from '../components/CuteBird';
import { gsap } from '../lib/motion';

const KINDS: AnimalKind[] = ['bunny', 'fox', 'hedgehog', 'squirrel', 'duckling'];

export function Gallery() {
  const animals = useRef<(SVGGElement | null)[]>([]);
  const bf = useRef<SVGGElement>(null);
  const tulip = useRef<SVGGElement>(null);
  useEffect(() => {
    const a = animals.current.map((g) => new AnimalRig(g!));
    const b = new ButterflyRig(bf.current!);
    const t = new TulipRig(tulip.current!);
    const tick = (time: number) => {
      a.forEach((r, i) => r.pose({ squash: Math.sin(time * 3 + i) * 0.015, lean: 0, head: Math.sin(time + i) * 4, earL: 0, earR: 0, tail: Math.sin(time * 1.5 + i) * 6, blink: 1, offer: 0.5 + 0.5 * Math.sin(time + i), footL: i % 2 ? 10 : 0 }));
      b.pose(0.6 + 0.4 * Math.sin(time * 1.5), 1);
      t.pose(0.5 + 0.5 * Math.sin(time * 0.7), Math.sin(time) * 3);
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
      <g ref={bf} transform="translate(160 300) scale(1.2)"><ButterflyArt grain="grain-gallery" /></g>
      <g ref={tulip} transform="translate(600 230) scale(0.75)"><TulipArt grain="grain-gallery" /></g>
    </svg>
  );
}
