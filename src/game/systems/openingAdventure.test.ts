import { afterEach, describe, expect, it } from 'vitest';
import { DUNGEONS, ITEMS, MONSTERS, NPCS, QUESTS } from '../../data';
import { FIRST_TRIAL } from '../../data/openingAdventure';
import { gameStore, newPlayer } from '../../store/gameStore';
import { equipmentBaseId } from './equipment';
import { immortalProgress } from './immortal';
import { playerStats } from './progression';
import { getMap } from '../maps';
import { findPath } from './path';
import { canEnter } from './dungeon';
import { questDestination } from './questNav';

const previous = gameStore.getState();
afterEach(() => gameStore.setState(previous));
const earlier = () => ({ main_3: { status: 'done' as const, progress: [1, 5] } });
describe('first story boss', () => {
  it('reconciles older progress, credits earlier preparation and opens the correct dungeon', () => {
    const p = {
      ...newPlayer(),
      admitted: true,
      level: 5,
      equipment: { weapon: 'moc_kiem' },
      practice: { basic: 3, skill: 1, dash: 1 },
      immortal: { ...immortalProgress(newPlayer()), crafted: { hoi_xuan_dan: 1 } },
    };
    gameStore.setState({
      player: p,
      stats: playerStats(p),
      quests: earlier(),
      status: 'alive',
      dungeon: null,
      tribulation: null,
    });
    expect(gameStore.getState().beginDungeon(FIRST_TRIAL)).toBe(false);
    gameStore.getState().questEvent({ type: 'enterZone', zone: 'dai_thua_vien' });
    expect(gameStore.getState().quests.first_prepare.status).toBe('done');
    expect(gameStore.getState().quests.first_boss.status).toBe('active');
    expect(
      questDestination('first_boss', gameStore.getState().quests, 5, 'dai_thua_vien'),
    ).toMatchObject({ kind: 'menu', menu: 'dungeon' });
    expect(gameStore.getState().beginDungeon(FIRST_TRIAL)).toBe(true);
    gameStore.getState().finishDungeon(FIRST_TRIAL, true, 90000);
    const swords = () =>
      Object.keys(gameStore.getState().player.inventory).filter(
        (id) => equipmentBaseId(id) === 'thanh_khe_kiem',
      );
    expect(swords()).toHaveLength(1);
    expect(gameStore.getState().quests.first_boss.status).toBe('done');
    expect(gameStore.getState().quests.first_return.status).toBe('active');
    gameStore.getState().questEvent({ type: 'talk', npc: 'truong_lao' });
    expect(gameStore.getState().quests.first_return.status).toBe('ready');
    gameStore.getState().turnInQuest('first_return');
    expect(gameStore.getState().quests.first_return.status).toBe('done');
    expect(QUESTS.main_4.requires).toBe('first_return');
    expect(gameStore.getState().player.inventory.yeu_dan).toBe(2);
    gameStore.getState().finishDungeon(FIRST_TRIAL, true, 90000);
    expect(swords()).toHaveLength(1);
  });

  it('counts manual practice, does not count Auto, and keeps the trial retryable at any level', () => {
    const p = { ...newPlayer(), admitted: true };
    gameStore.setState({ player: p, quests: {}, status: 'alive', auto: true });
    gameStore.getState().recordPractice('basic');
    expect(gameStore.getState().player.practice?.basic).toBeUndefined();
    gameStore.setState({ auto: false });
    gameStore.getState().recordPractice('basic');
    gameStore.getState().recordPractice('dash');
    expect(gameStore.getState().player.practice).toMatchObject({ basic: 1, dash: 1 });
    const quests = { first_prepare: { status: 'done' } };
    expect(canEnter(undefined, FIRST_TRIAL, DUNGEONS[FIRST_TRIAL], 1, undefined, quests).ok).toBe(
      true,
    );
    expect(
      canEnter(
        { day: 'today', runs: { [FIRST_TRIAL]: 9999 }, clears: {} },
        FIRST_TRIAL,
        DUNGEONS[FIRST_TRIAL],
        1,
        'today',
        quests,
      ).ok,
    ).toBe(true);
  });

  it('gives the boss, every wave and exit reachable ground and a unique guaranteed reward', () => {
    const def = DUNGEONS[FIRST_TRIAL],
      map = getMap(def.map),
      [sx, sy] = map.playerSpawn;
    for (const [x, y] of [
      ...map.arena!.spawns,
      map.arena!.boss,
      [map.arena!.exit[0], map.arena!.exit[1]],
    ])
      expect(findPath(map.blocked, sx, sy, x, y).reached).toBe(true);
    expect(MONSTERS[def.boss].boss!.slamWindup).toBeGreaterThanOrEqual(1500);
    expect(def.firstClear.items?.thanh_khe_kiem).toBe(1);
    expect(ITEMS.thanh_khe_kiem.reqLevel).toBeLessThanOrEqual(def.minLevel);
    expect(NPCS.thuong_nhan.shop?.some((o) => o.item === 'thanh_khe_kiem')).toBe(false);
    for (const offer of NPCS.thuong_nhan.shop ?? []) {
      const rarity = ITEMS[offer.item]?.rarity;
      if (rarity && ITEMS[offer.item]?.slot) expect(['white', 'blue', 'green']).toContain(rarity);
    }
  });
});
