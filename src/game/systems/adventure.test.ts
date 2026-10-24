import { beforeEach, describe, it, expect } from 'vitest';
import {
  adventure,
  adventureAction,
  beastVictory,
  sectEvent,
  sectRank,
  battlePower,
} from './adventure';
import { newPlayer, gameStore } from '../../store/gameStore';
import { playerStats, expToNext } from './progression';
import { skillLoadout, chooseSkill } from './skills';
import { performLifeAction } from './life';
import { getMap } from '../maps';
import { DUNGEON_MAPS } from '../maps/dungeonMaps';
import { findPath } from './path';
import { mapGateReason } from './worldAccess';
import { portalToward } from './questNav';
import { deserialize, serialize, type PlayerSave } from './save';
import { premiumStore, resetPremium } from '../../net/premium';

const hero = (): PlayerSave => ({
  ...newPlayer(),
  level: 10,
  inventory: {
    linh_thach: 200,
    huyen_thiet: 100,
    tinh_luyen_thach: 20,
    pha_canh_dan: 1,
    linh_chi: 20,
    yeu_dan: 20,
  },
  equipment: { weapon: 'weapon_white', armor: 'armor_white' },
});
beforeEach(() => {
  const p = hero();
  gameStore.setState({
    player: p,
    stats: playerStats(p),
    status: 'alive',
    tribulation: null,
    mapId: 'dai_thua_vien',
    quests: {},
    logs: [],
    toasts: [],
  });
  resetPremium();
});
describe('equipment, EXP and loadouts', () => {
  it('restores armor stats and charges enhancement costs atomically', () => {
    const p = hero(),
      base = playerStats(p),
      up = adventureAction(p, { type: 'enhance', id: 'armor_white' }, false);
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    expect(playerStats(up.player).def).toBeGreaterThan(base.def);
    expect(battlePower(playerStats(up.player))).toBeGreaterThan(battlePower(base));
    expect(up.player.inventory.linh_thach).toBe(p.inventory.linh_thach);
    expect(up.player.inventory.huyen_thiet).toBe(p.inventory.huyen_thiet);
    expect(up.player.inventory.tinh_luyen_thach).toBe(p.inventory.tinh_luyen_thach - 1);
    expect(p.inventory.linh_thach).toBe(200);
    expect(
      adventureAction({ ...p, inventory: {} }, { type: 'enhance', id: 'armor_white' }, false).ok,
    ).toBe(false);
  });
  it('requires more EXP and keeps four unique selected slots across saves', () => {
    expect(expToNext(1)).toBeGreaterThan(400);
    expect(expToNext(20)).toBeGreaterThan(expToNext(10) * 2);
    const chosen = chooseSkill(hero(), 1, 'moc_linh')!;
    expect(skillLoadout(chosen)).toHaveLength(4);
    expect(skillLoadout(chosen)[1]).toBe('moc_linh');
    const loaded = deserialize(
      serialize({ player: chosen, quests: {}, mapId: 'dai_thua_vien', pos: null }),
    )!;
    expect(skillLoadout(loaded.player)).toEqual(skillLoadout(chosen));
    expect(chooseSkill(hero(), 1, 'loi_kich')).toBeNull();
    expect(chooseSkill(hero(), 4, 'basic')).toBeNull();
    expect(chooseSkill(chosen, 0, 'moc_linh')).toBeNull();
    expect(chooseSkill(chosen, 1, 'than_phap')).toBeNull();
    expect(chooseSkill(chosen, 1, 'basic')).toBeNull();
    expect(new Set(skillLoadout(chooseSkill(chosen, 2, 'moc_linh')!)).size).toBe(4);
  });
});
describe('sect missions and reputation gates', () => {
  it('requires the sect to accept and claim, and does not repeat a reward', () => {
    const p = hero();
    expect(adventureAction(p, { type: 'mission', id: 'hunt' }, false).ok).toBe(false);
    const accepted = adventureAction(p, { type: 'mission', id: 'hunt' }, true);
    if (!accepted.ok) throw Error(accepted.reason);
    const done = sectEvent(accepted.player, 'kill', 8),
      claimed = adventureAction(done, { type: 'claimMission' }, true);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(adventure(claimed.player).reputation).toBe(30);
    expect(adventureAction(claimed.player, { type: 'claimMission' }, true).ok).toBe(false);
    expect(adventureAction(claimed.player, { type: 'mission', id: 'hunt' }, true).ok).toBe(false);
  });
  it('opens higher sect areas and secrets through reputation instead of level', () => {
    const p = hero(),
      ranked = { ...p, adventure: { ...adventure(p), reputation: 150, contribution: 60 } };
    expect(sectRank(ranked)).toBe(2);
    expect(
      mapGateReason(getMap('sect_archive'), { childhood: false, reputation: 149 }),
    ).not.toBeNull();
    expect(mapGateReason(getMap('sect_archive'), { childhood: false, reputation: 150 })).toBeNull();
    const learned = adventureAction(ranked, { type: 'learnSecret', id: 'loi_kich' }, true);
    expect(learned.ok).toBe(true);
    if (learned.ok) {
      expect(learned.player.adventure?.contribution).toBe(0);
      expect(chooseSkill(learned.player, 1, 'loi_kich')).not.toBeNull();
    }
  });
  it('routes high and low players into an explicitly chosen old field', () => {
    for (const level of [1, 20, 99])
      expect(
        portalToward(getMap('dai_thua_vien'), 'linh_thu_lam', level, { childhood: false }),
      ).not.toBeNull();
    expect(
      portalToward(getMap('dai_thua_vien'), 'han_bang_nguyen', 1, { childhood: false }),
    ).not.toBeNull();
  });
});
describe('earned spirit beasts and heavenly tribulation', () => {
  it('cannot buy a beast with Yêu Đan, and instead consumes earned victory marks', () => {
    let p = hero();
    expect(performLifeAction(p, { type: 'tame', id: 'snow_fox' }, false, true).ok).toBe(false);
    p = beastVictory(beastVictory(p, 'linh_thu'), 'linh_thu');
    const result = performLifeAction(p, { type: 'tame', id: 'snow_fox' }, false, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.player.inventory.yeu_dan).toBe(20);
    expect(result.player.adventure?.beastSeals.snow_fox).toBe(0);
  });
  it('spends pills at trial start and requires survival before granting a realm', () => {
    gameStore.setState({ player: { ...hero(), exp: expToNext(10), linhKhi: 300 } });
    const before = playerStats(gameStore.getState().player);
    gameStore.getState().tryBreakthrough();
    expect(gameStore.getState().tribulation).not.toBeNull();
    expect(gameStore.getState().player.inventory.pha_canh_dan).toBeUndefined();
    gameStore.getState().finishTribulation(true);
    expect(gameStore.getState().player.realmIndex).toBe(0);
    gameStore.setState({ tribulation: { realm: 0, strikes: 4, remaining: 0 } });
    gameStore.getState().finishTribulation(true);
    expect(gameStore.getState().player.realmIndex).toBe(1);
    expect(gameStore.getState().stats.atk).toBeGreaterThan(before.atk);
    gameStore.getState().finishTribulation(true);
    expect(gameStore.getState().player.realmIndex).toBe(1);
  });
  it('keeps every redesigned dungeon spawn, boss and exit reachable', () => {
    expect(new Set(DUNGEON_MAPS.map((id) => JSON.stringify(getMap(id).terrain))).size).toBe(5);
    for (const id of DUNGEON_MAPS) {
      const m = getMap(id),
        a = m.arena!;
      for (const [x, y] of [...a.spawns, a.boss, [a.exit[0], a.exit[1]]]) {
        expect(m.blocked[y][x], `${id}: ${x},${y}`).toBe(false);
        expect(findPath(m.blocked, ...m.playerSpawn, x, y).reached).toBe(true);
      }
    }
  });
  it('does not trust locally edited premium items as a currency entitlement', () => {
    gameStore.setState({
      player: {
        ...hero(),
        inventory: { tien_phap_bao: 1 },
        equipment: { amulet: 'tien_phap_bao' },
      },
    });
    gameStore.getState().syncPremium();
    expect(gameStore.getState().player.inventory.tien_phap_bao).toBeUndefined();
    expect(gameStore.getState().player.equipment.amulet).toBeUndefined();
    expect(premiumStore.getState().admin).toBe(false);
    premiumStore.setState({ items: ['tien_phap_bao'], loaded: true });
    gameStore.setState({ player: { ...hero(), equipment: { amulet: 'tien_phap_bao' } } });
    gameStore.getState().syncPremium();
    expect(gameStore.getState().player.equipment.amulet).toBe('tien_phap_bao');
  });
});
