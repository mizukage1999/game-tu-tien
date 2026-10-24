import { useEffect, useState } from 'react';
import { useGame } from '../../store/gameStore';
export { SectPanel } from './SectPanel';
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
