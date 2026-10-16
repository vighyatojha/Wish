// ─────────────────────────────────────────────────────────────
//  The story, scene by scene.
//  Only the scene on screen (plus the one being revealed under it)
//  is mounted, so the phone never runs two heavy scenes at once.
//
//  While building, add ?scene=sunrise to the address to jump
//  straight to page 2 (sound needs the first tap, so it's silent).
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { preloadStory } from './lib/preload';
import { Intro } from './scenes/Intro';
import { Sunrise } from './scenes/Sunrise';

const skipTo = new URLSearchParams(location.search).get('scene');

export function App() {
  const jump = skipTo === 'sunrise';
  const [showIntro, setShowIntro] = useState(!jump);
  const [showSunrise, setShowSunrise] = useState(jump);
  const [flying, setFlying] = useState(jump);
  const [sunriseInCharge, setSunriseInCharge] = useState(jump);

  // start fetching page 2 shortly after page 1 appears
  useEffect(() => {
    const id = window.setTimeout(preloadStory, jump ? 0 : 1200);
    return () => clearTimeout(id);
  }, [jump]);

  return (
    <main>
      {showSunrise && <Sunrise flying={flying} entered={sunriseInCharge} />}
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
