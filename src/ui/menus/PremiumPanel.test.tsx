// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ rpc: vi.fn(), limit: vi.fn(), balance: 500, owned: false }));
vi.mock('../../net/supabase', () => ({
  supabase: {
    rpc: fake.rpc,
    from: () => ({ select: () => ({ order: () => ({ limit: fake.limit }) }) }),
  },
}));
vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/${id}.png` }));
import { PremiumPanel } from './PremiumPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { playerStats } from '../../game/systems/progression';
import { getAccountState, setAccountState } from '../../net/session';
import { premiumStore, resetPremium } from '../../net/premium';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement,
  root: Root,
  previous: ReturnType<typeof gameStore.getState>,
  account: ReturnType<typeof getAccountState>;
const click = async (selector: string) => {
  await act(async () => {
    host.querySelector<HTMLButtonElement>(selector)!.click();
  });
};
beforeEach(async () => {
  previous = gameStore.getState();
  account = getAccountState();
  resetPremium();
  fake.balance = 500;
  fake.owned = false;
  fake.rpc.mockReset().mockImplementation(async (name: string) => {
    if (name === 'exchange_tien_ngoc') {
      fake.balance -= 200;
      fake.owned = true;
    }
    return {
      data: { balance: fake.balance, items: fake.owned ? ['tien_phap_bao'] : [], admin: false },
      error: null,
    };
  });
  fake.limit.mockReset().mockResolvedValue({ data: [], error: null });
  const player = { ...newPlayer(), admitted: true, level: 20 };
  gameStore.setState({ player, stats: playerStats(player), menu: 'premium' });
  setAccountState({
    user: {
      id: 'jade-user',
      user_metadata: { username: 'jade' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-10-27T15:00:00Z',
    } as User,
  });
  host = document.createElement('div');
  root = createRoot(host);
  await act(async () => root.render(<PremiumPanel />));
});
afterEach(() => {
  act(() => root.unmount());
  gameStore.setState(previous);
  setAccountState(account);
  resetPremium();
});
it('previews all packs, monthly cards and future products without creating currency or granting anything', async () => {
  const before = gameStore.getState().player;
  expect(host.querySelector('[data-jade-balance]')!.textContent).toBe('500');
  await click('[data-jade-page=topup]');
  expect(host.querySelectorAll('.jade-pack')).toHaveLength(8);
  expect(
    [...host.querySelectorAll<HTMLButtonElement>('.jade-pack button')].every((b) => b.disabled),
  ).toBe(true);
  await click('[data-jade-topup=month]');
  expect(host.querySelectorAll('.jade-month')).toHaveLength(2);
  expect(
    [...host.querySelectorAll<HTMLButtonElement>('.jade-month button')].every((b) => b.disabled),
  ).toBe(true);
  await click('[data-jade-page=shop]');
  await click('[data-jade-group=outfit]');
  expect(host.querySelector<HTMLButtonElement>('[data-action=exchange-jade]')!.disabled).toBe(true);
  expect(fake.rpc.mock.calls.some((c) => c[0] === 'exchange_tien_ngoc')).toBe(false);
  expect(premiumStore.getState().balance).toBe(500);
  expect(gameStore.getState().player).toBe(before);
  expect(host.querySelector('[data-jade-page=admin]')).toBeNull();
});
it('exchanges the real entitlement through the server once and synchronizes the confirmed inventory', async () => {
  await click('[data-jade-page=shop]');
  await click('[data-action=exchange-jade]');
  expect(fake.rpc.mock.calls.filter((c) => c[0] === 'exchange_tien_ngoc')).toHaveLength(1);
  expect(premiumStore.getState().balance).toBe(300);
  expect(gameStore.getState().player.inventory.tien_phap_bao).toBe(1);
  expect(host.querySelector<HTMLButtonElement>('[data-action=exchange-jade]')!.disabled).toBe(true);
  expect(host.querySelector('[role=status]')!.textContent).toContain('Đã đổi');
});
it('displays account ledger rows and links to stall drafts without inventing sales proceeds', async () => {
  fake.limit.mockResolvedValue({
    data: [
      {
        id: 9,
        delta: -200,
        reason: 'Đổi pháp bảo đã xác nhận',
        created_at: '2026-10-27T15:10:00Z',
      },
    ],
    error: null,
  });
  await click('[data-jade-page=history]');
  expect(host.querySelector('tbody')!.textContent).toContain('-200');
  expect(host.querySelector('tbody')!.textContent).toContain('Đổi pháp bảo đã xác nhận');
  const before = gameStore.getState().player;
  await click('[data-jade-page=earn]');
  await click('[data-action=jade-stall]');
  expect(gameStore.getState()).toMatchObject({ menu: 'shop', marketSection: 'stall' });
  expect(gameStore.getState().player).toBe(before);
  expect(premiumStore.getState().balance).toBe(500);
});
it('blocks unauthenticated or insufficient balance exchanges and shows the empty ledger state', async () => {
  await click('[data-jade-page=history]');
  expect(host.querySelector('tbody')!.textContent).toContain('Chưa có giao dịch');
  await act(async () => premiumStore.setState({ balance: 199 }));
  await click('[data-jade-page=shop]');
  expect(host.querySelector<HTMLButtonElement>('[data-action=exchange-jade]')!.disabled).toBe(true);
  await act(async () => setAccountState({ user: null }));
  await click('[data-jade-page=shop]');
  expect(host.querySelector<HTMLButtonElement>('[data-action=exchange-jade]')!.disabled).toBe(true);
});
