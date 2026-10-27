import { expect, it } from 'vitest';
import {
  beginGameBoot,
  BOOT_GUARD_KEY,
  CANVAS_RECOVERY_KEY,
  consumeBootRetry,
  finishGameBoot,
  requestCanvasRecovery,
} from './gameBoot';
import { startupDensity } from './display';
import { mapMonsterArt, monsterSheets } from './mapAssetPlan';
import { getMap, MAP_IDS } from '../maps';
import { DUNGEONS, MONSTERS } from '../../data';
import { BESTIARY_SHEETS } from '../../data/bestiary';

function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
it('recovers successive interrupted boots while stable entry and expired guards start normally', () => {
  const s = storage();
  s.setItem('character', 'keep');
  expect(beginGameBoot(s, 1000)).toBe(0);
  expect(beginGameBoot(s, 2000)).toBe(1);
  expect(beginGameBoot(s, 3000)).toBe(2);
  finishGameBoot(s);
  expect(beginGameBoot(s, 4000)).toBe(0);
  expect(beginGameBoot(s, 400_000)).toBe(0);
  expect(s.getItem('character')).toBe('keep');
  s.setItem(BOOT_GUARD_KEY, '{corrupt');
  expect(beginGameBoot(s)).toBe(0);
});
it('explicit recovery survives reload, skips the start screen once and never edits character storage', () => {
  const s = storage();
  s.setItem('character', 'keep');
  requestCanvasRecovery(s);
  expect(consumeBootRetry(s)).toBe(true);
  expect(consumeBootRetry(s)).toBe(false);
  expect(beginGameBoot(s)).toBe(2);
  finishGameBoot(s);
  expect(s.getItem(CANVAS_RECOVERY_KEY)).toBe('1');
  expect(s.getItem('character')).toBe('keep');
  const blocked = {
    getItem: () => {
      throw Error('blocked');
    },
    setItem: () => {
      throw Error('blocked');
    },
    removeItem: () => {
      throw Error('blocked');
    },
  };
  expect(beginGameBoot(blocked)).toBe(0);
  expect(() => finishGameBoot(blocked)).not.toThrow();
});
it('keeps high-end Retina sharp while bounding low-memory, recovery and GPU-limited buffers', () => {
  expect(startupDensity(844, 390, 3, 'sharp', { mobile: true, mode: 0, memory: 8 })).toBe(3);
  expect(startupDensity(844, 390, 3, 'sharp', { mobile: true, mode: 0, memory: 4 })).toBe(2);
  expect(startupDensity(844, 390, 3, 'sharp', { mobile: true, mode: 0, memory: 2 })).toBe(1.5);
  expect(startupDensity(844, 390, 3, 'sharp', { mobile: true, mode: 2 })).toBe(1);
  expect(startupDensity(844, 390, 3, 'light', { mobile: true, mode: 0, memory: 4 })).toBe(1);
  expect(
    startupDensity(1200, 800, 3, 'sharp', { mobile: true, mode: 0, maxEdge: 2048 }) * 1200,
  ).toBeLessThanOrEqual(2048);
});
it('plans only the field bestiary and includes every wave/boss across all dungeon difficulties', () => {
  expect(monsterSheets(mapMonsterArt(getMap('vuong_gia_thon')))).toHaveLength(0);
  const field = monsterSheets(mapMonsterArt(getMap('rung_linh_thu')));
  expect(field.length).toBeGreaterThan(0);
  expect(field.length).toBeLessThan(BESTIARY_SHEETS.length);
  for (const id of MAP_IDS) {
    const map = getMap(id),
      arts = mapMonsterArt(map);
    for (const spawn of map.monsters) expect(arts.has(MONSTERS[spawn.type].art)).toBe(true);
  }
  for (const dungeon of Object.values(DUNGEONS)) {
    const arts = mapMonsterArt(getMap(dungeon.map));
    expect(arts.has(MONSTERS[dungeon.boss].art)).toBe(true);
    for (const wave of dungeon.waves)
      for (const spawn of wave) expect(arts.has(MONSTERS[spawn.type].art)).toBe(true);
  }
});
