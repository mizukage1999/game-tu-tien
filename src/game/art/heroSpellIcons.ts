import { menuSkillIcon } from '../../data/menuIcons';
const icons = new Map<string, string>();
export function cacheHeroSpellIcon(id: string, url: string) {
  icons.set(id, url);
}
export function heroSpellIcon(id: string) {
  return menuSkillIcon(id) ?? icons.get(id) ?? null;
}
