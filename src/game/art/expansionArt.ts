import type Phaser from 'phaser';
import { makeCanvas } from './canvas';
import { CHARACTERS, RIGS } from './generate';
export const EXPANSION_ATLASES = [
  'mu-uyen-child',
  'wanderers',
  'spirit-companions',
  'hero-wang-simple',
  'hero-li-simple',
  'dungeon-bosses-v3',
] as const;
export function registerExpansionArt(scene: Phaser.Scene) {
  RIGS.simple = {
    frameWidth: 136,
    frameHeight: 136,
    originY: 0.97,
    dirs: ['side'],
    anims: {
      idle: { frames: 2, frameRate: 2, repeat: -1 },
      run: { frames: 4, frameRate: 7, repeat: -1 },
      attack: { frames: 2, frameRate: 8, repeat: 0 },
      attack_1: { frames: 2, frameRate: 8, repeat: 0, hitFrame: 1 },
      attack_2: { frames: 2, frameRate: 8, repeat: 0, hitFrame: 1 },
      attack_3: { frames: 2, frameRate: 8, repeat: 0, hitFrame: 1 },
      cast: { frames: 2, frameRate: 6, repeat: 0, hitFrame: 1 },
      hurt: { frames: 2, frameRate: 10, repeat: 0 },
      downed: { frames: 2, frameRate: 4, repeat: 0 },
      meditate: { frames: 2, frameRate: 1, repeat: -1 },
    },
  };
  for (const [source, key, palette] of [
    ['hero-wang-simple', 'hero_wang_simple', 'player_male'],
    ['hero-li-simple', 'hero_li_simple', 'player'],
  ]) {
    if (!scene.textures.exists(source)) continue;
    CHARACTERS[key] = { rig: 'simple', palette };
    const src = scene.textures.get(source).getSourceImage() as HTMLImageElement;
    const [out, ctx] = makeCanvas(544, 272);
    ctx.imageSmoothingQuality = 'high';
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 4; col++) {
        const [cell, c] = makeCanvas(Math.floor(src.width / 4), Math.floor(src.height / 2));
        c.drawImage(
          src,
          (col * src.width) / 4,
          (row * src.height) / 2,
          src.width / 4,
          src.height / 2,
          0,
          0,
          cell.width,
          cell.height,
        );
        const data = c.getImageData(0, 0, cell.width, cell.height).data;
        let left = cell.width,
          top = cell.height,
          right = 0,
          bottom = 0;
        for (let y = 0; y < cell.height; y++)
          for (let x = 0; x < cell.width; x++)
            if (data[(y * cell.width + x) * 4 + 3] > 48) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        const w = right - left + 1,
          h = bottom - top + 1,
          k = Math.min(116 / w, 112 / h);
        if (w > 0 && h > 0)
          ctx.drawImage(
            cell,
            left,
            top,
            w,
            h,
            col * 136 + (136 - w * k) / 2,
            row * 136 + 130 - h * k,
            w * k,
            h * k,
          );
      }
    const tex = scene.textures.addCanvas(key, out);
    for (const [anim, def] of Object.entries(RIGS.simple.anims))
      for (let i = 0; i < def.frames; i++)
        tex?.add(`${anim}_side_${i}`, 0, (i % 4) * 136, (anim === 'run' ? 1 : 0) * 136, 136, 136);
    tex?.refresh();
    const alias = key === 'hero_wang_simple' ? 'player_male' : 'player';
    CHARACTERS[alias] = { rig: 'simple', palette };
    const alternate = scene.textures.addCanvas(alias, out);
    for (const [anim, def] of Object.entries(RIGS.simple.anims))
      for (let i = 0; i < def.frames; i++)
        alternate?.add(
          `${anim}_side_${i}`,
          0,
          (i % 4) * 136,
          (anim === 'run' ? 1 : 0) * 136,
          136,
          136,
        );
    alternate?.refresh();
  }
  CHARACTERS.mu_uyen_child = { rig: 'child', palette: 'player' };
  if (scene.textures.exists('mu-uyen-child')) {
    const src = scene.textures.get('mu-uyen-child').getSourceImage() as HTMLImageElement;
    const [canvas, ctx] = makeCanvas(544, 272),
      texture = scene.textures.addCanvas('mu_uyen_child', canvas);
    ctx.imageSmoothingQuality = 'high';
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 4; col++) {
        ctx.drawImage(
          src,
          (col * src.width) / 4,
          (row * src.height) / 2,
          src.width / 4,
          src.height / 2,
          col * 136 + 12,
          row * 136 + 18,
          112,
          112,
        );
        texture?.add(`${row ? 'run' : 'idle'}_side_${col}`, 0, col * 136, row * 136, 136, 136);
      }
    texture?.refresh();
  }
  for (const [atlas, prefix] of [
    ['wanderers', 'wanderer'],
    ['spirit-companions', 'companion'],
    ['dungeon-bosses-v3', 'dungeon_boss'],
  ]) {
    if (!scene.textures.exists(atlas)) continue;
    const src = scene.textures.get(atlas).getSourceImage() as HTMLImageElement;
    for (let i = 0; i < 6; i++) {
      const [cell, c] = makeCanvas(Math.floor(src.width / 3), Math.floor(src.height / 2));
      c.drawImage(
        src,
        ((i % 3) * src.width) / 3,
        (Math.floor(i / 3) * src.height) / 2,
        src.width / 3,
        src.height / 2,
        0,
        0,
        cell.width,
        cell.height,
      );
      const data = c.getImageData(0, 0, cell.width, cell.height).data;
      let left = cell.width,
        top = cell.height,
        right = 0,
        bottom = 0;
      for (let y = 0; y < cell.height; y++)
        for (let x = 0; x < cell.width; x++)
          if (data[(y * cell.width + x) * 4 + 3] > 32) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      const [out, ctx] = makeCanvas(180, 180),
        w = right - left + 1,
        h = bottom - top + 1,
        scale = Math.min(164 / w, 164 / h);
      if (w <= 0 || h <= 0) continue;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        cell,
        left,
        top,
        w,
        h,
        (180 - w * scale) / 2,
        174 - h * scale,
        w * scale,
        h * scale,
      );
      scene.textures.addCanvas(`${prefix}-${i}`, out);
      if (prefix === 'wanderer' || prefix === 'dungeon_boss') {
        const key = `${prefix}_${i}`;
        CHARACTERS[key] = { rig: 'simple', palette: 'player_male' };
        const [small, c] = makeCanvas(136, 136);
        c.drawImage(out, 8, 8, 120, 120);
        const tex = scene.textures.addCanvas(key, small);
        for (const [anim, def] of Object.entries(RIGS.simple.anims))
          for (let f = 0; f < def.frames; f++) tex?.add(`${anim}_side_${f}`, 0, 0, 0, 136, 136);
        tex?.refresh();
      }
    }
  }
}
