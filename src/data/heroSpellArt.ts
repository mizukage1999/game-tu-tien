import { heroSpell, type HeroSkillId } from './heroSkills';
import type { HeroId } from './heroes';

export const SCHOOL_ART = '/assets/skills-schools-v1';
export const SCHOOL_SHEET_W = 1024;
export const SCHOOL_SHEET_H = 1536;
export const SPELL_FRAMES = 4;
export const spellSource = (hero: HeroId) => `school-spells-v1-source-${hero}`;
export const spellTexture = (hero: HeroId) => `school-spells-v1-${hero}`;

/** Two groups of five spells; each group occupies four consecutive animation rows. */
export function spellCell(id: HeroSkillId, frame = 2): [number, number, number, number] {
  const col = heroSpell(id)!.col;
  return [
    ((col % 5) * SCHOOL_SHEET_W) / 5,
    ((Math.floor(col / 5) * 4 + Math.max(0, Math.min(3, Math.floor(frame)))) * SCHOOL_SHEET_H) / 8,
    SCHOOL_SHEET_W / 5,
    SCHOOL_SHEET_H / 8,
  ];
}

/** Impact frame starts when damage resolves, identically in world, preview and arena. */
export function spellFrame(id: HeroSkillId, ageMs: number) {
  const { windupMs, duration } = heroSpell(id)!;
  return ageMs < windupMs / 2
    ? 0
    : ageMs < windupMs
      ? 1
      : ageMs < windupMs + (duration - windupMs) / 2
        ? 2
        : 3;
}
