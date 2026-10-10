import type { EquipSlot } from '../../data';
import type { QuestLog } from './quest';
import type { DungeonRecord } from './dungeon';
import type { SkillLevels } from './skills';
import type { Vec2 } from '../types';

export const SAVE_KEY = 'tu-tien-demo-save';
const SAVE_VERSION = 1;

export type Sex = 'female' | 'male';

export interface PlayerSave {
  name: string;
  /** Missing on saves from before character creation; those keep the original look. */
  sex?: Sex;
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
  return JSON.stringify({ ...data, v: SAVE_VERSION, savedAt: Date.now() });
}

export function deserialize(raw: string | null): SaveData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.v !== SAVE_VERSION || !data.player || typeof data.player.level !== 'number') return null;
    if (data.player.sex !== 'male' && data.player.sex !== 'female') data.player.sex = 'female';
    return data;
  } catch {
    return null;
  }
}

export function loadGame(store: StorageLike | null = storage()): SaveData | null {
  return deserialize(store?.getItem(SAVE_KEY) ?? null);
}

let savingDisabled = false;

/** Used before a reset + reload so the unload handler cannot write the old progress back. */
export function disableSaving() {
  savingDisabled = true;
}

export function saveGame(data: Omit<SaveData, 'v' | 'savedAt'>, store: StorageLike | null = storage()) {
  if (savingDisabled) return;
  store?.setItem(SAVE_KEY, serialize(data));
}

export function clearSave(store: StorageLike | null = storage()) {
  store?.removeItem(SAVE_KEY);
}
