import type { HeroId } from './heroes';
/** Cosmetic IDs are inventory unlocks, never combat equipment or stat bonuses. */
export const OUTFITS = [
  {
    id: 'ao_thanh_van',
    name: 'Thanh Vân Tiên Y',
    hue: 205,
    saturation: 0.72,
    neutral: 0.12,
    light: 1.02,
    color: '#65cbff',
    price: 2688,
  },
  {
    id: 'ao_huyet_nguyet',
    name: 'Huyết Nguyệt Y',
    hue: 350,
    saturation: 0.8,
    neutral: 0.34,
    light: 0.76,
    color: '#f55772',
    price: 2688,
  },
  {
    id: 'ao_cuu_huyen',
    name: 'Cửu Huyền Bào',
    hue: 275,
    saturation: 0.7,
    neutral: 0.22,
    light: 0.88,
    color: '#be85ff',
    price: 2688,
  },
  {
    id: 'ao_long_uy',
    name: 'Long Uy Giáp',
    hue: 42,
    saturation: 0.68,
    neutral: 0.2,
    light: 0.8,
    color: '#efc35b',
    price: 3288,
  },
  {
    id: 'ao_lien_hoa',
    name: 'Liên Hoa Tiên Y',
    hue: 330,
    saturation: 0.5,
    neutral: 0.2,
    light: 1.08,
    color: '#ffa8d4',
    price: 2188,
  },
  {
    id: 'ao_van_hai',
    name: 'Vân Hải Bào',
    hue: 215,
    saturation: 0.66,
    neutral: 0.24,
    light: 0.7,
    color: '#679be4',
    price: 1888,
  },
  {
    id: 'ao_tuyet_vu',
    name: 'Tuyết Vũ',
    hue: 190,
    saturation: 0.45,
    neutral: 0.08,
    light: 1.1,
    color: '#adebff',
    price: 1280,
  },
] as const;
export const WEAPON_SKINS = [
  {
    id: 'kiem_anh_thanh_van',
    name: 'Thanh Vân Kiếm Ảnh',
    hero: 'wang_lam',
    hue: 200,
    color: '#72d8ff',
    price: 988,
  },
  {
    id: 'kiem_anh_huyet_nguyet',
    hero: 'wang_lam',
    name: 'Huyết Nguyệt Kiếm Ảnh',
    hue: 350,
    color: '#ff607c',
    price: 988,
  },
  {
    id: 'kiem_anh_cuu_huyen',
    name: 'Cửu Huyền Kiếm Ảnh',
    hero: 'wang_lam',
    hue: 275,
    color: '#ca8cff',
    price: 988,
  },
] as const;
export type OutfitId = (typeof OUTFITS)[number]['id'];
export type WeaponSkinId = (typeof WEAPON_SKINS)[number]['id'];
export type CosmeticSlot = 'outfit' | 'weapon';
export interface CosmeticLook {
  outfit: OutfitId | null;
  weapon: WeaponSkinId | null;
}
export const EMPTY_LOOK: Readonly<CosmeticLook> = { outfit: null, weapon: null };
export function parseCosmeticLook(raw: unknown): CosmeticLook {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    outfit: OUTFITS.find((x) => x.id === r.outfit)?.id ?? null,
    weapon: WEAPON_SKINS.find((x) => x.id === r.weapon)?.id ?? null,
  };
}
export function cosmeticDefinition(id: string) {
  return OUTFITS.find((x) => x.id === id) ?? WEAPON_SKINS.find((x) => x.id === id);
}
export function compatibleWeaponSkin(hero: HeroId, id: string | null) {
  return id === null || WEAPON_SKINS.some((s) => s.id === id && s.hero === hero);
}
export function cosmeticsForHero(hero: HeroId, raw: unknown): CosmeticLook {
  const look = parseCosmeticLook(raw);
  return { ...look, weapon: compatibleWeaponSkin(hero, look.weapon) ? look.weapon : null };
}
export const COSMETIC_ITEMS = Object.fromEntries(
  [...OUTFITS, ...WEAPON_SKINS].map((x) => [
    x.id,
    {
      name: x.name,
      kind: 'material' as const,
      color: x.color,
      desc: 'Ngoại trang vĩnh viễn. Mở Ngoại Trang để mặc/tháo; chỉ đổi diện mạo, không cộng chỉ số.',
    },
  ]),
);
