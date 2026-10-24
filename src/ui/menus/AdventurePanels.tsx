import { useEffect, useState } from 'react';
import { useGame } from '../../store/gameStore';
import {
  adventure,
  battlePower,
  SECT_MISSIONS,
  SECT_RANKS,
  sectRank,
} from '../../game/systems/adventure';
import { SKILLS } from '../../data';
import { EventBus } from '../../game/EventBus';
import { practiceDuel } from '../../net/socialBridge';
import {
  exchangePremium,
  grantPremium,
  refreshPremium,
  usePremium,
  premiumStore,
} from '../../net/premium';
import { getAccountState, useAccount } from '../../net/session';
import { onlineEnabled } from '../../net/config';
import './adventure.css';

export function SectPanel() {
  const p = useGame((s) => s.player),
    stats = useGame((s) => s.stats),
    map = useGame((s) => s.mapId),
    act = useGame((s) => s.adventureAction),
    setMenu = useGame((s) => s.setMenu),
    a = adventure(p),
    rank = sectRank(p);
  const atSect = ['dai_thua_vien', 'linh_son_tong'].includes(map);
  return (
    <div className="adventure-panel">
      <div className="adventure-summary">
        <h2>Tông Môn · {SECT_RANKS[rank].name}</h2>
        <span>
          Danh vọng <b>{a.reputation}</b> · Cống hiến <b>{a.contribution}</b> · Lực chiến{' '}
          <b>{battlePower(stats)}</b>
        </span>
        <p>Trừ yêu, hái dược, luyện đan và luận kiếm để được tông môn ghi nhận.</p>
        <div className="life-actions">
          <button className="btn" onClick={() => EventBus.emit('cmd:travel', a.boundSect)}>
            Về tông môn
          </button>
          <button
            className="btn"
            disabled={!atSect}
            onClick={() => act({ type: 'bindSect', id: map as 'dai_thua_vien' | 'linh_son_tong' })}
          >
            Ghi danh · đặt điểm hồi sinh
          </button>
          <button className="btn gold" onClick={practiceDuel}>
            Luyện tay với Mộc Nhân
          </button>
          <button className="btn" onClick={() => setMenu('social')}>
            Mời người chơi tỷ võ
          </button>
        </div>
      </div>
      <div className="sect-ranks">
        {SECT_RANKS.map((r, i) => (
          <span className={i <= rank ? 'unlocked' : ''} key={r.name}>
            {r.name}
            <small>{r.reputation} danh vọng</small>
          </span>
        ))}
      </div>
      <h4>Nhiệm vụ Chấp Sự · mỗi nhiệm vụ một lần/ngày game</h4>
      <div className="adventure-cards">
        {SECT_MISSIONS.map((m) => (
          <article className="immortal-card" key={m.id}>
            <h4>{m.name}</h4>
            <p>{m.desc}</p>
            <small>
              +{m.reputation} danh vọng · +{m.contribution} cống hiến
            </small>
            <p>
              {a.mission?.id === m.id
                ? `${a.mission.progress}/${a.mission.target}`
                : a.mission
                  ? 'Đang nhận nhiệm vụ khác'
                  : 'Chưa nhận'}
            </p>
            <button
              className="btn gold"
              disabled={
                !atSect ||
                (!!a.mission && a.mission.id !== m.id) ||
                (a.mission?.id === m.id && a.mission.progress < a.mission.target)
              }
              onClick={() =>
                act(
                  a.mission?.id === m.id ? { type: 'claimMission' } : { type: 'mission', id: m.id },
                )
              }
            >
              {a.mission?.id === m.id ? 'Trả nhiệm vụ' : 'Nhận nhiệm vụ'}
            </button>
          </article>
        ))}
      </div>
      <h4>Trưởng Lão truyền pháp</h4>
      <div className="adventure-cards">
        {(['loi_kich', 'phong_nhan'] as const).map((id, i) => (
          <article className="immortal-card" key={id}>
            <h4>{SKILLS[id].name}</h4>
            <p>{SKILLS[id].desc}</p>
            <p>Cần {SECT_RANKS[i + 2].name} · 60 cống hiến</p>
            <button
              className="btn"
              disabled={a.learnedSecrets.includes(id) || !atSect || rank < i + 2}
              onClick={() => act({ type: 'learnSecret', id })}
            >
              {a.learnedSecrets.includes(id) ? 'Đã lĩnh ngộ' : 'Học bí thuật'}
            </button>
          </article>
        ))}
      </div>
      <p className="muted">
        Nội Môn mở Tàng Kinh Các; Chân Truyền mở Linh Địa Hậu Sơn. Có thể chọn đường trên bản đồ thế
        giới.
      </p>
    </div>
  );
}

export function PremiumPanel() {
  const account = useAccount(),
    premium = usePremium(),
    sync = useGame((s) => s.syncPremium),
    [username, setUsername] = useState(''),
    [amount, setAmount] = useState(100),
    [note, setNote] = useState('Phần thưởng sự kiện'),
    [granted, setGranted] = useState(false);
  useEffect(() => {
    const id = account.user?.id;
    if (id)
      void refreshPremium().then(() => {
        if (getAccountState().user?.id === id) sync();
      });
  }, [account.user, sync]);
  return (
    <div className="adventure-panel">
      <div className="adventure-summary">
        <h2>Tiên Ngọc Các</h2>
        <p>Tiên Ngọc chỉ được quản trị viên cấp qua hệ thống tài khoản.</p>
        <b className="premium-balance">{premium.loaded ? premium.balance : '—'} Tiên Ngọc</b>
      </div>
      {(!onlineEnabled || !account.user) && (
        <p className="muted">
          Cần cấu hình server và đăng nhập để dùng Tiên Ngọc. Chế độ offline không có quyền tự cấp
          ngọc.
        </p>
      )}
      {premium.error && <p className="req-bad">Không thể truy cập Tiên Ngọc: {premium.error}</p>}
      <article className="immortal-card">
        <h3>Thiên Ngọc Tiên Ấn</h3>
        <p>
          Tiên pháp bảo · ô Ngọc Bội · Lv.10. Công +40, Thủ +25, Sinh lực +220. Vật phẩm được ghi nhận
          trên tài khoản.
        </p>
        <p>Giá: 200 Tiên Ngọc</p>
        <button
          className="btn gold"
          disabled={
            !premium.loaded ||
            premium.busy ||
            premium.balance < 200 ||
            premium.items.includes('tien_phap_bao')
          }
          onClick={async () => {
            if (await exchangePremium()) sync();
          }}
        >
          {premium.items.includes('tien_phap_bao') ? 'Đã sở hữu' : 'Đổi tiên pháp bảo'}
        </button>
      </article>
      {premium.admin && (
        <form
          className="premium-admin immortal-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setGranted(false);
            await grantPremium(username, amount, note);
            setGranted(!premiumStore.getState().error);
          }}
        >
          <h4>Quản trị · Cấp Tiên Ngọc</h4>
          <label>
            Username người nhận
            <input value={username} required onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            Số lượng
            <input
              type="number"
              min="1"
              max="1000000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <label>
            Lý do
            <input required minLength={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button className="btn gold" disabled={premium.busy}>
            Cấp ngọc
          </button>
          {granted && <p>Đã gửi yêu cầu cấp ngọc thành công.</p>}
        </form>
      )}
    </div>
  );
}
