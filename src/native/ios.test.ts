// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  native: true,
  platform: 'ios',
  listener: undefined as undefined | ((state: { isActive: boolean }) => void),
  remove: vi.fn(),
  save: vi.fn(),
  add: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.native, getPlatform: () => mocks.platform },
}));
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.add } }));
vi.mock('../game/EventBus', () => ({
  EventBus: { emit: mocks.save }, virtualInput: { x: 1, y: -1 },
}));
import { virtualInput } from '../game/EventBus';
import { startIOSRuntime } from './ios';

describe('iOS suspension and resume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.native = true;
    mocks.platform = 'ios';
    mocks.listener = undefined;
    mocks.add.mockImplementation(async (_name, callback) => {
      mocks.listener = callback;
      return { remove: mocks.remove };
    });
    virtualInput.x = 1;
    virtualInput.y = -1;
  });

  it('saves and releases movement when iOS suspends the app', async () => {
    const blur = vi.fn();
    window.addEventListener('blur', blur, { once: true });
    const stop = await startIOSRuntime();
    expect(mocks.add).toHaveBeenCalledWith('appStateChange', expect.any(Function));
    expect(mocks.add).toHaveBeenCalledTimes(1);
    mocks.listener!({ isActive: false });
    expect(virtualInput).toEqual({ x: 0, y: 0 });
    expect(blur).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledWith('cmd:save');
    stop();
    expect(mocks.remove).toHaveBeenCalledOnce();
  });

  it('updates layout on return without saving or resetting movement again', async () => {
    const resize = vi.fn();
    window.addEventListener('resize', resize, { once: true });
    const stop = await startIOSRuntime();
    mocks.listener!({ isActive: true });
    expect(resize).toHaveBeenCalledOnce();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(virtualInput).toEqual({ x: 1, y: -1 });
    stop();
  });

  it.each(['web', 'android'])('does not install iOS handlers on %s', async (platform) => {
    mocks.platform = platform;
    mocks.native = platform !== 'web';
    (await startIOSRuntime())();
    expect(mocks.add).not.toHaveBeenCalled();
  });
});
