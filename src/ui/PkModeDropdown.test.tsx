// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { PkModeDropdown } from './PkModeDropdown';
import { gameStore, newPlayer } from '../store/gameStore';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: Root, host: HTMLDivElement, previous: ReturnType<typeof gameStore.getState>;
beforeEach(() => {
  previous = gameStore.getState();
  gameStore.setState({ player: { ...newPlayer(), pkMode: 'peace' } });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  gameStore.setState(previous);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('compact PK dropdown', () => {
  it('changes the actual PK mode through options, while preserving character data', () => {
    const before = gameStore.getState().player;
    act(() => root.render(<PkModeDropdown />));
    const trigger = host.querySelector<HTMLButtonElement>('.pk-mode-trigger')!;
    expect(trigger.textContent).toBe('Hòa bình');
    expect(host.querySelector('.pk-swords')).not.toBeNull();
    for (const mode of ['sect', 'all', 'peace']) {
      act(() => trigger.click());
      expect(host.querySelectorAll('[role=option]')).toHaveLength(3);
      act(() => host.querySelector<HTMLButtonElement>(`[role=option][data-mode=${mode}]`)!.click());
      expect(gameStore.getState().player.pkMode).toBe(mode);
      expect(host.querySelector('[role=listbox]')).toBeNull();
      expect(host.querySelector('.pk-dropdown')?.getAttribute('data-mode')).toBe(mode);
    }
    expect(gameStore.getState().player).toEqual(before);
  });
  it('closes outside and supports keyboard navigation without silently changing mode', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (fn: () => void) => setTimeout(fn, 0));
    act(() => root.render(<PkModeDropdown />));
    const trigger = host.querySelector<HTMLButtonElement>('.pk-mode-trigger')!;
    act(() => trigger.click());
    act(() => document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })));
    expect(host.querySelector('[role=listbox]')).toBeNull();
    act(() =>
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    );
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement?.getAttribute('data-mode')).toBe('peace');
    act(() =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      ),
    );
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement?.getAttribute('data-mode')).toBe('sect');
    expect(gameStore.getState().player.pkMode).toBe('peace');
    act(() =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      ),
    );
    expect(host.querySelector('[role=listbox]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
