/** Retained in save parsing only; retired skills cannot be assigned, upgraded or cast. */
export const RETIRED_COMMON_SKILLS = [
  'bang_tam_tram',
  'phi_kiem',
  'han_bang_tran',
  'loi_kich',
  'hoa_lien',
  'phong_nhan',
  'moc_linh',
  'kim_cang',
] as const;
export const WANG_SIGNATURE_SKILLS = [
  'hoa_ma_chi',
  'dao_hoa_hoang_tuyen',
  'tich_diet_chi',
  'tram_la_quyet',
  'dich_linh_an',
  'dinh_than_thuat',
  'luyen_hon_thuat',
] as const;
export function retiredSkill(id: string) {
  return id.startsWith('wang_lam_') || RETIRED_COMMON_SKILLS.some((skill) => skill === id);
}
