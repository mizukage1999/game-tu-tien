import { expect, it } from 'vitest';
import { HERO_ACTIONS, heroSkillBody } from './heroActionSpec';
import manifest from '../../data/heroActionAssets.json';
import { HERO_DIRECTIONS } from './heroDirections';
import type { HeroActionAtlas } from './heroActionSpec';

it('adds true separate poses while preserving basic impact/recovery and spell lock timing', () => {
  for (const name of ['attack', 'attack_1', 'attack_2', 'attack_3']) {
    const def = HERO_ACTIONS[name],
      durations = def.durations!;
    expect(durations.slice(0, def.hitFrame).reduce((a, b) => a + b, 0)).toBeCloseTo(125);
    expect(durations.reduce((a, b) => a + b, 0)).toBeCloseTo(375);
  }
  for (const name of ['cast', 'skill_fast', 'skill_strong', 'skill_ultimate']) {
    const def = HERO_ACTIONS[name],
      durations = def.durations!;
    expect(durations.slice(0, def.hitFrame).reduce((a, b) => a + b, 0)).toBeCloseTo(1000 / 7);
    expect(durations.reduce((a, b) => a + b, 0)).toBeCloseTo(3000 / 7);
    expect(new Set(def.poses ?? Array.from({ length: def.frames }, (_, i) => i)).size).toBe(
      def.frames,
    );
  }
  expect(HERO_ACTIONS.skill_fast.frames).toBe(8);
  expect(HERO_ACTIONS.skill_strong.frames).toBe(12);
  expect(HERO_ACTIONS.skill_ultimate.frames).toBe(12);
});
it('every shipped school includes all eight directions and complete trimmed source frames', () => {
  const atlases = Object.values(manifest) as unknown as HeroActionAtlas[];
  expect(atlases).toHaveLength(8);
  for (const atlas of atlases) {
    expect(atlas.pages.every((p) => p.width <= 1024 && p.height <= 1024)).toBe(true);
    expect(Object.keys(atlas.frames)).toHaveLength(448);
    for (const def of Object.values(HERO_ACTIONS))
      for (const dir of HERO_DIRECTIONS) {
        const frames = Array.from(
          { length: def.frames },
          (_, i) => atlas.frames[def.source + '_' + dir + '_' + (def.poses?.[i] ?? i)],
        );
        expect(frames.every(Boolean)).toBe(true);
        expect(new Set(frames.map((f) => f.page + ',' + f.x + ',' + f.y)).size).toBe(def.frames);
        for (const f of frames) {
          expect(f.ox + f.w).toBeLessThanOrEqual(160);
          expect(f.oy + f.h).toBeLessThanOrEqual(160);
          expect(f.x + f.w).toBeLessThanOrEqual(atlas.pages[f.page].width);
          expect(f.y + f.h).toBeLessThanOrEqual(atlas.pages[f.page].height);
        }
      }
    for (const dir of HERO_DIRECTIONS)
      expect(atlas.frames['downed_' + dir + '_7'].h).toBeLessThan(
        atlas.frames['downed_' + dir + '_0'].h,
      );
  }
});
it('selects the same skill body clip for local and remote attacks', () => {
  expect(heroSkillBody('hoa_ma_chi')).toBe('skill_fast');
  expect(heroSkillBody('dinh_than_thuat')).toBe('skill_fast');
  expect(heroSkillBody('tram_la_quyet')).toBe('skill_strong');
  expect(heroSkillBody('dao_hoa_hoang_tuyen')).toBe('skill_ultimate');
  expect(heroSkillBody('luyen_hon_thuat')).toBe('skill_ultimate');
});
