import { describe, expect, it } from 'vitest';
import { HEROES, heroFor } from '../../data/heroes';
import {
  HERO_SKILLS,
  HERO_SPELLS,
  heroDefaultLoadout,
  heroSkillIds,
  heroSpellHit,
} from '../../data/heroSkills';
import { SKILLS, type SkillId } from '../../data';
import { newPlayer } from '../../store/gameStore';
import { chooseSkill, DEFAULT_LOADOUT, skillLoadout, skillUnlocked } from './skills';
import { deserialize, serialize, type PlayerSave } from './save';
import { buildDuelist } from './duel';
import { playerStats } from './progression';
import { ArenaEngine, validateArenaSnapshot } from './arena';
import { heroName, originText, usesChildSprite } from './origin';

describe('eight character schools', () => {
  it('keeps the two original childhood identities and the six new hero identities in the village', () => {
    for (const hero of HEROES) {
      const p: PlayerSave = { ...newPlayer(), heroId: hero.id, sex: hero.sex, name: hero.name, origin: 'vuong_gia_thon', admitted: false };
      const original = hero.id === 'wang_lam' || hero.id === 'ly_mo_uyen';
      expect(usesChildSprite(p)).toBe(original);
      expect(heroName(p)).toBe(original ? hero.sex === 'male' ? 'Thiết Trụ' : 'Mộ Uyển' : hero.name);
      if (!original) expect(originText('Thiết Trụ, đi nào!', p)).toBe(`${hero.name}, đi nào!`);
    }
  });
  it('provides five distinct spells per hero and three available starting spells', () => {
    expect(Object.keys(HERO_SKILLS)).toHaveLength(40);
    for (const hero of HEROES) {
      const p = { ...newPlayer({ sex: hero.sex }), heroId: hero.id };
      const ids = heroSkillIds(hero.id);
      expect(new Set(ids).size).toBe(5);
      expect(skillLoadout(p)).toEqual(heroDefaultLoadout(hero.id));
      expect(ids.map((id) => skillUnlocked(p, id))).toEqual([true, true, true, false, false]);
      expect(
        ids.every((id) => SKILLS[id].hero === hero.id && HERO_SPELLS[id].hero === hero.id),
      ).toBe(true);
    }
  });
  it('changes or swaps a chosen slot and rejects another school even on a male character', () => {
    const p: PlayerSave = { ...newPlayer(), heroId: 'so_thien', sex: 'male', level: 15 };
    const changed = chooseSkill(p, 2, 'so_thien_4')!;
    expect(skillLoadout(changed)).toEqual(['basic', 'so_thien_1', 'so_thien_4', 'so_thien_3']);
    const swapped = chooseSkill(changed, 1, 'so_thien_3')!;
    expect(skillLoadout(swapped)).toEqual(['basic', 'so_thien_3', 'so_thien_4', 'so_thien_1']);
    expect(chooseSkill(p, 1, 'hong_lien_1')).toBeNull();
    expect(chooseSkill(p, 1, 'hoa_ma_chi')).toBeNull();
    expect(chooseSkill(p, 0, 'so_thien_4')).toBeNull();
  });
  it('round-trips identity and loadout while preserving old saves and default skills', () => {
    const p: PlayerSave = {
      ...newPlayer(),
      heroId: 'diep_ly',
      sex: 'female',
      level: 15,
      skillLoadout: ['basic', 'diep_ly_5', 'diep_ly_2', 'diep_ly_3'],
    };
    const saved = deserialize(
      serialize({ player: p, quests: {}, mapId: 'vuong_gia_thon', pos: null }),
    )!;
    expect(saved.player.heroId).toBe('diep_ly');
    expect(skillLoadout(saved.player)).toEqual(p.skillLoadout);
    const old = deserialize(
      serialize({ player: newPlayer(), quests: {}, mapId: 'vuong_gia_thon', pos: null }),
    )!;
    expect(old.player.heroId).toBeUndefined();
    expect(skillLoadout(old.player)).toEqual(DEFAULT_LOADOUT);
    const invalid = deserialize(
      serialize({
        player: { ...p, heroId: '__proto__' } as unknown as PlayerSave,
        quests: {},
        mapId: 'vuong_gia_thon',
        pos: null,
      }),
    )!;
    expect(invalid.player.heroId).toBeUndefined();
    expect(heroFor(invalid.player).id).toBe('ly_mo_uyen');
  });
  it('uses a narrow directed hit line rather than damaging everything in range', () => {
    const from = { x: 100, y: 100 },
      facing = { x: 1, y: 0 };
    expect(heroSpellHit('line', from, facing, 300, 0, { x: 350, y: 110 })).toBe(true);
    expect(heroSpellHit('line', from, facing, 300, 0, { x: 350, y: 130 })).toBe(false);
    expect(heroSpellHit('line', from, facing, 300, 0, { x: 90, y: 100 })).toBe(false);
    expect(heroSpellHit('circle', from, facing, 110, 0, { x: 100, y: 200 })).toBe(true);
  });
});

function arena(heroId: PlayerSave['heroId'], skill: SkillId) {
  const p: PlayerSave = {
    ...newPlayer(),
    heroId,
    sex: heroFor({ heroId }).sex,
    level: 15,
    skillLoadout: ['basic', skill],
  };
  const a = buildDuelist(p, playerStats(p), 'Trúc Cơ', 'a'),
    b = { ...a, userId: 'b' };
  const e = new ArenaEngine('heroes', a, b);
  e.start();
  for (let i = 0; i < 30; i++) e.step(100);
  e.state.fighters[0].x = 200;
  e.state.fighters[1].x = 260;
  return e;
}
describe('class spells in manual PK', () => {
  it('applies an ice bind after its windup and publishes a validated action pose', () => {
    const e = arena('ly_mo_uyen', 'ly_mo_uyen_2'),
      [a, b] = e.state.fighters,
      hp = b.hp;
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'ly_mo_uyen_2' });
    e.step(50);
    expect(a.lastSkill).toBe('ly_mo_uyen_2');
    expect(a.actionUntil).toBeGreaterThan(e.state.elapsed);
    expect(b.hp).toBe(hp);
    for (let i = 0; i < 8; i++) e.step(50);
    expect(b.hp).toBeLessThan(hp);
    expect(b.rootUntil).toBe(e.state.elapsed + 1000);
    expect(validateArenaSnapshot(e.snapshot(), 'heroes')).toBe(true);
    const bad = e.snapshot();
    bad.fighters[0].heroId = 'invalid' as PlayerSave['heroId'];
    expect(validateArenaSnapshot(bad, 'heroes')).toBe(false);
  });
  it('heals and shields the caster with a visible effect and no opponent damage', () => {
    for (const [heroId, skill, kind] of [
      ['quan_vo_tran', 'quan_vo_tran_2', 'heal'],
      ['ly_mo_uyen', 'ly_mo_uyen_3', 'shield'],
    ] as const) {
      const e = arena(heroId, skill),
        [a, b] = e.state.fighters;
      const hp = b.hp;
      a.hp = Math.floor(a.maxHp * 0.5);
      const before = a.hp;
      e.input('a', { seq: 1, x: 0, y: 0, cast: skill });
      e.step(50);
      if (kind === 'heal') expect(a.hp).toBe(before + Math.round(a.maxHp * 0.24));
      else expect(a.shield).toBe(Math.round(a.maxHp * 0.35));
      expect(e.state.effects.some((effect) => effect.skill === skill)).toBe(true);
      for (let i = 0; i < 12; i++) e.step(50);
      expect(b.hp).toBe(hp);
    }
  });
  it('rejects a spoofed loadout containing another hero skill', () => {
    const e = arena('so_thien', 'so_thien_1'),
      a = e.state.fighters[0];
    a.loadout = ['basic', 'hong_lien_1'];
    const mp = a.mp;
    e.input('a', { seq: 1, x: 0, y: 0, cast: 'hong_lien_1' });
    e.step(50);
    expect(a.mp).toBe(mp);
    expect(e.state.effects).toHaveLength(0);
  });
});
