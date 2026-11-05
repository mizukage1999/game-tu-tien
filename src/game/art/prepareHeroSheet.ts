import { directionalCell } from './heroAtlas';

/** Asset-build only: keep authored shoes, eight facings, scale and feet anchors. */
export function prepareHeroSheet(
  row: number,
  source: HTMLImageElement,
  casting: HTMLImageElement,
  child: boolean,
) {
  const cell = child ? 128 : 160,
    foot = child ? 118 : 150,
    bodyHeight = child ? 76 : 108;
  const crop = (image: HTMLImageElement, col: number, cast: boolean) => {
    const [x, y, w, h] = directionalCell(
      child ? 'children' : cast ? 'casting' : 'adults',
      row,
      col,
    );
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
    const bytes = ctx.getImageData(0, 0, w, h).data;
    let l = w,
      t = h,
      r = 0,
      b = 0;
    for (let cy = 2; cy < h - 2; cy++)
      for (let cx = 2; cx < w - 2; cx++)
        if (bytes[(cy * w + cx) * 4 + 3] > 110) {
          l = Math.min(l, cx);
          r = Math.max(r, cx);
          t = Math.min(t, cy);
          b = Math.max(b, cy);
        }
    return { image, x: x + l, y: y + t, w: Math.max(1, r - l + 1), h: Math.max(1, b - t + 1) };
  };
  const idle = Array.from({ length: 8 }, (_, col) => crop(source, col, false));
  const cast = child ? idle : Array.from({ length: 8 }, (_, col) => crop(casting, col, true));
  const scale = Math.min(
    bodyHeight / Math.max(...idle.map((p) => p.h)),
    (cell - 12) / Math.max(...idle.concat(cast).map((p) => p.w)),
  );
  const canvas = document.createElement('canvas');
  canvas.width = cell * 8;
  canvas.height = cell * 4;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  const draw = (p: ReturnType<typeof crop>, col: number, row: number, lift = 0) =>
    ctx.drawImage(
      p.image,
      p.x,
      p.y,
      p.w,
      p.h,
      col * cell + (cell - p.w * scale) / 2,
      row * cell + foot - p.h * scale + lift,
      p.w * scale,
      p.h * scale,
    );
  idle.forEach((p, col) => {
    draw(p, col, 0);
    draw(p, col, 1, -1.5);
    draw(p, col, 2, 1.5);
  });
  cast.forEach((p, col) => draw(p, col, 3));
  return canvas;
}
