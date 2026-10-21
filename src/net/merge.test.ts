import { describe, expect, it } from 'vitest';
import type { SaveData } from '../game/systems/save';
import { pickNewer } from './merge';

function save(savedAt: number, level: number): SaveData {
  return {
    v: 1,
    savedAt,
    mapId: 'dai_thua_vien',
    pos: null,
    quests: {},
    player: {
      name: 'Test',
      level,
      exp: 0,
      realmIndex: 0,
      hp: 1,
      mp: 1,
      linhKhi: 0,
      inventory: {},
      equipment: {},
    },
  } as SaveData;
}

describe('pickNewer', () => {
  it('returns the cloud save when it is newer', () => {
    const local = save(1000, 3);
    const cloud = save(2000, 5);
    expect(pickNewer(local, cloud)).toBe(cloud);
  });

  it('keeps the local save when it is newer', () => {
    const local = save(3000, 7);
    const cloud = save(2000, 5);
    expect(pickNewer(local, cloud)).toBe(local);
  });

  it('prefers local on a tie so a flaky sync never reverts progress', () => {
    const local = save(1000, 3);
    const cloud = save(1000, 9);
    expect(pickNewer(local, cloud)).toBe(local);
  });

  it('handles a missing side', () => {
    const local = save(1000, 3);
    expect(pickNewer(null, local)).toBe(local);
    expect(pickNewer(local, null)).toBe(local);
    expect(pickNewer(null, null)).toBeNull();
  });
});
