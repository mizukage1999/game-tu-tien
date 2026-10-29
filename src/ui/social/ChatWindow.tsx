import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChat } from '../../store/chatStore';
import { useSocial } from '../../store/socialStore';
import { useGame } from '../../store/gameStore';
import { getAccountState } from '../../net/session';
import { sendWhisper, sendWorldChat } from '../../net/socialBridge';
import { EventBus } from '../../game/EventBus';
import { RosterPortrait } from '../HeroArt';
import { heroFor } from '../../data/heroes';
import './chat-window.css';

export function ChatWindow() {
  const state = useChat((s) => s),
    roster = useSocial((s) => s.roster),
    map = useGame((s) => s.mapId),
    me = useGame((s) => s.player);
  const self = getAccountState().user?.id ?? 'me';
  const [text, setText] = useState(''),
    [query, setQuery] = useState(''),
    [emoji, setEmoji] = useState(false),
    [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const shown = state.messages.filter((m) =>
    state.tab !== 'private'
      ? m.kind === state.tab
      : m.kind === 'private' && (m.from === state.recipient?.id || m.to === state.recipient?.id),
  );
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [shown.length, state.open, state.recipient?.id]);
  if (!state.open) return null;
  const peers = new Map<string, { id: string; name: string }>();
  for (const p of roster)
    if (state.tab !== 'near' || p.mapId === map)
      peers.set(p.userId, { id: p.userId, name: p.name });
  if (state.tab === 'private')
    for (const m of state.messages.filter((m) => m.kind === 'private' && m.from !== self))
      if (!peers.has(m.from)) peers.set(m.from, { id: m.from, name: m.name });
  const list = [...peers.values()].filter((p) =>
    p.name.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN')),
  );
  const send = async () => {
    const cleaned = text.trim();
    if (!cleaned || busy) return;
    if (state.tab === 'near') {
      EventBus.emit('cmd:nearChat', cleaned);
      setText('');
      return;
    }
    if (state.tab === 'world') {
      setBusy(true);
      if (await sendWorldChat(cleaned)) setText('');
      setBusy(false);
      return;
    }
    if (!state.recipient) return;
    setBusy(true);
    if (await sendWhisper(state.recipient.id, cleaned)) setText('');
    setBusy(false);
  };
  return createPortal(
    <div
      className="chat-screen"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) state.close();
      }}
    >
      <section className="chat-window" role="dialog" aria-modal="true" aria-label="Trò chuyện">
        <header>
          <span>✉</span>
          <h2>Tiên Âm Truyền Tin</h2>
          <button aria-label="Đóng trò chuyện" onClick={state.close}>
            ×
          </button>
        </header>
        <nav aria-label="Kênh trò chuyện">
          <button aria-pressed={state.tab === 'world'} onClick={() => state.show('world')}>
            ◎ Thế Giới
          </button>
          <button aria-pressed={state.tab === 'near'} onClick={() => state.show('near')}>
            ⌖ Gần
          </button>
          <button aria-pressed={state.tab === 'private'} onClick={() => state.show('private')}>
            ♡ Chat mật {state.unread > 0 && <b>{state.unread}</b>}
          </button>
        </nav>
        <aside className="chat-contacts">
          <input
            aria-label="Tìm người trò chuyện"
            value={query}
            placeholder="Tìm đạo hữu..."
            onChange={(e) => setQuery(e.target.value)}
          />
          <div>
            {list.map((p) => {
              const profile = roster.find((r) => r.userId === p.id);
              return (
                <button
                  key={p.id}
                  aria-pressed={state.recipient?.id === p.id}
                  onClick={() => state.privateTo(p.id, p.name)}
                >
                  <RosterPortrait id={heroFor(profile ?? {}).id} />
                  <span>
                    <b>{p.name}</b>
                    <small>{profile ? '● Trực tuyến' : 'Ngoại tuyến'}</small>
                  </span>
                </button>
              );
            })}
            {!list.length && <p>Chưa có đạo hữu trong danh sách.</p>}
          </div>
        </aside>
        <main className="chat-thread">
          <h3>
            {state.tab === 'near'
              ? '⌖ Trò chuyện gần'
              : state.tab === 'world' ? '◎ Trò chuyện Thế Giới' : (state.recipient?.name ?? 'Chọn đạo hữu để truyền tin')}
            <small>
              {state.tab === 'near'
                ? 'Người ở gần bạn trong cùng bản đồ có thể đọc được.'
                : state.tab === 'world' ? 'Mọi đạo hữu đang online trên server đều có thể đọc, dù ở khác bản đồ.' : 'Tin mật chỉ gửi đến người bạn chọn.'}
            </small>
          </h3>
          <div className="chat-messages" aria-live="polite">
            {shown.map((m) => {
              const own = m.from === self,
                profile = roster.find((p) => p.userId === m.from);
              return (
                <article key={m.id} className={own ? 'own' : ''}>
                  <button
                    aria-label={`Chat mật với ${m.name}`}
                    disabled={own}
                    onClick={() => state.privateTo(m.from, m.name)}
                  >
                    <RosterPortrait id={heroFor(own ? me : (profile ?? {})).id} />
                  </button>
                  <div>
                    <small>
                      {m.name} ·{' '}
                      {new Date(m.at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                    <p>{m.text}</p>
                  </div>
                </article>
              );
            })}
            <div ref={bottom} />
            {!shown.length && <p className="chat-empty">Một lời chào, một mối tiên duyên.</p>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {emoji && (
              <div className="chat-emojis">
                {['😊', '😄', '❤️', '👋', '👍', '🙏', '😮', '😭', '🔥', '⚔️', '🌸', '✨'].map(
                  (v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        setText((t) => (t + v).slice(0, 200));
                        setEmoji(false);
                      }}
                    >
                      {v}
                    </button>
                  ),
                )}
              </div>
            )}
            <button type="button" aria-label="Biểu cảm" onClick={() => setEmoji((v) => !v)}>
              ☺
            </button>
            <input
              aria-label="Nội dung tin nhắn"
              value={text}
              maxLength={200}
              placeholder={
                state.tab === 'private' && !state.recipient
                  ? 'Chọn người nhận trước...'
                  : 'Nhập nội dung...'
              }
              disabled={state.tab === 'private' && !state.recipient}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
            />
            <button
              className="chat-send"
              type="submit"
              disabled={busy || !text.trim() || (state.tab === 'private' && !state.recipient)}
            >
              {busy ? '...' : 'Gửi'}
            </button>
          </form>
        </main>
      </section>
    </div>,
    document.body,
  );
}
