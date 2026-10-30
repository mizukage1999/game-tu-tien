import { describe, expect, it } from 'vitest';
import {
  RETIRED_COMMON_SKILLS,
  WANG_SIGNATURE_SKILLS,
  retiredSkill,
} from '../../data/skillCatalog';
import { availableHeroSkillIds, heroSkillIds } from '../../data/heroSkills';
import { gameStore, newPlayer } from '../../store/gameStore';
import { chooseSkill, skillLoadout, skillUnlocked } from './skills';
import { deserialize, serialize } from './save';
import { ArenaEngine } from './arena';
import { buildDuelist } from './duel';
import { playerStats } from './progression';
import { equipmentBaseId } from './equipment';

describe('retired common and sword-school spells', () => {
  it('does not spend upgrade materials on retired spells', () => {
    const previous = gameStore.getState();
    const p = {
      ...newPlayer({ sex: 'male' }),
      level: 99,
      linhKhi: 100000,
      inventory: { linh_thach: 1000, kiem_pho: 1000 },
    };
    try {
      gameStore.setState({ player: p, toasts: [] });
      for (const id of [...RETIRED_COMMON_SKILLS, ...heroSkillIds('wang_lam')])
        gameStore.getState().upgradeSkill(id);
      expect(gameStore.getState().player).toEqual(p);
    } finally {
      gameStore.setState(previous);
    }
  });
  it('migrates an old loadout while preserving resources, equipment and skill levels', () => {
    const p = {
      ...newPlayer({ sex: 'male' }),
      level: 99,
      linhKhi: 987,
      inventory: { linh_thach: 321 },
      equipment: { weapon: 'weapon_white' },
      skills: { bang_tam_tram: 8, hoa_ma_chi: 4 },
      skillLoadout: [
        'basic',
        'bang_tam_tram',
        'phi_kiem',
        'wang_lam_1',
        'hoa_lien',
        'phong_nhan',
        'kim_cang',
      ] as const,
    };
    const saved = deserialize(
      serialize({
        player: { ...p, skillLoadout: [...p.skillLoadout] },
        quests: {},
        mapId: 'dai_thua_vien',
        pos: null,
      }),
    )!;
    const loadout = skillLoadout(saved.player);
    expect(loadout).toHaveLength(7);
    expect(
      loadout.every((id) => id === 'basic' || WANG_SIGNATURE_SKILLS.some((s) => s === id)),
    ).toBe(true);
    expect(saved.player.inventory).toEqual(p.inventory);
    expect(saved.player.linhKhi).toBe(p.linhKhi);
    expect(equipmentBaseId(saved.player.equipment.weapon!)).toBe('weapon_white');
    expect(saved.player.skills).toEqual(p.skills);
    expect(availableHeroSkillIds('wang_lam')).toEqual([...WANG_SIGNATURE_SKILLS]);
  });
  it('rejects all retired spells even at maximum level or with a forged PK loadout', () => {
    const p = { ...newPlayer({ sex: 'male' }), level: 99 };
    const a = buildDuelist(p, playerStats(p), 'Toái Niết', 'a');
    for (const id of [...RETIRED_COMMON_SKILLS, ...heroSkillIds('wang_lam')]) {
      expect(retiredSkill(id)).toBe(true);
      expect(skillUnlocked(p, id)).toBe(false);
      expect(chooseSkill(p, 1, id)).toBeNull();
      const engine = new ArenaEngine(
        'retired',
        { ...a, loadout: ['basic', id] },
        { ...a, userId: 'b' },
      );
      engine.start();
      for (let i = 0; i < 30; i++) engine.step(100);
      const mp = engine.state.fighters[0].mp;
      engine.input('a', { seq: 1, x: 0, y: 0, cast: id });
      engine.step(50);
      expect(engine.state.fighters[0].mp).toBe(mp);
      expect(engine.state.effects).toHaveLength(0);
    }
  });
});
