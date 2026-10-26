import { expect, it } from 'vitest';
import { newPlayer } from '../../store/gameStore';
import { journeyQuestState, journeyStages } from './journey';
import { storyOrder } from './immortal';

it('presents the whole real story once, in order, from the village to the wider world', () => {
  const p = { ...newPlayer(), origin: 'vuong_gia_thon' as const, admitted: false };
  const stages = journeyStages(p),
    ids = stages.flatMap((s) => s.ids);
  expect(stages).toHaveLength(8);
  expect(stages[0].name).toBe('Vương Gia Thôn');
  expect(ids).toEqual(storyOrder(p));
  expect(new Set(ids).size).toBe(ids.length);
  expect(journeyStages(newPlayer()).flatMap((s) => s.ids)).toEqual(storyOrder(newPlayer()));
});
it('unlocks a task only after the actual prerequisite is done, and respects childhood', () => {
  const p = { ...newPlayer(), origin: 'vuong_gia_thon' as const, admitted: false };
  expect(journeyQuestState('village_1', {}, p)).toBe('locked');
  expect(
    journeyQuestState('village_1', { village_0: { status: 'ready', progress: [1, 1] } }, p),
  ).toBe('locked');
  expect(
    journeyQuestState('village_1', { village_0: { status: 'done', progress: [1, 1] } }, p),
  ).toBe('available');
  expect(journeyQuestState('main_0', {}, p)).toBe('locked');
  expect(journeyQuestState('main_0', {}, { ...p, admitted: true })).toBe('available');
});
