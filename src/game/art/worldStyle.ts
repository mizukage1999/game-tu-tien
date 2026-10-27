import type Phaser from 'phaser';
import { makeCanvas } from './canvas';
import { WORLD_PROPS } from './world';

export const WORLD_STYLE_ATLASES = ['world-buildings-v4', 'world-nature-v4', 'world-props-v4', 'world-materials-v4', 'world-vistas-v4'] as const;

type Entry = { keys: string[]; cell: number; height: number; originY?: number; fade?: boolean; ground?: boolean; glowY?: number; tint?: number; region?: [number, number, number, number] };
const SHEETS: { atlas: string; columns: number; rows: number; entries: Entry[] }[] = [
  { atlas: 'world-buildings-v4', columns: 3, rows: 2, entries: [
    { keys: ['sect-hall'], cell: 0, height: 340, originY: .90, fade: true, region: [20/1536, 30/1024, 565/1536, 520/1024] },
    { keys: ['sect-pavilion'], cell: 1, height: 245, originY: .91, fade: true, region: [600/1536, 50/1024, 420/1536, 495/1024] },
    { keys: ['sect-gate'], cell: 2, height: 250, originY: .94, fade: true, region: [1060/1536, 40/1024, 450/1536, 490/1024] },
    { keys: ['sect-wall'], cell: 3, height: 145, originY: .80, fade: true, region: [35/1536, 580/1024, 470/1536, 400/1024] },
    { keys: ['sect-bridge'], cell: 4, height: 125, originY: .57, ground: true, region: [575/1536, 625/1024, 450/1536, 355/1024] },
    { keys: ['world-market-house'], cell: 5, height: 240, originY: .90, fade: true, region: [1080/1536, 555/1024, 430/1536, 430/1024] },
  ] },
  { atlas: 'world-nature-v4', columns: 3, rows: 2, entries: [
    { keys: ['sect-cherry'], cell: 0, height: 230, fade: true },
    { keys: ['world-bamboo'], cell: 1, height: 235, fade: true },
    { keys: ['world-tree', 'biome-pine'], cell: 2, height: 235, fade: true },
    { keys: ['biome-autumn'], cell: 2, height: 220, tint: 0xd6a17b, fade: true },
    { keys: ['world-waterfall'], cell: 3, height: 335, originY: .94, fade: true },
    { keys: ['world-cave'], cell: 4, height: 250, originY: .90, fade: true },
    { keys: ['world-crystal'], cell: 5, height: 145, originY: .91 },
  ] },
  { atlas: 'world-props-v4', columns: 4, rows: 3, entries: [
    { keys: ['court-column'], cell: 0, height: 200, fade: true },
    { keys: ['court-column-banner'], cell: 1, height: 200, fade: true },
    { keys: ['court-lantern'], cell: 2, height: 155, glowY: 78 },
    { keys: ['court-stone-post'], cell: 3, height: 95 },
    { keys: ['court-railing'], cell: 4, height: 92, originY: .79 },
    { keys: ['court-banner'], cell: 5, height: 150, fade: true },
    { keys: ['court-notice'], cell: 6, height: 125, fade: true },
    { keys: ['court-burner'], cell: 7, height: 105, originY: .87 },
    { keys: ['court-planter'], cell: 8, height: 74, originY: .88 },
    { keys: ['world-market-stall'], cell: 9, height: 140, originY: .88, fade: true },
    { keys: ['world-timber-bridge'], cell: 10, height: 145, originY: .57, ground: true },
    { keys: ['biome-shrub'], cell: 11, height: 52, originY: .88, ground: true },
  ] },
];

/** Clean rectangular atlas cells, alpha retained all the way to the renderer. */
export function registerWorldStyle(scene: Phaser.Scene) {
  for (const sheet of SHEETS) {
    if (!scene.textures.exists(sheet.atlas)) continue;
    const texture = scene.textures.get(sheet.atlas), source = texture.getSourceImage() as HTMLImageElement;
    const bounds = new Map<number, [number, number, number, number]>();
    for (const entry of sheet.entries) {
      let region = bounds.get(entry.cell);
      const registered = entry.keys.find(key => texture.has(key));
      if (!region && registered) { const f = texture.get(registered); region = [f.cutX, f.cutY, f.cutWidth, f.cutHeight]; }
      if (!region) {
        // Roof spans and stair baselines are hand-checked on the architecture
        // sheet; square packing is used only where the source follows it.
        const cw = Math.floor(entry.region ? entry.region[2] * source.width : source.width / sheet.columns);
        const ch = Math.floor(entry.region ? entry.region[3] * source.height : source.height / sheet.rows);
        const sx = Math.floor(entry.region ? entry.region[0] * source.width : entry.cell % sheet.columns * cw);
        const sy = Math.floor(entry.region ? entry.region[1] * source.height : Math.floor(entry.cell / sheet.columns) * ch);
        const [, ctx] = makeCanvas(cw, ch);
        ctx.drawImage(source, sx, sy, cw, ch, 0, 0, cw, ch);
        const data = ctx.getImageData(0, 0, cw, ch).data;
        let l = cw, t = ch, r = -1, b = -1;
        // Exclude faint grid separators at the edge of the props sheet.
        for (let y = 5; y < ch - 5; y++) for (let x = 5; x < cw - 5; x++) {
          if (data[(y * cw + x) * 4 + 3] < 64) continue;
          l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y);
        }
        if (r < l) continue;
        region = [sx + Math.max(5, l - 2), sy + Math.max(5, t - 2), Math.min(cw - 6, r + 2) - Math.max(5, l - 2) + 1, Math.min(ch - 6, b + 2) - Math.max(5, t - 2) + 1];
        bounds.set(entry.cell, region);
      }
      for (const key of entry.keys) {
        if (!texture.has(key)) texture.add(key, 0, ...region);
        WORLD_PROPS[key] = {
          ...WORLD_PROPS[key], atlas: sheet.atlas,
          region: [region[0] / source.width, region[1] / source.height, region[2] / source.width, region[3] / source.height],
          height: entry.height, originX: .5, originY: entry.originY ?? .96,
          fade: entry.fade, ground: entry.ground, glowY: entry.glowY, tint: entry.tint,
          fallback: WORLD_PROPS[key]?.fallback ?? 'rock',
        };
      }
    }
  }
  if (scene.textures.exists('world-vistas-v4')) {
    const texture = scene.textures.get('world-vistas-v4'), image = texture.getSourceImage() as HTMLImageElement;
    for (const [i, key] of ['sect', 'forest', 'fire', 'cave'].entries()) if (!texture.has(key)) {
      texture.add(key, 0, i % 2 * image.width / 2, Math.floor(i / 2) * image.height / 2, image.width / 2, image.height / 2);
    }
  }
}
