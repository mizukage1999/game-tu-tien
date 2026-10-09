import { useEffect, useRef, useState } from 'react';
import { useGame, type LogChannel } from '../store/gameStore';

const TABS: { id: 'all' | LogChannel; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'world', label: 'Thế Giới' },
  { id: 'system', label: 'Hệ Thống' },
];

const TAG: Record<LogChannel, string> = { system: 'Hệ Thống', world: 'Thế Giới', combat: 'Chiến Đấu' };

export function ChatLog() {
  const logs = useGame((s) => s.logs);
  const [tab, setTab] = useState<'all' | LogChannel>('all');
  const list = useRef<HTMLUListElement>(null);
  const shown = logs.filter((l) => tab === 'all' || l.channel === tab || (tab === 'system' && l.channel === 'combat'));

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [shown.length, tab]);

  return (
    <div className="chat panel-glass">
      <div className="chat-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <ul ref={list} className="chat-list">
        {shown.slice(-40).map((l) => (
          <li key={l.id}>
            <span className={`chat-tag ${l.channel}`}>{TAG[l.channel]}</span> {l.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
