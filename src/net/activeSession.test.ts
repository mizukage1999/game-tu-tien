// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ owner: '', rpc: vi.fn(), remove: vi.fn(), signOut: vi.fn() }));
vi.mock('./supabase', () => ({
  supabase: {
    rpc: fake.rpc,
    auth: { signOut: fake.signOut },
    removeChannel: fake.remove,
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch };
      return ch;
    },
  },
}));
import { activateSession, activeSessionId, stopActiveSession } from './activeSession';
afterEach(() => {
  stopActiveSession();
  vi.useRealTimers();
});
it('reuses the active claim for auth refreshes instead of kicking the newer login back out', async () => {
  fake.rpc.mockImplementation(async (name: string, args: { p_instance_id: string }) => {
    if (name === 'claim_game_session') fake.owner = args.p_instance_id;
    return { data: fake.owner === args.p_instance_id, error: null };
  });
  const replaced = vi.fn();
  await activateSession('user', replaced);
  const id = activeSessionId('user');
  await activateSession('user', replaced);
  await activateSession('user', replaced);
  expect(activeSessionId('user')).toBe(id);
  expect(fake.rpc.mock.calls.filter((c) => c[0] === 'claim_game_session')).toHaveLength(1);
  expect(replaced).not.toHaveBeenCalled();
  // Another device has claimed the row. Only the old local instance disappears.
  fake.owner = 'another-device';
  window.dispatchEvent(new Event('focus'));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(activeSessionId('user')).toBeNull();
  expect(replaced).toHaveBeenCalledOnce();
  expect(fake.signOut).not.toHaveBeenCalled();
  // A token-refresh callback cannot reclaim the revoked instance.
  await activateSession('user', replaced);
  expect(fake.rpc.mock.calls.filter((c) => c[0] === 'claim_game_session')).toHaveLength(1);
});
