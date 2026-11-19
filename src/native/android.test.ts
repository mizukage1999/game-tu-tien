// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  native: true,
  callbacks: new Map<string, (event?: unknown) => void>(),
  remove: vi.fn(),
  minimize: vi.fn(async () => {}),
  save: vi.fn(),
  game: {
    menu: null as string | null,
    dialogNpc: null as string | null,
    rewardPending: false,
    toast: vi.fn(),
    patch: vi.fn(),
  },
  chat: { open: false, close: vi.fn() },
  social: { card: null as string | null, duel: null as object | null, closeCard: vi.fn() },
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => 'android' },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    minimizeApp: mocks.minimize,
    addListener: vi.fn(async (name: string, callback: (event?: unknown) => void) => {
      mocks.callbacks.set(name, callback);
      return { remove: mocks.remove };
    }),
  },
}));
vi.mock('../store/gameStore', () => ({ gameStore: { getState: () => mocks.game } }));
vi.mock('../store/chatStore', () => ({ chatStore: { getState: () => mocks.chat } }));
vi.mock('../store/socialStore', () => ({ socialStore: { getState: () => mocks.social } }));
vi.mock('../net/partyDungeon', () => ({
  partyDungeonStore: { getState: () => ({ waiting: false }) },
}));
vi.mock('../store/skyRaceStore', () => ({ skyRaceStore: { getState: () => ({ active: false }) } }));
vi.mock('../game/EventBus', () => ({
  EventBus: { emit: mocks.save },
  virtualInput: { x: 1, y: -1 },
}));
import { startAndroidRuntime } from './android';
import { virtualInput } from '../game/EventBus';

describe('Android navigation and background lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.callbacks.clear();
    mocks.native = true;
    mocks.game.menu = mocks.game.dialogNpc = null;
    mocks.game.rewardPending = false;
    mocks.social.card = mocks.social.duel = null;
    mocks.chat.open = false;
    document.body.innerHTML = '';
    vi.spyOn(Date, 'now').mockReturnValue(10000);
  });
  afterEach(() => vi.restoreAllMocks());

  it('does not register native handlers on the web', async () => {
    mocks.native = false;
    (await startAndroidRuntime())();
    expect(mocks.callbacks.size).toBe(0);
  });
  it('closes a menu instead of minimizing or claiming rewards', async () => {
    const stop = await startAndroidRuntime();
    mocks.game.menu = 'skills';
    mocks.callbacks.get('backButton')!();
    expect(mocks.game.patch).toHaveBeenCalledWith({ menu: null, dialogNpc: null });
    expect(mocks.minimize).not.toHaveBeenCalled();
    stop();
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });
  it('never abandons an active duel on repeated Back', async () => {
    const stop = await startAndroidRuntime();
    mocks.social.duel = {};
    mocks.callbacks.get('backButton')!();
    mocks.callbacks.get('backButton')!();
    expect(mocks.minimize).not.toHaveBeenCalled();
    expect(mocks.game.patch).not.toHaveBeenCalled();
    stop();
  });
  it('Back cancels a confirmation via Escape without activating its confirm button', async () => {
    const stop = await startAndroidRuntime();
    document.body.innerHTML =
      '<section role="alertdialog" aria-modal="true"><button>Confirm</button></section>';
    const cancel = vi.fn();
    const confirm = vi.fn();
    document.addEventListener('keydown', cancel, { once: true });
    document.querySelector('button')!.addEventListener('click', confirm);
    mocks.callbacks.get('backButton')!();
    expect(cancel).toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(mocks.minimize).not.toHaveBeenCalled();
    stop();
  });
  it('saves and releases movement on background, then requests layout on resume', async () => {
    const stop = await startAndroidRuntime();
    const resize = vi.fn();
    window.addEventListener('resize', resize, { once: true });
    mocks.callbacks.get('appStateChange')!({ isActive: false });
    expect(virtualInput).toEqual({ x: 0, y: 0 });
    expect(mocks.save).toHaveBeenCalledWith('cmd:save');
    mocks.callbacks.get('appStateChange')!({ isActive: true });
    expect(resize).toHaveBeenCalledOnce();
    stop();
  });
  it('requires two Back presses at the root and saves before minimizing', async () => {
    const stop = await startAndroidRuntime();
    mocks.callbacks.get('backButton')!();
    expect(mocks.minimize).not.toHaveBeenCalled();
    mocks.callbacks.get('backButton')!();
    expect(mocks.save).toHaveBeenCalledWith('cmd:save');
    expect(mocks.minimize).toHaveBeenCalledOnce();
    stop();
  });
});
