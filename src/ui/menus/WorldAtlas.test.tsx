// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldAtlas } from './WorldAtlas';
import { gameStore, newPlayer } from '../../store/gameStore';
import { QUESTS } from '../../data';
import { EventBus } from '../../game/EventBus';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root, previous: ReturnType<typeof gameStore.getState>;
beforeEach(() => {
  previous = gameStore.getState(); host = document.createElement('div'); root = createRoot(host);
  gameStore.setState({ player: { ...newPlayer(), admitted: true, level: 92 }, mapId: 'dai_thua_vien',
    quests: Object.fromEntries(Object.entries(QUESTS).map(([id, def]) => [id, { status: 'done', progress: def.objectives.map(o => o.count) }])) });
});
afterEach(() => { act(() => root.unmount()); gameStore.setState(previous); });
const click = (selector: string) => act(() => host.querySelector<HTMLButtonElement>(selector)!.click());

describe('painted world atlas', () => {
  it('selects a real location first, then starts the existing travel action without changing character data', () => {
    const travel = vi.fn(), off = EventBus.on('cmd:travel', travel), player = gameStore.getState().player;
    try {
      act(() => root.render(<WorldAtlas />)); click('[data-pin="linh_son_tong"]');
      expect(host.querySelector('[data-selected-map="linh_son_tong"]')).toBeTruthy(); expect(travel).not.toHaveBeenCalled();
      click('.atlas-detail button'); expect(travel).toHaveBeenCalledTimes(1); expect(travel).toHaveBeenCalledWith('linh_son_tong');
      expect(gameStore.getState().player).toBe(player);
    } finally { off(); }
  });
  it('keeps story gates and reputation gates visible and does not emit travel through a locked entrance', () => {
    gameStore.setState({ quests: {} });
    const travel = vi.fn(), off = EventBus.on('cmd:travel', travel);
    try {
      act(() => root.render(<WorldAtlas />)); click('[data-pin="bi_canh_thach_linh"]');
      expect(host.querySelector<HTMLButtonElement>('.atlas-detail button')!.disabled).toBe(true);
      click('.atlas-detail button'); expect(travel).not.toHaveBeenCalled();
      click('[data-pin="sect_sacred"]'); expect(host.querySelector<HTMLButtonElement>('.atlas-detail button')!.disabled).toBe(true);
    } finally { off(); }
  });
  it('allows a high level traveler to select and return to the starting village', () => {
    gameStore.setState({ mapId: 'viem_duong_dia' });
    const travel = vi.fn(), off = EventBus.on('cmd:travel', travel);
    try {
      act(() => root.render(<WorldAtlas />)); click('[data-map="vuong_gia_thon"]');
      expect(host.querySelector<HTMLButtonElement>('.atlas-detail button')!.disabled).toBe(false);
      click('.atlas-detail button'); expect(travel).toHaveBeenCalledWith('vuong_gia_thon');
    } finally { off(); }
  });
});
