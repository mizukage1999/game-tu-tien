import type { SkillId } from '../../data';
export const SKILL_ATLAS_ORDER: SkillId[] = [
  'hoa_ma_chi',
  'dao_hoa_hoang_tuyen',
  'dinh_than_thuat',
  'tram_la_quyet',
  'dich_linh_an',
  'basic',
  'bang_tam_tram',
  'phi_kiem',
  'han_bang_tran',
  'than_phap',
  'loi_kich',
  'hoa_lien',
  'moc_linh',
  'kim_cang',
  'phong_nhan',
];
const icons = new Map<string, string>();
const children = new Map<string, string>();
export function registerCultivationIcons(source: HTMLImageElement) {
  SKILL_ATLAS_ORDER.forEach((id, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!,
      w = source.width / 5,
      h = source.height / 3;
    ctx.drawImage(
      source,
      (index % 5) * w + 2,
      Math.floor(index / 5) * h + 2,
      w - 4,
      h - 4,
      0,
      0,
      128,
      128,
    );
    icons.set(id, canvas.toDataURL('image/png'));
  });
}
export function cultivationIconUrl(id: SkillId) {
  return icons.get(id);
}
export function registerChildProfile(
  sex: string,
  source: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(source, x, y, width, height, 0, 0, width, height);
  children.set(sex, canvas.toDataURL('image/png'));
}
export function childProfileUrl(sex: string) {
  return children.get(sex);
}
