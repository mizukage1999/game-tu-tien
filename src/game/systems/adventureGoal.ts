import { QUESTS } from '../../data';
import type { PlayerSave } from './save';
import type { QuestLog } from './quest';
import { adventure } from './adventure';
import { COMPANIONS, lifeProgress } from './life';
import { ENHANCEMENT_STONE, enhancementLevel } from './enhancement';
import { breakthroughPillCount, expToNext, MAX_LEVEL, realmFor } from './progression';
import { fieldForLevel } from './scale';

export interface AdventureGoal {
  id: string;
  text: string;
  label: string;
  destination:
    | {
        menu: 'character' | 'cultivate' | 'dungeon' | 'journey';
        section?: 'alchemy' | 'companions';
      }
    | { travel: string }
    | { quest: string };
  progress?: { value: number; max: number; label: string };
}
/** One actionable goal, using the same quantities and location rules as the actual upgrade. */
export function adventureGoal(p: PlayerSave, quests: QuestLog, mapId: string): AdventureGoal {
  const ready = Object.keys(quests).find(
    (id) => quests[id].status === 'ready' && QUESTS[id]?.kind === 'main',
  );
  if (ready)
    return {
      id: 'claim',
      text: `Hoàn thành ${QUESTS[ready].name} · trở về nhận phần thưởng.`,
      label: 'Trả nhiệm vụ',
      destination: { quest: ready },
    };
  const field = fieldForLevel(p.level),
    realm = realmFor(p.realmIndex),
    cost = realm.breakthrough;
  const capped = !!cost && p.level >= realm.maxLevel && p.exp >= expToNext(p.level);
  if (capped && cost) {
    const pills = breakthroughPillCount(p.realmIndex),
      have = p.inventory.pha_canh_dan ?? 0;
    if (have < pills)
      return {
        id: 'pills',
        text: `Bình cảnh ${realm.name} · luyện Phá Cảnh Đan để đột phá. Nguyên liệu săn tại ${field.name}.`,
        label: 'Đan Phòng',
        destination: { menu: 'journey', section: 'alchemy' },
        progress: { value: have, max: pills, label: 'Phá Cảnh Đan' },
      };
    if (p.linhKhi < cost.linhKhi)
      return {
        id: 'energy',
        text: `Đột phá cần ${cost.linhKhi.toLocaleString('vi-VN')} Linh Khí · tọa thiền tại Linh Đài tông môn.`,
        label: 'Về tông môn',
        destination: { travel: adventure(p).boundSect },
        progress: { value: p.linhKhi, max: cost.linhKhi, label: 'Linh Khí' },
      };
    if ((p.inventory.linh_thach ?? 0) < cost.linhThach)
      return {
        id: 'stones',
        text: 'Đủ đan và Linh Khí · săn yêu thú, vượt phó bản để bổ sung Linh Thạch.',
        label: 'Đến vùng luyện',
        destination: { travel: field.id },
        progress: { value: p.inventory.linh_thach ?? 0, max: cost.linhThach, label: 'Linh Thạch' },
      };
    const atSect = ['dai_thua_vien', 'linh_son_tong'].includes(mapId);
    return {
      id: 'breakthrough',
      text: 'Đã đủ EXP, đan dược và linh lực · chuẩn bị vượt Thiên Kiếp để sang cảnh giới mới.',
      label: atSect ? 'Đột phá' : 'Về Linh Đài',
      destination: atSect ? { menu: 'cultivate' } : { travel: adventure(p).boundSect },
    };
  }
  if (!p.equipment.weapon)
    return {
      id: 'weapon',
      text: 'Trang bị vũ khí để tăng công trước khi tiếp tục hành trình.',
      label: 'Trang bị',
      destination: { menu: 'character' },
    };
  if (enhancementLevel(p.adventure?.enhancements[p.equipment.weapon]) < 1) {
    const have = p.inventory[ENHANCEMENT_STONE] ?? 0;
    return have > 0
      ? {
          id: 'enhance',
          text: 'Đã có Đá Cường Hóa · nâng vũ khí lên +1 để tăng sức mạnh.',
          label: 'Cường hóa',
          destination: { menu: 'character' },
        }
      : {
          id: 'enhance-stone',
          text: 'Vượt phó bản để nhận Đá Cường Hóa, chuẩn bị nâng vũ khí lên +1.',
          label: 'Kiếm đá',
          destination: { menu: 'dungeon' },
          progress: { value: 0, max: 1, label: 'Đá Cường Hóa' },
        };
  }
  const life = lifeProgress(p),
    pet = COMPANIONS.find(
      (c) => !life.companions[c.id] && (p.adventure?.beastSeals[c.id] ?? 0) >= c.cost,
    );
  if (!life.companion && (pet || Object.keys(life.companions).length))
    return {
      id: 'companion',
      text: pet
        ? `Đã đủ dấu chiến thắng để thu phục ${pet.name}.`
        : 'Chọn linh thú đã nhận chủ và cho xuất chiến để hỗ trợ bạn.',
      label: 'Linh thú',
      destination: { menu: 'journey', section: 'companions' },
    };
  if (p.level >= MAX_LEVEL)
    return {
      id: 'endgame',
      text: 'Đã đạt giới hạn cấp · mời tổ đội chinh phục boss và phó bản cao cấp.',
      label: 'Phó bản',
      destination: { menu: 'dungeon' },
    };
  return {
    id: 'exp',
    text: `Luyện tại ${field.name} · tiến tới cấp ${p.level + 1}, tích nguyên liệu cho ${realm.name}.`,
    label: mapId === field.id ? 'Xem phó bản' : 'Đến vùng luyện',
    destination: mapId === field.id ? { menu: 'dungeon' } : { travel: field.id },
    progress: { value: p.exp, max: expToNext(p.level), label: `EXP lên cấp ${p.level + 1}` },
  };
}
