import type { MenuTab } from '../store/gameStore';
const FRAMES: Record<MenuTab | 'more', number> = {
  character: 0,
  skills: 1,
  bag: 2,
  quests: 3,
  dungeon: 4,
  boss: 5,
  sect: 6,
  premium: 7,
  ranking: 8,
  settings: 9,
  cultivate: 10,
  journey: 11,
  mail: 12,
  social: 13,
  shop: 14,
  more: 15,
  map: 11,
};
/** Equal-cell atlas; the transparent gutter is retained so gold rims never gain a black tile. */
export function MenuSprite({ kind }: { kind: MenuTab | 'more' }) {
  const frame = FRAMES[kind];
  return (
    <svg
      className="menu-icon menu-sprite"
      viewBox={`${(frame % 4) * 256} ${Math.floor(frame / 4) * 256} 256 256`}
      aria-hidden="true"
      focusable="false"
    >
      <image href="/assets/ui/top-menu-icons-v2.webp" width="1024" height="1024" />
    </svg>
  );
}
