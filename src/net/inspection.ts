import { EQUIP_SLOTS, ITEMS, REALMS, SKILLS, type EquipSlot, type SkillId } from '../data';
import { heroFor, isHeroId, type HeroId } from '../data/heroes';
import { heroSkillIds } from '../data/heroSkills';
import { adventure, battlePower, sectRank } from '../game/systems/adventure';
import { equipmentBaseId } from '../game/systems/equipment';
import { enhancementLevel } from '../game/systems/enhancement';
import {
  flightProfile,
  immortalProgress,
  MOUNTS,
  mountUnlocked,
  type MountId,
} from '../game/systems/immortal';
import { COMPANIONS, lifeProgress, type CompanionId } from '../game/systems/life';
import { isChildhood } from '../game/systems/origin';
import { realmNameAtLevel, type DerivedStats } from '../game/systems/progression';
import type { PlayerSave } from '../game/systems/save';
import type { QuestLog } from '../game/systems/quest';
import { skillLevel, skillLoadout, skillUnlocked } from '../game/systems/skills';
import { parsePkMode, type PkMode } from './worldProtocol';

/** Only public character information; never ship the save, bag or account wallet. */
export interface PlayerInspection {
  userId: string;
  heroId: HeroId;
  sex: 'male' | 'female';
  child: boolean;
  level: number;
  realm: string;
  realmIndex: number;
  mapId: string;
  sect?: 'dai_thua_vien' | 'linh_son_tong';
  rank: number;
  pkMode: PkMode;
  stats: DerivedStats;
  hp: number;
  mp: number;
  power: number;
  equipment: { slot: EquipSlot; id: string; enhancement: number }[];
  skills: { id: SkillId; level: number; equipped: boolean }[];
  mounts: { id: MountId; active: boolean; speed: number; showMount: boolean }[];
  companions: { id: CompanionId; rank: number; evolution: number; active: boolean }[];
  progress: {
    clears: number;
    explored: number;
    gathered: number;
    crafted: number;
    missions: number;
  };
  friendCount: number;
}
const total = (values: Record<string, number>) =>
  Object.values(values).reduce((a, n) => a + Math.max(0, Math.floor(n)), 0);
export function buildInspection(
  p: PlayerSave,
  stats: DerivedStats,
  quests: QuestLog,
  mapId: string,
  userId: string,
): PlayerInspection {
  const a = adventure(p),
    life = lifeProgress(p),
    immortal = immortalProgress(p),
    child = isChildhood(p),
    hero = heroFor(p),
    loadout = skillLoadout(p);
  return {
    userId,
    heroId: hero.id,
    sex: hero.sex,
    child,
    level: p.level,
    realm: child ? 'Phàm Nhân' : realmNameAtLevel(p.level),
    realmIndex: p.realmIndex,
    mapId,
    ...(child ? {} : { sect: a.boundSect }),
    rank: child ? 0 : sectRank(p),
    pkMode: p.pkMode ?? 'peace',
    stats: { ...stats },
    hp: p.hp,
    mp: p.mp,
    power: battlePower(stats),
    equipment: EQUIP_SLOTS.flatMap((slot) => {
      const key = p.equipment[slot.id],
        id = key && equipmentBaseId(key);
      return id && ITEMS[id]?.slot === slot.id
        ? [{ slot: slot.id, id, enhancement: enhancementLevel(a.enhancements[key!]) }]
        : [];
    }),
    skills: child
      ? []
      : [
          ...new Set([
            ...loadout,
            'than_phap' as const,
            ...heroSkillIds(hero.id),
            ...(Object.keys(SKILLS) as SkillId[]),
          ]),
        ]
          .filter((id) => skillUnlocked(p, id))
          .map((id) => ({
            id,
            level: skillLevel(p.skills, id),
            equipped: id === 'than_phap' || loadout.includes(id),
          })),
    mounts: child
      ? []
      : MOUNTS.filter((m) => mountUnlocked(m.id, quests, p)).map((m) => ({
          id: m.id,
          active: immortal.mount === m.id,
          ...flightProfile(p, m.id),
        })),
    companions: child
      ? []
      : COMPANIONS.flatMap((c) => {
          const own = life.companions[c.id];
          return own
            ? [
                {
                  id: c.id,
                  rank: own.rank,
                  evolution: a.evolution[c.id] ?? 0,
                  active: life.companion === c.id,
                },
              ]
            : [];
        }),
    progress: {
      clears: total(p.dungeons?.clears ?? {}),
      explored: new Set(p.world?.discovered ?? []).size,
      gathered: total(immortal.gathered),
      crafted: total(immortal.crafted),
      missions: a.missionDay === life.days ? a.completedMissions.length : 0,
    },
    friendCount: p.friends?.length ?? 0,
  };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const num = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const integer = (n: unknown, min: number, max: number): n is number =>
  num(n, min, max) && Number.isInteger(n);
const short = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
/** Rebuild an allowlist instead of forwarding arbitrary peer fields into the UI. */
export function parseInspection(value: unknown): PlayerInspection | null {
  if (!object(value)) return null;
  const p = value;
  if (
    !short(p.userId, 64) ||
    !isHeroId(p.heroId) ||
    !['male', 'female'].includes(String(p.sex)) ||
    typeof p.child !== 'boolean' ||
    !integer(p.level, 1, 999) ||
    !integer(p.realmIndex, 0, REALMS.length - 1) ||
    !short(p.realm, 50) ||
    !short(p.mapId, 50) ||
    !integer(p.rank, 0, 5) ||
    !object(p.stats) ||
    !object(p.progress) ||
    !integer(p.friendCount, 0, 30)
  )
    return null;
  const s = p.stats;
  if (
    !['maxHp', 'maxMp', 'atk', 'def'].every((k) => num(s[k], 0, 10000000)) ||
    !num(s.maxHp, 1, 10000000) ||
    !num(s.critRate, 0, 1) ||
    !num(s.critMul, 1, 10) ||
    !num(s.speed, 0, 10000) ||
    !num(p.hp, 0, s.maxHp) ||
    !num(p.mp, 0, s.maxMp as number) ||
    !num(p.power, 0, 100000000)
  )
    return null;
  if (
    !['clears', 'explored', 'gathered', 'crafted', 'missions'].every((k) =>
      integer((p.progress as Record<string, unknown>)[k], 0, 10000000),
    )
  )
    return null;
  if (
    !Array.isArray(p.equipment) ||
    p.equipment.length > 6 ||
    !Array.isArray(p.skills) ||
    p.skills.length > 60 ||
    !Array.isArray(p.mounts) ||
    p.mounts.length > 2 ||
    !Array.isArray(p.companions) ||
    p.companions.length > COMPANIONS.length
  )
    return null;
  const equipment: PlayerInspection['equipment'] = [],
    skills: PlayerInspection['skills'] = [],
    mounts: PlayerInspection['mounts'] = [],
    companions: PlayerInspection['companions'] = [];
  for (const e of p.equipment) {
    if (
      !object(e) ||
      typeof e.id !== 'string' ||
      !Object.prototype.hasOwnProperty.call(ITEMS, e.id) ||
      !EQUIP_SLOTS.some((s) => s.id === e.slot) ||
      ITEMS[e.id]?.slot !== e.slot ||
      !integer(e.enhancement, 0, 12) ||
      equipment.some((s) => s.slot === e.slot)
    )
      return null;
    equipment.push({ slot: e.slot as EquipSlot, id: e.id, enhancement: e.enhancement });
  }
  for (const e of p.skills) {
    if (
      !object(e) ||
      typeof e.id !== 'string' ||
      !Object.prototype.hasOwnProperty.call(SKILLS, e.id) ||
      !integer(e.level, 1, 10) ||
      typeof e.equipped !== 'boolean' ||
      skills.some((s) => s.id === e.id)
    )
      return null;
    const id = e.id as SkillId;
    if (SKILLS[id].hero && SKILLS[id].hero !== p.heroId) return null;
    skills.push({ id, level: e.level, equipped: e.equipped });
  }
  for (const e of p.mounts) {
    if (
      !object(e) ||
      !MOUNTS.some((m) => m.id === e.id) ||
      typeof e.active !== 'boolean' ||
      typeof e.showMount !== 'boolean' ||
      !num(e.speed, 1, 3) ||
      mounts.some((m) => m.id === e.id)
    )
      return null;
    mounts.push({ id: e.id as MountId, active: e.active, showMount: e.showMount, speed: e.speed });
  }
  for (const e of p.companions) {
    if (
      !object(e) ||
      !COMPANIONS.some((c) => c.id === e.id) ||
      !integer(e.rank, 1, 5) ||
      !integer(e.evolution, 0, 2) ||
      typeof e.active !== 'boolean' ||
      companions.some((c) => c.id === e.id)
    )
      return null;
    companions.push({
      id: e.id as CompanionId,
      rank: e.rank,
      evolution: e.evolution,
      active: e.active,
    });
  }
  return {
    userId: p.userId,
    heroId: p.heroId,
    sex: p.sex as 'male' | 'female',
    child: p.child,
    level: p.level,
    realmIndex: p.realmIndex,
    realm: p.realm,
    mapId: p.mapId,
    rank: p.rank,
    pkMode: parsePkMode(p.pkMode),
    ...(p.sect === 'dai_thua_vien' || p.sect === 'linh_son_tong' ? { sect: p.sect } : {}),
    stats: {
      maxHp: s.maxHp,
      maxMp: s.maxMp as number,
      atk: s.atk as number,
      def: s.def as number,
      critRate: s.critRate,
      critMul: s.critMul,
      speed: s.speed,
    },
    hp: p.hp,
    mp: p.mp,
    power: p.power,
    equipment,
    skills,
    mounts,
    companions,
    progress: {
      clears: p.progress.clears as number,
      explored: p.progress.explored as number,
      gathered: p.progress.gathered as number,
      crafted: p.progress.crafted as number,
      missions: p.progress.missions as number,
    },
    friendCount: p.friendCount,
  };
}
