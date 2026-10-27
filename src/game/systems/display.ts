/** Cap the back buffer to keep high DPI phones within a modest GPU budget. */
export function renderDensity(width: number, height: number, deviceRatio: number) {
  return Math.max(
    1,
    Math.min(
      Number.isFinite(deviceRatio) ? deviceRatio : 1,
      2,
      Math.sqrt(4_000_000 / Math.max(1, width * height)),
    ),
  );
}

export function preferredDensity(
  width: number,
  height: number,
  deviceRatio: number,
  quality: 'light' | 'balanced' | 'sharp',
) {
  const ratio = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  // Painted art needs real device pixels. Supersampling above the device ratio
  // only wastes memory; 8 MP covers a 3x phone in either orientation.
  const pixels = quality === 'sharp' ? 8_000_000 : 4_000_000;
  return Math.max(
    1,
    Math.min(
      ratio,
      quality === 'light' ? 1 : quality === 'sharp' ? 3 : 2,
      Math.sqrt(pixels / Math.max(1, width * height)),
    ),
  );
}

export function adaptiveDensity(
  width: number,
  height: number,
  deviceRatio: number,
  quality: 'light' | 'balanced' | 'sharp',
) {
  // Adapt particles and decorations, not the framebuffer. Changing it during
  // combat blurred every sprite and reallocated large WebGL render targets.
  return preferredDensity(width, height, deviceRatio, quality);
}

/** Pick a fixed startup budget; never reallocate the buffer in response to FPS. */
export function startupDensity(
  width: number,
  height: number,
  ratio: number,
  quality: 'light' | 'balanced' | 'sharp',
  limits: { mobile: boolean; memory?: number; mode: 0 | 1 | 2; maxEdge?: number },
) {
  const budget =
    limits.mode === 2
      ? 1
      : limits.mode === 1 || (limits.mobile && !!limits.memory && limits.memory <= 2)
        ? 1.5
        : limits.mobile && !!limits.memory && limits.memory <= 4
          ? 2
          : 3;
  const edge =
    limits.maxEdge && limits.maxEdge > 0 ? limits.maxEdge / Math.max(1, width, height) : Infinity;
  return Math.max(0.5, Math.min(adaptiveDensity(width, height, ratio, quality), budget, edge));
}

export function worldZoom(width: number, height: number) {
  return Math.max(0.65, Math.min(1.5, height / 840, width / 1200));
}
