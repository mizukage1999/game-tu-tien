import { useGame, type MenuTab } from '../store/gameStore';

const ITEMS: { id: MenuTab; label: string }[] = [
  { id: 'character', label: 'Nhân Vật' },
  { id: 'bag', label: 'Túi Đồ' },
  { id: 'cultivate', label: 'Tu Luyện' },
  { id: 'skills', label: 'Kỹ Năng' },
  { id: 'dungeon', label: 'Phó Bản' },
  { id: 'quests', label: 'Nhiệm Vụ' },
  { id: 'shop', label: 'Cửa Hàng' },
  { id: 'settings', label: 'Cài Đặt' },
];

function MenuIcon({ id }: { id: MenuTab }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      {id === 'character' && (
        <>
          <circle {...common} cx="12" cy="8" r="3" />
          <path {...common} d="M6.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
        </>
      )}
      {id === 'bag' && (
        <>
          <path {...common} d="M8 10h8l1 9H7l1-9z" />
          <path {...common} d="M9.5 10V8a2.5 2.5 0 0 1 5 0v2" />
        </>
      )}
      {id === 'cultivate' && (
        <>
          <path {...common} d="M12 20v-6" />
          <path {...common} d="M12 15c-3.2-.2-5-2-5-4.2 2.2.2 3.8 1.2 5 3 1.2-1.8 2.8-2.8 5-3C17 13 15.2 14.8 12 15z" />
          <path {...common} d="M12 12c-1.6-2-1.4-4.2 0-6 1.4 1.8 1.6 4 0 6z" />
        </>
      )}
      {id === 'skills' && (
        <>
          <path {...common} d="M14.5 4.5l5 5-9 9H6v-4.5l8.5-9.5z" />
          <path {...common} d="M13 6l5 5" />
          <path {...common} d="M4.5 19.5l3.5-3.5" />
        </>
      )}
      {id === 'dungeon' && (
        <>
          <path {...common} d="M5 20V10a7 7 0 0 1 14 0v10" />
          <path {...common} d="M3.5 20h17" />
          <path {...common} d="M12 13.5V17" />
        </>
      )}
      {id === 'quests' && (
        <>
          <path {...common} d="M7 5.5h8.5A2 2 0 0 1 17.5 7.5V19H8.2A2.2 2.2 0 0 0 6 21.2V7.5A2 2 0 0 1 8 5.5" />
          <path {...common} d="M9.5 9.5h5M9.5 12.5h5" />
        </>
      )}
      {id === 'shop' && (
        <>
          <path {...common} d="M4 10l1.8-5h12.4L20 10" />
          <path {...common} d="M5 10h14v9H5z" />
          <path {...common} d="M10 19v-5h4v5" />
        </>
      )}
      {id === 'settings' && (
        <>
          <path {...common} d="M4 8h16M4 16h16" />
          <circle {...common} cx="9" cy="8" r="2" />
          <circle {...common} cx="15" cy="16" r="2" />
        </>
      )}
    </svg>
  );
}

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
          <span className="menu-glyph">
            <MenuIcon id={it.id} />
          </span>
          <span className="menu-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
