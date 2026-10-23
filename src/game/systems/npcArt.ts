export const PAINTED_NPC_GROUPS = {
  'city-people-v2': ['truong_lao', 'thuong_nhan', 'su_huynh', 'thanh_nhi', 'ho_ve', 'an_si'],
  'travel-people-v2': ['tiep_dan', 'khao_hach', 'chap_su', 'giu_dinh', 'lam_ho', 'a_moc'],
} as const;

export const NPC_SPRITES: Record<string, { texture: string; src: string }> = {
  vuong_mau: { texture: 'npc-village-vuong_mau', src: '/assets/maps/world-people.png' },
  vuong_phu: { texture: 'npc-village-vuong_phu', src: '/assets/maps/world-people.png' },
  vuong_thuc: { texture: 'npc-village-vuong_thuc', src: '/assets/maps/world-people.png' },
  duoc_ba: { texture: 'npc-village-duoc_ba', src: '/assets/maps/world-people.png' },
  tien_sinh: { texture: 'npc-village-tien_sinh', src: '/assets/maps/world-people.png' },
  giu_suoi: { texture: 'npc-village-giu_suoi', src: '/assets/maps/world-people.png' },
  ...Object.fromEntries(
    Object.entries(PAINTED_NPC_GROUPS).flatMap(([atlas, ids]) =>
      ids.map((id) => [id, { texture: `npc-painted-${id}`, src: `/assets/maps/${atlas}.png` }]),
    ),
  ),
};
