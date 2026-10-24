import { useGame, type MenuTab } from '../store/gameStore';
import { isChildhood } from '../game/systems/origin';
import { useState } from 'react';

const ITEMS: { id: MenuTab; label: string }[] = [
  { id: 'character', label: 'Nhân Vật' },
  { id: 'bag', label: 'Túi Đồ' },
  { id: 'cultivate', label: 'Tu Luyện' },
  { id: 'journey', label: 'Tiên Lộ' },
  { id: 'skills', label: 'Kỹ Năng' },
  { id: 'mail', label: 'Thư' },
  { id: 'quests', label: 'Nhiệm Vụ' },
  { id: 'social', label: 'Bạn Bè' },
  { id: 'sect', label: 'Tông Môn' },
  { id: 'premium', label: 'Tiên Ngọc' },
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
  journey: 'cultivate',
  sect: 'quests',
  premium: 'shop',
  map: 'journey',
};

export function TopMenu({ phone = false }: { phone?: boolean }) {
  const [more, setMore] = useState(false);
  const menu = useGame((s) => s.menu);
  const setMenu = useGame((s) => s.setMenu);
  const childhood = useGame((s) => isChildhood(s.player));
  const common: MenuTab[] = phone
    ? ['character', 'bag', 'journey', 'skills']
    : ['character', 'bag', 'skills', 'journey', 'sect'];
  const button = (it: (typeof ITEMS)[number]) => (
    <button
      key={it.id}
      aria-label={it.label}
      disabled={childhood && ['character', 'cultivate', 'skills'].includes(it.id)}
      title={
        childhood && ['character', 'cultivate', 'skills'].includes(it.id)
          ? 'Mở sau khi nhập môn'
          : it.label
      }
      className={`menu-btn menu-btn-${it.id} ${menu === it.id ? 'active' : ''}`}
      onClick={() => {
        setMore(false);
        setMenu(menu === it.id ? null : it.id);
      }}
    >
      <span className="menu-glyph">
        <img
          className="menu-icon"
          src={
            it.id === 'quests'
              ? '/assets/ui/menu-quests-original.svg'
              : `/assets/ui/menu-${MENU_ICONS[it.id]}.png`
          }
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </span>
      <span className="menu-label">{it.label}</span>
    </button>
  );
  return (
    <nav className="top-menu">
      {ITEMS.filter((it) => common.includes(it.id)).map(button)}
      <button
        className={`menu-btn ${more ? 'active' : ''}`}
        aria-label="Thêm tính năng"
        aria-expanded={more}
        onClick={() => setMore(!more)}
      >
        <span className="menu-glyph menu-more-glyph">⋯</span>
        <span className="menu-label">Thêm</span>
      </button>
      {more && (
        <div className="top-menu-more">
          {ITEMS.filter((it) => !common.includes(it.id)).map(button)}
        </div>
      )}
    </nav>
  );
}
