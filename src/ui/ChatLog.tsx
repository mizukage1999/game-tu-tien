import { useEffect, useRef, useState } from 'react';
import { useGame, type LogChannel } from '../store/gameStore';
import { usePhoneLayout } from './TouchPlay';
import { chatStore, useChat } from '../store/chatStore';

const TABS: { id: 'all' | LogChannel; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'world', label: 'Thế Giới' },
  { id:'near',label:'Gần' },
  { id: 'system', label: 'Hệ Thống' },
];

const TAG: Record<LogChannel, string> = { system: 'Hệ Thống', world: 'Thế Giới', combat: 'Chiến Đấu',near:'Gần' };

export function ChatLog() {
  const logs = useGame((s) => s.logs);
  const unread=useChat(s=>s.unread);
  const phone = usePhoneLayout();
  const [tab, setTab] = useState<'all' | LogChannel>('all');
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const shown = logs.filter((l) => tab === 'all' || l.channel === tab || (tab === 'system' && l.channel === 'combat'));

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [shown.length, tab, open]);

  return (
    <div className={`chat panel-glass ${open ? '' : 'collapsed'} ${expanded ? 'expanded' : ''}`}>
      <div className="chat-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        <button className="chat-compose" onClick={()=>chatStore.getState().show(tab === 'world' ? 'world' : tab === 'near' ? 'near' : unread ? 'private' : 'world')} aria-label="Mở chat Thế Giới, gần và chat mật">✉{unread?` ${unread}`:''}</button>
        {phone && open && <button className="chat-history" onClick={() => setExpanded(v => !v)} aria-label={expanded ? 'Thu gọn lịch sử chat' : 'Xem lịch sử chat'} aria-expanded={expanded}>{expanded ? '↙' : '↗'}</button>}
        <button className="chat-toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Thu gọn' : 'Mở rộng'}>
          {open ? '▾' : '▴'}
        </button>
      </div>
      {open && (
        <ul ref={list} className="chat-list">
          {shown.slice(phone && !expanded ? -2 : -40).map((l) => (
            <li key={l.id} title={l.text}>
              <span className={`chat-tag ${l.channel}`}>{TAG[l.channel]}</span> {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
