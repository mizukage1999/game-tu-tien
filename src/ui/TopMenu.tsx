import { useGame, type MenuTab } from '../store/gameStore';
import { isChildhood } from '../game/systems/origin';
import { useState } from 'react';
import type { MarketSection } from '../game/systems/marketUi';
import { MenuSprite } from './MenuSprite';
import { pendingMailCount, useMail } from '../net/gameMail';
import './menu-notifications.css';

const ITEMS: { id: MenuTab; label: string; marketSection?: MarketSection }[] = [
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
  { id: 'shop', label: 'Giao Dịch', marketSection: 'overview' },
  { id: 'dungeon', label: 'Phó Bản' },
  { id: 'boss', label: 'Săn Boss' },
  { id: 'ranking', label: 'Bảng Xếp Hạng' },
  { id: 'settings', label: 'Cài Đặt' },
];

export function TopMenu({ phone = false }: { phone?: boolean }) {
  const [more, setMore] = useState(false);
  const menu = useGame((s) => s.menu);
  const setMenu = useGame((s) => s.setMenu);
  const marketSection = useGame((s) => s.marketSection);
  const patch = useGame((s) => s.patch);
  const childhood = useGame((s) => isChildhood(s.player));
  const pendingMail = useMail((s) => pendingMailCount(s.mails));
  const common: MenuTab[] = ['character', 'bag', 'journey', 'skills'];
  const button = (it: (typeof ITEMS)[number]) => (
    <button
      key={`${it.id}-${it.marketSection ?? ''}`}
      aria-label={it.label}
      disabled={childhood && ['character', 'cultivate', 'skills'].includes(it.id)}
      title={
        childhood && ['character', 'cultivate', 'skills'].includes(it.id)
          ? 'Mở sau khi nhập môn'
          : it.label
      }
      className={`menu-btn menu-btn-${it.id} ${menu === it.id && (!it.marketSection || marketSection === it.marketSection) ? 'active' : ''}`}
      onClick={() => {
        setMore(false);
        setMenu(
          menu === it.id && (!it.marketSection || marketSection === it.marketSection)
            ? null
            : it.id,
        );
        if (it.marketSection) patch({ marketSection: it.marketSection });
      }}
    >
      <span className="menu-glyph">
        <MenuSprite kind={it.id} />
        {it.id === 'mail' && pendingMail > 0 && (
          <span
            className="menu-notification"
            aria-label={`${pendingMail} thư chưa đọc hoặc chưa nhận quà`}
          >
            {pendingMail > 99 ? '99+' : pendingMail}
          </span>
        )}
      </span>
      <span className="menu-label">{it.label}</span>
    </button>
  );
  if (!phone)
    return (
      <nav className="top-menu top-menu-desktop" aria-label="Menu tính năng">
        {ITEMS.map(button)}
      </nav>
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
        <span className="menu-glyph">
          <MenuSprite kind="more" />
          {pendingMail > 0 && (
            <span
              className="menu-notification menu-notification-dot"
              aria-label="Có thư chưa đọc hoặc chưa nhận quà"
            />
          )}
        </span>
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
