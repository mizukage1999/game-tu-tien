import { gameStore, useGame } from '../../store/gameStore';
import { useMail } from '../../net/gameMail';
import { CorrespondenceIcon } from './CorrespondenceIcon';
import './mail.css';
import { useSocial } from '../../store/socialStore';
export function MailNotice() {
  const duel = useSocial((s) => s.duel);
  const mails = useMail((s) => s.mails),
    admitted = useGame((s) => s.player.admitted),
    menu = useGame((s) => s.menu);
  const pending = mails.filter((m) => !m.read_at || (admitted && !m.claimed_at));
  if (!pending.length || menu || duel) return null;
  return (
    <button
      className="hud-mail-notice"
      onClick={() => gameStore.getState().setMenu('mail')}
      aria-label="Mở thư mới"
    >
      <CorrespondenceIcon kind="mail" />
      <span>{admitted ? 'Quà Alphatest' : 'Thư mới'}</span>
      <b>{pending.length}</b>
    </button>
  );
}
