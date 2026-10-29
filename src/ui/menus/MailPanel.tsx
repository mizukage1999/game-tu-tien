import { useEffect, useState } from 'react';
import { itemName, useGame } from '../../store/gameStore';
import { useAccount } from '../../net/session';
import {
  acknowledgeMailNotices,
  claimMail,
  readMail,
  refreshMail,
  useMail,
} from '../../net/gameMail';
import { itemIconUrl } from '../../game/art/icons';
import { CorrespondenceIcon } from '../social/CorrespondenceIcon';
import '../social/correspondence.css';
import '../social/mail.css';

export function MailPanel() {
  const player = useGame((s) => s.player),
    account = useAccount();
  const { mails, loading, loaded, busy, error } = useMail((s) => s);
  const [selected, setSelected] = useState('');
  const mail = mails.find((m) => m.id === selected) ?? mails[0];
  const admissionRequired = mail?.campaign_id === 'alphatest-v1';
  const canClaim = !admissionRequired || !!player.admitted;
  useEffect(() => {
    void refreshMail();
  }, []);
  useEffect(() => {
    acknowledgeMailNotices();
  }, [mails]);
  const mailId = mail?.id,
    readAt = mail?.read_at;
  useEffect(() => {
    if (mailId && !readAt) void readMail(mailId);
  }, [mailId, readAt]);
  return (
    <div className="cult-correspondence cult-mail alpha-mail">
      <nav className="cult-side correspondence-nav" aria-label="Mục thư">
        <button className="active" aria-current="page">
          <CorrespondenceIcon kind="mail" />
          <span>Tất cả</span>
          <small>{mails.length}</small>
        </button>
        <div className="correspondence-side-note">
          <span>THƯ TÍN</span>Một phong thư,
          <br />
          một mối duyên.
        </div>
      </nav>
      <section className="correspondence-list" aria-label="Danh sách thư">
        <header className="correspondence-list-heading">
          <h4>Hộp thư</h4>
          <button
            className="btn"
            disabled={loading || busy || !account.user}
            onClick={() => void refreshMail()}
            aria-label="Làm mới hộp thư"
          >
            ↻
          </button>
        </header>
        <div className="mail-rows">
          {mails.map((m) => (
            <button
              key={m.id}
              className={`mail-row ${m.id === mail?.id ? 'selected' : ''}`}
              onClick={() => setSelected(m.id)}
              disabled={busy}
            >
              <CorrespondenceIcon kind="mail" />
              <span>
                <b>{m.title}</b>
                <small>
                  {m.claimed_at
                    ? 'Đã nhận quà'
                    : !m.read_at
                      ? 'Thư mới · Có quà'
                      : 'Có quà đính kèm'}
                </small>
              </span>
              <i>{m.claimed_at ? '✓' : '✦'}</i>
            </button>
          ))}
          {!mails.length && (
            <div className="correspondence-empty">
              <CorrespondenceIcon kind="mail" />
              <h4>
                {loading ? 'Đang tải thư…' : !account.user ? 'Cần đăng nhập' : 'Hộp thư trống'}
              </h4>
              <p>
                {!account.user
                  ? 'Đăng nhập tài khoản online để nhận thư và vật phẩm.'
                  : loaded
                    ? 'Hiện chưa có thư nào.'
                    : ''}
              </p>
            </div>
          )}
        </div>
        <footer className="correspondence-list-foot">
          {mails.length} thư · Mỗi thư nhận một lần
        </footer>
      </section>
      <section className="cult-letter" aria-label="Nội dung thư" aria-busy={busy}>
        <div className="cult-letter-scroll">
          <span className="cult-letter-eyebrow">BAN ĐIỀU HÀNH CỬU HUYỀN</span>
          <h2>{mail?.title ?? 'Chờ một phong thư'}</h2>
          <p className="cult-letter-recipient">
            Đạo hữu: <b>{player.name}</b>
          </p>
          <div className="cult-letter-rule" />
          {mail && (
            <>
              <p className="mail-body">{mail.body}</p>
              <h4 className="mail-attachment-title">✦ Quà đính kèm</h4>
              <div className="mail-rewards">
                {!!mail.rewards.targetLevel && (
                  <div>
                    <i className="mail-level">{mail.rewards.targetLevel}</i>
                    <b>Cấp {mail.rewards.targetLevel}</b>
                    <small>EXP đủ lên cấp {mail.rewards.targetLevel}</small>
                  </div>
                )}
                {!!mail.rewards.jade && (
                  <div>
                    <i className="cult-jade-icon">◈</i>
                    <b>{mail.rewards.jade.toLocaleString('vi-VN')}</b>
                    <small>Tiên Ngọc</small>
                  </div>
                )}
                {!!mail.rewards.linhThach && (
                  <div>
                    <img src={itemIconUrl('linh_thach', 48)} alt="" />
                    <b>{mail.rewards.linhThach.toLocaleString('vi-VN')}</b>
                    <small>Linh Thạch</small>
                  </div>
                )}
                {!!mail.rewards.linhKhi && (
                  <div>
                    <img src={itemIconUrl('linh_khi', 48)} alt="" />
                    <b>{mail.rewards.linhKhi.toLocaleString('vi-VN')}</b>
                    <small>Linh Khí</small>
                  </div>
                )}
                {Object.entries(mail.rewards.items ?? {}).map(([id, qty]) => (
                  <div key={id}>
                    <img src={itemIconUrl(id, 48)} alt="" />
                    <b>{qty.toLocaleString('vi-VN')}</b>
                    <small>{itemName(id)}</small>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <footer className="mail-claim-footer">
          {error && (
            <p role="alert" className="mail-error">
              {error}
            </p>
          )}
          {mail && (
            <>
              <p role="status">
                {mail.claimed_at
                  ? 'Đã nhận toàn bộ vật phẩm trong thư.'
                  : canClaim
                    ? 'Vật phẩm sẽ vào túi khi bạn bấm nhận.'
                    : 'Hoàn thành nhập môn để mở phần thưởng.'}
              </p>
              <button
                className="btn gold mail-claim"
                disabled={busy || !!mail.claimed_at || !canClaim || !account.user}
                onClick={() => void claimMail(mail.id)}
              >
                {busy
                  ? 'Đang nhận…'
                  : mail.claimed_at
                    ? 'Đã nhận'
                    : canClaim
                      ? admissionRequired
                        ? 'Nhận quà Alphatest'
                        : 'Nhận vật phẩm'
                      : '🔒 Chưa nhập môn'}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
