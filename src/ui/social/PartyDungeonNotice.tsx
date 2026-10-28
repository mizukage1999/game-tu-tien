import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { DUNGEONS } from '../../data';
import { useAccount } from '../../net/session';
import {
  cancelPartyDungeon,
  partyDungeonStore,
  readyPartyDungeon,
  startPartyDungeon,
} from '../../net/partyDungeon';
import { socialStore, useSocial } from '../../store/socialStore';
import './party-dungeon.css';

export function PartyDungeonNotice() {
  const { ticket, phase, ready } = useStore(partyDungeonStore);
  const me = useAccount().user?.id;
  const party = useSocial((s) => s.partyId);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!ticket) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (partyDungeonStore.getState().phase === 'forming' && Date.now() >= ticket.expires)
        cancelPartyDungeon();
      const social = socialStore.getState();
      if (social.partyId !== ticket.party) cancelPartyDungeon();
    }, 1000);
    return () => clearInterval(timer);
  }, [ticket, party]);
  if (!ticket || phase !== 'forming') return null;
  const leader = me === ticket.leader,
    mine = !!me && ready.includes(me);
  return (
    <section
      className="party-dungeon-notice"
      role="dialog"
      aria-modal="true"
      aria-label="Chuẩn bị phó bản tổ đội"
    >
      <h3>⚔ Phó bản tổ đội · {DUNGEONS[ticket.dungeon].name}</h3>
      <p>
        Cùng đánh một boss · 2–3 người. Thưởng vượt ải dành cho người trực tiếp tham gia. Mỗi người
        dùng một lượt.
      </p>
      <ul>
        {ticket.members.map((m) => (
          <li key={m.userId}>
            <span>{m.name}</span>
            <b>
              {ready.includes(m.userId)
                ? '✓ Sẵn sàng'
                : leader
                  ? 'Đang chờ'
                  : m.userId === me
                    ? 'Chưa xác nhận'
                    : 'Đồng đội'}
            </b>
          </li>
        ))}
      </ul>
      <small>
        Hết hạn sau {Math.max(0, Math.ceil((ticket.expires - now) / 1000))} giây · Mất kết nối sẽ
        hủy và hoàn lượt.
      </small>
      <div>
        <button onClick={() => cancelPartyDungeon()}>Hủy</button>
        {leader ? (
          <button
            disabled={!ticket.members.every((m) => ready.includes(m.userId))}
            onClick={startPartyDungeon}
          >
            Cả đội vào phó bản
          </button>
        ) : (
          <button disabled={mine} onClick={readyPartyDungeon}>
            {mine ? 'Đang chờ đội trưởng' : 'Sẵn sàng'}
          </button>
        )}
      </div>
    </section>
  );
}
