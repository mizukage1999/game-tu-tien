export interface ZoneDef {
  id: string;
  name: string;
  /** Tile rectangle [x, y, w, h]. */
  rect: [number, number, number, number];
  /** Linh khí multiplier while meditating inside. */
  rate: number;
}

export const BASE_MEDITATE_RATE = 0.5;

/** Higher realms add actual lightning waves, rather than a random success roll. */
export function tribulationPlan(realmIndex: number) {
  const target = Math.max(1, Math.min(11, Math.floor(realmIndex) + 1));
  const waves = Math.min(9, 4 + Math.floor(target / 2));
  return {
    waves,
    intervalMs: 3500,
    warningMs: target >= 6 ? 900 : 1050,
    durationMs: (waves + 1) * 3500 + 500,
    radius: 76 + Math.min(target, 6) * 2,
    damagePct: 0.32 + Math.min(target - 1, 6) * 0.01,
    threats: target >= 8 ? 3 : target >= 4 ? 2 : 1,
  };
}

/** Kept in one place so the menu and the gameplay action enforce the same gates. */
export function breakthroughBlocker(
  player: PlayerSave,
  mapId: string,
  alive: boolean,
): string | null {
  if (!alive) return 'Cần hồi phục trước khi đột phá.';
  if (isChildhood(player)) return 'Hãy hoàn thành câu chuyện Vương Gia Thôn và nhập môn trước.';
  if (lifeProgress(player).retreat) return 'Hãy hoàn thành bế quan trước khi đột phá.';
  if (!['dai_thua_vien', 'linh_son_tong'].includes(mapId))
    return 'Hãy về Linh Đài trong tông môn để độ kiếp.';
  const check = checkBreakthrough(player, player.linhKhi, player.inventory.linh_thach ?? 0);
  if (!check.ok) return check.reason;
  if ((player.inventory.pha_canh_dan ?? 0) < 1)
    return 'Cần 1 Phá Cảnh Đan. Mở Tiên Lộ → Đan Phòng để luyện.';
  return null;
}

export interface MeditateGain {
  linhKhi: number;
  exp: number;
  hpPct: number;
  mpPct: number;
}

/** Gain per second of meditation. */
export function meditateGain(level: number, zoneRate: number | null): MeditateGain {
  const rate = zoneRate ?? BASE_MEDITATE_RATE;
  return {
    linhKhi: Math.max(1, Math.round(2 * rate * (1 + level * 0.15))),
    exp: Math.max(1, Math.round(4 * rate * (1 + level * 0.25))),
    hpPct: 0.04 * rate,
    mpPct: 0.06 * rate,
  };
}

export function zoneAt(zones: ZoneDef[], tileX: number, tileY: number): ZoneDef | null {
  for (const z of zones) {
    const [x, y, w, h] = z.rect;
    if (tileX >= x && tileX < x + w && tileY >= y && tileY < y + h) return z;
  }
  return null;
}
import type { PlayerSave } from './save';
import { checkBreakthrough } from './progression';
import { isChildhood } from './origin';
import { lifeProgress } from './life';
