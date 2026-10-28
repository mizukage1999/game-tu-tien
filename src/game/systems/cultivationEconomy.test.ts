import { afterEach, expect, it } from 'vitest';
import { BESTIARY } from '../../data/bestiary';
import { MONSTERS } from '../../data';
import { BREAKTHROUGH_PILL_RECIPE } from '../../data/cultivationBalance';
import { gameStore, newPlayer } from '../../store/gameStore';
import {
  GARDEN_COOLDOWN_MS,
  herbCooldownMs,
  herbNodes,
  HOME_QUEST,
  immortalProgress,
  RECIPES,
} from './immortal';
import {
  advanceLife,
  CROPS,
  DAY_MS,
  lifeProgress,
  performLifeAction,
  WORKSHOP_RECIPES,
} from './life';
import { rollLoot } from './loot';
import { deserialize, serialize, type PlayerSave } from './save';

const previous = gameStore.getState();
afterEach(() => gameStore.setState(previous));

it('rolls at most one Yêu Đan entry per monster, with better rewards from dangerous encounters', () => {
  for (const def of Object.values(MONSTERS)) {
    const cores = def.loot.filter((d) => d.item === 'yeu_dan');
    expect(cores.length).toBeLessThanOrEqual(1);
    if (!cores.length) continue;
    const core = cores[0];
    if (!def.boss) {
      expect(core.qty[0]).toBeGreaterThanOrEqual(1);
      expect(core.qty[1]).toBe(core.qty[0]);
      if (def.level <= 30) expect(core.qty).toEqual([1, 1]);
    }
    expect(rollLoot([core], () => 0)).toEqual([{ item: 'yeu_dan', qty: core.qty[0] }]);
    expect(rollLoot([core], () => core.chance)).toEqual([]);
  }
  const core = (id: string) => MONSTERS[id].loot.find((d) => d.item === 'yeu_dan')!;
  expect(core('linh_thu').chance).toBe(0.1);
  expect(core('hoa_ho').chance).toBe(0.25);
  expect(core('thach_linh_thu').chance).toBe(0.1);
  expect(core('field_thien_kiep_nhai').chance).toBeGreaterThan(core('linh_thu').chance);
  for (const s of BESTIARY.filter((s) => s.sheet === 'elite'))
    expect(core(s.id).chance).toBeGreaterThan(core('linh_thu').chance);
  expect(core('dg_90_kho_boss').chance).toBeGreaterThan(core('dg_10_de_boss').chance);
  expect(MONSTERS.tho_linh.loot.some((d) => d.item === 'yeu_dan')).toBe(false);
  expect(MONSTERS.ngoc_an_thu_ho.loot.some((d) => d.item === 'yeu_dan')).toBe(false);
});

it('makes both furnaces pay the full new recipe, including actual Linh Khí, without consuming a partial batch', () => {
  expect(RECIPES.find((r) => r.id === 'pha_canh_dan')!.cost).toEqual(BREAKTHROUGH_PILL_RECIPE);
  expect(WORKSHOP_RECIPES.find((r) => r.id === 'pha_canh_dan')!.cost).toEqual(
    BREAKTHROUGH_PILL_RECIPE,
  );
  for (const workshop of [false, true]) {
    let player: PlayerSave = {
      ...newPlayer(),
      admitted: true,
      level: 10,
      linhKhi: 119,
      inventory: { linh_chi: 6, yeu_dan: 4, ngung_lo: 4 },
    };
    player = {
      ...player,
      life: {
        ...lifeProgress(player),
        facilities: { ...lifeProgress(player).facilities, furnace: 2 },
        knownRecipes: ['pha_canh_dan'],
      },
    };
    gameStore.setState({
      player,
      quests: { [HOME_QUEST]: { status: 'done', progress: [1, 1] } },
      mapId: 'dong_phu',
      status: 'alive',
    });
    const craft = () =>
      workshop
        ? gameStore.getState().lifeAction({ type: 'forge', recipe: 'pha_canh_dan' })
        : gameStore.getState().craftPill('pha_canh_dan');
    craft();
    expect(gameStore.getState().player).toBe(player);
    expect(gameStore.getState().craftFeedback).toMatchObject({ ok: false });
    gameStore.setState({ player: { ...player, linhKhi: 120 } });
    craft();
    const made = gameStore.getState().player;
    expect(made.linhKhi).toBe(0);
    expect(made.inventory.pha_canh_dan).toBe(1);
    for (const id of ['linh_chi', 'yeu_dan', 'ngung_lo']) expect(made.inventory[id] ?? 0).toBe(0);
    expect(made.inventory.linh_khi).toBeUndefined();
    craft();
    expect(gameStore.getState().player).toBe(made);
    expect(gameStore.getState().craftFeedback).toMatchObject({ ok: false });
  }
});

it('persists longer rare-herb deadlines across reloads and prevents harvesting the garden early', () => {
  gameStore.setState({
    player: { ...newPlayer(), admitted: true },
    quests: { [HOME_QUEST]: { status: 'done', progress: [1, 1] } },
    status: 'alive',
    mapId: 'dong_phu',
  });
  for (const node of herbNodes('dai_thua_vien').filter((n) => n.item !== 'thanh_linh_thao')) {
    expect(gameStore.getState().harvestHerb(node, 1000)).toBe(true);
    const saved = deserialize(
      serialize({ player: gameStore.getState().player, quests: {}, mapId: 'dong_phu', pos: null }),
    )!;
    gameStore.setState({ player: saved.player });
    expect(gameStore.getState().harvestHerb(node, 26000)).toBe(false);
    expect(immortalProgress(saved.player).harvestReadyAt[node.id]).toBe(
      1000 + herbCooldownMs(node.item),
    );
    expect(gameStore.getState().harvestHerb(node, 1000 + herbCooldownMs(node.item))).toBe(true);
  }
  gameStore.getState().harvestGarden(1000);
  const harvested = gameStore.getState().player;
  gameStore.getState().harvestGarden(91000);
  expect(gameStore.getState().player).toBe(harvested);
  gameStore.getState().harvestGarden(1000 + GARDEN_COOLDOWN_MS);
  expect(gameStore.getState().player.inventory.linh_chi).toBe(
    (harvested.inventory.linh_chi ?? 0) + 1,
  );
});

it.each(CROPS.filter((c) => c.id !== 'thanh_linh_thao'))(
  'makes planted $name mature at its new deadline and harvest only once',
  (crop) => {
    const player = { ...newPlayer(), admitted: true, inventory: { [crop.seed]: 1 } };
    const planted = performLifeAction(
      player,
      { type: 'plant', herb: crop.id, plot: 0 },
      true,
      true,
    );
    expect(planted.ok).toBe(true);
    if (!planted.ok) return;
    const early = advanceLife(planted.player, (crop.days - 1) * DAY_MS);
    expect(performLifeAction(early, { type: 'harvest', plot: 0 }, true, true).ok).toBe(false);
    const ripe = advanceLife(early, DAY_MS);
    const harvested = performLifeAction(ripe, { type: 'harvest', plot: 0 }, true, true);
    expect(harvested.ok).toBe(true);
    if (!harvested.ok) return;
    expect(harvested.player.inventory[crop.id]).toBe(crop.qty);
    expect(performLifeAction(harvested.player, { type: 'harvest', plot: 0 }, true, true).ok).toBe(
      false,
    );
  },
);
