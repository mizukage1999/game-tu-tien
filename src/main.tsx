import { createRoot } from 'react-dom/client';
import './ui/hud.css';
import { startupScreen } from './startup/screen';

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
  const opening = startupScreen();
  if (
    !import.meta.env.VITE_NATIVE_APP &&
    /^\/admin(?:\/(?:index\.html)?)?$/.test(window.location.pathname)
  ) {
    const { AdminApp } = await import('./admin/AdminApp');
    window.__APP_READY = true;
    createRoot(document.getElementById('root')!).render(<AdminApp />);
    window.__RENDERED = true;
    opening.finish();
    return;
  }
  try {
    opening.phase('Đang xác nhận tài khoản và hành trình đã lưu…');
    const { bootOnline } = await import('./net/boot');
    await bootOnline();
  } catch (err) {
    console.error('[net] boot failed', err);
  }
  try {
    opening.phase('Đang chuẩn bị hệ thống game…');
    const [app, { prepareEntryResources }, { loadGame }] = await Promise.all([
      import('./App'),
      import('./startup/resources'),
      import('./game/systems/save'),
    ]);
    const App = app.default;
    if (!App) throw new Error('App default export missing');
    opening.allowContinue();
    // Capture after bootOnline: the account save must be hydrated before choosing art.
    const save = loadGame();
    let continuing = false;
    while (!continuing) {
      opening.phase('Đang chuẩn bị cảnh vật và nhân vật…');
      const resources = prepareEntryResources(save, (progress) => opening.progress(progress));
      const action = opening.waitForAction();
      const result = await Promise.race([resources, action]);
      if (result === 'continue') break;
      if (result === 'retry') continue;
      if (!result.failed) break;
      opening.assetsFailed();
      continuing = (await action) === 'continue';
    }
    window.__APP_READY = true;
    opening.renderer();
    createRoot(document.getElementById('root')!).render(
      <App
        onEntryReady={() => {
          window.__RENDERED = true;
          opening.finish();
        }}
      />,
    );
  } catch (err) {
    console.error('[app] render failed', err);
    window.__RENDER_ERROR = err;
    opening.fatal();
  }
}

void main();
