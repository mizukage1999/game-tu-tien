import { HERO_DIRECTIONS } from './heroDirections';
import { runPoseBounds } from './runPoseBounds';
import { authoredRowEdges } from './authoredRowEdges';
import type { HeroId } from '../../data/heroes';
import type { HeroActionFrame, HeroActionSource, HeroHand } from './heroActionSpec';

/** Build-only. Crop complete authored figures; preserve scale, shoes and virtual foot anchors. */
export function prepareHeroActions(
  images: Record<HeroActionSource, HTMLImageElement>,
  hero: HeroId,
) {
  const entries: {
    name: string;
    canvas: HTMLCanvasElement;
    ox: number;
    oy: number;
    hand?: HeroHand;
  }[] = [];
  const audit: { source: string; phase: number; dir: string; width: number; height: number }[] = [];
  for (const [source, image] of Object.entries(images)) {
    const scan = document.createElement('canvas');
    scan.width = image.width;
    scan.height = image.height;
    const s = scan.getContext('2d', { willReadFrequently: true })!;
    s.drawImage(image, 0, 0);
    const bytes = s.getImageData(0, 0, scan.width, scan.height).data;
    const edges = authoredRowEdges(bytes, scan.width, scan.height);
    const poses = Array.from({ length: 8 }, (_, phase) =>
      HERO_DIRECTIONS.map((dir, col) => {
        const box = runPoseBounds(
          bytes,
          scan.width,
          Math.round((col * scan.width) / 8),
          edges[phase],
          Math.round(((col + 1) * scan.width) / 8),
          edges[phase + 1],
        );
        if (!box) throw Error('Empty ' + hero + ' ' + source + ' ' + phase + ' ' + dir);
        return { ...box, dir, col, phase };
      }),
    );
    const ready = source === 'death' ? poses[0] : [...poses[0], ...poses[7]];
    // A prone body keeps standing scale; it is never enlarged to fill the square.
    const scale = Math.min(
      108 / Math.max(...ready.map((p) => p.h)),
      148 / Math.max(...poses.flat().map((p) => p.w)),
      146 / Math.max(...poses.flat().map((p) => p.h)),
    );
    for (const pose of poses.flat()) {
      const phase =
        source === 'power-extra'
          ? 8 + (pose.phase % 4)
          : source === 'idle-hurt'
            ? pose.phase % 4
            : pose.phase;
      const action =
        source === 'power-extra'
          ? pose.phase < 4
            ? 'skill_strong'
            : 'skill_ultimate'
          : source === 'idle-hurt'
            ? pose.phase < 4
              ? 'idle'
              : 'hurt'
            : source === 'death'
              ? 'downed'
              : source === 'attack'
                ? 'attack'
                : 'skill_' + source;
      const full = document.createElement('canvas');
      full.width = full.height = 160;
      const ctx = full.getContext('2d', { willReadFrequently: true })!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        image,
        pose.x,
        pose.y,
        pose.w,
        pose.h,
        (160 - pose.w * scale) / 2,
        150 - pose.h * scale,
        pose.w * scale,
        pose.h * scale,
      );
      const pixels = ctx.getImageData(0, 0, 160, 160).data;
      let l = 160,
        t = 160,
        r = -1,
        b = -1;
      for (let y = 0; y < 160; y++)
        for (let x = 0; x < 160; x++)
          if (pixels[(y * 160 + x) * 4 + 3] > 0) {
            l = Math.min(l, x);
            r = Math.max(r, x);
            t = Math.min(t, y);
            b = Math.max(b, y);
          }
      if (r < l) throw Error('Empty prepared ' + hero + ' ' + source);
      l = Math.max(0, l - 1);
      t = Math.max(0, t - 1);
      r = Math.min(159, r + 1);
      b = Math.min(159, b + 1);
      const canvas = document.createElement('canvas');
      canvas.width = r - l + 1;
      canvas.height = b - t + 1;
      canvas
        .getContext('2d')!
        .drawImage(full, l, t, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      let hand: HeroHand | undefined;
      if (hero === 'wang_lam') {
        const left = pose.col < 4,
          candidates: { x: number; y: number }[] = [];
        const swing = action === 'attack' && phase >= 2 && phase <= 5;
        for (
          let y = Math.ceil(t + (b - t) * (swing ? 0.18 : 0.3));
          y < Math.min(124, t + (b - t) * (swing ? 0.6 : 0.72));
          y++
        )
          for (let x = l; x <= r; x++) {
            const at = (y * 160 + x) * 4,
              red = pixels[at],
              green = pixels[at + 1],
              blue = pixels[at + 2],
              sat = (red - blue) / Math.max(1, red),
              hue = (60 * (green - blue)) / Math.max(1, red - blue);
            if (
              pixels[at + 3] > 128 &&
              red > 110 &&
              green > 72 &&
              red > green * 1.035 &&
              green > blue * 1.07 &&
              sat > 0.12 &&
              sat < 0.55 &&
              hue >= 10 &&
              hue <= 34
            )
              candidates.push({ x, y });
          }
        const edge = left
          ? Math.min(...candidates.map((p) => p.x))
          : Math.max(...candidates.map((p) => p.x));
        const hipX = left ? 65 : 96;
        const distance = (p: { x: number; y: number }) => (p.x - hipX) ** 2 + (p.y - 103) ** 2;
        const nearest = Math.min(...candidates.map(distance));
        const tip = candidates.filter((p) =>
          swing ? Math.abs(p.x - edge) <= 2 : distance(p) <= nearest + 9,
        );
        const x = tip.length ? tip.reduce((n, p) => n + p.x, 0) / tip.length : left ? 58 : 103;
        const y = tip.length ? tip.reduce((n, p) => n + p.y, 0) / tip.length : 103;
        const facing = [
          [0, 1],
          [-0.7, 0.7],
          [-1, 0],
          [-0.7, -0.7],
          [0, -1],
          [0.7, -0.7],
          [1, 0],
          [0.7, 0.7],
        ][pose.col];
        const vector =
          action === 'attack' && phase >= 2 && phase <= 5 ? facing : [left ? -0.75 : 0.75, 0.7];
        hand = [
          Math.round((x - 80) * 10) / 10,
          Math.round((y - 150) * 10) / 10,
          vector[0],
          vector[1],
        ];
      }
      entries.push({ name: action + '_' + pose.dir + '_' + phase, canvas, ox: l, oy: t, hand });
      audit.push({ source, phase: pose.phase, dir: pose.dir, width: pose.w, height: pose.h });
    }
  }
  const width = 1024,
    gutter = 2,
    frames: Record<string, HeroActionFrame> = {};
  let x = gutter,
    y = gutter,
    rowHeight = 0,
    page = 0,
    usedHeight = gutter;
  const pageHeights: number[] = [];
  const sorted = [...entries].sort(
    (a, b) => b.canvas.height - a.canvas.height || a.name.localeCompare(b.name),
  );
  for (const e of sorted) {
    if (x + e.canvas.width + gutter > width) {
      x = gutter;
      y += rowHeight + gutter * 2;
      rowHeight = 0;
    }
    if (y + e.canvas.height + gutter > 1024) {
      pageHeights.push(Math.ceil(usedHeight / 16) * 16);
      page++;
      x = gutter;
      y = gutter;
      rowHeight = 0;
      usedHeight = gutter;
    }
    frames[e.name] = {
      page,
      x,
      y,
      w: e.canvas.width,
      h: e.canvas.height,
      ox: e.ox,
      oy: e.oy,
      ...(e.hand ? { hand: e.hand } : {}),
    };
    x += e.canvas.width + gutter * 2;
    rowHeight = Math.max(rowHeight, e.canvas.height);
    usedHeight = Math.max(usedHeight, y + e.canvas.height + gutter);
  }
  pageHeights.push(Math.ceil(usedHeight / 16) * 16);
  const canvases = pageHeights.map((height) => {
    if (height > 1024) throw Error('Action page exceeds mobile upload budget: ' + hero);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  });
  for (const e of entries) {
    const f = frames[e.name];
    canvases[f.page].getContext('2d')!.drawImage(e.canvas, f.x, f.y);
  }
  if (entries.length !== 448 || Object.keys(frames).length !== 448)
    throw Error('Incomplete action frames: ' + hero);
  return { canvases, frames, audit };
}
