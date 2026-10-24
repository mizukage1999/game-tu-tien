/** Ignore transparent sprite padding when matching the height of two characters. */
export function visibleVerticalBounds(data: Uint8ClampedArray, width: number, height: number) {
  let top = height,
    bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] >= 48) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  return bottom < top ? { top: 0, bottom: height - 1 } : { top, bottom };
}
