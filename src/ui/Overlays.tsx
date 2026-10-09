import { useEffect, useState } from 'react';
import { EventBus } from '../game/EventBus';
import { npcName, useGame, type Toast } from '../store/gameStore';

export function TargetFrame() {
  const t = useGame((s) => s.target);
  if (!t) return null;
  const pct = (t.hp / t.maxHp) * 100;
  return (
    <div className="target-frame panel-glass">
      <div className="target-name">
        {t.name} <span>Lv.{t.level}</span>
      </div>
      <div className="bar bar-hp small">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
        <span className="bar-text">
          {t.hp} / {t.maxHp}
        </span>
      </div>
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useGame((s) => s.dismissToast);
  useEffect(() => {
    const ms = toast.kind === 'levelup' || toast.kind === 'realm' ? 2600 : 2200;
    const id = window.setTimeout(() => dismiss(toast.id), ms);
    return () => window.clearTimeout(id);
  }, [toast, dismiss]);
  return <div className={`toast toast-${toast.kind}`}>{toast.text}</div>;
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

export function DownedOverlay() {
  const status = useGame((s) => s.status);
  const rem = useGame((s) => s.downedRemaining);
  if (status !== 'downed') return null;
  return (
    <div className="downed">
      <div className="downed-title">Trọng Thương</div>
      <div className="downed-sub">Linh lực hao tổn, không thể chiến đấu</div>
      <div className="downed-timer">Hồi sinh sau {(rem / 1000).toFixed(1)}s</div>
    </div>
  );
}

export function InteractPrompt() {
  const npc = useGame((s) => s.nearbyNpc);
  const dialog = useGame((s) => s.dialogNpc);
  const zone = useGame((s) => s.zone);
  const meditating = useGame((s) => s.meditating);
  const status = useGame((s) => s.status);
  if (status !== 'alive' || dialog) return null;
  if (npc) {
    return (
      <button className="prompt" onClick={() => EventBus.emit('cmd:interact')}>
        <kbd>E</kbd> Trò chuyện với {npcName(npc)}
      </button>
    );
  }
  if (meditating) {
    return (
      <button className="prompt meditating" onClick={() => EventBus.emit('cmd:meditate')}>
        Đang tọa thiền{zone ? ` tại ${zone.name}` : ''}... <kbd>F</kbd> dừng
      </button>
    );
  }
  return (
    <button className="prompt subtle" onClick={() => EventBus.emit('cmd:meditate')}>
      <kbd>F</kbd> Tọa thiền{zone ? ` (${zone.name} x${zone.rate})` : ''}
    </button>
  );
}

export function ClockBar() {
  const auto = useGame((s) => s.auto);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="clock">
      {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')} · Offline
      {auto ? ' · Tự động' : ''}
    </div>
  );
}
