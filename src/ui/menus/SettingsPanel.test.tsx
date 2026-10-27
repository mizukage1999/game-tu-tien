// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from './SettingsPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  normalizeSettings,
  settingsStore,
} from '../../store/settingsStore';
import { getAccountState, setAccountState } from '../../net/session';
import { preferredDensity } from '../../game/systems/display';
import { signOutPlayer } from '../../net/auth';
import { EventBus } from '../../game/EventBus';
vi.mock('../../net/auth', () => ({ signOutPlayer: vi.fn(), upgradeGuest: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let previous: ReturnType<typeof gameStore.getState>;
let previousSettings: ReturnType<typeof settingsStore.getState>;
let previousAccount: ReturnType<typeof getAccountState>;
beforeEach(() => {
  previous = gameStore.getState();
  previousSettings = settingsStore.getState();
  previousAccount = getAccountState();
  vi.clearAllMocks();
  const p = { ...newPlayer(), admitted: true };
  gameStore.setState({ player: p });
  settingsStore.setState({ preferences: { ...DEFAULT_SETTINGS }, persisted: true });
  setAccountState({ user: null, status: 'offline', booting: false, error: null });
});
afterEach(() => {
  gameStore.setState(previous);
  settingsStore.setState(previousSettings);
  setAccountState(previousAccount);
  localStorage.removeItem(SETTINGS_KEY);
});

describe('device settings', () => {
  it('validates preferences and keeps sharp rendering inside the existing back-buffer budget', () => {
    expect(
      normalizeSettings({ brightness: 999, quality: 'ultra', showNames: 'yes', showDamage: false }),
    ).toEqual({ ...DEFAULT_SETTINGS, brightness: 130, showDamage: false });
    expect(normalizeSettings({ brightness: NaN })).toEqual(DEFAULT_SETTINGS);
    expect(preferredDensity(844, 390, 3, 'light')).toBe(1);
    expect(preferredDensity(844, 390, 3, 'sharp')).toBe(3);
    const density = preferredDensity(2400, 1600, 3, 'sharp');
    expect(2400 * 1600 * density ** 2).toBeLessThanOrEqual(8_000_001);
  });
  it('persists real display preferences and resets only those preferences, leaving the character intact', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      player = gameStore.getState().player;
    try {
      act(() => root.render(<SettingsPanel />));
      const damage = host.querySelector<HTMLButtonElement>(
        '[aria-label="Hiển thị số sát thương"]',
      )!;
      act(() => damage.click());
      expect(damage.getAttribute('aria-checked')).toBe('false');
      expect(settingsStore.getState().preferences.showDamage).toBe(false);
      expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toHaveProperty('showDamage', false);
      const quality = host.querySelector<HTMLSelectElement>('[aria-label="Độ nét hình ảnh"]')!;
      act(() => {
        quality.value = 'light';
        quality.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(settingsStore.getState().preferences.quality).toBe('light');
      act(() => host.querySelector<HTMLButtonElement>('.settings-bottom-bar button')!.click());
      expect(settingsStore.getState().preferences).toEqual(DEFAULT_SETTINGS);
      expect(gameStore.getState().player).toBe(player);
      expect(host.querySelector('[role="status"]')?.textContent).toContain('mặc định');
      act(() =>
        [...host.querySelectorAll<HTMLButtonElement>('nav button')]
          .find((b) => b.textContent === 'Tài khoản')!
          .click(),
      );
      expect(host.querySelector('.settings-account-management')?.textContent).not.toMatch(
        /Supabase|VITE_|SQL Editor/,
      );
    } finally {
      act(() => root.unmount());
    }
  });
  it('keeps sign-out failures inside the panel and enables a retry', async () => {
    setAccountState({
      user: {
        id: 'account-id',
        user_metadata: { username: 'Test' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: '2026-10-24T00:00:00Z',
        is_anonymous: true,
      },
      status: 'saved',
    });
    vi.mocked(signOutPlayer).mockRejectedValueOnce(new Error('offline'));
    const saved = vi.fn(),
      stop = EventBus.on('cmd:save', saved);
    const host = document.createElement('div'),
      root = createRoot(host);
    try {
      act(() => root.render(<SettingsPanel />));
      const button = host.querySelector<HTMLButtonElement>('.settings-signout')!;
      await act(async () => {
        button.click();
      });
      expect(saved).toHaveBeenCalled();
      expect(signOutPlayer).toHaveBeenCalledTimes(1);
      expect(button.disabled).toBe(false);
      expect(host.querySelector('[role="status"]')?.textContent).toContain('Chưa đăng xuất được');
    } finally {
      act(() => root.unmount());
      stop();
    }
  });
});
