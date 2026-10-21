import { useGame, type MenuTab } from '../store/gameStore';

const ITEMS: { id: MenuTab; label: string }[] = [
  { id: 'character', label: 'Nhân Vật' },
  { id: 'bag', label: 'Túi Đồ' },
  { id: 'cultivate', label: 'Tu Luyện' },
  { id: 'skills', label: 'Kỹ Năng' },
  { id: 'mail', label: 'Thư' },
  { id: 'quests', label: 'Nhiệm Vụ' },
  { id: 'social', label: 'Xã Hội' },
  { id: 'settings', label: 'Cài Đặt' },
];

const MENU_ICONS: Record<MenuTab, string> = {
  character: 'character',
  bag: 'bag',
  cultivate: 'cultivate',
  skills: 'skills',
  dungeon: 'dungeon',
  mail: 'mail',
  quests: 'quests',
  shop: 'shop',
  social: 'social',
  settings: 'settings',
};

export function TopMenu() {
  const menu = useGame((s) => s.menu);
  const setMenu = useGame((s) => s.setMenu);
  return (
    <nav className="top-menu">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          className={`menu-btn menu-btn-${it.id} ${menu === it.id ? 'active' : ''}`}
          onClick={() => setMenu(menu === it.id ? null : it.id)}
        >
          <span className="menu-glyph">
            <img
              className="menu-icon"
              src={it.id === 'quests' ? '/assets/ui/menu-quests-original.svg' : `/assets/ui/menu-${MENU_ICONS[it.id]}.png`}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          </span>
          <span className="menu-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
