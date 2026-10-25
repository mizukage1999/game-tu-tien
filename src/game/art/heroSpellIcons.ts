const icons = new Map<string, string>();
export function cacheHeroSpellIcon(id: string, url: string) {
  icons.set(id, url);
}
export function heroSpellIcon(id: string) {
  return icons.get(id) ?? null;
}
