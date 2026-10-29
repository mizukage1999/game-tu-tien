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
    'Ngưng tụ ma khí tím nơi đầu ngón tay, phóng chỉ kình xuyên qua kẻ địch trên đường thẳng. Ngắm hướng trước khi thi triển.',
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
    'Lưỡi kiếm khí màu lam hình lưỡi liềm bay thẳng về phía trước, xuyên nhiều mục tiêu và vỡ thành những vệt sáng.',
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
  grid?: { columns: number; rows: number; frames: number; cell: number };
  motion?: 'crescent' | 'beam' | 'bind' | 'vortex';
}
export const WANG_V2_GRID = { columns: 6, rows: 4, frames: 24, cell: 160 } as const;
export const WANG_ICON_ATLAS = '/assets/skills/wang-signature-icons-v2.png';
export const WANG_ICON_ORDER = [
  'tram_la_quyet',
  'hoa_ma_chi',
  'dinh_than_thuat',
  'dao_hoa_hoang_tuyen',
] as const;
export const WANG_EFFECT_ART: Record<WangSkillId, WangEffectArt> = {
  hoa_ma_chi: {
    texture: 'wang-hoa-ma-chi',
    url: '/assets/skills/wang-hoa-ma-chi-v2.png',
    duration: 1000,
    grid: WANG_V2_GRID,
    motion: 'beam',
  },
  dao_hoa_hoang_tuyen: {
    texture: 'wang-hoang-tuyen',
    url: '/assets/skills/wang-hoang-tuyen-v2.png',
    duration: 4500,
    grid: WANG_V2_GRID,
    motion: 'vortex',
  },
  dinh_than_thuat: {
    texture: 'wang-dinh-than',
    url: '/assets/skills/wang-dinh-than-v2.png',
    duration: 1000,
    grid: WANG_V2_GRID,
    motion: 'bind',
  },
  tram_la_quyet: {
    texture: 'wang-tram-la',
    url: '/assets/skills/wang-tram-la-v2.png',
    duration: 1000,
    grid: WANG_V2_GRID,
    motion: 'crescent',
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
export function wangFrameRect(width: number, height: number, frame: number, art?: WangEffectArt) {
  if (art?.grid) {
    const { columns, rows, frames } = art.grid,
      index = Math.max(0, Math.min(frames - 1, Math.floor(frame)));
    const col = index % columns,
      row = Math.floor(index / columns),
      x = Math.round((width * col) / columns),
      y = Math.round((height * row) / rows);
    return {
      x,
      y,
      width: Math.round((width * (col + 1)) / columns) - x,
      height: Math.round((height * (row + 1)) / rows) - y,
    };
  }
  const x = Math.round(width * WANG_FRAME_EDGES[frame]);
  return { x, y: 0, width: Math.round(width * WANG_FRAME_EDGES[frame + 1]) - x, height };
}

export function wangSheetLayout(art: WangEffectArt) {
  return art.grid ?? { columns: 6, rows: 1, frames: 6, cell: 256 };
}
export interface WangVisualOptions {
  duration?: number;
  castOnly?: boolean;
}
export function wangVisual(
  art: WangEffectArt,
  age: number,
  range: number,
  options: WangVisualOptions = {},
) {
  const duration = options.duration ?? art.duration,
    time = Math.max(0, Math.min(duration, age));
  const part = (start: number, end: number, first: number) =>
    first +
    Math.min(
      5,
      Math.floor(Math.max(0, Math.min(0.9999, (time - start) / Math.max(1, end - start))) * 6),
    );
  let frame = 0,
    advance = 0,
    width = 150,
    height = 165,
    scale = 1;
  const alpha = Math.max(0, Math.min(1, time / 60, (duration - time) / 100));
  if (options.castOnly) {
    frame = part(0, duration, 0);
    width = 110;
    height = 130;
  } else if (art.motion === 'vortex') {
    frame =
      time < 500
        ? part(0, 500, 0)
        : time >= duration - 500
          ? part(duration - 500, duration, 18)
          : 6 + Math.floor((((time - 500) % 500) / 500) * 12);
    width = range * 2.9;
    height = range * 2.7;
    scale = 0.65 + 0.35 * Math.min(1, time / 500);
  } else if (art.motion === 'bind') {
    frame =
      time < 180
        ? part(0, 180, 6)
        : time >= duration - 180
          ? part(duration - 180, duration, 18)
          : 12 + Math.floor((((time - 180) % 350) / 350) * 6);
  } else {
    frame =
      time < 140
        ? part(0, 140, 0)
        : time < 400
          ? part(140, 400, 6)
          : time < 620
            ? part(400, 620, 12)
            : part(620, duration, 18);
    advance = time < 140 ? 0.06 : 0.12 + 0.88 * Math.min(1, (time - 140) / 260);
    const flight = time >= 140 && time < 400;
    width = time < 140 ? 110 : flight && art.motion === 'beam' ? Math.min(340, range * 0.9) : 190;
    height = flight && art.motion === 'beam' ? 95 : time < 140 ? 120 : 185;
  }
  return { frame, advance, width: width * scale, height: height * scale, alpha };
}
