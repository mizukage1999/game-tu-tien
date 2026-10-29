import {
  wangFrameRect,
  wangSheetLayout,
  WANG_ICON_ORDER,
  WANG_EFFECT_ART,
  type WangEffectArt,
} from '../../data/wangSkills';

const sheets = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, string>();
const icons = new Map<string, string>();
export const WANG_CELL = 256;

/** Slice the painted charge / impact / fade poses into equal animation cells. */
export function buildWangSheet(art: WangEffectArt, source: HTMLImageElement) {
  const old = sheets.get(art.texture);
  if (old) return old;
  const canvas = document.createElement('canvas');
  const { columns, rows, frames, cell } = wangSheetLayout(art);
  canvas.width = cell * columns;
  canvas.height = cell * rows;
  const ctx = canvas.getContext('2d')!;
  for (let frame = 0; frame < frames; frame++) {
    const r = wangFrameRect(
      source.naturalWidth || source.width,
      source.naturalHeight || source.height,
      frame,
      art,
    );
    const scale = cell / r.height;
    const width = r.width * scale;
    ctx.drawImage(
      source,
      r.x,
      r.y,
      r.width,
      r.height,
      cell * (frame % columns) + (cell - width) / 2,
      cell * Math.floor(frame / columns),
      width,
      cell,
    );
  }
  sheets.set(art.texture, canvas);
  urls.set(art.texture, canvas.toDataURL('image/png'));
  const icon = document.createElement('canvas');
  icon.width = icon.height = 96;
  const c = icon.getContext('2d')!;
  const poster = art.grid ? 9 : 3;
  c.drawImage(
    canvas,
    (poster % columns) * cell,
    Math.floor(poster / columns) * cell,
    cell,
    cell,
    0,
    0,
    96,
    96,
  );
  icons.set(art.texture, icon.toDataURL('image/png'));
  return canvas;
}
export function registerWangIcons(source: HTMLImageElement) {
  WANG_ICON_ORDER.forEach((id, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!,
      w = source.naturalWidth / 2,
      h = source.naturalHeight / 2;
    ctx.drawImage(source, (index % 2) * w, Math.floor(index / 2) * h, w, h, 0, 0, 128, 128);
    icons.set(WANG_EFFECT_ART[id].texture, canvas.toDataURL('image/png'));
  });
}
export function wangSheetUrl(art: WangEffectArt) {
  return urls.get(art.texture);
}
export function wangIconUrl(art: WangEffectArt) {
  return icons.get(art.texture);
}
