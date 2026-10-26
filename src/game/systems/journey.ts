import { QUESTS } from '../../data';
import { storyChapter, storyOrder } from './immortal';
import { isChildhood } from './origin';
import type { QuestLog } from './quest';
import type { PlayerSave } from './save';

const STOPS = [
  {
    id: 'village',
    name: 'Vương Gia Thôn',
    ids: ['village_0', 'village_1', 'village_2', 'village_3'],
    point: [18, 76],
    scene: 0,
  },
  {
    id: 'river',
    name: 'Bến Thanh Khê',
    ids: ['village_4', 'village_5', 'village_6'],
    point: [41, 67],
    scene: 5,
  },
  {
    id: 'gate',
    name: 'Sơn Môn Khảo Hạch',
    ids: ['village_7', 'village_8', 'village_9'],
    point: [29, 48],
    scene: 1,
  },
  {
    id: 'sect',
    name: 'Tiên Duyên Nhập Môn',
    ids: ['main_0', 'main_1', 'main_2'],
    point: [58, 35],
    scene: 1,
  },
  {
    id: 'alchemy',
    name: 'Đan Đạo Khai Hỏa',
    ids: ['main_duoc', 'main_dan', 'main_phu'],
    point: [77, 17],
    scene: 4,
  },
  {
    id: 'trial',
    name: 'Ngọc Ấn Thức Tỉnh',
    ids: ['main_3', 'first_prepare', 'first_boss', 'first_return'],
    point: [83, 48],
    scene: 3,
  },
  {
    id: 'flight',
    name: 'Ngự Kiếm Sơn Hà',
    ids: ['main_4', 'main_kiem', 'main_hac'],
    point: [81, 72],
    scene: 5,
  },
  {
    id: 'world',
    name: 'Sơn Hà Rộng Mở',
    ids: ['travel_0', 'travel_1', 'travel_2', 'travel_3', 'travel_4', 'travel_5'],
    point: [84, 91],
    scene: 2,
  },
] as const;

export interface JourneyStage {
  id: string;
  name: string;
  ids: string[];
  chapter: string;
  point: readonly [number, number];
  scene: number;
}

/** Visual stops only: quest order, prerequisites and payouts remain unchanged. */
export function journeyStages(player: PlayerSave): JourneyStage[] {
  const order = storyOrder(player).filter((id) => !!QUESTS[id]),
    stages: JourneyStage[] = [];
  for (const id of order) {
    const stop = STOPS.find((s) => (s.ids as readonly string[]).includes(id)),
      key = stop?.id ?? storyChapter(id),
      existing = stages.find((s) => s.id === key);
    if (existing) existing.ids.push(id);
    else
      stages.push({
        id: key,
        name: stop?.name ?? storyChapter(id),
        ids: [id],
        chapter: storyChapter(id),
        point: stop?.point ?? [84, 91],
        scene: stop?.scene ?? 1,
      });
  }
  return stages;
}

export function journeyQuestState(id: string, quests: QuestLog, player: PlayerSave) {
  if (quests[id]) return quests[id].status;
  const def = QUESTS[id];
  if (!def || (isChildhood(player) && !id.startsWith('village_'))) return 'locked';
  return !def.requires || quests[def.requires]?.status === 'done' ? 'available' : 'locked';
}
