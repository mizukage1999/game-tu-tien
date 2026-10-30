import { describe, it, expect } from 'vitest';
import { newPlayer } from '../../store/gameStore';
import { adventure, adventureAction } from './adventure';
import { enhanceChance, enhanceCost, MAX_ENHANCEMENT } from './enhancement';
import { skillLoadout, chooseSkill } from './skills';
import { flightProfile, mountUnlocked } from './immortal';
import {
  addExp,
  applyBreakthrough,
  checkBreakthrough,
  expToNext,
  MAX_LEVEL,
  realmNameAtLevel,
} from './progression';
import { serialize, deserialize } from './save';
import { ArenaEngine } from './arena';
import { buildDuelist } from './duel';
import { playerStats } from './progression';
describe('enhancement stones and +12 cap', () => {
  const hero = () => ({
    ...newPlayer(),
    equipment: { weapon: 'weapon_white' },
    inventory: { tinh_luyen_thach: 20 },
    adventure: { ...adventure(newPlayer()), enhancements: { weapon_white: 6 } },
  });
  it('consumes only stones on success and failure, without losing equipment levels', () => {
    const p = hero(),
      action = { type: 'enhance' as const, id: 'weapon_white' };
    const success = adventureAction(p, action, false, () => 0),
      failed = adventureAction(p, action, false, () => 0.99);
    expect(success.ok && success.player.adventure?.enhancements[success.player.equipment.weapon!]).toBe(7);
    expect(failed.ok && failed.player.adventure?.enhancements[failed.player.equipment.weapon!]).toBe(6);
    expect(failed.ok && failed.enhanced).toBe(false);
    expect(failed.ok && failed.player.inventory.tinh_luyen_thach).toBe(17);
    expect(p.inventory.tinh_luyen_thach).toBe(20);
    expect(enhanceChance(11)).toBe(0.12);
    expect(enhanceChance(12)).toBe(0);
    expect(enhanceCost(12)).toEqual({});
  });
  it('cannot substitute gathered ore and clamps old +15 saves to +12', () => {
    const p = hero();
    expect(
      adventureAction(
        { ...p, inventory: { huyen_thiet: 999, linh_thach: 999 } },
        { type: 'enhance', id: 'weapon_white' },
        false,
      ).ok,
    ).toBe(false);
    p.adventure.enhancements.weapon_white = 15;
    const loaded = deserialize(
      serialize({ player: p, quests: {}, mapId: 'linh_son_tong', pos: null }),
    )!;
    expect(loaded.player.adventure?.enhancements[loaded.player.equipment.weapon!]).toBe(MAX_ENHANCEMENT);
    expect(adventureAction(loaded.player, { type: 'enhance', id: 'weapon_white' }, false).ok).toBe(
      false,
    );
  });
});
describe('seven selected combat skills and independent dash', () => {
  it('migrates old dash slots and fixes the basic attack in slot one', () => {
    const p = {
      ...newPlayer(),
      skillLoadout: ['phi_kiem', 'than_phap', 'basic', 'bang_tam_tram'] as const,
      level:99,
    };
    const slots = skillLoadout({ ...p, skillLoadout: [...p.skillLoadout] });
    expect(slots).toHaveLength(7);
    expect(slots[0]).toBe('basic');
    expect(slots).not.toContain('than_phap');
    expect(chooseSkill({ ...p, skillLoadout: [...p.skillLoadout] }, 0, 'phi_kiem')).toBeNull();
  });
  it('allows a manual arena dash without sacrificing a combat slot and enforces its cooldown', () => {
    const p = newPlayer(),
      a = buildDuelist(p, playerStats(p), 'Luyện Khí', 'a'),
      b = { ...a, userId: 'b' };
    const e = new ArenaEngine('dash', a, b);
    e.start();
    for (let i = 0; i < 30; i++) e.step(100);
    const f = e.state.fighters[0],
      x = f.x;
    expect(f.loadout).not.toContain('than_phap');
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'than_phap' });
    e.step(50);
    expect(f.x).toBe(x + 125);
    const after = f.x;
    e.input('a', { seq: 2, x: 0, y: 0, cast: 'than_phap' });
    e.step(50);
    expect(f.x).toBe(after);
    expect(f.cooldowns.than_phap).toBeGreaterThan(e.state.elapsed);
  });
});
describe('flight and the realms above Khuy Niết', () => {
  it('hides the sword from Vấn Đỉnh while retaining flight speed and adding 1% per realm', () => {
    expect(flightProfile({ realmIndex: 5 }).showMount).toBe(true);
    expect(flightProfile({ realmIndex: 6 }).showMount).toBe(false);
    expect(
      flightProfile({ realmIndex: 6 }).speed - flightProfile({ realmIndex: 5 }).speed,
    ).toBeCloseTo(0.01);
    expect(flightProfile({ realmIndex: 11 }).speed).toBeCloseTo(1.56);
    expect(mountUnlocked('sword', {}, { realmIndex: 1 })).toBe(true);
    expect(mountUnlocked('sword', {}, { realmIndex: 0 })).toBe(false);
  });
  it('requires breakthroughs from Khuy to Tịnh and then Toái, and caps at Lv120', () => {
    const s = { level: 100, realmIndex: 9, exp: expToNext(100) };
    expect(checkBreakthrough(s, 999999, 999999).ok).toBe(true);
    applyBreakthrough(s);
    expect(s.level).toBe(101);
    expect(realmNameAtLevel(s.level)).toContain('Tịnh Niết');
    s.level = 110;
    s.exp = expToNext(110);
    expect(checkBreakthrough(s, 999999, 999999).ok).toBe(true);
    applyBreakthrough(s);
    expect(s.level).toBe(111);
    expect(realmNameAtLevel(s.level)).toContain('Toái Niết');
    addExp(s, 1e9);
    expect(s.level).toBe(MAX_LEVEL);
    expect(MAX_LEVEL).toBe(120);
    expect(checkBreakthrough(s, 999999, 999999).ok).toBe(false);
    const loaded = deserialize(
      serialize({
        player: { ...newPlayer(), ...s },
        quests: {},
        mapId: 'dai_thua_vien',
        pos: null,
      }),
    )!;
    expect(loaded.player.realmIndex).toBe(11);
  });
});
