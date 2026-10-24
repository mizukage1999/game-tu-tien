// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestJournal } from './QuestJournal';
import { SectPanel } from './SectPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { socialStore } from '../../store/socialStore';
import { adventure } from '../../game/systems/adventure';
import { playerStats } from '../../game/systems/progression';
import { trackedQuest, trackQuest } from '../../game/systems/questNav';
import { EventBus } from '../../game/EventBus';

vi.mock('../../net/socialBridge', () => ({ practiceDuel: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root;
let previous: ReturnType<typeof gameStore.getState>;
let previousSocial: ReturnType<typeof socialStore.getState>;
let previousTracked: string | null;
const button = (text: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === text)!;
const tab = (text: string) =>
  act(() =>
    [...host.querySelectorAll<HTMLButtonElement>('nav button')]
      .find((b) => b.textContent?.startsWith(text))!
      .click(),
  );
beforeEach(() => {
  previous = gameStore.getState();
  previousSocial = socialStore.getState();
  previousTracked = trackedQuest();
  trackQuest(null);
  host = document.createElement('div');
  root = createRoot(host);
  const p = { ...newPlayer(), admitted: true, level: 20 };
  p.adventure = { ...adventure(p), reputation: 150, contribution: 60 };
  gameStore.setState({
    player: p,
    stats: playerStats(p),
    mapId: 'linh_son_tong',
    status: 'alive',
    dungeon: null,
    tribulation: null,
    toasts: [],
    quests: {
      main_0: { status: 'done', progress: [1] },
      main_1: { status: 'active', progress: [3] },
      side_2: { status: 'active', progress: [0] },
    },
  });
  socialStore.setState({ connected: false, roster: [] });
});
afterEach(() => {
  act(() => root.unmount());
  trackQuest(previousTracked);
  gameStore.setState(previous);
  socialStore.setState(previousSocial);
});

describe('quest journal', () => {
  it('tracks and navigates the selected quest without granting rewards or changing progress', () => {
    act(() => root.render(<QuestJournal />));
    expect(host.querySelectorAll('nav button')).toHaveLength(1);
    expect(host.querySelectorAll('[data-quest]')).toHaveLength(2);
    const before = gameStore.getState().player;
    act(() => host.querySelector<HTMLButtonElement>('[data-quest="main_1"]')!.click());
    act(() => button('Theo dõi').click());
    expect(trackedQuest()).toBe('main_1');
    expect(button('Bỏ theo dõi')).toBeTruthy();
    const go = vi.fn(),
      off = EventBus.on('cmd:questGo', go);
    try {
      act(() => button('Đến vị trí').click());
      expect(go).toHaveBeenCalledWith('main_1');
    } finally {
      off();
    }
    expect(gameStore.getState().player).toBe(before);
    expect(gameStore.getState().quests.main_1.progress).toEqual([3]);
    const select = host.querySelector<HTMLSelectElement>('select')!;
    act(() => {
      select.value = 'done';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(host.querySelectorAll('[data-quest]')).toHaveLength(1);
    expect(button('Theo dõi').disabled).toBe(true);
    expect(button('Đến vị trí').disabled).toBe(true);
  });
});

describe('sect screens', () => {
  it('keeps five tabs and updates the real bound sect from registration', () => {
    act(() => root.render(<SectPanel />));
    expect(host.querySelectorAll('nav button')).toHaveLength(5);
    tab('Ghi danh');
    act(() =>
      [...host.querySelectorAll<HTMLButtonElement>('.sect-registration-options button')]
        .find((b) => b.textContent?.includes('Linh Sơn Tông'))!
        .click(),
    );
    act(() => button('Ghi danh tại đây').click());
    expect(adventure(gameStore.getState().player).boundSect).toBe('linh_son_tong');
    expect(button('Đã ghi danh').disabled).toBe(true);
    expect(host.querySelector('[role="status"]')?.textContent).toContain('điểm hồi sinh');
  });
  it('accepts, advances and claims daily missions once, and charges contribution for real secrets', () => {
    act(() => root.render(<SectPanel />));
    tab('Nhiệm vụ');
    const mission = () => host.querySelector<HTMLElement>('[data-mission="hunt"]')!;
    act(() => mission().querySelector<HTMLButtonElement>('button')!.click());
    expect(adventure(gameStore.getState().player).mission?.id).toBe('hunt');
    expect(mission().querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
    act(() => gameStore.getState().recordAdventure('kill', 8));
    act(() => button('Trả nhiệm vụ').click());
    expect(adventure(gameStore.getState().player).contribution).toBe(80);
    expect(adventure(gameStore.getState().player).reputation).toBe(180);
    expect(mission().querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);
    tab('Cống hiến');
    act(() => button('Học bí thuật').click());
    expect(adventure(gameStore.getState().player).learnedSecrets).toContain('loi_kich');
    expect(adventure(gameStore.getState().player).contribution).toBe(20);
    expect(button('Đã lĩnh ngộ').disabled).toBe(true);
  });
  it('lists only actual registered online sect members, irrespective of their current map', () => {
    const p = gameStore.getState().player;
    gameStore.setState({
      player: { ...p, adventure: { ...adventure(p), boundSect: 'linh_son_tong' } },
    });
    const base = {
      name: 'Đạo hữu',
      sex: 'female' as const,
      level: 20,
      realm: 'Trúc Cơ',
      party: null,
      updatedAt: Date.now(),
    };
    socialStore.setState({
      connected: true,
      roster: [
        {
          ...base,
          userId: 'same',
          key: 'same',
          name: 'Đồng môn đi xa',
          mapId: 'vuong_gia_thon',
          sect: 'linh_son_tong',
        },
        {
          ...base,
          userId: 'visitor',
          key: 'visitor',
          name: 'Khách ghé thăm',
          mapId: 'linh_son_tong',
        },
      ],
    });
    act(() => root.render(<SectPanel />));
    tab('Thành viên');
    expect(host.querySelector('.sect-member-list')?.textContent).toContain('Đồng môn đi xa');
    expect(host.querySelector('.sect-member-list')?.textContent).not.toContain('Khách ghé thăm');
    act(() => socialStore.setState({ connected: false }));
    expect(host.querySelectorAll('.sect-member')).toHaveLength(1);
  });
});
