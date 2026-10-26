import { useEffect, useState } from 'react';
import { useSocial } from '../../store/socialStore';
import { freshInvites } from '../../net/social';
import { respondInvite } from '../../net/socialBridge';
import './social-notices.css';

export function InviteNotice() {
  const pending = useSocial((s) => s.invites),
    duel = useSocial((s) => s.duel);
  const [now, setNow] = useState(Date.now()),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const invites = freshInvites(pending, now);
  if (!invites.length || duel) return null;
  return (
    <aside className="invite-notice" aria-label="Lời mời mới">
      <button
        className="invite-emblem"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        aria-label={`${invites.length} lời mời mới`}
      >
        ✉<b>{invites.length}</b>
        <span>Lời mời</span>
      </button>
      {open && (
        <section className="invite-tray panel-ornate" role="dialog" aria-label="Xem lời mời">
          <header>
            <h3>Tiên duyên hội ngộ</h3>
            <button onClick={() => setOpen(false)} aria-label="Đóng lời mời">
              ×
            </button>
          </header>
          {invites.map((i) => (
            <article key={i.id}>
              <i>{i.kind === 'duel' ? '⚔' : i.kind === 'party' ? '♟' : '✦'}</i>
              <div>
                <b>{i.from.name}</b>
                <p>
                  {i.kind === 'duel'
                    ? 'Mời bạn tỷ võ điều khiển tay'
                    : i.kind === 'party'
                      ? 'Mời bạn tham gia tổ đội'
                      : 'Muốn kết bạn cùng bạn'}
                </p>
                <small>Còn {Math.max(0, 45 - Math.floor((now - i.createdAt) / 1000))} giây</small>
              </div>
              <button className="btn gold" onClick={() => respondInvite(i, true)}>
                Đồng ý
              </button>
              <button className="btn" onClick={() => respondInvite(i, false)}>
                Từ chối
              </button>
            </article>
          ))}
        </section>
      )}
    </aside>
  );
}
