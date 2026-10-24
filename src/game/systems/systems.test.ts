import { describe, expect, it } from 'vitest';
import { computeDamage, inAttackArc } from './combat';
import { createBrain, provoke, stepMonsterAI, type AIParams } from './monsterAI';
import { canAct, canBeHit, createLife, knockDown, tickLife } from './respawn';
import { rollDungeonGear, rollLoot } from './loot';
import { findPath } from './path';
import { questDestination, routeOnMap } from './questNav';
import {
  addExp,
  applyBreakthrough,
  canEquip,
  checkBreakthrough,
  computeStats,
  expToNext,
  realmNameAtLevel,
} from './progression';
import { acceptQuest, applyEvent, availableQuests, completeQuest, turnInQuests } from './quest';
import { meditateGain, zoneAt } from './cultivation';
import { deserialize, serialize } from './save';
import {
  DUNGEONS,
  EQUIP_SLOTS,
  equipmentId,
  ITEMS,
  MONSTERS,
  NPCS,
  QUESTS,
  RARITIES,
  REALMS,
  type QuestDef,
} from '../../data';
import { getMap } from '../maps';
import { DIFFICULTIES, DUNGEON_TIERS, FIELD_BANDS, canEnterField, dungeonId, expForMonsterLevel, fieldForLevel } from './scale';
import { normalizeName, playerArt } from './character';
import { itemSpriteTextureKey } from '../art/icons';
import { screenToTurnedGame, swipeVector } from '../../ui/TouchPlay';

const fixed = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('combat', () => {
  it('reduces damage by defence and never goes below 1', () => {
    const low = computeDamage({ atk: 100, def: 0, multiplier: 1, rng: fixed(0.5, 0.99) });
    const high = computeDamage({ atk: 100, def: 100, multiplier: 1, rng: fixed(0.5, 0.99) });
    expect(low.amount).toBe(100);
    expect(high.amount).toBeLessThan(low.amount);
    expect(computeDamage({ atk: 1, def: 9999, multiplier: 1, rng: fixed(0) }).amount).toBe(1);
  });

  it('applies crits', () => {
    const r = computeDamage({ atk: 100, def: 0, multiplier: 1, critRate: 1, critMul: 2, rng: fixed(0.5, 0) });
    expect(r.crit).toBe(true);
    expect(r.amount).toBe(200);
  });

  it('checks attack cones', () => {
    const o = { x: 0, y: 0 };
    const right = { x: 1, y: 0 };
    expect(inAttackArc(o, right, { x: 50, y: 0 }, 60, 90)).toBe(true);
    expect(inAttackArc(o, right, { x: -50, y: 0 }, 60, 90)).toBe(false);
    expect(inAttackArc(o, right, { x: 100, y: 0 }, 60, 90)).toBe(false);
    expect(inAttackArc(o, right, { x: -50, y: 0 }, 60, 360)).toBe(true);
  });
});

describe('monster AI', () => {
  const p: AIParams = { speed: 100, aggroRadius: 150, attackRange: 50, attackInterval: 1000, leashRadius: 400 };

  it('chases a player inside aggro range and attacks on an interval', () => {
    const brain = createBrain({ x: 0, y: 0 });
    stepMonsterAI(brain, p, { pos: { x: 0, y: 0 }, player: { x: 100, y: 0 }, dt: 16 });
    expect(brain.state).toBe('chase');
    const chase = stepMonsterAI(brain, p, { pos: { x: 0, y: 0 }, player: { x: 100, y: 0 }, dt: 16 });
    expect(chase.velocity.x).toBeGreaterThan(0);

    stepMonsterAI(brain, p, { pos: { x: 70, y: 0 }, player: { x: 100, y: 0 }, dt: 16 });
    expect(brain.state).toBe('attack');
    const first = stepMonsterAI(brain, p, { pos: { x: 70, y: 0 }, player: { x: 100, y: 0 }, dt: 16 });
    expect(first.attack).toBe(true);
    const tooSoon = stepMonsterAI(brain, p, { pos: { x: 70, y: 0 }, player: { x: 100, y: 0 }, dt: 500 });
    expect(tooSoon.attack).toBe(false);
    const again = stepMonsterAI(brain, p, { pos: { x: 70, y: 0 }, player: { x: 100, y: 0 }, dt: 600 });
    expect(again.attack).toBe(true);
  });

  it('returns home when the player is downed or leashed', () => {
    const brain = createBrain({ x: 0, y: 0 });
    brain.state = 'attack';
    stepMonsterAI(brain, p, { pos: { x: 40, y: 0 }, player: null, dt: 16 });
    expect(brain.state).toBe('return');

    const b2 = createBrain({ x: 0, y: 0 });
    b2.state = 'chase';
    stepMonsterAI(b2, p, { pos: { x: 500, y: 0 }, player: { x: 520, y: 0 }, dt: 16 });
    expect(b2.state).toBe('return');
  });

  it('is provoked by damage even outside aggro range', () => {
    const brain = createBrain({ x: 0, y: 0 });
    provoke(brain);
    expect(brain.state).toBe('chase');
    stepMonsterAI(brain, p, { pos: { x: 0, y: 0 }, player: { x: 280, y: 0 }, dt: 16 });
    expect(brain.state).toBe('chase');
  });
});

describe('downed state', () => {
  it('stays downed until a map transfer instead of reviving on the spot', () => {
    const life = createLife();
    knockDown(life);
    expect(canAct(life)).toBe(false);
    expect(canBeHit(life)).toBe(false);
    expect(tickLife(life, 3000)).toBe(false);
    expect(tickLife(life, 1)).toBe(false);
    expect(canAct(life)).toBe(false);
    expect(canBeHit(life)).toBe(false);
    tickLife(life, 5000);
    expect(canBeHit(life)).toBe(false);
  });
});

describe('loot', () => {
  it('rolls each entry independently', () => {
    const table = [
      { item: 'linh_khi', qty: [10, 30] as [number, number], chance: 0.8 },
      { item: 'linh_thach', qty: [1, 1] as [number, number], chance: 0.35 },
    ];
    expect(rollLoot(table, fixed(0.1, 0, 0.1, 0))).toEqual([
      { item: 'linh_khi', qty: 10 },
      { item: 'linh_thach', qty: 1 },
    ]);
    expect(rollLoot(table, fixed(0.99))).toEqual([]);
  });
});

describe('progression', () => {
  it('uses tier-colored sprites for weapons and gear, with the top rarity mapped to red', () => {
    for (const rarity of ['white', 'blue', 'green', 'purple', 'orange', 'red'] as const) {
      expect(itemSpriteTextureKey(equipmentId('weapon', rarity))).toBe(`item-sprite-weapon_${rarity}`);
      for (const slot of ['armor', 'boots', 'ring', 'amulet'] as const) {
        expect(itemSpriteTextureKey(equipmentId(slot, rarity))).toBe(`item-sprite-${slot}_${rarity}`);
      }
    }
    expect(itemSpriteTextureKey(equipmentId('weapon', 'pink'))).toBe('item-sprite-weapon_red');
    for (const slot of ['armor', 'boots', 'ring', 'amulet'] as const) {
      expect(itemSpriteTextureKey(equipmentId(slot, 'pink'))).toBe(`item-sprite-${slot}_red`);
    }
  });

  it('uses the weapon tier level requirements for the new gear sprites', () => {
    const requirements = { white: 10, blue: 20, green: 40, purple: 60, orange: 80, red: 100, pink: 100 } as const;
    for (const slot of ['armor', 'boots', 'ring', 'amulet'] as const) {
      for (const [rarity, level] of Object.entries(requirements)) {
        expect(ITEMS[equipmentId(slot, rarity as keyof typeof requirements)].reqLevel).toBe(level);
      }
    }
  });

  it('levels up and stops at the realm bottleneck', () => {
    const s = { level: 1, exp: 0, realmIndex: 0 };
    const r = addExp(s, expToNext(1) + 5);
    expect(r.levelsGained).toBe(1);
    expect(s.exp).toBe(5);

    const capped = { level: 10, exp: 0, realmIndex: 0 };
    const res = addExp(capped, 999999);
    expect(res.bottleneck).toBe(true);
    expect(capped.level).toBe(10);
    expect(capped.exp).toBe(expToNext(10));
  });

  it('requires resources to break through', () => {
    const s = { level: 10, exp: expToNext(10), realmIndex: 0 };
    expect(checkBreakthrough(s, 0, 0).ok).toBe(false);
    const ok = checkBreakthrough(s, 10000, 100);
    expect(ok.ok).toBe(true);
    applyBreakthrough(s);
    expect(s).toEqual({ level: 11, exp: 0, realmIndex: 1 });
  });

  it('names major and minor cultivation stages at the requested level boundaries', () => {
    expect(REALMS.map(({ name, minLevel, maxLevel }) => [name, minLevel, maxLevel])).toEqual([
      ['Luyện Khí', 1, 10],
      ['Trúc Cơ', 11, 20],
      ['Kim Đan', 21, 30],
      ['Nguyên Anh', 31, 40],
      ['Hóa Thần', 41, 50],
      ['Anh Biến', 51, 60],
      ['Vấn Đỉnh', 61, 70],
      ['Âm Hư', 71, 80],
      ['Dương Thực', 81, 90],
      ['Khuy Niết', 91, 100],
    ]);
    expect(realmNameAtLevel(1)).toBe('Luyện Khí Sơ Kỳ');
    expect(realmNameAtLevel(4)).toBe('Luyện Khí Trung Kỳ');
    expect(realmNameAtLevel(7)).toBe('Luyện Khí Hậu Kỳ');
    expect(realmNameAtLevel(10)).toBe('Luyện Khí Hậu Kỳ Đại Viên Mãn');
    expect(realmNameAtLevel(53)).toBe('Anh Biến Sơ Kỳ');
    expect(realmNameAtLevel(88)).toBe('Dương Thực Hậu Kỳ');
  });

  it('adds weapon bonuses and ignores legacy armor slots', () => {
    const base = computeStats(5, 0, {});
    const ringed = computeStats(5, 0, { ring: 'nhan_bac' });
    expect(ringed.atk).toBe(base.atk+8);
    expect(computeStats(5, 0, {weapon:'moc_kiem',ring:'nhan_bac'}).atk).toBe(base.atk + 12);
  });

  it('gates equipment by rarity level', () => {
    expect(canEquip('weapon_white', 9).ok).toBe(false);
    expect(canEquip('weapon_white', 10).ok).toBe(true);
    expect(canEquip('weapon_blue', 19).ok).toBe(false);
    expect(canEquip('weapon_blue', 20).ok).toBe(true);
    expect(canEquip('weapon_green', 39).ok).toBe(false);
    expect(canEquip('weapon_green', 40).ok).toBe(true);
    expect(canEquip('weapon_purple', 59).ok).toBe(false);
    expect(canEquip('weapon_purple', 60).ok).toBe(true);
    expect(canEquip('weapon_orange', 79).ok).toBe(false);
    expect(canEquip('weapon_orange', 80).ok).toBe(true);
    expect(canEquip('weapon_red', 99).ok).toBe(false);
    expect(canEquip('weapon_red', 100).ok).toBe(true);
    expect(canEquip('weapon_pink', 100).ok).toBe(true);
    expect(canEquip('armor_white', 9).ok).toBe(false);
    expect(canEquip('armor_white', 100).ok).toBe(true);
    expect(canEquip('moc_kiem', 1).ok).toBe(true);
    expect(canEquip('hoi_xuan_dan', 99).ok).toBe(false);
  });

  it('generates every slot for all seven rarities with rising stats', () => {
    expect(RARITIES.map((r) => r.id)).toEqual(['white', 'blue', 'green', 'purple', 'orange', 'red', 'pink']);
    let prev = 0;
    for (const r of RARITIES) {
      for (const slot of EQUIP_SLOTS) expect(ITEMS[equipmentId(slot.id, r.id)]?.slot).toBe(slot.id);
      const atk = ITEMS[equipmentId('weapon', r.id)].bonus!.atk!;
      expect(atk).toBeGreaterThan(prev);
      prev = atk;
    }
    const equipment = NPCS.thuong_nhan.shop!.filter(o=>ITEMS[o.item]?.kind==='equipment');
    expect(equipment).toHaveLength(RARITIES.length*EQUIP_SLOTS.length);
    expect(new Set(equipment.map(o=>ITEMS[o.item].slot)).size).toBe(EQUIP_SLOTS.length);
    expect(NPCS.thuong_nhan.shop!.some(o=>o.item==='hat_thanh_linh')).toBe(true);
  });
});

describe('world scale', () => {
  it('raises exp as monster level rises and confines a player to one field', () => {
    expect(expForMonsterLevel(20)).toBeGreaterThan(expForMonsterLevel(10));
    expect(expForMonsterLevel(90)).toBeGreaterThan(expForMonsterLevel(20));
    expect(fieldForLevel(1).id).toBe('linh_thu_lam');
    expect(fieldForLevel(15).minLevel).toBe(11);
    expect(fieldForLevel(99).maxLevel).toBe(99);
    expect(canEnterField(15, { min: 11, max: 20 }).ok).toBe(true);
    expect(canEnterField(15, { min: 1, max: 10 }).ok).toBe(true);
    expect(canEnterField(9, { min: 11, max: 20 }).ok).toBe(true);
  });

  it('builds a map for every level band and a dungeon for every difficulty', () => {
    expect(FIELD_BANDS.map((b) => b.minLevel)).toEqual([1, 11, 21, 31, 41, 51, 61, 71, 81, 91]);
    for (const band of FIELD_BANDS) {
      const map = getMap(band.id);
      expect(map.level).toEqual({ min: band.minLevel, max: band.maxLevel });
      expect(MONSTERS[band.mob].level).toBeLessThanOrEqual(band.maxLevel);
      expect(MONSTERS[band.elite].level).toBeGreaterThanOrEqual(MONSTERS[band.mob].level);
    }
    for (const tier of DUNGEON_TIERS) {
      let prevLevel = 0;
      for (const diff of DIFFICULTIES) {
        const def = DUNGEONS[dungeonId(tier.level, diff.id)];
        expect(def.minLevel).toBe(tier.level);
        expect(def.difficulty).toBe(diff.id);
        const boss = MONSTERS[def.boss];
        expect(boss.level).toBeGreaterThan(prevLevel);
        prevLevel = boss.level;
        expect(def.drops?.length).toBeGreaterThan(0);
        for (const drop of def.drops ?? []) expect(drop.chance).toBeLessThanOrEqual(0.08);
      }
    }
  });

  it('keeps guaranteed rewards and only sometimes rolls bonus gear', () => {
    const table = DUNGEONS[dungeonId(10, 'de')].drops ?? [];
    expect(rollDungeonGear(table, fixed(0, 0, 0.5))).toEqual([{ item: 'weapon_white', qty: 1 }]);
    expect(rollDungeonGear(table, fixed(0.5))).toEqual([]);
    expect(rollDungeonGear([{ item: 'gear:blue', qty: [1, 1], chance: 1 }], fixed(0))).toEqual([{ item: 'weapon_blue', qty: 1 }]);
  });
});

describe('quest navigation', () => {
  it('walks around walls and sends a talk quest to the npc', () => {
    const blocked = [
      [false, false, false, false, false],
      [false, true, true, true, false],
      [false, false, false, true, false],
      [false, true, false, true, false],
      [false, false, false, false, false],
    ];
    const path = findPath(blocked, 0, 2, 4, 2);
    expect(path.reached).toBe(true);
    expect(path.tiles[path.tiles.length - 1]).toEqual({ x: 4, y: 2 });
    expect(path.tiles.some((t) => t.x === 3 && t.y === 2)).toBe(false);
    expect(path.tiles.some((t) => blocked[t.y][t.x])).toBe(false);

    const log = acceptQuest({}, QUESTS, 'main_0', { level: 1 });
    const nav = questDestination('main_0', log, 1, 'dai_thua_vien', { x: 24, y: 20 });
    expect(nav.kind).toBe('go');
    if (nav.kind !== 'go') return;
    expect(nav.stop.talkTo).toBe('truong_lao');
    expect(nav.stop.mapId).toBe('dai_thua_vien');
    const route = routeOnMap(getMap('dai_thua_vien'), { x: 24, y: 20 }, nav.stop, 1);
    expect(route.kind).toBe('path');
  });

  it('refuses a field the player has outleveled', () => {
    const log = acceptQuest({}, QUESTS, 'side_3', { level: 20 });
    const nav = questDestination('side_3', log, 20, 'dai_thua_vien');
    expect(nav.kind).toBe('go');
  });
});

describe('phone swipe', () => {
  it('turns a downward finger into a rightward step when the page is rotated', () => {
    const turned = swipeVector(0, 64, true);
    expect(turned.x).toBeGreaterThan(0.9);
    expect(Math.abs(turned.y)).toBeLessThan(0.01);
    const flat = swipeVector(64, 0, false);
    expect(flat.x).toBeGreaterThan(0.9);
    expect(Math.abs(flat.y)).toBeLessThan(0.01);
  });

  it('maps a portrait tap through the 90° turn onto the landscape game', () => {
    const bounds = { x: 0, y: 0, width: 390, height: 844 };
    const center = screenToTurnedGame(195, 422, bounds, 844, 390);
    expect(center.x).toBeCloseTo(422, 0);
    expect(center.y).toBeCloseTo(195, 0);
    const down = screenToTurnedGame(195, 500, bounds, 844, 390);
    expect(down.x).toBeGreaterThan(center.x);
  });
});

describe('quests', () => {
  const defs: Record<string, QuestDef> = {
    a: { kind: 'main', name: 'A', desc: '', objectives: [{ type: 'kill', target: 'x', count: 2 }], turnIn: 'npc', giver: 'npc', rewards: {} },
    b: { kind: 'main', name: 'B', desc: '', giver: 'npc', requires: 'a', objectives: [{ type: 'reachLevel', count: 3 }], rewards: {} },
  };

  it('tracks kills until ready, then turns in', () => {
    let log = acceptQuest({}, defs, 'a', { level: 1 });
    log = applyEvent(log, defs, { type: 'kill', target: 'x' }).log;
    expect(log.a.progress).toEqual([1]);
    const res = applyEvent(log, defs, { type: 'kill', target: 'x' });
    expect(res.finished).toEqual(['a']);
    expect(res.log.a.status).toBe('ready');
    expect(turnInQuests(res.log, defs, 'npc')).toEqual(['a']);
    log = completeQuest(res.log, 'a');
    expect(log.a.status).toBe('done');
    expect(availableQuests(log, defs, 'npc')).toEqual(['b']);
  });

  it('completes reachLevel immediately when already satisfied', () => {
    const log = acceptQuest({ a: { status: 'done', progress: [2] } }, defs, 'b', { level: 5 });
    expect(log.b.status).toBe('done');
  });

  it('ships a consistent quest chain', () => {
    for (const [id, q] of Object.entries(QUESTS)) {
      if (q.requires) expect(QUESTS[q.requires], `${id}.requires`).toBeDefined();
      expect(q.objectives.length).toBeGreaterThan(0);
    }
  });
});

describe('cultivation', () => {
  it('meditating in a zone is faster', () => {
    expect(meditateGain(5, 3).linhKhi).toBeGreaterThan(meditateGain(5, null).linhKhi);
    expect(zoneAt([{ id: 'z', name: 'Z', rect: [2, 2, 3, 3], rate: 2 }], 3, 3)?.id).toBe('z');
    expect(zoneAt([{ id: 'z', name: 'Z', rect: [2, 2, 3, 3], rate: 2 }], 5, 3)).toBeNull();
  });

  it('keeps Linh Dai meditation at the base x1 rate', () => {
    const linhDai = getMap('dai_thua_vien').zones.find((zone) => zone.id === 'linh_dai');
    expect(linhDai?.rate).toBe(1);
    expect(meditateGain(5, linhDai?.rate ?? null)).toEqual(meditateGain(5, 1));
  });

});

describe('save', () => {
  it('round-trips and rejects garbage', () => {
    const raw = serialize({
      player: { name: 'A', level: 2, exp: 3, realmIndex: 0, hp: 1, mp: 1, linhKhi: 5, inventory: {}, equipment: {} },
      quests: {},
      mapId: 'm',
      pos: null,
    });
    expect(deserialize(raw)?.player.level).toBe(2);
    expect(deserialize('{oops')).toBeNull();
    expect(deserialize(JSON.stringify({ v: 999 }))).toBeNull();
    const old = deserialize(raw);
    expect(old?.player.sex).toBe('female');

    const legacy = JSON.stringify({
      v: 1,
      player: { name: 'B', level: 88, realmIndex: 6 },
    });
    expect(deserialize(legacy)?.player.realmIndex).toBe(8);
  });
});

describe('character creation', () => {
  it('keeps a trimmed name and rejects a blank one', () => {
    expect(normalizeName('  Tuyết Kỳ  ')).toBe('Tuyết Kỳ');
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName('a'.repeat(17))).toBeNull();
  });

  it('gives the male figure its own sprite and leaves older saves on the original', () => {
    expect(playerArt('male')).toBe('player_male');
    expect(playerArt('female')).toBe('player');
    expect(playerArt(undefined)).toBe('player');
  });
});
