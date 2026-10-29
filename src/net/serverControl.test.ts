import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ rpc: vi.fn(), emit: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { rpc: fake.rpc } }));
vi.mock('../game/EventBus', () => ({ EventBus: { emit: fake.emit } }));
import { watchServerControl, serverControlStore } from './serverControl';
const normal = {
  maintenance: false,
  maintenance_at: null,
  admin: false,
  blocked: false,
  message: '',
  boss_resets: [],
};
let stop: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  fake.rpc.mockReset().mockResolvedValue({ data: normal, error: null });
  fake.emit.mockClear();
  serverControlStore.setState(normal);
});
afterEach(() => {
  stop?.();
  vi.useRealTimers();
});
it('applies a first/new boss reset once, without replaying historical commands on entry', async () => {
  const block = vi.fn();
  stop = watchServerControl(() => 'map', block);
  await vi.advanceTimersByTimeAsync(1);
  fake.rpc.mockResolvedValue({
    data: { ...normal, boss_resets: [{ map_id: 'map', monster_id: 'boss', revision: 1 }] },
    error: null,
  });
  await vi.advanceTimersByTimeAsync(2000);
  expect(fake.emit).toHaveBeenCalledWith('cmd:adminBossReset', { map: 'map', monster: 'boss' });
  await vi.advanceTimersByTimeAsync(2000);
  expect(fake.emit).toHaveBeenCalledTimes(1);
  expect(block).not.toHaveBeenCalled();
});
it('gates ordinary players during maintenance while admins can stay', async () => {
  const blocked = vi.fn();
  fake.rpc.mockResolvedValue({
    data: { ...normal, maintenance: true, message: 'Bảo trì' },
    error: null,
  });
  stop = watchServerControl(() => '', blocked);
  await vi.advanceTimersByTimeAsync(1);
  expect(blocked).toHaveBeenCalledOnce();
  stop();
  fake.rpc.mockResolvedValue({ data: { ...normal, maintenance: true, admin: true }, error: null });
  blocked.mockClear();
  stop = watchServerControl(() => '', blocked);
  await vi.advanceTimersByTimeAsync(1);
  expect(blocked).not.toHaveBeenCalled();
});
it('does not treat lost network as a maintenance or account ban', async () => {
  const blocked = vi.fn();
  fake.rpc.mockRejectedValue(new Error('offline'));
  stop = watchServerControl(() => '', blocked);
  await vi.advanceTimersByTimeAsync(4001);
  expect(blocked).not.toHaveBeenCalled();
});
it('keeps players in game during the announcement period and blocks only at the deadline', async () => {
  const blocked = vi.fn();
  const maintenance_at = new Date(Date.now() + 60000).toISOString();
  fake.rpc.mockResolvedValue({
    data: { ...normal, maintenance: true, maintenance_at, message: 'Lưu tiến trình trước bảo trì' },
    error: null,
  });
  stop = watchServerControl(() => '', blocked);
  await vi.advanceTimersByTimeAsync(58000);
  expect(blocked).not.toHaveBeenCalled();
  expect(serverControlStore.getState().maintenance_at).toBe(maintenance_at);
  await vi.advanceTimersByTimeAsync(2001);
  expect(blocked).toHaveBeenCalledOnce();
});
it('ignores a control response after the account watcher has stopped', async () => {
  let resolve!: (r: unknown) => void;
  fake.rpc.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const blocked = vi.fn();
  stop = watchServerControl(() => '', blocked);
  stop();
  resolve({ data: { ...normal, blocked: true }, error: null });
  await vi.advanceTimersByTimeAsync(1);
  expect(blocked).not.toHaveBeenCalled();
  expect(serverControlStore.getState().blocked).toBe(false);
});
