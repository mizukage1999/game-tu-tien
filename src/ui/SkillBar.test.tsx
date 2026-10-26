// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { SkillBar } from './SkillBar';
import { gameStore, newPlayer } from '../store/gameStore';
vi.mock('../game/art/icons', () => ({
  itemIconUrl: () => '/potion.png',
  skillSpriteUrl: (id: string) => `/${id}.png`,
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
describe('selected combat controls', () => {
  it('keeps seven combat buttons plus a separate dash while selected skills change', () => {
    const host = document.createElement('div'),
      root = createRoot(host);
    const previous = gameStore.getState();
    const player = { ...newPlayer(), admitted: true, level: 10 };
    gameStore.setState({ player });
    try {
      act(() => root.render(<SkillBar />));
      expect(host.querySelectorAll('[data-skill]')).toHaveLength(8);
      expect(host.querySelector('[data-skill="basic"]')).not.toBeNull();
      expect(host.querySelector('[data-skill="than_phap"]')?.classList.contains('pos-dash')).toBe(
        true,
      );
      expect(host.querySelector('.flight-btn')).not.toBeNull();
      act(() => gameStore.getState().chooseSkill(1, 'moc_linh'));
      expect(host.querySelectorAll('[data-skill]')).toHaveLength(8);
      expect(host.querySelector('[data-skill="moc_linh"]')).not.toBeNull();
      act(() => gameStore.setState({ cooldowns: { moc_linh: 8000 } }));
      expect(host.querySelector('[data-skill="moc_linh"]')?.classList.contains('cooling')).toBe(
        true,
      );
    } finally {
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
});
