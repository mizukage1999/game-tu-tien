import { useEffect } from 'react';
import { useStore } from 'zustand';
import { rankedAction, rankedStore, rankedTier } from '../../net/ranked';
import { isChildhood } from '../../game/systems/origin';
import { useGame } from '../../store/gameStore';
import { useSocial } from '../../store/socialStore';
import { practiceDuel } from '../../net/socialBridge';
import './competitive.css';
export function RankedArenaPanel() {
  const { page, error, busy, searching } = useStore(rankedStore),
    p = useGame((s) => s.player),
    status = useGame((s) => s.status),
    dungeon = useGame((s) => s.dungeon),
    trial = useGame((s) => s.tribulation),
    connected = useSocial((s) => s.connected);
  useEffect(() => {
    void rankedAction('status');
  }, []);
  const blocked = isChildhood(p) || status !== 'alive' || !!dungeon || !!trial || !connected;
  return (
    <section className="ranked-panel">
      <div className="ranked-intro">
        <small>LUẬN ĐẠO · XẾP HẠNG 1 VS 1</small>
        <h2>{page ? rankedTier(page.rating) : 'Tiên Đài Tranh Phong'}</h2>
        <strong>
          {page?.rating ?? '—'} <small>điểm</small>
        </strong>
        <p>Mùa tuần bắt đầu {page?.season ?? '—'} · Thắng +20 · Thua −20 · Hòa giữ điểm.</p>
        <p>Giữ trang bị và bộ chiêu của bạn. Ghép tối đa lệch một đại cảnh giới và 15 cấp.</p>
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
        {error && (
          <p role="alert" className="competitive-error">
            {error}
          </p>
        )}
        {searching && (
          <p role="status">
            {page?.match
              ? 'Đã ghép đối thủ · chuẩn bị vào sân…'
              : 'Đang tìm đối thủ phù hợp… Bạn có thể đóng bảng này.'}
          </p>
        )}
        <button
          className="btn gold"
          disabled={busy || (!searching && blocked)}
          onClick={() => void rankedAction(searching ? 'leave' : 'join')}
        >
          {searching ? 'Hủy tìm trận' : 'Tìm trận xếp hạng'}
        </button>
        <button className="btn" disabled={isChildhood(p)} onClick={practiceDuel}>
          Luyện tay · không tính điểm
        </button>
        <p className="competitive-note">
          Mỗi cặp tính điểm tối đa 2 trận/ngày; mỗi người tối đa 20 trận tính điểm/24 giờ. Rời trận
          tính thua. Kết quả cần hai bên xác nhận; kết quả bất đồng không cộng điểm.
        </p>
      </div>
      <div className="ranked-board">
        <h3>Tiên Bảng mùa này</h3>
        <button className="btn" disabled={busy} onClick={() => void rankedAction('status')}>
          Làm mới
        </button>
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
                  <td>{i + 1}</td>
                  <td>
                    {r.name}
                    <small>{rankedTier(r.rating)}</small>
                  </td>
                  <td>{r.rating}</td>
                  <td>{r.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!page?.rows.length && <p>Chưa có dữ liệu xếp hạng mùa này.</p>}
        </div>
      </div>
    </section>
  );
}
