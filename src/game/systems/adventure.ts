import { ITEMS, type SkillId } from '../../data';
import type { PlayerSave } from './save';
import { lifeProgress, type CompanionId } from './life';
import { enhanceCost, enhanceChance, enhancementLevel, MAX_ENHANCEMENT } from './enhancement';
export { enhanceCost, enhanceChance, MAX_ENHANCEMENT } from './enhancement';

export interface SectMission {
  id: string;
  progress: number;
  target: number;
}
export interface AdventureProgress {
  reputation: number;
  contribution: number;
  mission: SectMission | null;
  missionDay: number;
  completedMissions: string[];
  learnedSecrets: SkillId[];
  enhancements: Record<string, number>;
  beastSeals: Partial<Record<CompanionId, number>>;
  evolution: Partial<Record<CompanionId, number>>;
  boundSect: 'dai_thua_vien' | 'linh_son_tong';
}
export const SECT_RANKS = [
  { name: 'Tạp Dịch', reputation: 0 },
  { name: 'Ngoại Môn', reputation: 50 },
  { name: 'Nội Môn', reputation: 150 },
  { name: 'Chân Truyền', reputation: 350 },
  { name: 'Chấp Sự', reputation: 700 },
  { name: 'Trưởng Lão', reputation: 1500 },
];
export const SECT_MISSIONS = [
  {
    id: 'hunt',
    name: 'Trừ yêu hộ sơn',
    desc: 'Đánh bại 8 yêu thú hoặc tán tu thù địch.',
    target: 8,
    reputation: 30,
    contribution: 20,
    event: 'kill',
  },
  {
    id: 'herbs',
    name: 'Dược liệu tông môn',
    desc: 'Hái hoặc thu hoạch 5 linh thảo.',
    target: 5,
    reputation: 20,
    contribution: 15,
    event: 'gather',
  },
  {
    id: 'forge',
    name: 'Giữ lửa đan phòng',
    desc: 'Luyện hoặc chế tạo 2 vật phẩm.',
    target: 2,
    reputation: 25,
    contribution: 20,
    event: 'craft',
  },
  {
    id: 'dungeon',
    name: 'Thử luyện bí cảnh',
    desc: 'Vượt một phó bản.',
    target: 1,
    reputation: 60,
    contribution: 40,
    event: 'dungeon',
  },
  {
    id: 'duel',
    name: 'Luận kiếm đồng môn',
    desc: 'Hoàn thành một trận tỷ võ điều khiển tay.',
    target: 1,
    reputation: 20,
    contribution: 15,
    event: 'duel',
  },
] as const;
export function adventure(p: PlayerSave): AdventureProgress {
  return {
    reputation: 0,
    contribution: 0,
    mission: null,
    missionDay: -1,
    completedMissions: [],
    learnedSecrets: [],
    beastSeals: {},
    evolution: {},
    boundSect: 'dai_thua_vien',
    ...p.adventure,
    enhancements: Object.fromEntries(
      Object.entries(p.adventure?.enhancements ?? {}).map(([id, n]) => [id, enhancementLevel(n)]),
    ),
  };
}
export function sectRank(p: PlayerSave) {
  const rep = adventure(p).reputation;
  return Math.max(0, SECT_RANKS.filter((r) => rep >= r.reputation).length - 1);
}
export function sectEvent(p: PlayerSave, event: string, qty = 1): PlayerSave {
  const a = adventure(p),
    mission = a.mission,
    def = SECT_MISSIONS.find((m) => m.id === mission?.id);
  if (!mission || !def || def.event !== event) return p;
  return {
    ...p,
    adventure: {
      ...a,
      mission: { ...mission, progress: Math.min(mission.target, mission.progress + qty) },
    },
  };
}
export type AdventureAction =
  | { type: 'mission'; id: string }
  | { type: 'claimMission' }
  | { type: 'learnSecret'; id: SkillId }
  | { type: 'enhance'; id: string }
  | { type: 'evolve'; id: CompanionId }
  | { type: 'bindSect'; id: 'dai_thua_vien' | 'linh_son_tong' };
export function adventureAction(
  p: PlayerSave,
  action: AdventureAction,
  atSect: boolean,
  rng = Math.random,
):
  | { ok: false; reason: string }
  | { ok: true; player: PlayerSave; message: string; exp?: number; enhanced?: boolean } {
  if (p.origin && !p.admitted) return { ok: false, reason: 'Hoàn thành chương mở đầu trước.' };
  const a = adventure(p),
    inventory = { ...p.inventory };
  const fail = (reason: string) => ({ ok: false as const, reason });
  const pay = (cost: Record<string, number>) => {
    if (Object.entries(cost).some(([id, n]) => (inventory[id] ?? 0) < n)) return false;
    for (const [id, n] of Object.entries(cost)) inventory[id] = (inventory[id] ?? 0) - n;
    return true;
  };
  let message = '',
    exp = 0;
  let enhanced: boolean | undefined;
  switch (action.type) {
    case 'mission': {
      if (!atSect) return fail('Hãy gặp Chấp Sự tại tông môn để nhận nhiệm vụ.');
      if (a.mission) return fail('Hãy hoàn thành nhiệm vụ đang nhận.');
      const day = lifeProgress(p).days,
        def = SECT_MISSIONS.find((m) => m.id === action.id);
      if (!def) return fail('Nhiệm vụ không tồn tại.');
      const done = a.missionDay === day ? a.completedMissions : [];
      if (done.includes(def.id)) return fail('Nhiệm vụ này đã làm trong ngày game.');
      a.missionDay = day;
      a.completedMissions = done;
      a.mission = { id: def.id, progress: 0, target: def.target };
      message = `Nhận nhiệm vụ: ${def.name}.`;
      break;
    }
    case 'claimMission': {
      if (!atSect) return fail('Về tông môn trả nhiệm vụ.');
      const def = SECT_MISSIONS.find((m) => m.id === a.mission?.id);
      if (!def || !a.mission || a.mission.progress < a.mission.target)
        return fail('Chưa hoàn thành nhiệm vụ.');
      a.reputation += def.reputation;
      a.contribution += def.contribution;
      a.completedMissions = [...a.completedMissions, def.id];
      a.mission = null;
      exp = 100 + p.level * 20;
      message = `Nhận ${def.reputation} danh vọng, ${def.contribution} cống hiến.`;
      break;
    }
    case 'learnSecret': {
      if (!atSect) return fail('Hãy gặp trưởng lão tại tông môn.');
      const required = action.id === 'loi_kich' ? 2 : action.id === 'phong_nhan' ? 3 : 99;
      if (sectRank(p) < required)
        return fail(`Cần cấp bậc ${SECT_RANKS[required]?.name ?? 'cao hơn'}.`);
      if (a.learnedSecrets.includes(action.id)) return fail('Đã học bí thuật này.');
      if (a.contribution < 60) return fail('Cần 60 cống hiến.');
      a.contribution -= 60;
      a.learnedSecrets = [...a.learnedSecrets, action.id];
      message = 'Trưởng lão đã truyền thụ bí thuật.';
      break;
    }
    case 'enhance': {
      const def = ITEMS[action.id],
        n = a.enhancements[action.id] ?? 0;
      if (!def?.slot || !Object.values(p.equipment).includes(action.id))
        return fail('Hãy trang bị món đồ cần cường hóa.');
      if (n >= MAX_ENHANCEMENT) return fail('Trang bị đã đạt tối đa +12.');
      const cost = enhanceCost(n);
      if (!pay(cost)) return fail('Chưa đủ Đá Cường Hóa. Có thể nhận đá khi vượt phó bản.');
      enhanced = rng() < enhanceChance(n);
      a.enhancements = { ...a.enhancements, [action.id]: enhanced ? n + 1 : n };
      message = enhanced
        ? `${def.name} đạt +${n + 1}!`
        : `Cường hóa thất bại. ${def.name} giữ +${n}; đã tiêu hao đá.`;
      break;
    }
    case 'evolve': {
      const own = lifeProgress(p).companions[action.id],
        n = a.evolution[action.id] ?? 0;
      if (!own || own.rank < 3 + n) return fail(`Linh thú cần bậc ${3 + n}.`);
      if (n >= 2) return fail('Linh thú đã tiến hóa tối đa.');
      if (!pay({ yeu_dan: 3 + n * 3, linh_chi: 2 + n * 2 }))
        return fail('Thiếu Yêu Đan hoặc Linh Chi.');
      a.evolution = { ...a.evolution, [action.id]: n + 1 };
      message = 'Linh thú đã tiến hóa, kỹ năng và chỉ số mạnh hơn.';
      break;
    }
    case 'bindSect':
      if (!atSect) return fail('Hãy tới tông môn muốn đặt điểm hồi sinh.');
      a.boundSect = action.id;
      message = 'Đã ghi danh tông môn, điểm hồi sinh được cập nhật.';
      break;
  }
  return { ok: true, player: { ...p, inventory, adventure: a }, message, exp, enhanced };
}
export function battlePower(stats: {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  critRate: number;
}) {
  return Math.round(
    stats.maxHp * 0.2 + stats.maxMp * 0.1 + stats.atk * 5 + stats.def * 4 + stats.critRate * 500,
  );
}
export const BEAST_ENCOUNTERS: Record<string, CompanionId> = {
  linh_thu: 'snow_fox',
  hoa_ho: 'red_fox',
  thanh_moc_thu: 'jade_deer',
  thach_linh_thu: 'gold_tiger',
  field_u_minh_trach_elite: 'shadow_wolf',
  field_han_bang_nguyen_elite: 'white_crane',
};
export function beastVictory(p: PlayerSave, type: string): PlayerSave {
  const id = BEAST_ENCOUNTERS[type];
  if (!id) return p;
  const a = adventure(p);
  return {
    ...p,
    adventure: { ...a, beastSeals: { ...a.beastSeals, [id]: (a.beastSeals[id] ?? 0) + 1 } },
  };
}
