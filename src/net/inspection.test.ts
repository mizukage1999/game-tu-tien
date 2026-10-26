import { describe, expect, it } from 'vitest';
import { buildInspection, parseInspection } from './inspection';
import { parseSocialMessage } from './social';
import { newPlayer } from '../store/gameStore';
import { ITEMS } from '../data';
import { adventure } from '../game/systems/adventure';
import { playerStats } from '../game/systems/progression';
import { lifeProgress } from '../game/systems/life';
import { inspectionStore } from '../store/inspectionStore';

export function inspectionFixture() {
  const base = {
    ...newPlayer(),
    heroId: 'hong_lien' as const,
    sex: 'female' as const,
    name: 'Hồng Liên',
    admitted: true,
    level: 25,
    realmIndex: 2,
  };
  const weapon = Object.keys(ITEMS).find(
    (id) => ITEMS[id].slot === 'weapon' && ITEMS[id].rarity === 'red',
  )!;
  const key = `${weapon}~peer-instance`;
  const p = {
    ...base,
    equipment: { weapon: key },
    inventory: { secret_material: 999, linh_thach: 700 },
    skills: { hong_lien_1: 4 },
    adventure: { ...adventure(base), enhancements: { [key]: 12 } },
    life: {
      ...lifeProgress(base),
      companions: { red_fox: { rank: 3, bond: 1 } },
      companion: 'red_fox' as const,
    },
  };
  const stats = playerStats(p);
  p.hp = stats.maxHp;
  p.mp = stats.maxMp;
  return { p, weapon, stats, data: buildInspection(p, stats, {}, 'dai_thua_vien', 'peer') };
}
describe('public opponent inspection', () => {
  it('shares the equipped physical item and its own upgrade, without leaking the bag or account fields', () => {
    const { data, weapon } = inspectionFixture();
    expect(data.equipment).toEqual([{ slot: 'weapon', id: weapon, enhancement: 12 }]);
    expect(data.skills.find((s) => s.id === 'hong_lien_1')).toMatchObject({
      level: 4,
      equipped: true,
    });
    expect(data.companions[0]).toMatchObject({ id: 'red_fox', rank: 3, active: true });
    expect(data.mounts[0].id).toBe('sword');
    expect(JSON.stringify(data)).not.toMatch(
      /secret_material|700|peer-instance|inventory|linhKhi|chatKey/,
    );
    expect(parseInspection(data)).toEqual(data);
  });
  it('validates slots, hero skills, finite stats and caps before rendering a peer response', () => {
    const { data } = inspectionFixture();
    expect(parseInspection({ ...data, stats: { ...data.stats, atk: NaN } })).toBeNull();
    expect(
      parseInspection({ ...data, equipment: [{ ...data.equipment[0], slot: 'armor' }] }),
    ).toBeNull();
    expect(
      parseInspection({ ...data, equipment: [{ ...data.equipment[0], enhancement: 15 }] }),
    ).toBeNull();
    expect(
      parseInspection({ ...data, skills: [{ id: 'vu_minh_1', level: 1, equipped: true }] }),
    ).toBeNull();
    expect(
      parseSocialMessage({
        t: 'inspect:result',
        to: 'me',
        from: 'wrong-peer',
        nonce: 'n',
        inspection: data,
      }),
    ).toBeNull();
    const parsed = parseInspection({
      ...data,
      inventory: { secret: 100 },
      stats: { ...data.stats, token: 'hidden' },
    })!;
    expect(parsed).not.toHaveProperty('inventory');
    expect(parsed.stats).not.toHaveProperty('token');
  });
  it('ignores old, unsolicited and mismatched replies when switching opponents', () => {
    const { data } = inspectionFixture(),
      s = inspectionStore.getState();
    s.begin('peer', 'new');
    s.complete('peer', 'old', data);
    expect(inspectionStore.getState().data).toBeNull();
    s.complete('other', 'new', data);
    expect(inspectionStore.getState().data).toBeNull();
    s.complete('peer', 'new', data);
    expect(inspectionStore.getState().data).toEqual(data);
    s.begin('other', 'next');
    s.fail('new');
    expect(inspectionStore.getState().status).toBe('loading');
    s.reset();
  });
  it('keeps children untrained and omits combat pets and sect membership', () => {
    const p = { ...newPlayer(), origin: 'vuong_gia_thon' as const, admitted: false },
      data = buildInspection(p, playerStats(p), {}, 'vuong_gia_thon', 'child');
    expect(data.child).toBe(true);
    expect(data.realm).toBe('Phàm Nhân');
    expect(data.skills).toEqual([]);
    expect(data.mounts).toEqual([]);
    expect(data.companions).toEqual([]);
    expect(data.sect).toBeUndefined();
  });
});
