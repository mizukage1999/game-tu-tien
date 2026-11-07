// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';

const boot = vi.hoisted(() => ({
  saved: true,
  worldReady: undefined as undefined | ((ready: boolean) => void),
  hudMounts: 0,
  hudUnmounts: 0,
  engineMounts: 0,
}));
vi.mock('./game/PhaserGame', () => ({
  PhaserGame: ({
    started,
    onReadyChange,
  }: {
    started: boolean;
    onReadyChange: (ready: boolean) => void;
  }) => {
    boot.worldReady = onReadyChange;
    useEffect(() => {
      boot.engineMounts++;
    }, []);
    return <div data-testid="engine" data-started={started} />;
  },
}));
vi.mock('./ui/Hud', () => ({
  Hud: ({ hidden }: { hidden: boolean }) => {
    const [clicks, setClicks] = useState(0);
    useEffect(() => {
      boot.hudMounts++;
      return () => {
        boot.hudUnmounts++;
      };
    }, []);
    return (
      <div className="hud" hidden={hidden}>
        <button onClick={() => setClicks(clicks + 1)}>{clicks}</button>
      </div>
    );
  },
}));
vi.mock('./ui/EntryScreen', () => ({
  StartScreen: ({ onStart }: { onStart: () => void }) => (
    <button data-start onClick={onStart}>
      Tiếp tục
    </button>
  ),
}));
vi.mock('./ui/CreateCharacter', () => ({
  CreateCharacter: ({ onDone }: { onDone: () => void }) => (
    <button data-create onClick={onDone}>
      Tạo nhân vật
    </button>
  ),
}));
vi.mock('./ui/AuthScreen', () => ({ AuthScreen: () => null }));
vi.mock('./ui/MobileViewport', () => ({ MobileViewport: () => null }));
vi.mock('./ui/TouchPlay', () => ({
  usePhoneLayout: () => false,
  usePortrait: () => false,
  useTryLockLandscape: () => {},
}));
vi.mock('./game/systems/save', () => ({ loadGame: () => (boot.saved ? {} : null) }));
vi.mock('./game/systems/gameBoot', () => ({
  bootStorage: () => undefined,
  consumeBootRetry: () => false,
}));
vi.mock('./store/gameStore', () => ({
  gameStore: { getState: () => ({ syncPremium: () => {} }) },
}));
vi.mock('./store/performanceStore', () => ({ usePerformanceTier: () => 0 }));
vi.mock('./net/config', () => ({ onlineEnabled: false }));
vi.mock('./net/session', () => ({
  useAccount: () => ({ user: null }),
  getAccountState: () => ({ user: null }),
}));
vi.mock('./net/socialBridge', () => ({ startSocial: () => {} }));
vi.mock('./net/premium', () => ({ refreshPremium: async () => {}, resetPremium: () => {} }));
vi.mock('./net/gameMail', () => ({ refreshMail: async () => {}, resetMail: () => {} }));
vi.mock('./net/serverControl', () => ({
  useServerControl: () => ({ blocked: false }),
  maintenanceBlocks: () => false,
  watchServerControl: () => {},
}));
vi.mock('./net/boot', () => ({ endGameSession: () => {} }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(boot, {
    saved: true,
    worldReady: undefined,
    hudMounts: 0,
    hudUnmounts: 0,
    engineMounts: 0,
  });
  vi.stubGlobal('visualViewport', undefined);
  host = document.createElement('div');
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});
const render = () => act(() => root.render(<App />));
const enter = () => act(() => host.querySelector<HTMLButtonElement>('[data-start]')!.click());
const ready = (value: boolean) => act(() => boot.worldReady!(value));

it('does not build HUD or menus during entry, initial loading, or a failed initial load', () => {
  render();
  expect(host.querySelector('.hud')).toBeNull();
  expect(host.querySelector('[data-started]')!.getAttribute('data-started')).toBe('false');
  enter();
  ready(false);
  expect(host.querySelector('.hud')).toBeNull();
  expect(host.querySelector('.world-grade')).toBeNull();
  expect(boot.hudMounts).toBe(0);
  ready(true);
  expect(host.querySelector('.hud')!.hasAttribute('hidden')).toBe(false);
  expect(boot.hudMounts).toBe(1);
  expect(boot.engineMounts).toBe(1);
});

it('hides existing controls on map loading/errors and restores them without losing menu state', () => {
  render();
  enter();
  ready(true);
  const hud = host.querySelector('.hud')!;
  act(() => hud.querySelector<HTMLButtonElement>('button')!.click());
  ready(false);
  expect(hud.hasAttribute('hidden')).toBe(true);
  expect(host.querySelector('.world-grade')!.hasAttribute('hidden')).toBe(true);
  ready(false);
  ready(true);
  expect(host.querySelector('.hud')).toBe(hud);
  expect(hud.hasAttribute('hidden')).toBe(false);
  expect(hud.textContent).toBe('1');
  expect(boot.hudMounts).toBe(1);
  expect(boot.hudUnmounts).toBe(0);
  expect(boot.engineMounts).toBe(1);
});

it('waits for the world to be ready after creating a character too', () => {
  boot.saved = false;
  render();
  act(() => host.querySelector<HTMLButtonElement>('[data-create]')!.click());
  expect(host.querySelector('[data-create]')).toBeNull();
  expect(host.querySelector('[data-started]')!.getAttribute('data-started')).toBe('true');
  expect(boot.hudMounts).toBe(0);
  ready(true);
  expect(boot.hudMounts).toBe(1);
});
