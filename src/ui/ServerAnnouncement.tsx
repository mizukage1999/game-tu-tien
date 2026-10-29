import { useEffect, useState, type CSSProperties } from 'react';
import { maintenancePending, useServerControl } from '../net/serverControl';
import './server-announcement.css';

export function ServerAnnouncement() {
  const control = useServerControl();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!control.maintenance) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [control.maintenance]);
  if (!control.maintenance) return null;
  const pending = maintenancePending(control, now);
  const seconds = pending
    ? Math.max(0, Math.ceil((Date.parse(control.maintenance_at!) - now) / 1000))
    : 0;
  const message =
    control.message.trim() ||
    'Máy chủ chuẩn bị bảo trì. Đạo hữu vui lòng hoàn tất hoạt động đang tham gia.';
  return (
    <div className="server-announcement" role="status" aria-label={`Thông báo bảo trì. ${message}`}>
      <svg
        className="server-announcement-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M4 9h5l10-5v16L9 15H4V9Zm4 6 2 6H6l-2-6M22 9v6" />
      </svg>
      <div className="server-announcement-window" aria-hidden="true">
        <span
          key={`${control.maintenance_at}:${message}`}
          className="server-announcement-text"
          style={
            {
              '--notice-duration': `${Math.max(16, Math.min(40, message.length / 6))}s`,
            } as CSSProperties
          }
        >
          THÔNG BÁO BẢO TRÌ · {message}
        </span>
      </div>
      <b className="server-announcement-countdown" aria-hidden="true">
        {pending ? `${seconds}s` : 'Bảo trì'}
      </b>
    </div>
  );
}
