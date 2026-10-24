// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect } from 'vitest';
import { TopMenu } from './TopMenu';
import { gameStore, newPlayer } from '../store/gameStore';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('keeps mobile menus compact while making sect and premium features reachable', () => {
  const previous = gameStore.getState(),
    host = document.createElement('div'),
    root = createRoot(host);
  gameStore.setState({ player: { ...newPlayer(), admitted: true }, menu: null });
  try {
    act(() => root.render(<TopMenu phone />));
    expect(host.querySelectorAll('button')).toHaveLength(5);
    act(() => host.querySelector<HTMLButtonElement>('[aria-expanded]')!.click());
    expect(host.querySelector('.menu-btn-premium')).not.toBeNull();
    act(() => host.querySelector<HTMLButtonElement>('.menu-btn-sect')!.click());
    expect(gameStore.getState().menu).toBe('sect');
    expect(host.querySelector('.top-menu-more')).toBeNull();
    act(() => root.render(<TopMenu />));
    expect(host.querySelectorAll('button')).toHaveLength(11);
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});
