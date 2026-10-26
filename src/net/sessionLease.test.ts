import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionLease, type LeaseBackend, type LeaseResult } from './sessionLease';

function server() {
  const owners = new Map<string, string>();
  const watchers = new Map<string, Set<() => void>>();
  const backend = (user: string): LeaseBackend => ({
    claim: vi.fn(async (instance) => {
      owners.set(user, instance);
      for (const fn of watchers.get(user) ?? []) fn();
      return { data: true, error: null };
    }),
    check: vi.fn(async (instance) => ({ data: owners.get(user) === instance, error: null })),
    watch(fn) {
      const set = watchers.get(user) ?? new Set();
      set.add(fn);
      watchers.set(user, set);
      return () => {
        set.delete(fn);
      };
    },
  });
  return { owners, backend };
}
afterEach(() => vi.useRealTimers());
describe('one active game session per account', () => {
  it('evicts the earlier instance and keeps the later login alive across different maps/devices', async () => {
    const s = server(),
      oldLost = vi.fn(),
      newLost = vi.fn();
    const old = new SessionLease('map-a-phone', s.backend('user'), oldLost);
    const latest = new SessionLease('map-b-pc', s.backend('user'), newLost);
    await old.start();
    await latest.start();
    expect(old.active).toBe(false);
    expect(oldLost).toHaveBeenCalledOnce();
    expect(latest.active).toBe(true);
    expect(newLost).not.toHaveBeenCalled();
    latest.stop();
  });
  it('allows different accounts to keep playing simultaneously', async () => {
    const s = server(),
      lost = vi.fn();
    const a = new SessionLease('a', s.backend('alice'), lost),
      b = new SessionLease('b', s.backend('bob'), lost);
    await a.start();
    await b.start();
    await a.verify();
    expect(a.active && b.active).toBe(true);
    expect(lost).not.toHaveBeenCalled();
    a.stop();
    b.stop();
  });
  it('detects takeover within a heartbeat even if the Realtime notice is lost', async () => {
    vi.useFakeTimers();
    const s = server(),
      lost = vi.fn(),
      backend = s.backend('user');
    backend.watch = () => () => {};
    const lease = new SessionLease('old', backend, lost);
    await lease.start();
    s.owners.set('user', 'new');
    await vi.advanceTimersByTimeAsync(1500);
    expect(lease.active).toBe(false);
    expect(lost).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(6000);
    expect(lost).toHaveBeenCalledOnce();
  });
  it('fails closed if the server migration is absent or a claim fails', async () => {
    const backend = server().backend('user');
    backend.claim = async () => ({ data: null, error: { message: 'RPC not installed' } });
    const lease = new SessionLease('old', backend, vi.fn());
    await expect(lease.start()).rejects.toThrow('RPC not installed');
    expect(lease.active).toBe(false);
    lease.stop();
  });
  it('retries transient errors without treating disconnection as another login', async () => {
    const s = server(),
      lost = vi.fn(),
      backend = s.backend('user');
    const lease = new SessionLease('old', backend, lost);
    await lease.start();
    backend.check = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ data: false, error: null });
    await lease.verify();
    await lease.verify();
    expect(lease.active).toBe(true);
    expect(lost).not.toHaveBeenCalled();
    await lease.verify();
    expect(lost).toHaveBeenCalledOnce();
  });
  it('does not deliver a late rejection after the instance was already stopped', async () => {
    const s = server(),
      backend = s.backend('user'),
      lost = vi.fn();
    const lease = new SessionLease('old', backend, lost);
    await lease.start();
    let resolve!: (r: LeaseResult) => void;
    backend.check = vi.fn(
      () =>
        new Promise<LeaseResult>((r) => {
          resolve = r;
        }),
    );
    const first = lease.verify();
    await lease.verify();
    expect(backend.check).toHaveBeenCalledOnce();
    lease.stop();
    resolve({ data: false, error: null });
    await first;
    expect(lost).not.toHaveBeenCalled();
  });
  it('does not start watchers when a pending claim completes after shutdown', async () => {
    const backend = server().backend('user');
    let resolve!: (r: LeaseResult) => void;
    backend.claim = () =>
      new Promise((r) => {
        resolve = r;
      });
    backend.watch = vi.fn(() => () => {});
    const lease = new SessionLease('old', backend, vi.fn()),
      start = lease.start();
    lease.stop();
    resolve({ data: true, error: null });
    expect(await start).toBe(false);
    expect(backend.watch).not.toHaveBeenCalled();
  });
});
