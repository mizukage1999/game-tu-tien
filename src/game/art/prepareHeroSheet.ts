import { directionalCell } from './heroAtlas';
import {
  HERO_CAST_ROW,
  HERO_RUN_ROWS,
  HERO_SHEET_ROWS,
  HERO_RUN_LEG_SCALE,
  runningPoseY,
  heroSheetMetrics,
} from './heroSheetLayout';
import { runPoseBounds } from './runPoseBounds';

/** Asset-build only: keep authored shoes, eight facings, scale and feet anchors. */
export function prepareHeroSheet(
  row: number,
  source: HTMLImageElement,
  casting: HTMLImageElement,
  child: boolean,
  running: HTMLImageElement,
) {
  const { cell, foot, bodyHeight } = heroSheetMetrics(child);
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
  canvas.height = cell * HERO_SHEET_ROWS;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  const draw = (p: ReturnType<typeof crop>, col: number, row: number, factor = scale) =>
    ctx.drawImage(
      p.image,
      p.x,
      p.y,
      p.w,
      p.h,
      col * cell + (cell - p.w * factor) / 2,
      row * cell + foot - p.h * factor,
      p.w * factor,
      p.h * factor,
    );
  idle.forEach((p, col) => draw(p, col, 0));
  cast.forEach((p, col) => draw(p, col, HERO_CAST_ROW));
  // Source columns are facings, source rows are successive gait phases.
  // Use ONE scale for all 64 poses, not per-frame stretching or an idle bob.
  const runCanvas = document.createElement('canvas');
  runCanvas.width = running.width;
  runCanvas.height = running.height;
  const runContext = runCanvas.getContext('2d', { willReadFrequently: true })!;
  runContext.drawImage(running, 0, 0);
  const pixels = runContext.getImageData(0, 0, running.width, running.height).data;
  const poses = HERO_RUN_ROWS.map((_, phase) =>
    idle.map((_, col) => {
      const x = Math.round((col * running.width) / 8),
        y = Math.round((phase * running.height) / 8),
        right = Math.round(((col + 1) * running.width) / 8),
        bottom = Math.round(((phase + 1) * running.height) / 8);
      const bounds = runPoseBounds(pixels, running.width, x, y, right, bottom);
      if (!bounds) throw Error(`Missing running pose: hero ${row}, ${child}, ${phase}, ${col}`);
      return { image: running, ...bounds };
    }),
  );
  const runScale = Math.min(
    bodyHeight / Math.max(...poses.flat().map((p) => p.h)),
    (cell - 12) / Math.max(...poses.flat().map((p) => p.w)),
  );
  poses.forEach((directions, phase) =>
    directions.forEach((p, col) => draw(p, col, HERO_RUN_ROWS[phase], runScale)),
  );
  const gait = document.createElement('canvas');
  gait.width = cell * 8;
  gait.height = cell;
  const gaitContext = gait.getContext('2d')!;
  const hip = Math.round(cell * 0.65),
    hipY = runningPoseY(hip, child);
  for (const row of HERO_RUN_ROWS) {
    gaitContext.clearRect(0, 0, gait.width, cell);
    gaitContext.drawImage(canvas, 0, row * cell, gait.width, cell, 0, 0, gait.width, cell);
    ctx.clearRect(0, row * cell, gait.width, cell);
    ctx.drawImage(
      gait,
      0,
      0,
      gait.width,
      hip,
      0,
      row * cell + runningPoseY(0, child),
      gait.width,
      hip,
    );
    ctx.drawImage(
      gait,
      0,
      hip,
      gait.width,
      cell - hip,
      0,
      row * cell + hipY,
      gait.width,
      (cell - hip) * HERO_RUN_LEG_SCALE,
    );
  }
  return canvas;
}
