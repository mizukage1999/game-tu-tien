import { expect, it } from 'vitest';
import { newPlayer } from '../../store/gameStore';
import {
  personalRankingEntry,
  rankEntries,
  rankingPreviewEntries,
  rankingScore,
} from './rankingUi';
import { battlePower } from './adventure';
import { playerStats } from './progression';

it('uses the actual player stats and saved achievements without inventing untracked results', () => {
  const p = {
    ...newPlayer(),
    name: 'Đạo Hữu',
    admitted: true,
    level: 40,
    realmIndex: 3,
    equipment: { weapon: 'weapon_blue' },
    dungeons: { day: '2026-10-28', runs: {}, clears: { a: 3, b: 2 } },
  };
  const before = JSON.stringify(p),
    stats = playerStats(p),
    entry = personalRankingEntry(p, stats, {}, 'linh_son_tong');
  expect(entry.name).toBe('Đạo Hữu');
  expect(rankingScore(entry, 'power')).toBe(battlePower(stats));
  expect(rankingScore(entry, 'dungeons')).toBe(5);
  expect(rankingScore(entry, 'pets')).toBe(0);
  expect(rankingScore(entry, 'boss')).toBeUndefined();
  expect(rankingScore(entry, 'elements')).toBeUndefined();
  expect(JSON.stringify(p)).toBe(before);
});

it('keeps explicit preview data deterministic, separate, and searchable with Vietnamese names', () => {
  const entries = rankingPreviewEntries(),
    again = rankingPreviewEntries();
  expect(entries).toEqual(again);
  expect(new Set(entries.map((e) => e.id)).size).toBe(16);
  expect(entries.every((e) => e.id.startsWith('ranking:preview:'))).toBe(true);
  for (const category of [
    'power',
    'level',
    'realm',
    'sect',
    'dungeons',
    'pets',
    'boss',
    'elements',
  ] as const) {
    const rows = rankEntries(entries, category);
    expect(rows).toHaveLength(16);
    expect(rankingScore(rows[0], category)!).toBeGreaterThanOrEqual(
      rankingScore(rows[rows.length - 1], category)!,
    );
  }
  expect(rankEntries(entries, 'power', 'luc tran').map((e) => e.name)).toEqual(['Lục Trần']);
  const first = [...entries];
  rankEntries(entries, 'level');
  expect(entries).toEqual(first);
  const own = personalRankingEntry(newPlayer(), playerStats(newPlayer()), {}, 'vuong_gia_thon');
  expect(rankEntries([own], 'boss')).toEqual([]);
});
