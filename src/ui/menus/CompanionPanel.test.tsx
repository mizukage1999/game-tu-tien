// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/test-icons/${id}.png` }));
import { CompanionPanel } from './CompanionPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { lifeProgress } from '../../game/systems/life';
import { adventure } from '../../game/systems/adventure';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
it('uses real ownership, feeding and evolution with no equipment or unrelated sidebar', () => {
  const previous = gameStore.getState(),
    host = document.createElement('div'),
    root = createRoot(host),
    p = { ...newPlayer(), admitted: true };
  p.life = { ...lifeProgress(p), companions: { snow_fox: { rank: 3, bond: 5 } }, companion: null };
  p.inventory = { thuc_an_linh_thu: 2, yeu_dan: 6, linh_chi: 4 };
  gameStore.setState({ player: p, status: 'alive', menu: 'companions', rewardPending: false });
  const tab = (label: string) =>
    act(() =>
      [...host.querySelectorAll<HTMLButtonElement>('.beast-tabs button')]
        .find((b) => b.textContent === label)!
        .click(),
    );
  try {
    act(() => root.render(<CompanionPanel />));
    expect(host.querySelectorAll('.beast-card')).toHaveLength(6);
    expect(host.querySelector('.journey-sidebar')).toBeNull();
    expect(host.querySelector('.beast-tabs')?.textContent).not.toContain('Trang Bị');
    act(() => host.querySelector<HTMLButtonElement>('.beast-deploy')!.click());
    expect(lifeProgress(gameStore.getState().player).companion).toBe('snow_fox');
    tab('Nuôi Dưỡng');
    act(() => host.querySelector<HTMLButtonElement>('.beast-detail-info > .btn')!.click());
    expect(lifeProgress(gameStore.getState().player).companions.snow_fox).toEqual({
      rank: 4,
      bond: 0,
    });
    expect(gameStore.getState().player.inventory.thuc_an_linh_thu).toBe(1);
    tab('Tiến Hóa');
    act(() => host.querySelector<HTMLButtonElement>('.beast-detail-info > .btn')!.click());
    expect(adventure(gameStore.getState().player).evolution.snow_fox).toBe(1);
    expect(gameStore.getState().player.inventory.yeu_dan).toBe(3);
    tab('Kỹ Năng');
    expect(host.textContent).toContain('Hàn Tức');
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Thanh Ngọc Lộc"]')!.click());
    expect(host.querySelector<HTMLButtonElement>('.beast-deploy')!.disabled).toBe(true);
    act(() => {
      const current = gameStore.getState().player;
      gameStore.setState({
        player: { ...current, adventure: { ...adventure(current), beastSeals: { jade_deer: 4 } } },
      });
    });
    act(() => host.querySelector<HTMLButtonElement>('.beast-deploy')!.click());
    expect(lifeProgress(gameStore.getState().player).companions.jade_deer).toEqual({
      rank: 1,
      bond: 0,
    });
    expect(adventure(gameStore.getState().player).beastSeals.jade_deer).toBe(0);
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});
