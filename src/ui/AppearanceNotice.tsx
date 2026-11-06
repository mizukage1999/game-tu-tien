import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { appearanceStore, stopAppearancePreview } from '../store/appearanceStore';
import { useAccount } from '../net/session';
import { useGame } from '../store/gameStore';
import './menus/appearance.css';

export function AppearanceNotice() {
  const preview = useStore(appearanceStore, (s) => s.preview),
    until = useStore(appearanceStore, (s) => s.until),
    menu = useGame((s) => s.menu),
    account = useAccount(),
    [now, setNow] = useState(Date.now);
  useEffect(() => {
    stopAppearancePreview();
    return stopAppearancePreview;
  }, [account.user?.id]);
  useEffect(() => {
    if (!preview) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [preview]);
  if (!preview || menu) return null;
  return (
    <aside className="appearance-preview-notice" role="status">
      <span>Đang thử ngoại trang · {Math.max(0, Math.ceil((until - now) / 1000))}s</span>
      <button onClick={stopAppearancePreview}>Kết thúc thử</button>
    </aside>
  );
}
