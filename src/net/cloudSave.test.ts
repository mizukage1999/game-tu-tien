import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SaveData } from '../game/systems/save';
const fake = vi.hoisted(() => ({
  instance: 'instance-a' as string | null,
  sink: null as ((s: SaveData) => void) | null,
  rpc: vi.fn(),
  account: vi.fn(),
  write: vi.fn(),
  maybe: vi.fn(),
}));
vi.mock('./supabase', () => ({
  supabase: {
    rpc: fake.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: fake.maybe }) }) }),
  },
}));
vi.mock('./activeSession', () => ({ activeSessionId: () => fake.instance }));
vi.mock('./session', () => ({ setAccountState: fake.account }));
vi.mock('../game/systems/save', () => ({
  setSaveSink: (s: typeof fake.sink) => {
    fake.sink = s;
  },
  loadGame: () => null,
  writeSnapshot: fake.write,
}));
import { attachCloudSync, detachCloudSync, hydrateFromCloud, deleteCloudSave } from './cloudSave';
beforeEach(() => {
  fake.instance = 'instance-a';
  fake.rpc.mockReset().mockResolvedValue({ data: true, error: null });
  fake.account.mockClear();
  fake.write.mockClear();
  attachCloudSync('user');
});
afterEach(() => detachCloudSync());
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

it('sends the owning instance on every cloud write and reset', async () => {
  const data = { savedAt: 1 } as SaveData;
  fake.sink!(data);
  await settle();
  expect(fake.rpc).toHaveBeenCalledWith('save_game_snapshot', {
    p_instance_id: 'instance-a',
    p_snapshot: data,
  });
  await deleteCloudSave('user');
  expect(fake.rpc).toHaveBeenCalledWith('delete_game_snapshot', { p_instance_id: 'instance-a' });
});
it('drops queued old saves and ignores a stale response after eviction', async () => {
  let resolve!: (r: { error: null }) => void;
  fake.rpc.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  fake.sink!({ savedAt: 1 } as SaveData);
  fake.sink!({ savedAt: 2 } as SaveData);
  fake.instance = null;
  detachCloudSync();
  fake.account.mockClear();
  resolve({ error: null });
  await settle();
  expect(fake.rpc).toHaveBeenCalledTimes(1);
  expect(fake.account).not.toHaveBeenCalled();
});
it('does not reset or upload progress without a live lease', async () => {
  fake.instance = null;
  fake.sink!({ savedAt: 1 } as SaveData);
  await deleteCloudSave('user');
  await settle();
  expect(fake.rpc).not.toHaveBeenCalled();
});
it('does not hydrate a save that arrives after the player has been logged out', async () => {
  let resolve!: (r: { data: { data: SaveData }; error: null }) => void;
  fake.maybe.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const hydration = hydrateFromCloud('user');
  fake.instance = null;
  detachCloudSync();
  resolve({ data: { data: { savedAt: 3 } as SaveData }, error: null });
  await hydration;
  expect(fake.write).not.toHaveBeenCalled();
});
