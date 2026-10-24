export const MAX_ENHANCEMENT = 12;
export const ENHANCEMENT_STONE = 'tinh_luyen_thach';
const RATES = [1, 0.95, 0.9, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.18, 0.12];
export function enhancementLevel(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.min(MAX_ENHANCEMENT, Math.floor(value!))) : 0;
}
export function enhanceChance(level: number) {
  return RATES[enhancementLevel(level)] ?? 0;
}
export function enhanceCost(level: number): Record<string, number> {
  return level >= MAX_ENHANCEMENT
    ? {}
    : { [ENHANCEMENT_STONE]: 1 + Math.floor(enhancementLevel(level) / 3) };
}
