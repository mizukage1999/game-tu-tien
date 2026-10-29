import { ITEMS, rarityOf, type EquipSlot, type SkillId } from '../../data';
import { fillEllipse, linear, makeCanvas, radial, rgba, shade, type Ctx } from './canvas';
import { BASE_POSE, drawHuman, drawPortrait, PALETTES } from './character';
import { wangEffect } from '../../data/wangSkills';
import { wangIconUrl } from './wangEffects';
import { cultivationIconUrl } from './skillIcons';
import { inventoryIconUrl } from './inventoryIcons';
import { equipmentBaseId } from '../systems/equipment';
import { optimizedAsset } from '../../data/assetDelivery';
import { heroSpellIcon } from './heroSpellIcons';

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
  id = equipmentBaseId(id);
  const m = s / 2;
  ctx.save();
  const equip = ITEMS[id];
  if (equip?.slot && equip.rarity && id !== 'nhan_bac' && id !== 'moc_kiem') {
    drawEquipment(ctx, equip.slot, rarityOf(equip.rarity).color, s);
    ctx.restore();
    return;
  }
  switch (id) {
    case 'moc_kiem': {
      ctx.translate(m, m);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = linear(ctx, -s * 0.05, 0, s * 0.05, 0, [
        [0, '#76512d'],
        [0.5, '#d4b07a'],
        [1, '#926538'],
      ]);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.lineTo(s * 0.055, -s * 0.32);
      ctx.lineTo(s * 0.055, s * 0.2);
      ctx.lineTo(-s * 0.055, s * 0.2);
      ctx.lineTo(-s * 0.055, -s * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#735035';
      ctx.fillRect(-s * 0.16, s * 0.18, s * 0.32, s * 0.065);
      ctx.fillRect(-s * 0.035, s * 0.22, s * 0.07, s * 0.22);
      break;
    }
    case 'hat_thanh_linh':
    case 'hat_linh_chi':
    case 'hat_ngung_lo': {
      fillEllipse(ctx, m, s * 0.6, s * 0.3, s * 0.27, '#876748');
      ctx.fillStyle = '#cfb47c';
      ctx.fillRect(s * 0.38, s * 0.23, s * 0.24, s * 0.15);
      fillEllipse(ctx, s * 0.45, s * 0.55, s * 0.06, s * 0.09, ITEMS[id].color);
      fillEllipse(ctx, s * 0.6, s * 0.65, s * 0.06, s * 0.09, ITEMS[id].color);
      break;
    }
    case 'huyen_thiet': {
      ctx.fillStyle = linear(ctx, 0, 0, s, s, [
        [0, '#d9e0e4'],
        [0.5, '#607580'],
        [1, '#263b45'],
      ]);
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.7);
      ctx.lineTo(s * 0.3, s * 0.27);
      ctx.lineTo(s * 0.67, s * 0.18);
      ctx.lineTo(s * 0.87, s * 0.62);
      ctx.lineTo(s * 0.6, s * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b0bfc5';
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(s * 0.3, s * 0.27);
      ctx.lineTo(s * 0.5, s * 0.58);
      ctx.lineTo(s * 0.87, s * 0.62);
      ctx.stroke();
      break;
    }
    case 'phap_bao_ngoc': {
      ctx.strokeStyle = '#c9a963';
      ctx.lineWidth = s * 0.035;
      ctx.beginPath();
      ctx.moveTo(m, s * 0.1);
      ctx.lineTo(m, s * 0.35);
      ctx.stroke();
      fillEllipse(ctx, m, s * 0.58, s * 0.29, s * 0.3, '#74bba3');
      fillEllipse(ctx, m, s * 0.58, s * 0.13, s * 0.14, '#243f40');
      ctx.fillStyle = '#e3c784';
      ctx.fillRect(m - s * 0.05, s * 0.84, s * 0.1, s * 0.1);
      break;
    }
    case 'tinh_luyen_thach':
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
      fillEllipse(
        ctx,
        m,
        s * 0.62,
        s * 0.3,
        s * 0.3,
        linear(ctx, 0, s * 0.3, 0, s, [
          [0, '#a8ffb8'],
          [1, '#1f9a45'],
        ]),
      );
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
    case 'cong_thuc_ngoc':
    case 'cong_thuc_pha_canh':
    case 'kiem_pho': {
      ctx.fillStyle = radial(ctx, m, m, m, [
        [0, 'rgba(255,210,120,0.45)'],
        [1, 'rgba(255,210,120,0)'],
      ]);
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = linear(ctx, 0, s * 0.2, 0, s * 0.8, [
        [0, '#fff3d1'],
        [1, '#d9b77a'],
      ]);
      ctx.fillRect(s * 0.24, s * 0.2, s * 0.52, s * 0.6);
      ctx.fillStyle = '#8a4b22';
      for (const y of [0.14, 0.78]) {
        ctx.beginPath();
        ctx.roundRect(s * 0.16, s * y, s * 0.68, s * 0.09, s * 0.04);
        ctx.fill();
      }
      ctx.strokeStyle = '#7a3a1a';
      ctx.lineWidth = Math.max(1, s / 22);
      for (let i = 0; i < 3; i++) {
        const x = s * (0.36 + i * 0.13);
        ctx.beginPath();
        ctx.moveTo(x, s * 0.3);
        ctx.lineTo(x, s * 0.7);
        ctx.stroke();
      }
      ctx.fillStyle = '#d23a3a';
      ctx.fillRect(s * 0.62, s * 0.58, s * 0.1, s * 0.1);
      break;
    }
    case 'thuc_an_linh_thu':
    case 'tu_linh_dan':
    case 'pha_canh_dan':
    case 'yeu_dan': {
      const color = ITEMS[id]?.color ?? '#b8a1f0';
      fillEllipse(
        ctx,
        m,
        m,
        s * 0.33,
        s * 0.33,
        radial(ctx, m - s * 0.1, m - s * 0.12, s * 0.55, [
          [0, '#ffffff'],
          [0.3, color],
          [1, '#213947'],
        ]),
      );
      ctx.strokeStyle = '#e8d898';
      ctx.lineWidth = Math.max(1, s / 25);
      ctx.beginPath();
      ctx.arc(m, m, s * 0.22, 0.2, 4.2);
      ctx.stroke();
      break;
    }
    case 'thanh_linh_thao':
    case 'linh_chi': {
      ctx.strokeStyle = '#c6d6a1';
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.moveTo(m, s * 0.85);
      ctx.lineTo(m, s * 0.22);
      ctx.stroke();
      fillEllipse(ctx, s * 0.35, s * 0.5, s * 0.22, s * 0.1, ITEMS[id].color);
      fillEllipse(ctx, s * 0.65, s * 0.35, s * 0.22, s * 0.12, ITEMS[id].color);
      break;
    }
    case 'ngung_lo': {
      ctx.fillStyle = '#81d9ef';
      ctx.beginPath();
      ctx.moveTo(m, s * 0.1);
      ctx.bezierCurveTo(s * 0.02, s * 0.7, s * 0.3, s * 0.9, m, s * 0.9);
      ctx.bezierCurveTo(s * 0.7, s * 0.9, s * 0.98, s * 0.7, m, s * 0.1);
      ctx.fill();
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
    case 'loi_kich':
      ctx.fillStyle = '#e9c9ff';
      ctx.beginPath();
      ctx.moveTo(s * 0.57, s * 0.12);
      ctx.lineTo(s * 0.25, s * 0.54);
      ctx.lineTo(s * 0.48, s * 0.54);
      ctx.lineTo(s * 0.4, s * 0.88);
      ctx.lineTo(s * 0.78, s * 0.4);
      ctx.lineTo(s * 0.55, s * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    case 'hoa_lien':
      ctx.fillStyle = '#ffb963';
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(m, m);
        ctx.rotate((i * Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.19, s * 0.1, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#fff3a2';
      ctx.beginPath();
      ctx.arc(m, m, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'moc_linh':
      ctx.fillStyle = '#91efb9';
      ctx.fillRect(s * 0.42, s * 0.23, s * 0.16, s * 0.54);
      ctx.fillRect(s * 0.23, s * 0.42, s * 0.54, s * 0.16);
      break;
    case 'kim_cang':
      ctx.strokeStyle = '#ffdc8c';
      ctx.beginPath();
      ctx.moveTo(m, s * 0.16);
      ctx.lineTo(s * 0.79, s * 0.3);
      ctx.quadraticCurveTo(s * 0.79, s * 0.65, m, s * 0.85);
      ctx.quadraticCurveTo(s * 0.21, s * 0.65, s * 0.21, s * 0.3);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'phong_nhan':
      ctx.strokeStyle = '#b4ffdc';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s * 0.23, s * (0.27 + i * 0.18));
        ctx.quadraticCurveTo(s * 0.6, s * (0.05 + i * 0.18), s * 0.82, s * (0.27 + i * 0.18));
        ctx.stroke();
      }
      break;
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
export const ITEM_SPRITE_ASSETS: Record<string, string> = {
  linh_thach: '/assets/ui/item-linh-thach.png',
  linh_khi: '/assets/ui/item-linh-khi.png',
  hoi_xuan_dan: '/assets/ui/item-hoi-xuan-dan.png',
  nhan_bac: '/assets/ui/item-nhan-bac.png',
  kiem_pho: '/assets/ui/item-kiem-pho.png',
  weapon_white: '/assets/sprites/weapon-white.png',
  weapon_blue: '/assets/sprites/weapon-blue.png',
  weapon_green: '/assets/sprites/weapon-green.png',
  weapon_purple: '/assets/sprites/weapon-purple.png',
  weapon_orange: '/assets/sprites/weapon-orange.png',
  weapon_red: '/assets/sprites/weapon-red.png',
  armor_white: '/assets/sprites/armor-white.png',
  armor_blue: '/assets/sprites/armor-blue.png',
  armor_green: '/assets/sprites/armor-green.png',
  armor_purple: '/assets/sprites/armor-purple.png',
  armor_orange: '/assets/sprites/armor-orange.png',
  armor_red: '/assets/sprites/armor-red.png',
  boots_white: '/assets/sprites/boots-white.png',
  boots_blue: '/assets/sprites/boots-blue.png',
  boots_green: '/assets/sprites/boots-green.png',
  boots_purple: '/assets/sprites/boots-purple.png',
  boots_orange: '/assets/sprites/boots-orange.png',
  boots_red: '/assets/sprites/boots-red.png',
  ring_white: '/assets/sprites/ring-white.png',
  ring_blue: '/assets/sprites/ring-blue.png',
  ring_green: '/assets/sprites/ring-green.png',
  ring_purple: '/assets/sprites/ring-purple.png',
  ring_orange: '/assets/sprites/ring-orange.png',
  ring_red: '/assets/sprites/ring-red.png',
  amulet_white: '/assets/sprites/amulet-white.png',
  amulet_blue: '/assets/sprites/amulet-blue.png',
  amulet_green: '/assets/sprites/amulet-green.png',
  amulet_purple: '/assets/sprites/amulet-purple.png',
  amulet_orange: '/assets/sprites/amulet-orange.png',
  amulet_red: '/assets/sprites/amulet-red.png',
  equipment_weapon: '/assets/ui/item-equipment-weapon.png',
  equipment_armor: '/assets/ui/item-equipment-armor.png',
  equipment_helmet: '/assets/ui/item-equipment-helmet.png',
  equipment_boots: '/assets/ui/item-equipment-boots.png',
  equipment_ring: '/assets/ui/item-equipment-ring.png',
  equipment_amulet: '/assets/ui/item-equipment-amulet.png',
};

export function itemSpriteTextureKey(id: string) {
  id = equipmentBaseId(id);
  if (id === 'moc_kiem') return undefined;
  const item = ITEMS[id];
  const spriteRarity = item?.rarity === 'pink' ? 'red' : item?.rarity;
  const tieredGearAsset =
    item?.slot && ['armor', 'boots', 'ring', 'amulet'].includes(item.slot) && spriteRarity
      ? `${item.slot}_${spriteRarity}`
      : undefined;
  const weaponAsset =
    item?.slot === 'weapon' && spriteRarity ? `weapon_${spriteRarity}` : undefined;
  const assetId = ITEM_SPRITE_ASSETS[id]
    ? id
    : (tieredGearAsset ?? weaponAsset ?? (item?.slot ? `equipment_${item.slot}` : undefined));
  return assetId && ITEM_SPRITE_ASSETS[assetId] ? `item-sprite-${assetId}` : undefined;
}

const UI_SKILL_ICONS: Partial<Record<SkillId, string>> = {
  basic: '/assets/ui/skill-basic.png',
  phi_kiem: '/assets/ui/skill-phi-kiem.png',
  bang_tam_tram: '/assets/ui/skill-bang-tam-tram.png',
  han_bang_tran: '/assets/ui/skill-han-bang-tran.png',
  than_phap: '/assets/ui/skill-than-phap.png',
};

const LI_MU_SKILL_ICONS: Partial<Record<SkillId, string>> = {
  basic: '/assets/ui/skill-basic-li-mu.png',
  bang_tam_tram: '/assets/ui/skill-bang-tam-tram-li-mu.png',
  phi_kiem: '/assets/ui/skill-phi-kiem-li-mu.png',
  han_bang_tran: '/assets/ui/skill-han-bang-tran-li-mu.png',
  than_phap: '/assets/ui/skill-than-phap-li-mu.png',
};

const WANG_LIN_SKILL_ICONS: Partial<Record<SkillId, string>> = {
  basic: '/assets/ui/skill-basic-wang-lin.png',
  bang_tam_tram: '/assets/ui/skill-bang-tam-tram-wang-lin.png',
  phi_kiem: '/assets/ui/skill-phi-kiem-wang-lin.png',
  han_bang_tran: '/assets/ui/skill-han-bang-tran-wang-lin.png',
  than_phap: '/assets/ui/skill-than-phap-wang-lin.png',
};

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
  id = equipmentBaseId(id);
  const sprite = inventoryIconUrl(id);
  if (sprite) return sprite;
  const key = itemSpriteTextureKey(id);
  const assetId = key?.slice('item-sprite-'.length);
  if (assetId) return optimizedAsset(ITEM_SPRITE_ASSETS[assetId]);
  return toUrl(`item:${id}:${s}`, s, (ctx) => drawItem(ctx, id, s));
}

export function skillIconUrl(id: string, s = 64) {
  return toUrl(`skill:${id}:${s}`, s, (ctx) => drawSkill(ctx, id, s));
}

export function skillSpriteUrl(id: SkillId, sex: 'female' | 'male' = 'male') {
  const heroIcon = heroSpellIcon(id);
  if (heroIcon) return heroIcon;
  const art = wangEffect(id);
  if (art && wangIconUrl(art)) return wangIconUrl(art)!;
  const icon = cultivationIconUrl(id);
  if (icon) return icon;
  return (
    (sex === 'male' ? WANG_LIN_SKILL_ICONS[id] : LI_MU_SKILL_ICONS[id]) ??
    UI_SKILL_ICONS[id] ??
    skillIconUrl(id)
  );
}

export function portraitUrl(palette = 'player', s = 128) {
  return toUrl(`portrait:${palette}:${s}`, s, (ctx) => drawPortrait(ctx, s, PALETTES[palette]));
}

export function characterSpriteUrl(palette = 'player', s = 136) {
  const pal = PALETTES[palette];
  if (!pal) throw new Error(`Unknown character palette: ${palette}`);
  return toUrl(`character-sprite:${palette}:${s}`, s, (ctx) => {
    const scale = (s / 136) * 1.34;
    ctx.save();
    ctx.translate(s / 2, s * 0.92);
    ctx.scale(scale, scale);
    drawHuman(ctx, 0, 0, 'down', pal, BASE_POSE);
    ctx.restore();
  });
}

export function buildLootTextures(
  spriteSources: Partial<Record<string, CanvasImageSource>> = {},
): Record<string, HTMLCanvasElement> {
  const out: Record<string, HTMLCanvasElement> = {};
  for (const id of ['linh_thach', 'linh_khi', 'hoi_xuan_dan', 'nhan_bac', 'kiem_pho', 'yeu_dan']) {
    const [c, ctx] = makeCanvas(32, 32);
    const sprite = spriteSources[id];
    if (sprite) ctx.drawImage(sprite, 0, 0, 32, 32);
    else drawItem(ctx, id, 32);
    out[`loot_${id}`] = c;
  }
  return out;
}
