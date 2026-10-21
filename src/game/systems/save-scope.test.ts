import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY,
  clearSave,
  loadGame,
  saveGame,
  saveKey,
  setSaveScope,
  setSaveSink,
  writeSnapshot,
  type SaveData,
} from './save';

function memoryStore() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

const payload = {
  mapId: 'dai_thua_vien',
  pos: null,
  quests: {},
  player: {
    name: 'Tuyết Kỳ',
    sex: 'female' as const,
    level: 4,
    exp: 12,
    realmIndex: 1,
    hp: 100,
    mp: 50,
    linhKhi: 7,
    inventory: {},
    equipment: {},
  },
};

afterEach(() => {
  setSaveScope(null);
  setSaveSink(null);
});

describe('save scope', () => {
  it('uses the bare key offline', () => {
    expect(saveKey()).toBe(SAVE_KEY);
  });

  it('gives every account its own key', () => {
    setSaveScope('user-a');
    expect(saveKey()).toBe(`${SAVE_KEY}:user-a`);
    const store = memoryStore();
    saveGame(payload, store);
    expect(store.map.has(`${SAVE_KEY}:user-a`)).toBe(true);

    setSaveScope('user-b');
    expect(loadGame(store)).toBeNull();

    setSaveScope('user-a');
    expect(loadGame(store)?.player.level).toBe(4);
  });

  it('clears only the current account', () => {
    const store = memoryStore();
    setSaveScope('user-a');
    saveGame(payload, store);
    setSaveScope('user-b');
    saveGame(payload, store);
    clearSave(store);
    expect(loadGame(store)).toBeNull();
    setSaveScope('user-a');
    expect(loadGame(store)).not.toBeNull();
  });
});

describe('cloud sink', () => {
  it('receives every snapshot with a timestamp', () => {
    const sink = vi.fn();
    setSaveSink(sink);
    const store = memoryStore();
    saveGame(payload, store);
    expect(sink).toHaveBeenCalledTimes(1);
    const snapshot = sink.mock.calls[0][0] as SaveData;
    expect(snapshot.v).toBe(1);
    expect(snapshot.player.name).toBe('Tuyết Kỳ');
    expect(snapshot.savedAt).toBeGreaterThan(0);
  });

  it('does not fire when saving is disabled for a reset', async () => {
    const { disableSaving } = await import('./save');
    const sink = vi.fn();
    setSaveSink(sink);
    disableSaving();
    saveGame(payload, memoryStore());
    expect(sink).not.toHaveBeenCalled();
  });

  it('writes a cloud snapshot without changing its timestamp', () => {
    const store = memoryStore();
    setSaveScope('user-a');
    const cloud: SaveData = { ...payload, v: 1, savedAt: 12345 } as SaveData;
    writeSnapshot(cloud, store);
    expect(loadGame(store)?.savedAt).toBe(12345);
  });
});
