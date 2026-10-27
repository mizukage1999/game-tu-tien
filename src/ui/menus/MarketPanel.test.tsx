// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MarketPanel } from './MarketPanel';
import { gameStore, newPlayer } from '../../store/gameStore';
import { socialStore } from '../../store/socialStore';
import { playerStats } from '../../game/systems/progression';
import { saveKey, setSaveScope } from '../../game/systems/save';
import {
  MARKET_OFFERS,
  marketStorageKey,
  parseMarketData,
  stallDraftReason,
  type MarketSection,
} from '../../game/systems/marketUi';

vi.mock('../../game/art/icons', () => ({ itemIconUrl: (id: string) => `/${id}.png` }));
vi.mock('../../net/session', () => ({ useAccount: () => ({ user: null }) }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement, root: Root, previous: ReturnType<typeof gameStore.getState>;
const click = (selector: string) =>
  act(() => host.querySelector<HTMLButtonElement>(selector)!.click());
const section = (id: MarketSection) => act(() => gameStore.setState({ marketSection: id }));
const field = (label: string, value: string) =>
  act(() => {
    const input = host.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[aria-label="${label}"]`,
    )!;
    const prototype =
      input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(
      new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
    );
  });
beforeEach(() => {
  previous = gameStore.getState();
  setSaveScope('market-test-a');
  localStorage.clear();
  const player = {
    ...newPlayer(),
    admitted: true,
    inventory: { linh_thach: 100, hoi_xuan_dan: 4, linh_chi: 8 },
  };
  gameStore.setState({
    player,
    stats: playerStats(player),
    menu: 'shop',
    marketSection: 'buy',
    status: 'alive',
  });
  host = document.createElement('div');
  root = createRoot(host);
  act(() => root.render(<MarketPanel />));
});
afterEach(() => {
  act(() => root.unmount());
  gameStore.setState(previous);
  setSaveScope(null);
  localStorage.clear();
});

it('buys the selected NPC offer once at its actual price and records it in local history', () => {
  const offer = MARKET_OFFERS.find((o) => o.item === 'hoi_xuan_dan')!;
  field('Tìm vật phẩm', 'hoi xuan');
  click(`[data-offer="${offer.key}"] td:first-child button`);
  const before = gameStore.getState().player;
  click('[data-action="buy"]');
  const after = gameStore.getState().player;
  expect(after.inventory.hoi_xuan_dan).toBe(before.inventory.hoi_xuan_dan + offer.qty);
  expect(after.inventory.linh_thach).toBe(before.inventory.linh_thach - offer.price.linh_thach);
  const saved = parseMarketData(localStorage.getItem(marketStorageKey(saveKey())));
  expect(saved.purchases).toHaveLength(1);
  expect(saved.purchases[0]).toMatchObject({
    item: offer.item,
    quantity: offer.qty,
    price: offer.price,
  });
  expect(host.querySelector('[role=status]')!.textContent).toContain('Đã mua');
  act(() => gameStore.setState({ player: { ...after, inventory: {} } }));
  expect(host.querySelector<HTMLButtonElement>('[data-action="buy"]')!.disabled).toBe(true);
});
it('saves, edits and removes a stall draft without reserving items or spending currency', () => {
  section('stall');
  click('[data-own-item="linh_chi"]');
  field('Số lượng bày bán', '99');
  expect(host.querySelector<HTMLButtonElement>('[data-action="save-draft"]')!.disabled).toBe(true);
  field('Số lượng bày bán', '3');
  field('Đơn giá', '120');
  const before = gameStore.getState().player;
  click('[data-action="save-draft"]');
  let saved = parseMarketData(localStorage.getItem(marketStorageKey(saveKey())));
  expect(saved.drafts[0]).toMatchObject({ item: 'linh_chi', quantity: 3, price: 120, hours: 12 });
  expect(gameStore.getState().player).toBe(before);
  click('.market-drafts article button:first-of-type');
  field('Đơn giá', '150');
  click('[data-action="save-draft"]');
  saved = parseMarketData(localStorage.getItem(marketStorageKey(saveKey())));
  expect(saved.drafts).toHaveLength(1);
  expect(saved.drafts[0].price).toBe(150);
  act(() => root.render(<MarketPanel />));
  expect(host.querySelector('.market-drafts')!.textContent).toContain('150');
  setSaveScope('market-test-b');
  act(() => root.render(<MarketPanel />));
  expect(host.querySelector('.market-tabs')!.textContent).toContain('(0)');
  setSaveScope('market-test-a');
  act(() => root.render(<MarketPanel />));
  click('.market-tabs button:last-child');
  click('.market-drafts article button:last-child');
  expect(parseMarketData(localStorage.getItem(marketStorageKey(saveKey()))).drafts).toHaveLength(0);
  expect(gameStore.getState().player).toBe(before);
});
it('previews real own inventory while leaving exchange disabled and preserving player data', () => {
  const previousSocial = socialStore.getState();
  try {
    act(() =>
      socialStore.setState({
        roster: [
          {
            userId: 'peer',
            name: 'Đạo Hữu',
            heroId: 'hong_lien',
            sex: 'female',
            level: 22,
            realm: 'Trúc Cơ',
            mapId: 'dai_thua_vien',
            party: null,
            key: 'peer',
            updatedAt: Date.now(),
          },
        ],
      }),
    );
    section('direct');
    field('Chọn người giao dịch', 'peer');
    const before = gameStore.getState().player;
    field('Thêm vật phẩm giao dịch', 'linh_chi');
    field('Linh Thạch đặt giao dịch', '999');
    expect(host.querySelectorAll('.market-trade-slots img')).toHaveLength(1);
    expect(
      host.querySelector<HTMLInputElement>('[aria-label="Linh Thạch đặt giao dịch"]')!.value,
    ).toBe('100');
    expect(host.querySelector<HTMLButtonElement>('.market-direct-footer button')!.disabled).toBe(
      true,
    );
    expect(host.querySelector('.market-direct-footer')!.textContent).toContain('chưa mở');
    expect(gameStore.getState().player).toBe(before);
  } finally {
    act(() => socialStore.setState(previousSocial));
  }
});
it('rejects malformed drafts, unavailable inventory and invalid prices', () => {
  const player = gameStore.getState().player;
  expect(stallDraftReason(player, 'linh_chi', 8, 123, 6)).toBeNull();
  for (const [item, quantity, price, hours] of [
    ['missing', 1, 1, 6],
    ['linh_chi', 9, 1, 6],
    ['linh_chi', 1, -1, 6],
    ['linh_chi', 1, 1, 7],
  ] as const)
    expect(stallDraftReason(player, item, quantity, price, hours)).not.toBeNull();
  expect(parseMarketData('{broken')).toEqual({ drafts: [], purchases: [], favorites: [] });
  expect(
    parseMarketData(
      JSON.stringify({
        drafts: [{ id: 'bad', item: 'missing', quantity: 1, price: 1, hours: 6, at: 1 }],
        favorites: ['bad'],
      }),
    ).drafts,
  ).toHaveLength(0);
});
