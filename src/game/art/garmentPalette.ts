import type { OUTFITS } from '../../data/cosmetics';
export type GarmentPalette = (typeof OUTFITS)[number];

function huePixel(
  bytes: Uint8ClampedArray,
  at: number,
  hue: number,
  saturation: number,
  value: number,
) {
  const h = hue / 60,
    c = value * saturation,
    x = c * (1 - Math.abs((h % 2) - 1)),
    m = value - c;
  const sector = Math.floor(h) % 6;
  bytes[at] = Math.round(
    255 * ((sector === 0 || sector === 5 ? c : sector === 1 || sector === 4 ? x : 0) + m),
  );
  bytes[at + 1] = Math.round(
    255 * ((sector === 1 || sector === 2 ? c : sector === 0 || sector === 3 ? x : 0) + m),
  );
  bytes[at + 2] = Math.round(
    255 * ((sector === 3 || sector === 4 ? c : sector === 2 || sector === 5 ? x : 0) + m),
  );
}

/** Dye a single authored cell, keeping alpha, dark hair, head, skin and outer gold trim. */
export function dyeGarmentCell(
  bytes: Uint8ClampedArray,
  width: number,
  height: number,
  box: { x: number; y: number; width: number; height: number },
  palette: GarmentPalette,
) {
  let left = box.x + box.width,
    top = box.y + box.height,
    right = box.x,
    bottom = box.y;
  const endX = Math.min(width, box.x + box.width),
    endY = Math.min(height, box.y + box.height);
  for (let y = box.y; y < endY; y++)
    for (let x = box.x; x < endX; x++) {
      if (bytes[(y * width + x) * 4 + 3] < 48) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  if (right <= left || bottom <= top) return;
  const spanX = right - left,
    spanY = bottom - top;
  for (let y = Math.ceil(top + spanY * 0.24); y <= bottom; y++)
    for (let x = left; x <= right; x++) {
      const at = (y * width + x) * 4;
      if (bytes[at + 3] < 16) continue;
      const r = bytes[at],
        g = bytes[at + 1],
        b = bytes[at + 2],
        max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      if (max < 42) continue;
      const saturation = (max - min) / max,
        core = x > left + spanX * 0.3 && x < left + spanX * 0.7 && y > top + spanY * 0.48,
        skin = r > g && g > b && saturation > 0.08 && saturation < 0.55,
        gold = r > g * 1.04 && g > b * 1.18 && saturation > 0.45;
      if (skin || (gold && !core)) continue;
      if (saturation < 0.16) {
        if (!core || max < 105) continue;
        huePixel(bytes, at, palette.hue, palette.neutral, Math.min(1, (max / 255) * palette.light));
      } else {
        huePixel(
          bytes,
          at,
          palette.hue,
          Math.min(0.92, saturation * 0.35 + palette.saturation * 0.65),
          Math.min(1, (max / 255) * palette.light),
        );
      }
    }
}
