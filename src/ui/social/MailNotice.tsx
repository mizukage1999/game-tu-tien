import { gameStore, useGame } from '../../store/gameStore';
import { acknowledgeMailNotices, useMail } from '../../net/gameMail';
import { CorrespondenceIcon } from './CorrespondenceIcon';
import './mail.css';
import { useSocial } from '../../store/socialStore';
export function MailNotice() {
  const duel = useSocial((s) => s.duel);
  const mails = useMail((s) => s.mails),
    acknowledgedIds = useMail((s) => s.acknowledgedIds),
    menu = useGame((s) => s.menu);
  const pending = mails.filter((m) => !m.read_at && !acknowledgedIds.includes(m.id));
  if (!pending.length || menu || duel) return null;
  return (
    <button
      className="hud-mail-notice"
      onClick={() => {
        acknowledgeMailNotices();
        gameStore.getState().setMenu('mail');
      }}
      aria-label="Mở thư mới"
    >
      <CorrespondenceIcon kind="mail" />
      <span>Thư mới</span>
      <b>{pending.length}</b>
    </button>
  );
}
