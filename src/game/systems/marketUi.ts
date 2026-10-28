import { ITEMS, NPCS } from '../../data';
import type { PlayerSave } from './save';

export type MarketSection = 'overview' | 'buy' | 'stall' | 'direct' | 'history';
export type StallCurrency = 'linh_thach' | 'tien_ngoc';
export interface StallDraft {
  id: string;
  item: string;
  quantity: number;
  price: number;
  hours: number;
  at: number;
  currency?: StallCurrency;
}
export interface MarketPurchase {
  id: string;
  item: string;
  quantity: number;
  price: Record<string, number>;
  at: number;
}
export interface MarketLocalData {
  drafts: StallDraft[];
  purchases: MarketPurchase[];
  favorites: string[];
}
export const MARKET_OFFERS = (NPCS.thuong_nhan.shop ?? []).map((offer, index) => ({
  ...offer,
  index,
  key: `npc:${index}`,
}));
export const STALL_HOURS = [6, 12, 24, 48];
export const emptyMarketData = (): MarketLocalData => ({
  drafts: [],
  purchases: [],
  favorites: [],
});
const integer = (n: unknown, max: number) =>
  typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= max;
export function stallDraftReason(
  p: PlayerSave,
  item: string,
  quantity: number,
  price: number,
  hours: number,
  currency: StallCurrency = 'linh_thach',
): string | null {
  if (!ITEMS[item] || (p.inventory[item] ?? 0) < 1) return 'Chọn vật phẩm có trong túi.';
  if (!integer(quantity, 9999) || quantity > (p.inventory[item] ?? 0))
    return 'Số lượng vượt quá số vật phẩm trong túi.';
  if (!integer(price, 999999999) || !Number.isSafeInteger(quantity * price))
    return `Nhập đơn giá từ 1 đến 999.999.999 ${currency === 'tien_ngoc' ? 'Tiên Ngọc' : 'Linh Thạch'}.`;
  if (!STALL_HOURS.includes(hours)) return 'Chọn thời gian bày bán.';
  return null;
}
export function parseMarketData(raw: string | null): MarketLocalData {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return emptyMarketData();
    const drafts: StallDraft[] = (Array.isArray(value.drafts) ? value.drafts : [])
      .filter(
        (d: StallDraft) =>
          d &&
          typeof d.id === 'string' &&
          d.id.length <= 64 &&
          !!ITEMS[d.item] &&
          integer(d.quantity, 9999) &&
          integer(d.price, 999999999) &&
          (d.currency === undefined || d.currency === 'linh_thach' || d.currency === 'tien_ngoc') &&
          STALL_HOURS.includes(d.hours) &&
          integer(d.at, Number.MAX_SAFE_INTEGER),
      )
      .slice(0, 30)
      .map((d: StallDraft) => ({ ...d, currency: d.currency ?? 'linh_thach' }));
    const purchases: MarketPurchase[] = (Array.isArray(value.purchases) ? value.purchases : [])
      .filter(
        (d: MarketPurchase) =>
          d &&
          typeof d.id === 'string' &&
          !!ITEMS[d.item] &&
          integer(d.quantity, 9999) &&
          integer(d.at, Number.MAX_SAFE_INTEGER) &&
          d.price &&
          typeof d.price === 'object' &&
          Object.entries(d.price).every(([id, n]) => !!ITEMS[id] && integer(n, 999999999)),
      )
      .slice(0, 50);
    const favorites = (Array.isArray(value.favorites) ? value.favorites : [])
      .filter((id: unknown) => typeof id === 'string' && MARKET_OFFERS.some((o) => o.key === id))
      .slice(0, 500);
    return { drafts, purchases, favorites: [...new Set<string>(favorites)] };
  } catch {
    return emptyMarketData();
  }
}
export function marketStorageKey(scope: string) {
  return `tu-tien-market-ui-v1:${scope}`;
}
