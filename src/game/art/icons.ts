import { ITEMS, rarityOf, type EquipSlot } from '../../data';
import { fillEllipse, linear, makeCanvas, radial, rgba, shade, type Ctx } from './canvas';
import { drawPortrait, PALETTES } from './character';

function drawEquipment(ctx: Ctx, slot: EquipSlot, color: string, s: number) {
  const m = s / 2;
  ctx.fillStyle = radial(ctx, m, m, m, [
    [0, rgba(color, 0.4)],
    [1, rgba(color, 0)],
  ]);
  ctx.fillRect(0, 0, s, s);
  const metal = linear(ctx, 0, 0, s, s, [
    [0, shade(color, 0.55)],
    [0.5, color],
    [1, shade(color, -0.45)],
  ]);
  ctx.fillStyle = metal;
  ctx.strokeStyle = metal;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (slot) {
    case 'weapon':
      ctx.translate(m, m);
      ctx.rotate(-Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.42);
      ctx.lineTo(s * 0.06, -s * 0.32);
      ctx.lineTo(s * 0.06, s * 0.14);
      ctx.lineTo(-s * 0.06, s * 0.14);
      ctx.lineTo(-s * 0.06, -s * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e1b854';
      ctx.fillRect(-s * 0.16, s * 0.14, s * 0.32, s * 0.06);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(-s * 0.035, s * 0.2, s * 0.07, s * 0.18);
      break;
    case 'armor':
      ctx.beginPath();
      ctx.moveTo(s * 0.3, s * 0.14);
      ctx.lineTo(s * 0.12, s * 0.3);
      ctx.lineTo(s * 0.22, s * 0.42);
      ctx.lineTo(s * 0.28, s * 0.36);
      ctx.lineTo(s * 0.26, s * 0.88);
      ctx.lineTo(s * 0.74, s * 0.88);
      ctx.lineTo(s * 0.72, s * 0.36);
      ctx.lineTo(s * 0.78, s * 0.42);
      ctx.lineTo(s * 0.88, s * 0.3);
      ctx.lineTo(s * 0.7, s * 0.14);
      ctx.lineTo(m, s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e1b854';
      ctx.fillRect(s * 0.27, s * 0.56, s * 0.46, s * 0.06);
      break;
    case 'helmet':
      ctx.beginPath();
      ctx.moveTo(s * 0.18, s * 0.72);
      ctx.quadraticCurveTo(s * 0.18, s * 0.26, m, s * 0.22);
      ctx.quadraticCurveTo(s * 0.82, s * 0.26, s * 0.82, s * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e1b854';
      ctx.fillRect(s * 0.14, s * 0.68, s * 0.72, s * 0.08);
      fillEllipse(ctx, m, s * 0.18, s * 0.08, s * 0.08, '#e1b854');
      break;
    case 'boots':
      for (const dx of [-s * 0.14, s * 0.14]) {
        ctx.beginPath();
        ctx.moveTo(m + dx - s * 0.1, s * 0.2);
        ctx.lineTo(m + dx + s * 0.06, s * 0.2);
        ctx.lineTo(m + dx + s * 0.06, s * 0.66);
        ctx.lineTo(m + dx + s * 0.16, s * 0.74);
        ctx.lineTo(m + dx + s * 0.16, s * 0.84);
        ctx.lineTo(m + dx - s * 0.1, s * 0.84);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'ring':
      ctx.lineWidth = s * 0.12;
      ctx.beginPath();
      ctx.ellipse(m, s * 0.6, s * 0.28, s * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      fillEllipse(ctx, m, s * 0.3, s * 0.13, s * 0.13, shade(color, 0.6));
      fillEllipse(ctx, m - s * 0.04, s * 0.26, s * 0.04, s * 0.04, '#ffffff');
      break;
    case 'amulet':
      ctx.lineWidth = s * 0.04;
      ctx.strokeStyle = '#e1b854';
      ctx.beginPath();
      ctx.arc(m, s * 0.3, s * 0.22, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      fillEllipse(ctx, m, s * 0.6, s * 0.24, s * 0.24, metal);
      fillEllipse(ctx, m, s * 0.6, s * 0.09, s * 0.09, rgba('#ffffff', 0.6));
      ctx.fillStyle = '#e1b854';
      ctx.fillRect(m - s * 0.03, s * 0.16, s * 0.06, s * 0.2);
      break;
  }
}

export function drawItem(ctx: Ctx, id: string, s: number) {
  const m = s / 2;
  ctx.save();
  const equip = ITEMS[id];
  if (equip?.slot && equip.rarity && id !== 'nhan_bac') {
    drawEquipment(ctx, equip.slot, rarityOf(equip.rarity).color, s);
    ctx.restore();
    return;
  }
  switch (id) {
    case 'linh_thach': {
      ctx.fillStyle = radial(ctx, m, m, m, [
        [0, 'rgba(120,160,255,0.45)'],
        [1, 'rgba(120,160,255,0)'],
      ]);
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = linear(ctx, m - s * 0.25, s * 0.1, m + s * 0.25, s * 0.9, [
        [0, '#d9e6ff'],
        [0.5, '#6f8dff'],
        [1, '#2b3fb0'],
      ]);
      ctx.beginPath();
      ctx.moveTo(m, s * 0.08);
      ctx.lineTo(m + s * 0.28, s * 0.38);
      ctx.lineTo(m + s * 0.18, s * 0.86);
      ctx.lineTo(m - s * 0.18, s * 0.86);
      ctx.lineTo(m - s * 0.28, s * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = Math.max(1, s / 24);
      ctx.beginPath();
      ctx.moveTo(m, s * 0.08);
      ctx.lineTo(m - s * 0.06, s * 0.5);
      ctx.lineTo(m, s * 0.86);
      ctx.stroke();
      break;
    }
    case 'linh_khi': {
      ctx.fillStyle = radial(ctx, m, m, m, [
        [0, 'rgba(255,255,255,1)'],
        [0.3, 'rgba(150,235,255,0.95)'],
        [0.7, 'rgba(80,190,255,0.45)'],
        [1, 'rgba(80,190,255,0)'],
      ]);
      ctx.beginPath();
      ctx.arc(m, m, m, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = Math.max(1, s / 20);
      ctx.beginPath();
      ctx.arc(m, m, m * 0.55, 0.3, 2.4);
      ctx.stroke();
      break;
    }
    case 'hoi_xuan_dan': {
      fillEllipse(ctx, m, s * 0.62, s * 0.3, s * 0.3, linear(ctx, 0, s * 0.3, 0, s, [
        [0, '#a8ffb8'],
        [1, '#1f9a45'],
      ]));
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(m - s * 0.1, s * 0.12, s * 0.2, s * 0.22);
      ctx.fillStyle = '#d23a3a';
      ctx.fillRect(m - s * 0.14, s * 0.1, s * 0.28, s * 0.08);
      fillEllipse(ctx, m - s * 0.1, s * 0.55, s * 0.07, s * 0.1, 'rgba(255,255,255,0.7)');
      break;
    }
    case 'nhan_bac': {
      ctx.strokeStyle = linear(ctx, 0, 0, s, s, [
        [0, '#ffffff'],
        [1, '#8a96a8'],
      ]);
      ctx.lineWidth = s * 0.12;
      ctx.beginPath();
      ctx.ellipse(m, s * 0.6, s * 0.3, s * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();
      fillEllipse(ctx, m, s * 0.3, s * 0.13, s * 0.13, '#7fd8ff');
      fillEllipse(ctx, m - s * 0.04, s * 0.26, s * 0.04, s * 0.04, '#ffffff');
      break;
    }
    default:
      fillEllipse(ctx, m, m, m * 0.6, m * 0.6, '#cccccc');
  }
  ctx.restore();
}

function drawSkill(ctx: Ctx, id: string, s: number) {
  const m = s / 2;
  ctx.fillStyle = radial(ctx, m, m * 0.8, s * 0.7, [
    [0, '#5a86d6'],
    [1, '#16224a'],
  ]);
  ctx.fillRect(0, 0, s, s);
  ctx.save();
  ctx.strokeStyle = '#e8f8ff';
  ctx.fillStyle = '#e8f8ff';
  ctx.shadowColor = '#7fd8ff';
  ctx.shadowBlur = s / 8;
  ctx.lineCap = 'round';
  ctx.lineWidth = s / 14;
  switch (id) {
    case 'bang_tam_tram':
      ctx.beginPath();
      ctx.arc(m - s * 0.12, m, s * 0.34, -1.1, 1.1);
      ctx.arc(m - s * 0.22, m, s * 0.3, 0.95, -0.95, true);
      ctx.closePath();
      ctx.fill();
      break;
    case 'phi_kiem':
    case 'basic':
      ctx.translate(m, m);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-s * 0.04, -s * 0.36, s * 0.08, s * 0.5);
      ctx.fillStyle = '#e1b854';
      ctx.fillRect(-s * 0.14, s * 0.14, s * 0.28, s * 0.05);
      ctx.fillStyle = '#3a4a7a';
      ctx.fillRect(-s * 0.03, s * 0.19, s * 0.06, s * 0.14);
      if (id === 'phi_kiem') {
        ctx.strokeStyle = 'rgba(160,230,255,0.8)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-s * 0.2 - i * s * 0.06, s * 0.1);
          ctx.lineTo(-s * 0.2 - i * s * 0.06, s * 0.36);
          ctx.stroke();
        }
      }
      break;
    case 'han_bang_tran':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(m, m);
        ctx.lineTo(m + Math.cos(a) * s * 0.34, m + Math.sin(a) * s * 0.34);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(m, m, s * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'than_phap':
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s * 0.2, s * (0.3 + i * 0.2));
        ctx.quadraticCurveTo(s * 0.5, s * (0.22 + i * 0.2), s * 0.8, s * (0.3 + i * 0.2));
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
}

const cache = new Map<string, string>();

function toUrl(key: string, s: number, draw: (ctx: Ctx) => void): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(s, s);
  draw(ctx);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function itemIconUrl(id: string, s = 48) {
  return toUrl(`item:${id}:${s}`, s, (ctx) => drawItem(ctx, id, s));
}

export function skillIconUrl(id: string, s = 64) {
  return toUrl(`skill:${id}:${s}`, s, (ctx) => drawSkill(ctx, id, s));
}

export function portraitUrl(palette = 'player', s = 128) {
  return toUrl(`portrait:${palette}:${s}`, s, (ctx) => drawPortrait(ctx, s, PALETTES[palette]));
}

export function buildLootTextures(): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {};
  for (const id of ['linh_thach', 'linh_khi', 'hoi_xuan_dan', 'nhan_bac']) {
    const [c, ctx] = makeCanvas(32, 32);
    drawItem(ctx, id, 32);
    out[`loot_${id}`] = c;
  }
  return out;
}
