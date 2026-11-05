import type { SkillId } from '../../data';
import layout from '../../data/uiIconLayout.json';
import icons from '../../data/uiIconAssets.json';
import startup from '../../data/startupAssets.json';
import type { HeroId } from '../../data/heroes';
export const SKILL_ATLAS_ORDER = layout.skills as SkillId[];
const children = new Map<string, string>();
export function cultivationIconUrl(id: SkillId) {
  return (icons as Record<string, string>)[`skill:${id}`];
}
export function registerChildProfile(
  sex: string,
  source: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(source, x, y, width, height, 0, 0, width, height);
  children.set(sex, canvas.toDataURL('image/png'));
}
export function childProfileUrl(sex: string,id?:HeroId) {
  return (startup.urls as Record<string,string>)[`portrait-${id??(sex==='male'?'wang_lam':'ly_mo_uyen')}`]??children.get(sex);
}
