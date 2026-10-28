// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DungeonSelectPanel } from './DungeonSelectPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { EventBus } from '../../game/EventBus';
import { emptyRecord, todayKey } from '../../game/systems/dungeon';
import { DUNGEONS } from '../../data';
import { DUNGEON_CATALOG } from '../../data/dungeonCatalog';
import { playerStats } from '../../game/systems/progression';
import { lifeProgress } from '../../game/systems/life';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/${id}.png` }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root, previous: ReturnType<typeof gameStore.getState>;
const click = (selector: string) =>
  act(() => host.querySelector<HTMLButtonElement>(selector)!.click());
const named = (parent: string, name: string) =>
  act(() =>
    [...host.querySelectorAll<HTMLButtonElement>(`${parent} button`)]
      .find((b) => b.textContent === name)!
      .click(),
  );
beforeEach(() => {
  previous = gameStore.getState();
  const p = { ...newPlayer(), admitted: true };
  gameStore.setState({
    player: p,
    stats: playerStats(p),
    menu: 'dungeon',
    status: 'alive',
    quests: {},
    dungeon: null,
    tribulation: null,
  });
  host = document.createElement('div');
  root = createRoot(host);
  act(() => root.render(<DungeonSelectPanel />));
});
afterEach(() => {
  act(() => root.unmount());
  gameStore.setState(previous);
});

it('selects a real variant without granting loot or consuming attempts and permits a low-level challenge', () => {
  const before = gameStore.getState().player,
    enter = vi.fn(),
    stop = EventBus.on('cmd:enterDungeon', enter);
  try {
    expect(host.querySelectorAll('[data-dungeon]')).toHaveLength(DUNGEON_CATALOG.length);
    click('[data-dungeon="tier_90"]');
    click('[data-difficulty="dia_nguc"]');
    expect(
      host.querySelector('[data-selected-dungeon]')!.getAttribute('data-selected-dungeon'),
    ).toBe('tier_90_dia_nguc');
    expect(host.querySelector('.dungeon-detail')!.textContent).toContain('Huyền Thiên Thủ Hộ');
    expect(host.querySelector('[data-action="enter-dungeon"]')!.hasAttribute('disabled')).toBe(
      false,
    );
    expect(gameStore.getState().player).toBe(before);
    click('[data-action="enter-dungeon"]');
    expect(enter).toHaveBeenCalledWith('tier_90_dia_nguc');
    expect(gameStore.getState().player).toBe(before);
    click('[data-dungeon="tier_10"]');
    click('[data-dungeon="tier_90"]');
    expect(host.querySelector('[data-difficulty="dia_nguc"]')!.getAttribute('aria-pressed')).toBe(
      'true',
    );
  } finally {
    stop();
  }
});
it('shows the selected difficulty daily limit and re-enables entry on another difficulty or day', () => {
  act(() =>
    gameStore.setState((s) => ({
      player: {
        ...s.player,
        dungeons: {
          ...emptyRecord(),
          runs: { tier_10_de: DUNGEONS.tier_10_de.attemptsPerDay },
          clears: { tier_10_de: 2 },
        },
      },
    })),
  );
  click('[data-dungeon="tier_10"]');
  expect(host.querySelector('.dungeon-launch [role=status]')!.textContent).toContain('hết lượt');
  expect(host.querySelector<HTMLButtonElement>('[data-action="enter-dungeon"]')!.disabled).toBe(
    true,
  );
  click('[data-difficulty="kho"]');
  expect(host.querySelector<HTMLButtonElement>('[data-action="enter-dungeon"]')!.disabled).toBe(
    false,
  );
  expect(host.querySelector('.dungeon-launch')!.textContent).toContain('2/2');
  act(() =>
    gameStore.setState((s) => ({
      player: {
        ...s.player,
        dungeons: {
          ...s.player.dungeons!,
          day: todayKey() === '2000-01-01' ? '2000-01-02' : '2000-01-01',
        },
      },
    })),
  );
  click('[data-difficulty="de"]');
  expect(host.querySelector<HTMLButtonElement>('[data-action="enter-dungeon"]')!.disabled).toBe(
    false,
  );
  expect(host.querySelector('.dungeon-record')!.textContent).toContain(`1/${DUNGEON_CATALOG.length}`);
});
it('filters the real catalog, resets empty filters and never hides access behind a recommended level', () => {
  named('.dungeon-level-filters', 'Lv.81+');
  expect(host.querySelectorAll('[data-dungeon]')).toHaveLength(2);
  expect(host.querySelector('[data-dungeon="tier_90"]')).not.toBeNull();
  named('.dungeon-sidebar', 'Cốt truyện');
  expect(host.querySelectorAll('[data-dungeon]')).toHaveLength(0);
  named('.dungeon-destinations', 'Xem tất cả');
  expect(host.querySelectorAll('[data-dungeon]')).toHaveLength(DUNGEON_CATALOG.length);
  named('.dungeon-sidebar', 'Sư môn');
  expect(host.querySelectorAll('[data-dungeon]')).toHaveLength(2);
});
it('previews real first-clear rewards and drop probabilities and keeps preparation connected to the bag', () => {
  click('[data-dungeon="tier_30"]');
  click('[data-difficulty="dia_nguc"]');
  expect(host.querySelector('.dungeon-boss-portrait image')!.getAttribute('href')).toMatch(
    /monsters-elite-v6\.[a-f0-9]{12}\.webp$/,
  );
  expect(host.querySelector('.dungeon-boss-portrait image')!.getAttribute('clip-path')).toContain(
    'url(#',
  );
  const before = gameStore.getState().player;
  named('.dungeon-reward-tabs', 'Có thể rơi');
  const probabilities = [...host.querySelectorAll('.bonus > b')].map((e) => e.textContent);
  expect(probabilities).toEqual(['4%', '1.5%', '0.6%', '0.2%']);
  named('.dungeon-reward-tabs', 'Lần đầu');
  expect(host.querySelector('.dungeon-prizes')!.textContent).toContain('Hồi Xuân Đan');
  expect(host.querySelector('.dungeon-prizes')!.textContent).toContain('×3');
  expect(gameStore.getState().player).toBe(before);
  named('.dungeon-launch', 'Chuẩn bị hành trang');
  expect(gameStore.getState().menu).toBe('bag');
});
it('keeps story and combat-state restrictions, and the return button leaves the real current instance', () => {
  expect(host.querySelector<HTMLButtonElement>('[data-action="enter-dungeon"]')!.disabled).toBe(
    true,
  );
  act(() => gameStore.setState({ quests: { first_prepare: { status: 'done', progress: [1] } } }));
  expect(host.querySelector<HTMLButtonElement>('[data-action="enter-dungeon"]')!.disabled).toBe(
    false,
  );
  act(() => gameStore.setState({ status: 'downed' }));
  expect(host.querySelector<HTMLButtonElement>('[data-action="enter-dungeon"]')!.disabled).toBe(
    true,
  );
  act(() =>
    gameStore.setState((s) => ({
      status: 'alive',
      player: {
        ...s.player,
        life: { ...lifeProgress(s.player), retreat: { days: 1, readyDay: 10000 } },
      },
    })),
  );
  expect(host.querySelector('.dungeon-launch')!.textContent).toContain('xuất quan');
  act(() =>
    gameStore.setState({
      dungeon: {
        id: 'tier_10_de',
        name: 'Băng Tuyết Động',
        phase: 'wave',
        wave: 0,
        waves: 3,
        remaining: 3,
        timeLeft: 100,
        boss: null,
      },
    }),
  );
  const leave = vi.fn(),
    stop = EventBus.on('cmd:leaveDungeon', leave);
  try {
    named('.dungeon-launch', 'Rời phó bản');
    expect(leave).toHaveBeenCalledOnce();
  } finally {
    stop();
  }
});
