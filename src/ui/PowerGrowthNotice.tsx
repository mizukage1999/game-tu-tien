import { useEffect, useState } from 'react';
import { SKILLS } from '../data';
import { gameStore, useGame } from '../store/gameStore';
import { powerGrowth, type PowerGrowth } from '../game/systems/powerGrowth';
import './power-growth.css';

/** Non-blocking result of a real upgrade, with the next useful action beside it. */
export function PowerGrowthNotice() {
  const [notice, setNotice] = useState<(PowerGrowth & { at: number }) | null>(null);
  const setMenu = useGame((s) => s.setMenu);
  useEffect(
    () =>
      gameStore.subscribe((next, previous) => {
        const growth = powerGrowth(previous.player, next.player);
        if (growth) setNotice({ ...growth, at: performance.now() });
      }),
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  if (!notice) return null;
  return (
    <aside className="power-growth" role="status" aria-label="Sức mạnh vừa tăng">
      <button
        className="power-growth-close"
        aria-label="Ẩn thông báo tăng sức mạnh"
        onClick={() => setNotice(null)}
      >
        ×
      </button>
      <b>✦ {notice.title}</b>
      <strong>
        {notice.delta > 0 ? `Lực chiến +${notice.delta.toLocaleString('vi-VN')}` : 'Lĩnh ngộ mới'}{' '}
        <small>{notice.power.toLocaleString('vi-VN')}</small>
      </strong>
      <span>{notice.details.slice(0, 3).join(' · ')}</span>
      {!!notice.unlocked.length && (
        <span className="power-unlocked">
          Mở chiêu: {notice.unlocked.map((id) => SKILLS[id].name).join(', ')}
        </span>
      )}
      <button
        className="power-growth-action"
        onClick={() => {
          setMenu(notice.menu);
          setNotice(null);
        }}
      >
        {notice.menu === 'skills'
          ? 'Chọn bộ chiêu'
          : notice.menu === 'cultivate'
            ? 'Xem cảnh giới'
            : 'Xem thuộc tính'}{' '}
        ›
      </button>
    </aside>
  );
}
