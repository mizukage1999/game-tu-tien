import type { SkillDef } from './index';

const signature = (
  name: string,
  kind: SkillDef['kind'],
  mpCost: number,
  cooldownMs: number,
  multiplier: number,
  range: number,
  desc: string,
): SkillDef => ({
  name,
  kind,
  character: 'male',
  key: '2–4',
  mpCost,
  cooldownMs,
  multiplier,
  range,
  arc: kind === 'melee' ? 100 : 360,
  desc,
  growth: { multiplier: 0.06, cooldown: -0.02, range: 0.005 },
  bonus: { desc: 'Lĩnh ngộ: tăng uy lực và giảm hồi chiêu.' },
});

export const WANG_SKILLS = {
  hoa_ma_chi: signature(
    'Hóa Ma Chỉ',
    'projectile',
    120,
    8000,
    3.4,
    420,
    'Chỉ kình ma khí đỏ xuyên qua kẻ địch trên đường thẳng. Ngắm hướng trước khi thi triển.',
  ),
  dao_hoa_hoang_tuyen: signature(
    'Đạo Hóa Hoàng Tuyền',
    'nova',
    300,
    20000,
    0.65,
    165,
    'Hoàng Tuyền xoáy quanh vị trí thi triển trong 4 giây, gây 8 đợt sát thương, làm chậm và giảm 20% phòng ngự.',
  ),
  dinh_than_thuat: signature(
    'Định Thân Thuật',
    'projectile',
    80,
    12000,
    0,
    270,
    'Ấn định thân khóa mục tiêu đầu tiên theo hướng chỉ: 1 giây trong PK, 2 giây với quái. Không gây sát thương.',
  ),
  tram_la_quyet: signature(
    'Trảm La Quyết',
    'projectile',
    200,
    15000,
    3.8,
    360,
    'Lưỡi liềm ma đạo đỏ đen quét thẳng về phía trước, xuyên nhiều mục tiêu.',
  ),
  dich_linh_an: signature(
    'Địch Linh Ấn',
    'melee',
    150,
    10000,
    4.2,
    115,
    'Chưởng ấn vàng giáng xuống trước mặt, sát thương phạm vi nhỏ và choáng nhẹ 0,35 giây trong PK.',
  ),
} satisfies Record<string, SkillDef>;

export type WangSkillId = keyof typeof WANG_SKILLS;
export interface WangEffectArt {
  texture: string;
  url: string;
  duration: number;
}
export const WANG_EFFECT_ART: Record<WangSkillId, WangEffectArt> = {
  hoa_ma_chi: {
    texture: 'wang-hoa-ma-chi',
    url: '/assets/skills/wang-hoa-ma-chi-v1.png',
    duration: 640,
  },
  dao_hoa_hoang_tuyen: {
    texture: 'wang-hoang-tuyen',
    url: '/assets/skills/wang-hoang-tuyen-v1.png',
    duration: 4000,
  },
  dinh_than_thuat: {
    texture: 'wang-dinh-than',
    url: '/assets/skills/wang-dinh-than-v1.png',
    duration: 1000,
  },
  tram_la_quyet: {
    texture: 'wang-tram-la',
    url: '/assets/skills/wang-tram-la-v1.png',
    duration: 720,
  },
  dich_linh_an: {
    texture: 'wang-dich-linh-an',
    url: '/assets/skills/wang-dich-linh-an-v1.png',
    duration: 850,
  },
};
export function wangEffect(id: string): WangEffectArt | undefined {
  return WANG_EFFECT_ART[id as WangSkillId];
}

// The painted strip uses wider impact frames. Both renderers use these same crops.
export const WANG_FRAME_EDGES = [0, 0.13, 0.29, 0.5, 0.71, 0.885, 1];
export function wangFrameRect(width: number, height: number, frame: number) {
  const x = Math.round(width * WANG_FRAME_EDGES[frame]);
  return { x, y: 0, width: Math.round(width * WANG_FRAME_EDGES[frame + 1]) - x, height };
}
