/** Falling poses have shorter rows: locate the eight authored bands, not eight equal crops. */
export function authoredRowEdges(pixels: Uint8ClampedArray, width: number, height: number) {
  const bands: { top: number; bottom: number }[] = [];
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] >= 128) count++;
    if (count < Math.max(8, width * 0.008)) continue;
    const last = bands[bands.length - 1];
    if (last && y - last.bottom <= 8) last.bottom = y;
    else bands.push({ top: y, bottom: y });
  }
  if (bands.length !== 8) return Array.from({ length: 9 }, (_, i) => Math.round((i * height) / 8));
  return [0, ...bands.slice(1).map((b, i) => Math.floor((bands[i].bottom + b.top) / 2)), height];
}
