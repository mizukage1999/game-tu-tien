import { wangFrameRect, type WangEffectArt } from '../../data/wangSkills';

const sheets = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, string>();
const icons = new Map<string, string>();
export const WANG_CELL = 256;

/** Slice the painted charge / impact / fade poses into equal animation cells. */
export function buildWangSheet(art: WangEffectArt, source: HTMLImageElement) {
  const old = sheets.get(art.texture);
  if (old) return old;
  const canvas = document.createElement('canvas');
  canvas.width = WANG_CELL * 6;
  canvas.height = WANG_CELL;
  const ctx = canvas.getContext('2d')!;
  for (let frame = 0; frame < 6; frame++) {
    const r = wangFrameRect(
      source.naturalWidth || source.width,
      source.naturalHeight || source.height,
      frame,
    );
    const scale = WANG_CELL / r.height;
    const width = r.width * scale;
    ctx.drawImage(
      source,
      r.x,
      r.y,
      r.width,
      r.height,
      WANG_CELL * frame + (WANG_CELL - width) / 2,
      0,
      width,
      WANG_CELL,
    );
  }
  sheets.set(art.texture, canvas);
  urls.set(art.texture, canvas.toDataURL('image/png'));
  const icon = document.createElement('canvas');
  icon.width = icon.height = 96;
  const c = icon.getContext('2d')!;
  c.fillStyle = '#08101f';
  c.fillRect(0, 0, 96, 96);
  c.drawImage(canvas, WANG_CELL * 3 + 44, 25, 168, 215, 0, 0, 96, 96);
  icons.set(art.texture, icon.toDataURL('image/png'));
  return canvas;
}
export function wangSheetUrl(art: WangEffectArt) {
  return urls.get(art.texture);
}
export function wangIconUrl(art: WangEffectArt) {
  return icons.get(art.texture);
}
