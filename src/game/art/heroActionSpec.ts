import type { AnimDef } from './generate';
import type { SkillId } from '../../data';
import { heroSpell } from '../../data/heroSkills';
import type Phaser from 'phaser';

export const HERO_ACTION_SOURCES = [
  'idle-hurt',
  'attack',
  'fast',
  'strong',
  'ultimate',
  'death',
  'power-extra',
] as const;
export type HeroActionSource = (typeof HERO_ACTION_SOURCES)[number];
export type HeroHand = readonly [number, number, number, number];
export interface HeroBodyPose {
  action: string;
  hand?: HeroHand;
}
export function heroBodyPose(frame: Phaser.Textures.Frame): HeroBodyPose | undefined {
  const data = frame.customData as {
    heroAuthored?: boolean;
    heroAction?: string;
    heroHand?: HeroHand;
  };
  return data.heroAuthored && data.heroAction
    ? { action: data.heroAction, hand: data.heroHand }
    : undefined;
}
export interface HeroActionFrame {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
  hand?: HeroHand;
}
export interface HeroActionAtlas {
  pages: { url: string; width: number; height: number }[];
  frames: Record<string, HeroActionFrame>;
}
export interface HeroActionDef extends AnimDef {
  source: 'idle' | 'hurt' | 'downed' | 'attack' | 'skill_fast' | 'skill_strong' | 'skill_ultimate';
  durations?: readonly number[];
  poses?: readonly number[];
}
// Phaser frame durations are absolute milliseconds. Preserve old 125ms basic impact,
// 375ms basic recovery, 428.57ms spell lock and the spell VFX's independent timeline.
const strike = {
  frames: 8,
  frameRate: 24,
  repeat: 0,
  hitFrame: 3,
  durations: [125 / 3, 125 / 3, 125 / 3, 50, 50, 50, 50, 50],
} as const;
const cast = {
  frames: 8,
  frameRate: 21,
  repeat: 0,
  hitFrame: 3,
  durations: [1000 / 21, 1000 / 21, 1000 / 21, 400 / 7, 400 / 7, 400 / 7, 400 / 7, 400 / 7],
} as const;
const power = {
  frames: 12,
  frameRate: 35,
  repeat: 0,
  hitFrame: 5,
  poses: [0, 8, 1, 2, 9, 3, 4, 10, 5, 6, 11, 7],
  durations: [...Array<number>(5).fill(1000 / 35), ...Array<number>(7).fill(2000 / 49)],
} as const;
export const HERO_ACTIONS: Record<string, HeroActionDef> = {
  idle: { source: 'idle', frames: 4, frameRate: 3, repeat: -1 },
  attack: { source: 'attack', ...strike },
  attack_1: { source: 'attack', ...strike },
  attack_2: { source: 'attack', ...strike },
  attack_3: { source: 'attack', ...strike },
  cast: { source: 'skill_fast', ...cast },
  skill_fast: { source: 'skill_fast', ...cast },
  skill_strong: { source: 'skill_strong', ...power },
  skill_ultimate: { source: 'skill_ultimate', ...power },
  hurt: { source: 'hurt', frames: 4, frameRate: 18, repeat: 0 },
  downed: { source: 'downed', frames: 8, frameRate: 12, repeat: 0 },
};

/** Identical selection for local, remote and arena actors; VFX/damage remain skill-owned. */
export function heroSkillBody(id: SkillId): 'skill_fast' | 'skill_strong' | 'skill_ultimate' {
  if (id === 'dao_hoa_hoang_tuyen' || id === 'luyen_hon_thuat') return 'skill_ultimate';
  if (id === 'dich_linh_an' || id === 'tich_diet_chi' || id === 'tram_la_quyet')
    return 'skill_strong';
  const spell = heroSpell(id);
  if (spell && (spell.col === 4 || spell.col >= 8)) return 'skill_ultimate';
  if (spell && (spell.shape === 'circle' || spell.motion === 'eruption' || spell.col >= 5))
    return 'skill_strong';
  return 'skill_fast';
}

// Per Animation instance, not a mutable global rig: loading art cannot move an in-flight hit.
const definitions = new WeakMap<object, HeroActionDef>();
export function setHeroAnimationDefinition(animation: object, def: HeroActionDef) {
  definitions.set(animation, def);
}
export function heroAnimationDefinition(animation?: object | null) {
  return animation ? definitions.get(animation) : undefined;
}
