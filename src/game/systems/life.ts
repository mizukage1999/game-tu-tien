import type { PlayerSave } from './save';
import { missingMaterials } from './crafting';

export const DAY_MS = 30_000;
export type Facility = 'field' | 'chamber' | 'furnace' | 'array';
export type CompanionId =
  'snow_fox' | 'gold_tiger' | 'white_crane' | 'jade_deer' | 'shadow_wolf' | 'red_fox';
export interface LifeProgress {
  days: number;
  remainder: number;
  aptitude: number;
  facilities: Record<Facility, number>;
  plots: ({ herb: string; readyDay: number } | null)[];
  retreat: { readyDay: number; days: number } | null;
  knownRecipes: string[];
  artifact: string | null;
  companions: Partial<Record<CompanionId, { rank: number; bond: number }>>;
  companion: CompanionId | null;
}
export const FACILITIES: Record<Facility, string> = {
  field: 'Linh điền',
  chamber: 'Tĩnh thất',
  furnace: 'Lò đan',
  array: 'Tụ linh trận',
};
export const CROPS = [
  { id: 'thanh_linh_thao', name: 'Thanh Linh Thảo', seed: 'hat_thanh_linh', days: 2, qty: 3 },
  { id: 'linh_chi', name: 'Linh Chi', seed: 'hat_linh_chi', days: 4, qty: 2 },
  { id: 'ngung_lo', name: 'Ngưng Lộ', seed: 'hat_ngung_lo', days: 3, qty: 3 },
] as const;
export const COMPANIONS = [
  {
    id: 'snow_fox' as const,
    name: 'Tiểu Tuyết Hồ',
    atk: 8,
    def: 2,
    hp: 40,
    cost: 2,
    desc: 'Linh hồ lanh lợi, hỗ trợ công kích.',
  },
  {
    id: 'gold_tiger' as const,
    name: 'Kim Văn Hổ',
    atk: 15,
    def: 4,
    hp: 65,
    cost: 5,
    desc: 'Hổ con có sức công kích mạnh.',
  },
  {
    id: 'white_crane' as const,
    name: 'Bạch Linh Hạc',
    atk: 5,
    def: 3,
    hp: 55,
    cost: 3,
    desc: 'Linh hạc hộ chủ, khác với hạc dùng ngự hành.',
  },
  {
    id: 'jade_deer' as const,
    name: 'Thanh Ngọc Lộc',
    atk: 3,
    def: 7,
    hp: 100,
    cost: 4,
    desc: 'Linh lộc bảo vệ sinh lực chủ nhân.',
  },
  {
    id: 'shadow_wolf' as const,
    name: 'Ngân Ảnh Lang',
    atk: 12,
    def: 5,
    hp: 60,
    cost: 4,
    desc: 'Lang thú theo sát dấu chân đối thủ.',
  },
  {
    id: 'red_fox' as const,
    name: 'Tam Vĩ Xích Hồ',
    atk: 19,
    def: 3,
    hp: 50,
    cost: 7,
    desc: 'Xích hồ nhanh nhẹn, thiên về công kích.',
  },
];
export const WORKSHOP_RECIPES = [
  {
    id: 'moc_kiem',
    name: 'Mộc Kiếm',
    cost: { thanh_linh_thao: 2, linh_thach: 1 },
    furnace: 1,
    formula: null,
  },
  {
    id: 'phap_bao_ngoc',
    name: 'Ngọc Hộ Thân',
    cost: { huyen_thiet: 4, linh_chi: 2, linh_thach: 3 },
    furnace: 2,
    formula: 'cong_thuc_ngoc',
  },
  {
    id: 'thuc_an_linh_thu',
    name: 'Linh Thú Đan',
    cost: { thanh_linh_thao: 2, yeu_dan: 1 },
    furnace: 1,
    formula: null,
  },
  {
    id: 'pha_canh_dan',
    name: 'Phá Cảnh Đan',
    cost: { linh_chi: 3, yeu_dan: 2, ngung_lo: 2 },
    furnace: 2,
    formula: 'cong_thuc_pha_canh',
  },
] as const;

export function workshopCheck(p: PlayerSave, id: string): string | null {
  const recipe = WORKSHOP_RECIPES.find(r=>r.id===id);
  if (!recipe) return 'Không có công thức này.';
  const life = lifeProgress(p);
  if (life.facilities.furnace < recipe.furnace) return `Cần lò đan cấp ${recipe.furnace}.`;
  if (recipe.formula && !life.knownRecipes.includes(recipe.id)) return 'Cần học công thức trước.';
  return missingMaterials(p,recipe.cost);
}

export function lifeProgress(p: PlayerSave): LifeProgress {
  const seed = Array.from(p.name).reduce((a, c) => a + c.charCodeAt(0), 0);
  const base: LifeProgress = {
    days: p.origin && !p.admitted ? 0 : 2160,
    remainder: 0,
    aptitude: 75 + (seed % 36),
    facilities: { field: 1, chamber: 1, furnace: 1, array: 1 },
    plots: [null, null, null],
    retreat: null,
    knownRecipes: [],
    artifact: null,
    companions: {},
    companion: null,
  };
  return { ...base, ...p.life, facilities: { ...base.facilities, ...p.life?.facilities } };
}
export function gameDate(p: PlayerSave) {
  const d = lifeProgress(p).days;
  return `Năm ${Math.floor(d / 360) + 1} · ngày ${(d % 360) + 1}`;
}
export function advanceLife(p: PlayerSave, ms: number): PlayerSave {
  const l = lifeProgress(p),
    elapsed = l.remainder + Math.max(0, ms);
  return {
    ...p,
    life: { ...l, days: l.days + Math.floor(elapsed / DAY_MS), remainder: elapsed % DAY_MS },
  };
}
export function companionStats(p: PlayerSave) {
  const l = lifeProgress(p),
    c = COMPANIONS.find((c) => c.id === l.companion),
    own = c && l.companions[c.id];
  const evolution=c?p.adventure?.evolution[c.id]??0:0;
  return c && own
    ? { atk: Math.round(c.atk * own.rank*(1+.5*evolution)), def: Math.round(c.def * own.rank*(1+.5*evolution)), hp: Math.round(c.hp * own.rank*(1+.5*evolution)) }
    : { atk: 0, def: 0, hp: 0 };
}
export function facilityCost(level: number) {
  return { linh_thach: 2 * level, thanh_linh_thao: 3 * level };
}
export type LifeAction =
  | { type: 'plant'; plot: number; herb: string }
  | { type: 'harvest'; plot: number }
  | { type: 'facility'; facility: Facility }
  | { type: 'retreat'; days: number }
  | { type: 'claimRetreat' }
  | { type: 'cancelRetreat' }
  | { type: 'learn'; formula: string }
  | { type: 'forge'; recipe: string }
  | { type: 'artifact'; id: string | null }
  | { type: 'tame'; id: CompanionId }
  | { type: 'companion'; id: CompanionId | null }
  | { type: 'feed'; id: CompanionId };
export type LifeResult =
  { ok: false; reason: string } | { ok: true; player: PlayerSave; exp?: number; message: string };

/** All permanent costs and rewards are atomic and verified here, including UI calls. */
export function performLifeAction(
  p: PlayerSave,
  action: LifeAction,
  atHome: boolean,
  alive: boolean,
): LifeResult {
  if (!alive) return { ok: false, reason: 'Cần hồi phục trước.' };
  if (p.origin && !p.admitted)
    return { ok: false, reason: 'Hoàn thành chương mở đầu để nhập đạo trước.' };
  const l = lifeProgress(p),
    life: LifeProgress = {
      ...l,
      facilities: { ...l.facilities },
      plots: [...l.plots],
      companions: { ...l.companions },
    },
    inventory = { ...p.inventory };
  const fail = (reason: string): LifeResult => ({ ok: false, reason });
  const pay = (cost: Record<string, number>) => {
    if (Object.entries(cost).some(([id, n]) => (inventory[id] ?? 0) < n)) return false;
    for (const [id, n] of Object.entries(cost)) inventory[id] = (inventory[id] ?? 0) - n;
    return true;
  };
  const gain = (id: string, n: number) => (inventory[id] = (inventory[id] ?? 0) + n);
  let exp = 0,
    message = '';
  let nextAdventure=p.adventure;
  if (
    ['plant', 'harvest', 'facility', 'retreat', 'claimRetreat', 'forge'].includes(action.type) &&
    !atHome
  )
    return fail('Hãy về động phủ để thực hiện.');
  if (life.retreat && !['claimRetreat', 'cancelRetreat'].includes(action.type))
    return fail('Hãy xuất quan hoặc dừng bế quan trước.');
  switch (action.type) {
    case 'plant': {
      const crop = CROPS.find((c) => c.id === action.herb);
      if (
        !crop ||
        !Number.isInteger(action.plot) ||
        action.plot < 0 ||
        action.plot >= life.plots.length ||
        life.plots[action.plot]
      )
        return fail('Luống đất không hợp lệ hoặc đang có cây.');
      if (!pay({ [crop.seed]: 1 })) return fail('Chưa có hạt giống. Có thể mua tại thương nhân.');
      life.plots[action.plot] = { herb: crop.id, readyDay: life.days + crop.days };
      message = `Đã gieo ${crop.name}.`;
      break;
    }
    case 'harvest': {
      const plot = life.plots[action.plot],
        crop = CROPS.find((c) => c.id === plot?.herb);
      if (!plot || !crop || plot.readyDay > life.days) return fail('Linh thảo chưa chín.');
      gain(crop.id, crop.qty + life.facilities.field - 1);
      gain(crop.seed, 1);
      life.plots[action.plot] = null;
      message = `Đã thu hoạch ${crop.name}, nhận lại hạt giống.`;
      break;
    }
    case 'facility': {
      const level = life.facilities[action.facility];
      if (!level || level >= 3) return fail('Công trình đã đạt tối đa.');
      if (!pay(facilityCost(level))) return fail('Chưa đủ nguyên liệu nâng cấp.');
      life.facilities[action.facility]++;
      if (action.facility === 'field') life.plots.push(null);
      message = `${FACILITIES[action.facility]} đạt cấp ${level + 1}.`;
      break;
    }
    case 'retreat': {
      if (life.retreat) return fail('Đang có một đợt bế quan chưa kết thúc.');
      if (![1, 3, 10].includes(action.days)) return fail('Thời gian bế quan không hợp lệ.');
      life.retreat = { days: action.days, readyDay: life.days + action.days };
      message = `Bắt đầu bế quan ${action.days} ngày game.`;
      break;
    }
    case 'claimRetreat': {
      if (!life.retreat || life.retreat.readyDay > life.days)
        return fail('Chưa hoàn thành bế quan.');
      exp = Math.round(
        ((life.retreat.days * 45 * life.aptitude) / 100) *
          (1 + 0.25 * (life.facilities.chamber - 1) + 0.2 * (life.facilities.array - 1)),
      );
      life.retreat = null;
      message = `Kết thúc bế quan, tích lũy ${exp} EXP.`;
      break;
    }
    case 'cancelRetreat':
      life.retreat = null;
      message = 'Đã dừng bế quan, chưa nhận EXP.';
      break;
    case 'learn': {
      const recipe = WORKSHOP_RECIPES.find((r) => r.formula === action.formula);
      if (!recipe || life.knownRecipes.includes(recipe.id))
        return fail('Công thức không hợp lệ hoặc đã học.');
      if (!pay({ [action.formula]: 1 })) return fail('Chưa có công thức.');
      life.knownRecipes = [...life.knownRecipes, recipe.id];
      message = `Đã học công thức ${recipe.name}.`;
      break;
    }
    case 'forge': {
      const recipe = WORKSHOP_RECIPES.find((r) => r.id === action.recipe);
      if (!recipe) return fail('Không có công thức này.');
      const reason = workshopCheck(p,action.recipe);
      if (reason) return fail(reason);
      if (!pay(recipe.cost)) return fail('Chưa đủ nguyên liệu chế tạo.');
      gain(recipe.id, 1);
      message = `Chế tạo thành công ${recipe.name}.`;
      break;
    }
    case 'artifact':
      if (action.id && (!(inventory[action.id] > 0) || action.id !== 'phap_bao_ngoc'))
        return fail('Chưa có pháp bảo này.');
      life.artifact = action.id;
      message = action.id ? 'Đã vận dụng Ngọc Hộ Thân.' : 'Đã thu pháp bảo.';
      break;
    case 'tame': {
      const c = COMPANIONS.find((c) => c.id === action.id);
      if (!c || life.companions[c.id]) return fail('Linh thú không hợp lệ hoặc đã kết khế ước.');
      const seals=p.adventure?.beastSeals[c.id]??0;
      if (seals<c.cost) return fail(`Cần tự đánh bại yêu thú tương ứng ${c.cost} lần để thu phục (${seals}/${c.cost}).`);
      nextAdventure={...p.adventure!,beastSeals:{...p.adventure!.beastSeals,[c.id]:seals-c.cost}};
      life.companions[c.id] = { rank: 1, bond: 0 };
      life.companion = c.id;
      message = `${c.name} đã nhận chủ.`;
      break;
    }
    case 'companion':
      if (action.id && !life.companions[action.id]) return fail('Linh thú chưa nhận chủ.');
      life.companion = action.id;
      message = action.id ? 'Linh thú xuất chiến.' : 'Linh thú nghỉ ngơi.';
      break;
    case 'feed': {
      const own = life.companions[action.id];
      if (!own || own.rank >= 5) return fail('Chưa có linh thú hoặc đã đạt bậc tối đa.');
      if (!pay({ thuc_an_linh_thu: 1 })) return fail('Cần Linh Thú Đan.');
      const bond = own.bond + 1,
        up = bond >= own.rank * 2;
      life.companions[action.id] = { rank: own.rank + (up ? 1 : 0), bond: up ? 0 : bond };
      message = up ? 'Linh thú tăng bậc!' : 'Linh thú đã dùng đan, thân mật tăng.';
      break;
    }
  }
  return { ok: true, player: { ...p, life, inventory, adventure:nextAdventure }, exp, message };
}
