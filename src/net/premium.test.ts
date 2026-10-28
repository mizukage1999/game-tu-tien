import { beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ rpc: vi.fn(), select: vi.fn(), order: vi.fn(), limit: vi.fn() }));
vi.mock('./supabase', () => ({
  supabase: {
    rpc: fake.rpc,
    from: (table: string) => {
      expect(table).toBe('premium_ledger');
      return { select: fake.select };
    },
  },
}));
import {
  exchangePremium,
  premiumStore,
  refreshPremium,
  refreshPremiumHistory,
  resetPremium,
} from './premium';
beforeEach(() => {
  resetPremium();
  fake.rpc.mockReset();
  fake.select.mockReset().mockReturnValue({ order: fake.order });
  fake.order.mockReset().mockReturnValue({ limit: fake.limit });
  fake.limit.mockReset();
});
it('reads only real ledger rows and clears private wallet history on account reset', async () => {
  fake.limit.mockResolvedValue({
    data: [
      { id: 1, delta: 500, reason: 'Giao dịch đã xác nhận', created_at: '2026-10-27T15:00:00Z' },
      { id: 2, delta: -200, reason: 'Đổi Thiên Ngọc Tiên Ấn', created_at: '2026-10-27T15:10:00Z' },
      { id: 3, delta: 'broken', reason: 'bad', created_at: 'not-a-date' },
    ],
    error: null,
  });
  await refreshPremiumHistory();
  expect(fake.select).toHaveBeenCalledWith('id,delta,reason,created_at');
  expect(fake.order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(fake.limit).toHaveBeenCalledWith(50);
  expect(premiumStore.getState().ledger.map((r) => r.delta)).toEqual([500, -200]);
  expect(premiumStore.getState().balance).toBe(0);
  resetPremium();
  expect(premiumStore.getState()).toMatchObject({ ledger: [], ledgerLoaded: false, loaded: false });
});
it('ignores an old account ledger response after reset', async () => {
  let resolve!: (v: unknown) => void;
  fake.limit.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const pending = refreshPremiumHistory();
  resetPremium();
  resolve({
    data: [{ id: 1, delta: 999, reason: 'old account', created_at: '2026-10-27T15:00:00Z' }],
    error: null,
  });
  await pending;
  expect(premiumStore.getState()).toMatchObject({
    ledger: [],
    ledgerBusy: false,
    ledgerLoaded: false,
  });
});
it('handles malformed and rejected wallet/history responses without claiming a successful load', async () => {
  fake.rpc.mockResolvedValue({ data: null, error: null });
  await refreshPremium();
  expect(premiumStore.getState().loaded).toBe(false);
  expect(premiumStore.getState().error).toBeTruthy();
  fake.rpc.mockRejectedValue(new Error('network unavailable'));
  await refreshPremium();
  expect(premiumStore.getState().error).toContain('network unavailable');
  fake.limit.mockRejectedValue(new Error('ledger unavailable'));
  await refreshPremiumHistory();
  expect(premiumStore.getState()).toMatchObject({
    ledger: [],
    ledgerBusy: false,
    ledgerLoaded: false,
    ledgerError: 'ledger unavailable',
  });
});
it('waits for server confirmation and suppresses duplicate exchanges while a request is in flight', async () => {
  premiumStore.setState({ balance: 500, loaded: true });
  let resolve!: (v: unknown) => void;
  fake.rpc.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const pending = exchangePremium();
  expect(await exchangePremium()).toBe(false);
  expect(fake.rpc).toHaveBeenCalledTimes(1);
  expect(premiumStore.getState().balance).toBe(500);
  resolve({ data: { balance: 300, items: ['tien_phap_bao'], admin: false }, error: null });
  expect(await pending).toBe(true);
  expect(premiumStore.getState()).toMatchObject({
    balance: 300,
    items: ['tien_phap_bao'],
    busy: false,
  });
});
it('does not let an older balance refresh undo a confirmed exchange', async () => {
  let resolve!: (v: unknown) => void;
  fake.rpc.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const stale = refreshPremium();
  fake.rpc.mockResolvedValueOnce({ data: { balance: 300, items: ['tien_phap_bao'] }, error: null });
  expect(await exchangePremium()).toBe(true);
  resolve({ data: { balance: 500, items: [] }, error: null });
  await stale;
  expect(premiumStore.getState()).toMatchObject({ balance: 300, items: ['tien_phap_bao'] });
});
