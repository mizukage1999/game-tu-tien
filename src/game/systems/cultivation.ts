export interface ZoneDef {
  id: string;
  name: string;
  /** Tile rectangle [x, y, w, h]. */
  rect: [number, number, number, number];
  /** Linh khí multiplier while meditating inside. */
  rate: number;
}

export const BASE_MEDITATE_RATE = 0.5;

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
