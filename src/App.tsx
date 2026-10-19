// ─────────────────────────────────────────────────────────────
//  The story, scene by scene.
//  Only the scene on screen (plus the one being revealed under it)
//  is mounted, so the phone never runs two heavy scenes at once.
//
//  While building, add ?scene=stop (or pluck, bus, animals, question)
//  to the address to jump straight to page 2 (sound needs the first
//  tap, so it's silent).
// ─────────────────────────────────────────────────────────────
import { lazy, Suspense, useEffect, useState } from 'react';
import { preloadStory } from './lib/preload';
import { Intro } from './scenes/Intro';
// Page 2 (and the gallery) are loaded separately, so page 1 appears as soon as possible:
// page 2's code downloads quietly while she's reading page 1.
const loadBusStop = () => import('./scenes/BusStop');
const BusStop = lazy(() => loadBusStop().then((m) => ({ default: m.BusStop })));
const Gallery = lazy(() => import('./scenes/Gallery').then((m) => ({ default: m.Gallery })));

const skipTo = new URLSearchParams(location.search).get('scene');

export function App() {
  if (skipTo === 'gallery') return <Suspense fallback={null}><Gallery /></Suspense>;
  const jump = ['stop', 'pluck', 'bus', 'animals', 'question', 'bouquet'].includes(skipTo ?? '');
  const [showIntro, setShowIntro] = useState(!jump);
  const [showSunrise, setShowSunrise] = useState(jump);
  const [flying, setFlying] = useState(jump);
  const [sunriseInCharge, setSunriseInCharge] = useState(jump);

  // start fetching page 2 shortly after page 1 appears
  useEffect(() => {
    const id = window.setTimeout(() => { void loadBusStop(); preloadStory(); }, jump ? 0 : 1200);
    return () => clearTimeout(id);
  }, [jump]);

  return (
    <main>
      {showSunrise && <Suspense fallback={null}><BusStop flying={flying} entered={sunriseInCharge} /></Suspense>}
      {showIntro && (
        <Intro
          onRainStart={() => setShowSunrise(true)}
          onPaperBreaking={() => setFlying(true)}
          onDone={() => {
            setShowIntro(false);
            setSunriseInCharge(true);
          }}
        />
      )}
    </main>
  );
}
