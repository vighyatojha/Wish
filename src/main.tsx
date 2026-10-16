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
createRoot(document.getElementById('root')!).render(<App />);
