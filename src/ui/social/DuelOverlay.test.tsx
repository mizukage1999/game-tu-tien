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
import { closeArena } from '../../net/socialBridge';
vi.mock('../../net/socialBridge', () => ({
  closeArena: vi.fn(),
  readyArena: vi.fn(),
  sendArenaInput: vi.fn(),
}));
vi.mock('../../game/art/icons', () => ({ skillSpriteUrl: () => '/skill.png' }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
    expect(host.querySelectorAll('.duel-abilities button')).toHaveLength(5);
    expect(host.querySelector('.duel-leave')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    socialStore.setState(previous);
  }
});
