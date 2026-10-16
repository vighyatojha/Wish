import { createRoot } from 'react-dom/client';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english-sc/400.css';
import '@fontsource/patrick-hand/400.css';
import './styles/global.css';
import { App } from './App';

// No <StrictMode>: it mounts every scene twice while developing, which
// would create and destroy each WebGL effect twice for no benefit.
(window as unknown as { __appStarted: boolean }).__appStarted = true;

// Always show the newest version. Browsers keep the site's page for a few
// minutes after it's published; if the copy just opened is older than the
// live one, load the live one instead (once, so it can never loop).
if (!import.meta.env.DEV && location.protocol.startsWith('http')) {
  const me = new URL(import.meta.url).pathname.split('/').pop() ?? '';
  fetch(`./?fresh=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : ''))
    .then((html) => {
      if (!me || !html.includes('/assets/') || html.includes(me)) return;
      try {
        if (sessionStorage.getItem('updatedFrom') === me) return;
        sessionStorage.setItem('updatedFrom', me);
      } catch { /* private mode: still fine to reload once */ }
      const url = new URL(location.href);
      url.searchParams.set('v', String(Date.now()));
      location.replace(url.toString());
    })
    .catch(() => { /* offline: keep what we have */ });
}
createRoot(document.getElementById('root')!).render(<App />);
