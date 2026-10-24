// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { Skills } from './Menus';
import { Journey } from './Journey';
import { HomeBoard } from './CultivatorLife';
import { SkillBar } from '../SkillBar';
import { gameStore, newPlayer } from '../../store/gameStore';
import { skillLoadout } from '../../game/systems/skills';
import { HOME_QUEST } from '../../game/systems/immortal';

vi.mock('../../game/art/icons', () => ({
  itemIconUrl: () => '/item.png',
  skillSpriteUrl: (id: string) => `/${id}.png`,
  portraitUrl: () => '/hero.png',
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
describe('skill selection and in-panel crafting', () => {
  it('changes a selected slot through actual menu buttons and immediately updates combat controls', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    gameStore.setState({
      player: { ...newPlayer({ sex: 'male' }), admitted: true },
      cooldowns: {},
    });
    try {
      act(() =>
        root.render(
          <>
            <Skills />
            <SkillBar />
          </>,
        ),
      );
      const slots = host.querySelectorAll<HTMLButtonElement>('.skill-loadout button');
      expect(slots[0].disabled).toBe(true);
      act(() => slots[2].click());
      const assign = host.querySelector<HTMLButtonElement>(
        '.cult-skill-detail[data-skill="hoa_ma_chi"] [data-action="assign"]',
      )!;
      expect(assign.disabled).toBe(false);
      act(() => assign.click());
      expect(skillLoadout(gameStore.getState().player)[2]).toBe('hoa_ma_chi');
      expect(host.querySelector('.skill-assignment')?.textContent).toContain('ô 3');
      expect(host.querySelector('.skill-bar [data-skill="hoa_ma_chi"]')).not.toBeNull();
      expect(host.querySelectorAll('.skill-bar [data-skill]')).toHaveLength(5);
      act(() => slots[1].click());
      const swap = host.querySelector<HTMLButtonElement>(
        '.cult-skill-detail[data-skill="hoa_ma_chi"] [data-action="assign"]',
      )!;
      act(() => swap.click());
      expect(skillLoadout(gameStore.getState().player)[1]).toBe('hoa_ma_chi');
      expect(new Set(skillLoadout(gameStore.getState().player)).size).toBe(4);
    } finally {
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
  it('shows missing ingredients, availability and the crafting result without closing Đan Phòng', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    gameStore.setState({
      player: newPlayer(),
      journeySection: 'alchemy',
      status: 'alive',
      craftFeedback: null,
      quests: {},
    });
    try {
      act(() => root.render(<Journey />));
      let card = host.querySelector('.immortal-recipes article')!;
      expect(card.querySelector('.craft-availability')?.textContent).toContain('Thiếu:');
      expect(card.querySelector('.craft-availability')?.textContent).toContain('×2');
      expect(card.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
      act(() =>
        gameStore.setState({
          player: {
            ...gameStore.getState().player,
            linhKhi: 5,
            inventory: { thanh_linh_thao: 2, ngung_lo: 1 },
          },
        }),
      );
      card = host.querySelector('.immortal-recipes article')!;
      expect(card.querySelector('.craft-availability')?.textContent).toContain('Đủ nguyên liệu');
      act(() => card.querySelector<HTMLButtonElement>('button')!.click());
      expect(card.querySelector('[role="status"]')?.textContent).toContain('Luyện thành');
      expect(gameStore.getState().player.inventory.hoi_xuan_dan).toBe(1);
      expect(card.querySelector('.craft-availability')?.textContent).toContain('Thiếu:');
      expect(gameStore.getState().journeySection).toBe('alchemy');
    } finally {
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
  it('keeps workshop requirements and forging success inside the home furnace', () => {
    const host = document.createElement('div'),
      root = createRoot(host),
      previous = gameStore.getState();
    gameStore.setState({
      player: newPlayer(),
      mapId: 'dong_phu',
      homeSection: 'furnace',
      status: 'alive',
      craftFeedback: null,
      quests: { [HOME_QUEST]: { status: 'done', progress: [1] } },
    });
    try {
      act(() => root.render(<HomeBoard />));
      const card = host.querySelector('.life-recipe')!;
      expect(card.querySelector('.craft-availability')?.textContent).toContain('Thiếu:');
      act(() =>
        gameStore.setState({
          player: {
            ...gameStore.getState().player,
            inventory: { thanh_linh_thao: 2, linh_thach: 1 },
          },
        }),
      );
      act(() => card.querySelector<HTMLButtonElement>('button')!.click());
      expect(card.querySelector('[role="status"]')?.textContent).toContain('Chế tạo thành công');
      expect(gameStore.getState().player.inventory.moc_kiem).toBe(1);
    } finally {
      act(() => root.unmount());
      gameStore.setState(previous);
    }
  });
});
