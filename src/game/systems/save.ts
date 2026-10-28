import type { EquipSlot, PracticeAction } from '../../data';
import { ITEMS, REALMS } from '../../data';
import type { QuestLog } from './quest';
import type { DungeonRecord } from './dungeon';
import type { SkillLevels } from './skills';
import type { Vec2 } from '../types';
import type { ImmortalProgress } from './immortal';
import type { LifeProgress } from './life';
import type { AdventureProgress } from './adventure';
import type { SkillId } from '../../data';
import { enhancementLevel } from './enhancement';
import { normalizeEquipment } from './equipment';
import { isHeroId, heroFor, type HeroId } from '../../data/heroes';
import { parsePkMode, type PkMode } from '../../net/worldProtocol';

export const SAVE_KEY = 'tu-tien-demo-save';
const SAVE_VERSION = 1;

/**
 * Offline play uses the bare key. Signed-in accounts get their own key so two
 * players on the same browser never pick up each other's cache.
 */
let scope: string | null = null;

export function setSaveScope(userId: string | null) {
  scope = userId;
}

export function saveKey(): string {
  return scope ? `${SAVE_KEY}:${scope}` : SAVE_KEY;
}

export type SaveSink = (data: SaveData) => void;
let sink: SaveSink | null = null;

/** Cloud sync registers here; localStorage keeps working as the instant cache. */
export function setSaveSink(next: SaveSink | null) {
  sink = next;
}

export type Sex = 'female' | 'male';

/** A friend, as stored in the save file. Level/realm come from presence at runtime. */
export interface FriendRef {
  userId: string;
  name: string;
}

export interface PlayerSave {
  /** Server receipt revision prevents delayed autosaves from undoing mail rewards. */
  mailRevision?: number;
  pkMode?: PkMode;
  heroId?: HeroId;
  practice?: Partial<Record<PracticeAction, number>>;
  name: string;
  /** Missing on saves from before character creation; those keep the original look. */
  sex?: Sex;
  /** Legacy saves receive this origin once when entering the village opening chapter. */
  origin?: 'vuong_gia_thon';
  admitted?: boolean;
  world?: { interactions: Record<string, number>; discovered: string[] };
  level: number;
  exp: number;
  realmIndex: number;
  hp: number;
  mp: number;
  linhKhi: number;
  inventory: Record<string, number>;
  equipment: Partial<Record<EquipSlot, string>>;
  /** Missing in saves from before skill upgrades; every skill then counts as level 1. */
  skills?: SkillLevels;
  dungeons?: DungeonRecord;
  /** Missing in saves from before social existed; those players start with no friends. */
  friends?: FriendRef[];
  /** Optional so saves made before the story/alchemy update remain playable. */
  immortal?: ImmortalProgress;
  life?: LifeProgress;
  adventure?: AdventureProgress;
  skillLoadout?: SkillId[];
}

export interface SaveData {
  v: number;
  player: PlayerSave;
  quests: QuestLog;
  mapId: string;
  pos: Vec2 | null;
  savedAt: number;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function serialize(data: Omit<SaveData, 'v' | 'savedAt'>): string {
  return JSON.stringify(snapshotOf(data));
}

function snapshotOf(data: Omit<SaveData, 'v' | 'savedAt'>): SaveData {
  return { ...data, v: SAVE_VERSION, savedAt: Date.now() };
}

/** Stores an already timestamped save, e.g. one pulled from the cloud. */
export function writeSnapshot(data: SaveData, store: StorageLike | null = storage()) {
  store?.setItem(saveKey(), JSON.stringify(data));
}

export function deserialize(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.v !== SAVE_VERSION || !data.player || typeof data.player.level !== 'number')
      return null;
    if (data.player.sex !== 'male' && data.player.sex !== 'female') data.player.sex = 'female';
    if (!isHeroId(data.player.heroId)) delete data.player.heroId;
    else data.player.sex = heroFor(data.player).sex;
    data.player.inventory ??= {};
    data.player.pkMode=parsePkMode(data.player.pkMode);
    data.player.equipment ??= {};
    const realmIndex = REALMS.findIndex((realm) => data.player.level <= realm.maxLevel);
    data.player.realmIndex = realmIndex < 0 ? REALMS.length - 1 : realmIndex;
    if (data.player.adventure)
      data.player.adventure.enhancements = Object.fromEntries(
        Object.entries(data.player.adventure.enhancements ?? {}).map(([id, n]) => [
          id,
          enhancementLevel(n),
        ]),
      );
    data.player = normalizeEquipment(data.player, ITEMS);
    return data;
  } catch {
    return null;
  }
}

export function loadGame(store: StorageLike | null = storage()): SaveData | null {
  return deserialize(store?.getItem(saveKey()) ?? null);
}

let savingDisabled = false;

/** Used before a reset + reload so the unload handler cannot write the old progress back. */
export function disableSaving() {
  savingDisabled = true;
}

export function saveGame(
  data: Omit<SaveData, 'v' | 'savedAt'>,
  store: StorageLike | null = storage(),
) {
  if (savingDisabled) return;
  const snapshot = snapshotOf(data);
  store?.setItem(saveKey(), JSON.stringify(snapshot));
  sink?.(snapshot);
}

export function clearSave(store: StorageLike | null = storage()) {
  store?.removeItem(saveKey());
}
