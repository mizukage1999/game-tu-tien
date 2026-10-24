/** Cap the back buffer to keep high DPI phones within a modest GPU budget. */
export function renderDensity(width: number, height: number, deviceRatio: number) {
  return Math.max(1, Math.min(Number.isFinite(deviceRatio) ? deviceRatio : 1, 2, Math.sqrt(4_000_000 / Math.max(1, width * height))));
}

export function preferredDensity(width: number, height: number, deviceRatio: number, quality: 'light' | 'balanced' | 'sharp') {
  return renderDensity(width, height, quality === 'light' ? 1 : quality === 'sharp' ? deviceRatio * 1.25 : deviceRatio);
}

export function worldZoom(width: number, height: number) {
  return Math.max(0.65, Math.min(1.5, height / 840, width / 1200));
}
