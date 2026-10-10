import { useGame, type MenuTab } from '../store/gameStore';

const ITEMS: { id: MenuTab; label: string; glyph: string }[] = [
  { id: 'character', label: 'Nhân Vật', glyph: '人' },
  { id: 'bag', label: 'Túi Đồ', glyph: '囊' },
  { id: 'cultivate', label: 'Tu Luyện', glyph: '修' },
  { id: 'skills', label: 'Kỹ Năng', glyph: '技' },
  { id: 'dungeon', label: 'Phó Bản', glyph: '秘' },
  { id: 'quests', label: 'Nhiệm Vụ', glyph: '任' },
  { id: 'shop', label: 'Cửa Hàng', glyph: '商' },
  { id: 'settings', label: 'Cài Đặt', glyph: '設' },
];

export function TopMenu() {
  const menu = useGame((s) => s.menu);
  const setMenu = useGame((s) => s.setMenu);
  return (
    <nav className="top-menu">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          className={`menu-btn ${menu === it.id ? 'active' : ''}`}
          onClick={() => setMenu(menu === it.id ? null : it.id)}
        >
          <span className="menu-glyph">{it.glyph}</span>
          <span className="menu-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
