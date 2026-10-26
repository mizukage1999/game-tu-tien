// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { it, expect, vi } from 'vitest';
import { DuelOverlay } from './DuelOverlay';
import { socialStore } from '../../store/socialStore';
import { newPlayer } from '../../store/gameStore';
import { buildDuelist } from '../../game/systems/duel';
import { playerStats } from '../../game/systems/progression';
import { ArenaEngine } from '../../game/systems/arena';
import { closeArena, readyArena } from '../../net/socialBridge';
vi.mock('../../net/socialBridge', () => ({
  closeArena: vi.fn(),
  readyArena: vi.fn(),
  sendArenaInput: vi.fn(),
}));
vi.mock('../../game/art/icons', () => ({ skillSpriteUrl: () => '/skill.png' }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('retries a ready message lost before the host opens the arena, then stops once acknowledged', () => {
  vi.useFakeTimers();
  vi.mocked(readyArena).mockClear();
  const root = createRoot(document.createElement('div'));
  const previous = socialStore.getState();
  const p = newPlayer(),
    a = buildDuelist(p, playerStats(p), 'Luyện Khí', 'a'),
    b = { ...a, userId: 'b' };
  const engine = new ArenaEngine('ready-retry', a, b);
  socialStore.setState({
    duel: { nonce: 'ready-retry', snapshot: engine.snapshot(), a, b, aIsMe: false, localId: 'b', practice: false },
  });
  try {
    act(() => root.render(<DuelOverlay />));
    expect(readyArena).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(1200));
    expect(readyArena).toHaveBeenCalledTimes(3);
    engine.start();
    act(() => socialStore.setState((s) => ({ duel: { ...s.duel!, snapshot: engine.snapshot() } })));
    act(() => vi.advanceTimersByTime(1200));
    expect(readyArena).toHaveBeenCalledTimes(3);
  } finally {
    act(() => root.unmount());
    socialStore.setState(previous);
    vi.useRealTimers();
  }
});
it('lets the result return button receive a tap instead of capturing it as arena movement', () => {
  const host = document.createElement('div'),
    root = createRoot(host),
    previous = socialStore.getState();
  const p = newPlayer(),
    a = buildDuelist(p, playerStats(p), 'Luyện Khí', 'a'),
    b = { ...a, userId: 'b' };
  const e = new ArenaEngine('return', a, b);
  e.forfeit('b');
  socialStore.setState({
    duel: {
      nonce: 'return',
      snapshot: e.snapshot(),
      a,
      b,
      aIsMe: true,
      localId: 'a',
      practice: true,
    },
  });
  try {
    act(() => root.render(<DuelOverlay />));
    const stage = host.querySelector<HTMLElement>('.duel-stage')!,
      capture = vi.fn();
    stage.setPointerCapture = capture;
    const button = host.querySelector<HTMLButtonElement>('.duel-finish button')!;
    act(() => button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })));
    expect(capture).not.toHaveBeenCalled();
    act(() => button.click());
    expect(closeArena).toHaveBeenCalledOnce();
    expect(host.querySelectorAll('.duel-abilities button')).toHaveLength(8);
    expect(host.querySelector('.duel-leave')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    socialStore.setState(previous);
  }
});
