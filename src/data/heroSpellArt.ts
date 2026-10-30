import { heroSpell, type HeroSkillId } from './heroSkills';
import type { HeroId } from './heroes';

export const SCHOOL_ART = '/assets/skills-schools-v2';
export const SCHOOL_SHEET_W = 1024;
export const SCHOOL_SHEET_H = 1536;
export const SPELL_FRAMES = 6;
/** Measured transparent gutters in the two reference sheets; shared by UI and runtime crops. */
const REFERENCE_ROW_EDGES: Partial<Record<HeroId, readonly number[]>> = {
  so_thien: [0, 132, 267, 405, 564, 728, 872, 1010, 1158, 1312, 1536],
  diep_ly: [0, 132, 275, 412, 569, 712, 881, 1013, 1152, 1322, 1536],
};
export function schoolSheet(hero: HeroId) {
  const legacy = hero === 'wang_lam';
  return {
    directory: legacy ? '/assets/skills-schools-v1' : SCHOOL_ART,
    width: SCHOOL_SHEET_W,
    height: SCHOOL_SHEET_H,
    frames: legacy ? 4 : 6,
    columns: legacy ? 5 : 6,
    rows: legacy ? 8 : 10,
    cell: legacy ? 192 : 144,
  };
}
export const spellAsset = (hero: HeroId) => `${schoolSheet(hero).directory}/${hero}.png`;
export const spellSource = (hero: HeroId) =>
  `school-spells-${hero === 'wang_lam' ? 'v1' : 'v2'}-source-${hero}`;
export const spellTexture = (hero: HeroId) =>
  `school-spells-${hero === 'wang_lam' ? 'v1' : 'v2'}-${hero}`;

/** V2 uses one skill per row and six phases; the retired Wang school keeps its legacy layout for basic attack art. */
export function spellCell(id: HeroSkillId, frame?: number): [number, number, number, number] {
  const art = heroSpell(id)!,
    sheet = schoolSheet(art.hero),
    col = art.col;
  const f = Math.max(
    0,
    Math.min(sheet.frames - 1, Math.floor(frame ?? (sheet.frames === 6 ? 3 : 2))),
  );
  if (sheet.frames === 6) {
    const edges = REFERENCE_ROW_EDGES[art.hero],
      top = edges?.[col] ?? (col * sheet.height) / 10,
      bottom = edges?.[col + 1] ?? ((col + 1) * sheet.height) / 10;
    return [(f * sheet.width) / 6, top, sheet.width / 6, bottom - top];
  }
  return [
    ((col % 5) * SCHOOL_SHEET_W) / 5,
    ((Math.floor(col / 5) * 4 + f) * SCHOOL_SHEET_H) / 8,
    SCHOOL_SHEET_W / 5,
    SCHOOL_SHEET_H / 8,
  ];
}
export function spellRuntimeCell(id: HeroSkillId, frame: number): [number, number, number, number] {
  const art = heroSpell(id)!,
    s = schoolSheet(art.hero);
  return s.frames === 6
    ? [frame * s.cell, art.col * s.cell, s.cell, s.cell]
    : [(art.col % 5) * s.cell, (Math.floor(art.col / 5) * 4 + frame) * s.cell, s.cell, s.cell];
}

/** Impact frame starts when damage resolves, identically in world, preview and arena. */
export function spellFrame(id: HeroSkillId, ageMs: number) {
  const { windupMs, duration, hero } = heroSpell(id)!;
  if (schoolSheet(hero).frames === 6)
    return ageMs < windupMs * 0.35
      ? 0
      : ageMs < windupMs * 0.8
        ? 1
        : ageMs < windupMs
          ? 2
          : ageMs < windupMs + (duration - windupMs) * 0.4
            ? 3
            : ageMs < windupMs + (duration - windupMs) * 0.75
              ? 4
              : 5;
  return ageMs < windupMs / 2
    ? 0
    : ageMs < windupMs
      ? 1
      : ageMs < windupMs + (duration - windupMs) / 2
        ? 2
        : 3;
}
