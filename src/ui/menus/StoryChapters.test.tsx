// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StoryChapters } from './StoryChapters';
import { Journey } from './Journey';
import { gameStore, newPlayer } from '../../store/gameStore';
import { EventBus } from '../../game/EventBus';
import { trackedQuest, trackQuest } from '../../game/systems/questNav';
vi.mock('../../game/art/icons', () => ({ itemIconUrl: () => '/item.png' }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement,
  root: Root,
  previous: ReturnType<typeof gameStore.getState>,
  previousTracked: string | null;
beforeEach(() => {
  previous = gameStore.getState();
  previousTracked = trackedQuest();
  host = document.createElement('div');
  root = createRoot(host);
  const p = {
    ...newPlayer(),
    heroId: 'hong_lien' as const,
    origin: 'vuong_gia_thon' as const,
    admitted: false,
  };
  gameStore.setState({
    player: p,
    status: 'alive',
    dungeon: null,
    tribulation: null,
    journeySection: 'story',
    quests: { village_0: { status: 'active', progress: [0, 0] } },
  });
});
afterEach(() => {
  act(() => root.unmount());
  trackQuest(previousTracked);
  gameStore.setState(previous);
});

it('previews locked stops and rewards without granting items or altering progression', () => {
  act(() => root.render(<StoryChapters />));
  expect(host.querySelectorAll('[data-stage]')).toHaveLength(8);
  expect(host.querySelector('[data-stage="village"]')?.getAttribute('aria-pressed')).toBe('true');
  const p = gameStore.getState().player,
    q = gameStore.getState().quests;
  act(() => host.querySelector<HTMLButtonElement>('[data-stage="trial"]')!.click());
  expect(
    [...host.querySelectorAll<HTMLButtonElement>('.road-task button')].every((b) => b.disabled),
  ).toBe(true);
  act(() => host.querySelector<HTMLButtonElement>('#road-tab-rewards')!.click());
  expect(host.querySelector('.road-reward-ledger')?.textContent).toContain('Chưa nhận');
  expect(host.querySelectorAll('.road-reward-ledger button')).toHaveLength(0);
  expect(gameStore.getState().player).toBe(p);
  expect(gameStore.getState().quests).toBe(q);
});
it('navigates a ready quest to its NPC instead of claiming its reward from the book', () => {
  gameStore.setState({
    quests: {
      village_0: { status: 'done', progress: [1, 1] },
      village_1: { status: 'ready', progress: [2] },
    },
  });
  act(() => root.render(<StoryChapters />));
  const p = gameStore.getState().player,
    go = vi.fn(),
    off = EventBus.on('cmd:questGo', go);
  try {
    act(() => host.querySelector<HTMLButtonElement>('[data-quest="village_1"] button')!.click());
    expect(go).toHaveBeenCalledWith('village_1');
    expect(trackedQuest()).toBe('village_1');
    expect(gameStore.getState().quests.village_1.status).toBe('ready');
    expect(gameStore.getState().player).toBe(p);
  } finally {
    off();
  }
});
it('accepts an available quest through the real action and follows the next stop after completion', () => {
  gameStore.setState({ quests: { village_0: { status: 'done', progress: [1, 1] } } });
  act(() => root.render(<StoryChapters />));
  act(() => host.querySelector<HTMLButtonElement>('[data-quest="village_1"] button')!.click());
  expect(gameStore.getState().quests.village_1.status).toBe('active');
  act(() =>
    gameStore.setState({
      quests: {
        village_0: { status: 'done', progress: [1, 1] },
        village_1: { status: 'done', progress: [2] },
        village_2: { status: 'done', progress: [2] },
        village_3: { status: 'done', progress: [2] },
      },
    }),
  );
  expect(host.querySelector('[data-stage="river"]')?.getAttribute('aria-pressed')).toBe('true');
});
it('retains the feature tabs and keeps adult activities closed during childhood', () => {
  gameStore.setState({ journeySection: 'alchemy' });
  act(() => root.render(<Journey />));
  expect(host.querySelector('.journey-roadbook')).not.toBeNull();
  expect(host.querySelector<HTMLButtonElement>('#journey-tab-alchemy')!.disabled).toBe(true);
  expect(host.querySelector<HTMLButtonElement>('#journey-tab-world')!.disabled).toBe(false);
  act(() => gameStore.setState({ player: { ...gameStore.getState().player, admitted: true } }));
  expect(host.querySelector('.alchemy-panel')).not.toBeNull();
  expect(host.querySelector<HTMLButtonElement>('#journey-tab-alchemy')!.disabled).toBe(false);
});
