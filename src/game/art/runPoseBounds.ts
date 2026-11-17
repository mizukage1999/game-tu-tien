/** Isolate the main figure, excluding stray pixels from a neighbouring source cell. */
export function runPoseBounds(
  pixels: Uint8ClampedArray,
  imageWidth: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
) {
  const width = right - left,
    height = bottom - top;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let largest = 0,
    result: { x: number; y: number; w: number; h: number } | null = null;
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const start = y * width + x;
      if (seen[start] || pixels[((top + y) * imageWidth + left + x) * 4 + 3] < 48) continue;
      let head = 0,
        tail = 1,
        l = x,
        t = y,
        r = x,
        b = y;
      queue[0] = start;
      seen[start] = 1;
      while (head < tail) {
        const index = queue[head++],
          cy = Math.floor(index / width),
          cx = index % width;
        l = Math.min(l, cx);
        r = Math.max(r, cx);
        t = Math.min(t, cy);
        b = Math.max(b, cy);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx,
              ny = cy + dy,
              next = ny * width + nx;
            if (nx < 1 || ny < 1 || nx >= width - 1 || ny >= height - 1 || seen[next]) continue;
            seen[next] = 1;
            if (pixels[((top + ny) * imageWidth + left + nx) * 4 + 3] >= 48) queue[tail++] = next;
          }
      }
      if (tail > largest) {
        largest = tail;
        l = Math.max(1, l - 2);
        t = Math.max(1, t - 2);
        r = Math.min(width - 2, r + 2);
        b = Math.min(height - 2, b + 2);
        result = { x: left + l, y: top + t, w: r - l + 1, h: b - t + 1 };
      }
    }
  return result;
}
