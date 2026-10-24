import { ITEMS } from '../../data';
import type { PlayerSave } from './save';

export function missingMaterials(player: PlayerSave, cost: Record<string, number>): string | null {
  const missing = Object.entries(cost).flatMap(([id, qty]) => {
    const have = id === 'linh_khi' ? player.linhKhi : (player.inventory[id] ?? 0);
    return have < qty
      ? [`${id === 'linh_khi' ? 'Linh Khí' : (ITEMS[id]?.name ?? id)} ×${qty - have}`]
      : [];
  });
  return missing.length ? `Thiếu: ${missing.join(', ')}.` : null;
}
