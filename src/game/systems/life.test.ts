import { describe, expect, it } from 'vitest';
import {
  advanceLife,
  companionStats,
  DAY_MS,
  lifeProgress,
  performLifeAction,
  type LifeAction,
} from './life';
import { playerStats } from './progression';
import { deserialize, serialize, type PlayerSave } from './save';
import { heroName, originText } from './origin';
import { getMap, MAP_IDS } from '../maps';
import { findPath } from './path';
import { allowsWanderers, SETTLEMENTS, wandererRoster } from './wanderers';
import { materializeDrop } from './loot';
import { adventure } from './adventure';

function player(): PlayerSave {
  return {
    name: 'Lý Mộ Uyển',
    sex: 'female',
    origin: 'vuong_gia_thon',
    admitted: true,
    level: 3,
    exp: 7,
    realmIndex: 0,
    hp: 300,
    mp: 100,
    linhKhi: 50,
    inventory: {
      hat_thanh_linh: 2,
      thanh_linh_thao: 50,
      linh_thach: 50,
      linh_chi: 10,
      huyen_thiet: 10,
      cong_thuc_ngoc: 1,
      yeu_dan: 10,
      thuc_an_linh_thu: 20,
    },
    equipment: {},
    adventure:{...adventure({name:'test'} as PlayerSave),beastSeals:{snow_fox:2,gold_tiger:5}},
  };
}
function act(p: PlayerSave, action: LifeAction) {
  const result = performLifeAction(p, action, true, true);
  if (!result.ok) throw Error(result.reason);
  return result;
}

describe('game calendar',()=>{
  it('keeps identity choices and does not grant EXP for elapsed calendar time',()=>{
    const p=player(),child={...p,admitted:false};
    expect(heroName(child)).toBe('Mộ Uyển');
    expect(heroName({...child,sex:'male'})).toBe('Thiết Trụ');
    expect(originText('Thiết Trụ ở Vương Gia Thôn',child)).toBe('Mộ Uyển ở Vương Gia Thôn');
    expect(playerStats(advanceLife(p,360*DAY_MS))).toEqual(playerStats(p));
    expect(advanceLife(p,360*DAY_MS).exp).toBe(p.exp);
  });
  it('carries partial game days across save/reload',()=>{
    let p=advanceLife(player(),DAY_MS-1);
    p=deserialize(serialize({player:p,quests:{},mapId:'dong_phu',pos:null}))!.player;
    expect(lifeProgress(advanceLife(p,1)).days).toBe(lifeProgress(player()).days+1);
  });
});
describe('private home resource loop', () => {
  it('requires a home, a living cultivator and a valid empty plot', () => {
    const p = player();
    for (const [home, alive] of [
      [false, true],
      [true, false],
    ])
      expect(
        performLifeAction(p, { type: 'plant', plot: 0, herb: 'thanh_linh_thao' }, home, alive).ok,
      ).toBe(false);
    expect(
      performLifeAction(
        { ...p, admitted: false },
        { type: 'plant', plot: 0, herb: 'thanh_linh_thao' },
        true,
        true,
      ).ok,
    ).toBe(false);
    expect(
      performLifeAction(p, { type: 'plant', plot: -1, herb: 'thanh_linh_thao' }, true, true).ok,
    ).toBe(false);
  });
  it('grows using game time, consumes a seed and harvests exactly once', () => {
    const p = player(),
      planted = act(p, { type: 'plant', plot: 0, herb: 'thanh_linh_thao' }).player;
    expect(planted.inventory.hat_thanh_linh).toBe(1);
    expect(p.inventory.hat_thanh_linh).toBe(2);
    expect(performLifeAction(planted, { type: 'harvest', plot: 0 }, true, true).ok).toBe(false);
    expect(
      performLifeAction(planted, { type: 'plant', plot: 0, herb: 'linh_chi' }, true, true).ok,
    ).toBe(false);
    const ripe = advanceLife(planted, 2 * DAY_MS),
      harvested = act(ripe, { type: 'harvest', plot: 0 }).player;
    expect(harvested.inventory.thanh_linh_thao).toBe(p.inventory.thanh_linh_thao + 3);
    expect(harvested.inventory.hat_thanh_linh).toBe(2);
    expect(performLifeAction(harvested, { type: 'harvest', plot: 0 }, true, true).ok).toBe(false);
  });
  it('charges upgrades atomically and expands fields up to five plots', () => {
    let p = player();
    const empty = { ...p, inventory: { linh_thach: 50 } };
    expect(performLifeAction(empty, { type: 'facility', facility: 'field' }, true, true).ok).toBe(
      false,
    );
    expect(empty.inventory.linh_thach).toBe(50);
    p = act(p, { type: 'facility', facility: 'field' }).player;
    expect(lifeProgress(p).plots).toHaveLength(4);
    expect(p.inventory.linh_thach).toBe(48);
    p = act(p, { type: 'facility', facility: 'field' }).player;
    expect(lifeProgress(p).plots).toHaveLength(5);
    expect(performLifeAction(p, { type: 'facility', facility: 'field' }, true, true).ok).toBe(
      false,
    );
  });
  it('awards retreat cultivation once after the chosen duration', () => {
    const p = act(player(), { type: 'retreat', days: 3 }).player;
    expect(performLifeAction(p, { type: 'claimRetreat' }, true, true).ok).toBe(false);
    expect(performLifeAction(p, { type: 'facility', facility: 'chamber' }, true, true).ok).toBe(
      false,
    );
    const complete = act(advanceLife(p, DAY_MS * 3), { type: 'claimRetreat' });
    expect(complete.exp).toBeGreaterThan(0);
    expect(lifeProgress(complete.player).retreat).toBeNull();
    expect(performLifeAction(complete.player, { type: 'claimRetreat' }, true, true).ok).toBe(false);
  });
  it('increases retreat yield with facilities and cancels without rewards', () => {
    let upgraded = act(player(), { type: 'facility', facility: 'chamber' }).player;
    upgraded = act(upgraded, { type: 'facility', facility: 'array' }).player;
    const claim = (p: PlayerSave) =>
      act(advanceLife(act(p, { type: 'retreat', days: 1 }).player, DAY_MS), {
        type: 'claimRetreat',
      }).exp!;
    expect(claim(upgraded)).toBeGreaterThan(claim(player()));
    const cancelled = act(act(player(), { type: 'retreat', days: 10 }).player, {
      type: 'cancelRetreat',
    });
    expect(cancelled.exp).toBe(0);
    expect(lifeProgress(cancelled.player).retreat).toBeNull();
  });
  it('requires a formula and furnace before consuming crafting materials', () => {
    const p = player();
    expect(performLifeAction(p, { type: 'forge', recipe: 'phap_bao_ngoc' }, true, true).ok).toBe(
      false,
    );
    let learned = act(p, { type: 'learn', formula: 'cong_thuc_ngoc' }).player;
    expect(learned.inventory.cong_thuc_ngoc).toBe(0);
    expect(
      performLifeAction(learned, { type: 'learn', formula: 'cong_thuc_ngoc' }, true, true).ok,
    ).toBe(false);
    learned = act(learned, { type: 'facility', facility: 'furnace' }).player;
    const forged = act(learned, { type: 'forge', recipe: 'phap_bao_ngoc' }).player;
    expect(forged.inventory.phap_bao_ngoc).toBe(1);
    expect(forged.inventory.huyen_thiet).toBe(6);
    const equipped = act(forged, { type: 'artifact', id: 'phap_bao_ngoc' }).player;
    expect(playerStats(equipped).maxHp).toBe(playerStats(forged).maxHp + 100);
  });
  it('keeps every home interaction reachable from spawn', () => {
    const m = getMap('dong_phu');
    expect(m.points).toHaveLength(4);
    for (const point of m.points!) {
      expect(m.blocked[point.y][point.x]).toBe(false);
      expect(findPath(m.blocked, ...m.playerSpawn, point.x, point.y, 0).reached).toBe(true);
    }
  });
});

describe('wandering cultivators and companions', () => {
  it('never places wanderers in any settlement, private home or dungeon', () => {
    for (const id of MAP_IDS) {
      const m = getMap(id);
      if (SETTLEMENTS.has(id) || m.private || m.arena || !m.monsters.length)
        expect(wandererRoster(m, 1)).toEqual([]);
    }
    expect(allowsWanderers(getMap('ngoai_mon'))).toBe(false);
  });
  it('generates distinct names and varied internal cultivation outdoors', () => {
    const m = getMap('rung_linh_thu'),
      a = wandererRoster(m, 1),
      b = wandererRoster(m, 777);
    expect(a.length).toBeGreaterThanOrEqual(2);
    expect(new Set(a.map((n) => n.name)).size).toBe(a.length);
    expect(a).not.toEqual(b);
    expect(new Set([...a, ...b].map((n) => n.cultivation)).size).toBeGreaterThan(1);
  });
  it('charges once for each companion and swaps distinct stat bonuses', () => {
    const p = player(),
      fox = act(p, { type: 'tame', id: 'snow_fox' }).player;
    expect(fox.inventory.yeu_dan).toBe(10);
    expect(companionStats(fox)).toEqual({ atk: 8, def: 2, hp: 40 });
    expect(performLifeAction(fox, { type: 'tame', id: 'snow_fox' }, true, true).ok).toBe(false);
    const tiger = act(fox, { type: 'tame', id: 'gold_tiger' }).player;
    expect(companionStats(tiger).atk).toBe(15);
    expect(companionStats(act(tiger, { type: 'companion', id: null }).player)).toEqual({
      atk: 0,
      def: 0,
      hp: 0,
    });
  });
  it('feeds the owned beast and limits rank to five', () => {
    let p = act(player(), { type: 'tame', id: 'snow_fox' }).player;
    p = act(p, { type: 'feed', id: 'snow_fox' }).player;
    expect(lifeProgress(p).companions.snow_fox).toEqual({ rank: 1, bond: 1 });
    p = act(p, { type: 'feed', id: 'snow_fox' }).player;
    expect(companionStats(p).atk).toBe(16);
    p = { ...p, life: { ...lifeProgress(p), companions: { snow_fox: { rank: 5, bond: 0 } } } };
    expect(performLifeAction(p, { type: 'feed', id: 'snow_fox' }, true, true).ok).toBe(false);
  });
});

describe('weapon-only save compatibility', () => {
  it('returns old equipped gear to inventory exactly once without losing weapons', () => {
    const p = {
      ...player(),
      equipment: { weapon: 'moc_kiem', armor: 'armor_white', ring: 'nhan_bac' },
    };
    const loaded = deserialize(serialize({ player: p, quests: {}, mapId: 'dong_phu', pos: null }))!;
    expect(Object.fromEntries(Object.entries(loaded.player.equipment).map(([slot, id]) => [slot, id!.split('~')[0]]))).toEqual(p.equipment);
    expect(loaded.player.inventory.armor_white).toBeUndefined();
    expect(loaded.player.inventory.nhan_bac).toBeUndefined();
    const again = deserialize(serialize(loaded))!;
    expect(again.player.inventory).toEqual(loaded.player.inventory);
  });
  it('converts all generic gear drops into matching weapons', () => {
    for (const rarity of ['white', 'blue', 'green', 'purple', 'orange', 'red', 'pink'])
      expect(materializeDrop(`gear:${rarity}`,()=>0)).toBe(`weapon_${rarity}`);
  });
});
