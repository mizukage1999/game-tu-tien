import icons from './menuIconAssets.json';

/** UI art is prepared separately from the much larger combat animation sheets. */
export function menuSkillIcon(id: string) {
  return (icons as Record<string, string>)[id];
}
