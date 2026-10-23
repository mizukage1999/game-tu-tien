import type { MapDef, PortalDef } from '../maps/MapBuilder';
import type { QuestLog } from './quest';

export interface TravelContext { childhood?: boolean; quests?: QuestLog }
export function questGateReason(id: string, context: TravelContext) {
  if (id.startsWith('village_') && !context.childhood) return null;
  return context.quests?.[id]?.status === 'done' ? null : id.startsWith('village_')
    ? 'Hãy từ biệt cha mẹ trước khi rời Vương Gia Thôn.'
    : 'Cần hoàn thành Ngọc Tuyền Sau Màn Sương để mở cổ ấn vào bí cảnh.';
}
export function portalGateReason(portal: PortalDef, context: TravelContext) {
  if (portal.admission && context.childhood) return 'Hãy hoàn thành khảo hạch và nhận lệnh bài nhập môn trước.';
  return portal.requiresQuest ? questGateReason(portal.requiresQuest, context) : null;
}
export function mapGateReason(map: MapDef, context: TravelContext) {
  if (context.childhood && !['vuong_gia_thon', 'ngoai_mon'].includes(map.id)) return 'Cần hoàn thành chương mở đầu và nhập môn trước.';
  return map.requiresQuest ? questGateReason(map.requiresQuest, context) : null;
}
