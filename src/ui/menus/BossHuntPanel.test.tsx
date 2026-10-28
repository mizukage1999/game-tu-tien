// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { BossHuntPanel } from './BossHuntPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { bossCatalog } from '../../data/bossCatalog';
import { DUNGEONS, MONSTERS } from '../../data';
import { dungeonVariant } from '../../data/dungeonCatalog';
import { getMap } from '../../game/maps';
import { playerStats } from '../../game/systems/progression';
import { adventure } from '../../game/systems/adventure';
import {
  bossHuntStore,
  publishBossSightings,
  bossStatus,
  bossSighting,
} from '../../store/bossHuntStore';
import { EventBus } from '../../game/EventBus';

vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/${id}.png` }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement,
  root: Root,
  previous: ReturnType<typeof gameStore.getState>,
  previousHunt: ReturnType<typeof bossHuntStore.getState>;
const click = (selector: string) =>
  act(() => host.querySelector<HTMLButtonElement>(selector)!.click());
const input = (selector: string, value: string) =>
  act(() => {
    const e = host.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    Object.getOwnPropertyDescriptor(
      e.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
      'value',
    )!.set!.call(e, value);
    e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
beforeEach(() => {
  previous = gameStore.getState();
  previousHunt = bossHuntStore.getState();
  const initial = newPlayer(),
    player = {
      ...initial,
      admitted: true,
      level: 1,
      adventure: { ...adventure(initial), reputation: 10000 },
    };
  gameStore.setState({
    player,
    stats: playerStats(player),
    mapId: 'dai_thua_vien',
    menu: 'boss',
    quests: { first_prepare: { status: 'done', progress: [1] } },
    status: 'alive',
    dungeon: null,
    tribulation: null,
  });
  bossHuntStore.setState({ mapId: '', sightings: [] });
  host = document.createElement('div');
  root = createRoot(host);
  act(() => root.render(<BossHuntPanel />));
});
afterEach(() => {
  act(() => root.unmount());
  gameStore.setState(previous);
  bossHuntStore.setState(previousHunt);
});

it('uses real spawns and chooses a real travel or local navigation action without spending or granting anything', () => {
  const entry = bossCatalog().find((e) => e.category === 'world')!,
    map = getMap(entry.mapId);
  expect(
    map.monsters.some((m) => m.type === entry.type && m.x === entry.x && m.y === entry.y),
  ).toBe(true);
  const before = gameStore.getState().player,
    travel = vi.fn(),
    walk = vi.fn();
  const offTravel = EventBus.on('cmd:travel', travel),
    offWalk = EventBus.on('cmd:mapWalk', walk);
  try {
    click(`[data-boss="${entry.key}"]`);
    expect(host.querySelector('[data-selected-boss]')!.textContent).toContain(
      MONSTERS[entry.type].name,
    );
    expect(host.querySelector<HTMLButtonElement>('[data-action="hunt-boss"]')!.disabled).toBe(
      false,
    );
    click('[data-action="hunt-boss"]');
    expect(travel).toHaveBeenCalledWith(entry.mapId);
    act(() => gameStore.setState({ mapId: entry.mapId }));
    click('[data-action="hunt-boss"]');
    expect(walk).toHaveBeenCalledWith({ x: entry.x, y: entry.y });
    expect(gameStore.getState().player).toBe(before);
  } finally {
    offTravel();
    offWalk();
  }
});
it('renders observed HP and real respawn time, and never shows another map as live', () => {
  const entry = bossCatalog().find((e) => e.category === 'world')!;
  const sighting = {
    id: 'boss',
    type: entry.type,
    homeX: (entry.x + 0.5) * 48,
    homeY: (entry.y + 0.5) * 48,
    hp: 500,
    maxHp: 1000,
    alive: true,
    respawnAt: 0,
    generation: 1,
  };
  act(() => {
    gameStore.setState({ mapId: entry.mapId });
    publishBossSightings({ mapId: entry.mapId, sightings: [sighting] });
  });
  expect(host.querySelector('.hunt-hero')!.textContent).toContain('Đang giao chiến');
  click('[data-boss-tab="damage"]');
  expect(host.querySelector('.hunt-combat-metrics')!.textContent).toContain('500');
  expect(host.querySelector('.hunt-ranking')!.textContent).toContain('Chưa có bảng xếp hạng');
  act(() =>
    publishBossSightings({
      mapId: entry.mapId,
      sightings: [{ ...sighting, hp: 0, alive: false, respawnAt: Date.now() + 180000 }],
    }),
  );
  expect(host.querySelector('.hunt-hero')!.textContent).toContain('Đang hồi sinh');
  act(() => gameStore.setState({ mapId: 'vuong_gia_thon' }));
  expect(host.querySelector('.hunt-hero')!.textContent).toContain('Chưa dò khu vực');
  expect(bossSighting(entry, bossHuntStore.getState(), 'vuong_gia_thon')).toBeUndefined();
  expect(bossStatus({ ...sighting, hp: 0, alive: false, respawnAt: 500 }, 1000)).toMatchObject({
    label: 'Chờ xuất hiện',
    remaining: 0,
  });
});
it('uses the selected personal difficulty, actual loot probabilities and daily entry restrictions', () => {
  const entry = bossCatalog().find((e) => e.dungeon?.tier === 90)!,
    id = dungeonVariant(entry.dungeon!, 'dia_nguc');
  click('[data-boss-category="personal"]');
  click(`[data-boss="${entry.key}"]`);
  input('[aria-label="Độ khó săn boss"]', 'dia_nguc');
  const enter = vi.fn(),
    off = EventBus.on('cmd:enterDungeon', enter),
    before = gameStore.getState().player;
  try {
    click('[data-boss-tab="rewards"]');
    expect(host.querySelector('.hunt-detail-body')!.textContent).toContain('0.2%');
    click('[data-action="hunt-boss"]');
    expect(enter).toHaveBeenCalledWith(id);
    expect(gameStore.getState().player).toBe(before);
    act(() => gameStore.setState({ status: 'downed' }));
    expect(host.querySelector<HTMLButtonElement>('[data-action="hunt-boss"]')!.disabled).toBe(true);
    expect(DUNGEONS[id].boss).toBeDefined();
  } finally {
    off();
  }
});
it('keeps an empty search editable and empty sect/event tabs do not fabricate encounters or rewards', () => {
  input('[aria-label="Tìm boss"]', 'khongcoquainaotencaithe');
  expect(host.querySelector('[aria-label="Tìm boss"]')).not.toBeNull();
  expect(host.querySelectorAll('[data-boss]')).toHaveLength(0);
  input('[aria-label="Tìm boss"]', '');
  expect(host.querySelectorAll('[data-boss]').length).toBeGreaterThan(0);
  const before = gameStore.getState().player;
  for (const category of ['sect', 'event']) {
    click(`[data-boss-category="${category}"]`);
    expect(host.querySelector('[data-action="hunt-boss"]')).toBeNull();
    expect(host.querySelector('.hunt-empty')).not.toBeNull();
  }
  expect(gameStore.getState().player).toBe(before);
});
