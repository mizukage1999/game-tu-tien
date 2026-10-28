import { createRoot } from 'react-dom/client';
import './ui/hud.css';

// StrictMode is omitted on purpose: it would boot the Phaser game twice in development.

declare global {
  interface Window {
    __APP_READY?: boolean;
    __RENDERED?: boolean;
    __RENDER_ERROR?: unknown;
  }
}

/**
 * The session (and its save) has to be resolved before the game store module is
 * loaded, because the store reads localStorage once, at import time.
 */
async function main() {
  if (/^\/admin(?:\/(?:index\.html)?)?$/.test(window.location.pathname)) {
    const { AdminApp } = await import('./admin/AdminApp');
    window.__APP_READY = true;
    createRoot(document.getElementById('root')!).render(<AdminApp />);
    window.__RENDERED = true;
    return;
  }
  try {
    const { bootOnline } = await import('./net/boot');
    await bootOnline();
  } catch (err) {
    console.error('[net] boot failed', err);
  }
  try {
    const App = (await import('./App')).default;
    if (!App) throw new Error('App default export missing');
    window.__APP_READY = true;
    createRoot(document.getElementById('root')!).render(<App />);
    window.__RENDERED = true;
  } catch (err) {
    console.error('[app] render failed', err);
    window.__RENDER_ERROR = err;
  }
}

void main();
