import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { rankedAction, rankedStore, rankedTier } from '../../net/ranked';
import { heroFor } from '../../data/heroes';
import { heroName, isChildhood } from '../../game/systems/origin';
import { useGame } from '../../store/gameStore';
import { useSocial } from '../../store/socialStore';
import { practiceDuel } from '../../net/socialBridge';
import { RosterPortrait } from '../HeroArt';
import { CrossedSwords } from '../PkModeDropdown';
import { HudFrame } from '../HudGlyph';
import { MenuSprite } from '../MenuSprite';
import './competitive.css';
import './ranked-arena.css';

function QueueClock({ since }: { since: number | null }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (since === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [since]);
  const seconds = since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
  return (
    <time>
      {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
    </time>
  );
}

export function RankedArenaPanel() {
  const [mobilePage, setMobilePage] = useState<'arena' | 'board'>('arena');
  const { page, error, busy, searching, searchStartedAt } = useStore(rankedStore),
    p = useGame((s) => s.player),
    status = useGame((s) => s.status),
    dungeon = useGame((s) => s.dungeon),
    trial = useGame((s) => s.tribulation),
    connected = useSocial((s) => s.connected);
  useEffect(() => {
    void rankedAction('status');
  }, []);
  const child = isChildhood(p),
    blocked = child || status !== 'alive' || !!dungeon || !!trial || !connected,
    name = heroName(p),
    hero = heroFor(p),
    matched = !!page?.match,
    phase = matched ? 1 : searching ? 0 : page?.result ? 2 : 0,
    opponent = page?.match && (page.match.a.name === name ? page.match.b : page.match.a);
  return (
    <section
      className={`ranked-panel ranked-arena ${searching ? 'is-searching' : ''} mobile-${mobilePage}`}
    >
      <nav className="ranked-mobile-tabs" aria-label="Mục tỷ võ">
        <button aria-pressed={mobilePage === 'arena'} onClick={() => setMobilePage('arena')}>
          ⚔ Tìm trận · {page?.rating ?? '—'} điểm
        </button>
        <button aria-pressed={mobilePage === 'board'} onClick={() => setMobilePage('board')}>
          ♛ Tiên Bảng
        </button>
      </nav>
      <aside className="ranked-intro ranked-card">
        <HudFrame />
        <div className="ranked-intro-summary">
          <small>Luận Đạo · Xếp Hạng 1 vs 1</small>
          <h2>{page ? rankedTier(page.rating) : 'Tiên Đài Tranh Phong'}</h2>
          <div className="ranked-rating">
            <MenuSprite kind="ranking" />
            <strong>
              {page?.rating ?? '—'} <small>điểm</small>
            </strong>
          </div>
          <div className="ranked-rules">
            <p>
              Mùa tuần bắt đầu <b>{page?.season ?? '—'}</b>
            </p>
            <p>Thắng +20 · Thua −20 · Hòa giữ điểm</p>
            <p>Giữ trang bị và bộ chiêu của bạn. Ghép tối đa lệch một đại cảnh giới và 15 cấp.</p>
          </div>
          <div className="ranked-record">
            <span>
              Thắng <b>{page?.wins ?? 0}</b>
            </span>
            <span>
              Thua <b>{page?.losses ?? 0}</b>
            </span>
            <span>
              Hòa <b>{page?.draws ?? 0}</b>
            </span>
          </div>
        </div>
        <button
          className="btn gold ranked-join"
          disabled={busy || searching || blocked}
          onClick={() => void rankedAction('join')}
        >
          <CrossedSwords />{' '}
          {matched ? 'Đã ghép đối thủ' : searching ? 'Đang tìm trận' : 'Tìm trận xếp hạng'}
        </button>
        <button
          className="btn ranked-practice"
          disabled={child || searching}
          onClick={practiceDuel}
        >
          Luyện tay · không tính điểm
        </button>
        <details className="competitive-note">
          <summary>Quy tắc tính điểm</summary>
          <p>Giữ trang bị và bộ chiêu của bạn. Ghép tối đa lệch một đại cảnh giới và 15 cấp.</p>
          <p>
            Mỗi cặp tính điểm tối đa 2 trận/ngày; mỗi người tối đa 20 trận tính điểm/24 giờ. Rời
            trận tính thua. Kết quả cần hai bên xác nhận; kết quả bất đồng không cộng điểm.
          </p>
        </details>
      </aside>
      <div className="ranked-stage">
        <ol className="ranked-phases" aria-label="Tiến trình trận đấu">
          {['Chờ ghép', 'Đang đấu', 'Kết quả'].map((label, i) => (
            <li
              key={label}
              className={phase === i ? 'active' : ''}
              aria-current={phase === i ? 'step' : undefined}
            >
              {label}
            </li>
          ))}
        </ol>
        <div className="ranked-search-status">
          {searching && !matched && <span className="ranked-spinner" aria-hidden="true" />}
          <h3 role="status">
            {matched
              ? 'Đã tìm thấy đối thủ'
              : searching
                ? 'Đang tìm đối thủ…'
                : page?.result
                  ? 'Đã kết thúc trận đấu'
                  : 'Sẵn sàng luận đạo'}
          </h3>
          {searching && (
            <p>
              {matched ? (
                'Chuẩn bị vào sân…'
              ) : (
                <>
                  Thời gian chờ: <QueueClock since={searchStartedAt} />
                </>
              )}
            </p>
          )}
          {!searching && (
            <p>
              {connected
                ? 'Thử sức cùng đạo hữu toàn server.'
                : 'Kết nối tài khoản online để tìm trận.'}
            </p>
          )}
        </div>
        <div className="ranked-versus">
          <div className="ranked-duelist">
            <div className="ranked-portrait">
              <RosterPortrait id={hero.id} />
            </div>
            <b title={name}>{name}</b>
            <small>
              {page ? rankedTier(page.rating) : hero.school} · {page?.rating ?? '—'} điểm
            </small>
          </div>
          <span className="ranked-vs" aria-hidden="true">
            VS
          </span>
          <div className="ranked-duelist">
            <div
              className="ranked-portrait ranked-unknown"
              aria-label={opponent ? 'Đối thủ đã ghép' : 'Chưa có đối thủ'}
            >
              {opponent?.heroId ? <RosterPortrait id={opponent.heroId} /> : <span>?</span>}
            </div>
            <b>{opponent?.name ?? (searching ? 'Đang tìm…' : 'Đối thủ')}</b>
            <small>{opponent ? `Lv.${opponent.level}` : 'Chờ đạo hữu ứng chiến'}</small>
          </div>
        </div>
        {error && (
          <p role="alert" className="competitive-error ranked-feedback">
            {error}
          </p>
        )}
        {searching && (
          <button
            className="btn ranked-cancel"
            disabled={busy}
            onClick={() => void rankedAction('leave')}
          >
            ✕ Hủy ghép
          </button>
        )}
      </div>
      <aside className="ranked-board ranked-card">
        <HudFrame />
        <header>
          <h3>♛ Tiên Bảng mùa này</h3>
          <button className="btn" disabled={busy} onClick={() => void rankedAction('status')}>
            ↻ Làm mới
          </button>
        </header>
        <div className="ranked-table">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Đạo hữu</th>
                <th>Điểm</th>
                <th>Thắng</th>
              </tr>
            </thead>
            <tbody>
              {page?.rows.map((r, i) => (
                <tr key={r.userId}>
                  <td>
                    <span className={`ranked-place place-${i + 1}`}>{i + 1}</span>
                  </td>
                  <td>
                    <b>{r.name}</b>
                    <small>{rankedTier(r.rating)}</small>
                  </td>
                  <td>{r.rating}</td>
                  <td>{r.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!page?.rows.length && (
            <p className="ranked-empty">
              {busy ? 'Đang tải Tiên Bảng…' : 'Chưa có dữ liệu xếp hạng mùa này.'}
            </p>
          )}
        </div>
      </aside>
    </section>
  );
}
