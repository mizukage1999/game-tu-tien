// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CultivationPanel } from './CultivationPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { expToNext, playerStats } from '../../game/systems/progression';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: () => '/item.png' }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const previous = gameStore.getState();
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  host = document.createElement('div');
  root = createRoot(host);
  const player = {
    ...newPlayer(),
    heroId: 'hong_lien' as const,
    admitted: true,
    level: 70,
    realmIndex: 6,
    exp: expToNext(70),
    linhKhi: 20000,
    inventory: { linh_thach: 100 },
  };
  gameStore.setState({
    player,
    stats: playerStats(player),
    status: 'alive',
    tribulation: null,
    mapId: 'dai_thua_vien',
    menu: 'cultivate',
  });
});
afterEach(() => {
  act(() => root.unmount());
  gameStore.setState(previous);
});

it('shows real material shortages inline and never starts an unaffordable breakthrough', () => {
  act(() => root.render(<CultivationPanel />));
  act(() => host.querySelectorAll<HTMLButtonElement>('.training-tabs button')[1].click());
  expect(host.querySelector('.training-materials .short')?.textContent).toContain('Phá Cảnh Đan');
  expect(host.querySelector('.training-inline-note')?.textContent).toContain('Phá Cảnh Đan');
  expect(host.querySelector<HTMLButtonElement>('.training-primary')!.disabled).toBe(true);
  expect(gameStore.getState().tribulation).toBeNull();
  act(() => gameStore.getState().addItem('pha_canh_dan', 1));
  expect(host.querySelector<HTMLButtonElement>('.training-primary')!.disabled).toBe(false);
  act(() => host.querySelector<HTMLButtonElement>('.training-primary')!.click());
  expect(gameStore.getState().tribulation).toMatchObject({ realm: 6, strikes: 0 });
  expect(gameStore.getState().player.realmIndex).toBe(6);
});
it('previews locked realms without changing the player or spending materials', () => {
  act(() => root.render(<CultivationPanel />));
  const before = gameStore.getState().player;
  act(() => host.querySelector<HTMLButtonElement>('[data-realm-index="11"]')!.click());
  expect(host.querySelector('.training-details h3')?.textContent).toContain('Toái Niết');
  expect(host.querySelector('.training-scene-label')?.textContent).toContain('XEM TRƯỚC');
  expect(gameStore.getState().player).toBe(before);
  expect(host.querySelector('image')?.getAttribute('href')).toBe(
    '/assets/ui/cultivation/meditating-heroes-v2.png',
  );
});
