import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore, newPlayer } from '../../store/gameStore';
import { ITEMS, QUESTS } from '../../data';
import { acceptQuest, applyEvent, type QuestLog } from './quest';
import { deserialize, serialize } from './save';
import { herbNodes, HOME_QUEST, immortalProgress, RECIPES, STORY_ORDER } from './immortal';
import { renderDensity, worldZoom } from './display';
import { getMap } from '../maps';
import { findPath } from './path';
import { expToNext } from './progression';

beforeEach(() => {
  gameStore.setState({ player: newPlayer(), quests: {}, mapId: 'dai_thua_vien', status: 'alive', logs: [], toasts: [] });
});

describe('immortal journey', () => {
  it('preserves old saves and round trips home, mount and real harvest deadlines', () => {
    const player = newPlayer();
    expect(immortalProgress(player).homeLevel).toBe(0);
    const original = { player, quests: {}, mapId: 'dai_thua_vien', pos: null };
    expect(deserialize(serialize(original))?.player.level).toBe(1);
    player.immortal = { ...immortalProgress(player), homeLevel: 2, mount: 'crane', gardenReadyAt: 12345, harvestReadyAt: { 'dai_thua_vien:0': 98765 } };
    expect(deserialize(serialize(original))?.player.immortal).toEqual(player.immortal);
  });

  it('spends exactly one recipe, records progress and refuses an unaffordable second batch', () => {
    const recipe = RECIPES[0];
    gameStore.setState({ player: { ...newPlayer(), linhKhi: 5, inventory: { thanh_linh_thao: 2, ngung_lo: 1 } } });
    gameStore.getState().craftPill(recipe.id);
    const after = gameStore.getState().player;
    expect(after.linhKhi).toBe(0);
    expect(after.inventory).toEqual({ hoi_xuan_dan: 1 });
    expect(after.immortal?.crafted.hoi_xuan_dan).toBe(1);
    gameStore.getState().craftPill(recipe.id);
    expect(gameStore.getState().player).toEqual(after);
  });

  it('keeps harvest cooldowns across reloading and credits earlier actions when accepting story quests', () => {
    const node = herbNodes('dai_thua_vien')[0];
    const s = gameStore.getState();
    expect(s.harvestHerb(node, 1000)).toBe(true);
    expect(s.harvestHerb(node, 2000)).toBe(false);
    expect(s.harvestHerb(node, 26000)).toBe(true);
    const log = acceptQuest({ main_2: { status: 'done', progress: [10] } }, QUESTS, 'main_duoc', { level: 3, immortal: immortalProgress(gameStore.getState().player) });
    expect(log.main_duoc.progress[0]).toBe(3);
    expect(log.main_duoc.status).toBe('active');
    const result = applyEvent(log, QUESTS, { type: 'gather', item: 'ngung_lo', qty: 1 });
    expect(result.log.main_duoc.status).toBe('ready');
  });

  it('gives cultivation pills their effect exactly once', () => {
    gameStore.setState({ player: { ...newPlayer(), inventory: { tu_linh_dan: 1 } } });
    gameStore.getState().consumeItem('tu_linh_dan');
    const after = gameStore.getState().player;
    expect(after.level).toBe(2);
    expect(after.linhKhi).toBe(80);
    expect(after.inventory.tu_linh_dan).toBeUndefined();
    gameStore.getState().consumeItem('tu_linh_dan');
    expect(gameStore.getState().player).toEqual(after);
  });

  it('requires and consumes the pill only when a breakthrough can succeed', () => {
    gameStore.setState({ player: { ...newPlayer(), level: 10, exp: expToNext(10), linhKhi: 300, inventory: { linh_thach: 3 } } });
    gameStore.getState().tryBreakthrough();
    expect(gameStore.getState().player.level).toBe(10);
    expect(gameStore.getState().player.linhKhi).toBe(300);
    gameStore.getState().addItem('pha_canh_dan', 1);
    gameStore.getState().tryBreakthrough();
    expect(gameStore.getState().player).toMatchObject({ level: 11, realmIndex: 1, linhKhi: 0 });
    expect(gameStore.getState().player.inventory.pha_canh_dan).toBeUndefined();
  });

  it('guards home harvests and mount unlocks, including after being downed', () => {
    const s = gameStore.getState();
    s.selectMount('sword');
    expect(immortalProgress(gameStore.getState().player).mount).toBeNull();
    s.harvestGarden(1000);
    expect(gameStore.getState().player.inventory.linh_chi).toBeUndefined();
    gameStore.setState({ quests: { [HOME_QUEST]: { status: 'done', progress: [1, 1] }, main_4: { status: 'done', progress: [11] } }, mapId: 'dong_phu' });
    s.selectMount('sword');
    expect(gameStore.getState().player.immortal?.mount).toBe('sword');
    s.harvestGarden(1000);
    expect(gameStore.getState().player.inventory.linh_chi).toBe(1);
    s.harvestGarden(2000);
    expect(gameStore.getState().player.inventory.linh_chi).toBe(1);
    gameStore.setState({ status: 'downed' });
    s.harvestGarden(100000);
    expect(gameStore.getState().player.inventory.linh_chi).toBe(1);
  });

  it('has a reachable supply of every herb and a consistent story with no cycles', () => {
    for (const mapId of ['dai_thua_vien', 'linh_thu_lam', 'dong_phu']) {
      const map = getMap(mapId);
      const [x, y] = map.playerSpawn;
      for (const node of herbNodes(mapId)) expect(findPath(map.blocked, x, y, node.x, node.y).reached, node.id).toBe(true);
    }
    const log: QuestLog = {};
    for (const id of STORY_ORDER) {
      const def = QUESTS[id];
      expect(def.story).toBeTruthy();
      expect(def.story).not.toContain('?');
      if (def.requires) expect(log[def.requires]?.status).toBe('done');
      log[id] = { status: 'done', progress: def.objectives.map((o) => o.count) };
    }
    for (const recipe of RECIPES) for (const id of Object.keys(recipe.cost)) expect(ITEMS[id]).toBeDefined();
  });
});

describe('mobile rendering', () => {
  it('uses retina density within the pixel budget and recalculates readable zoom in both orientations', () => {
    expect(renderDensity(844, 390, 3)).toBe(2);
    expect(renderDensity(3840, 2160, 2)).toBe(1);
    expect(renderDensity(1920, 1080, 2) ** 2 * 1920 * 1080).toBeCloseTo(4_000_000);
    expect(worldZoom(844, 390)).toBe(.65);
    expect(worldZoom(1440, 900)).toBeGreaterThan(worldZoom(844, 390));
  });
});
