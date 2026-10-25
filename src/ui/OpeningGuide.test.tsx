// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { OpeningGuide } from './OpeningGuide';
import { gameStore, newPlayer } from '../store/gameStore';
import { playerStats } from '../game/systems/progression';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it('lets a novice turn Auto off and take a potion without opening a modal', () => {
  const rootElement = document.createElement('div'),
    root = createRoot(rootElement),
    previous = gameStore.getState();
  const player = {
    ...newPlayer(),
    admitted: true,
    equipment: { weapon: 'moc_kiem' },
    inventory: { hoi_xuan_dan: 1 },
  };
  gameStore.setState({
    player,
    stats: playerStats(player),
    status: 'alive',
    auto: true,
    dungeon: null,
    menu: null,
    quests: { main_0: { status: 'done', progress: [1] } },
  });
  try {
    act(() => root.render(<OpeningGuide />));
    expect(rootElement.textContent).toContain('Tắt Auto');
    act(() => rootElement.querySelector('button')!.click());
    expect(gameStore.getState().auto).toBe(false);
    expect(rootElement.textContent).toContain('0/3');
    act(() => gameStore.setState({ player: { ...gameStore.getState().player, hp: 30 } }));
    act(() => rootElement.querySelector('button')!.click());
    expect(gameStore.getState().player.hp).toBeGreaterThan(30);
    expect(gameStore.getState().player.inventory.hoi_xuan_dan).toBeUndefined();
    expect(gameStore.getState().menu).toBeNull();
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});

it('shows boss evasion advice during the trial and disappears after the chapter reward', () => {
  const host = document.createElement('div'),
    root = createRoot(host),
    previous = gameStore.getState();
  gameStore.setState({
    player: { ...newPlayer(), admitted: true },
    status: 'alive',
    quests: { main_0: { status: 'done', progress: [1] } },
    dungeon: {
      id: 'ngoc_an_thu_luyen',
      name: 'Cổ Viện Ngọc Ấn',
      phase: 'boss',
      wave: 2,
      waves: 2,
      timeLeft: 200,
      remaining: 1,
      boss: null,
    },
  });
  try {
    act(() => root.render(<OpeningGuide />));
    expect(host.textContent).toContain('Vòng đỏ');
    act(() =>
      gameStore.setState({
        quests: { ...gameStore.getState().quests, first_return: { status: 'done', progress: [1] } },
      }),
    );
    expect(host.childElementCount).toBe(0);
  } finally {
    act(() => root.unmount());
    gameStore.setState(previous);
  }
});
