import { expect, it } from 'vitest';
import { parseSkyRacePage } from './skyRace';
it('accepts server rankings but rejects invalid times, unbounded lists and a run from another week', () => {
  const row = { userId: 'a', name: 'Đạo Hữu', score: 45000, energy: 7, hits: 1 };
  const p = {
    week: '2026-10-26',
    seed: 1792947600,
    rows: [row],
    self: row,
    run: null,
    result: null,
  };
  expect(parseSkyRacePage(p)).not.toBeNull();
  expect(parseSkyRacePage({ ...p, rows: [{ ...row, score: -1 }] })).toBeNull();
  expect(parseSkyRacePage({ ...p, rows: Array(51).fill(row) })).toBeNull();
  expect(parseSkyRacePage({ ...p, run: { id: 'r', seed: p.seed + 1, week: p.week } })).toBeNull();
});
