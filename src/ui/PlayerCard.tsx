import { challengeDuel, inviteToParty, removeFriend, requestFriend } from '../net/socialBridge';
import { presenceFor, useSocial } from '../store/socialStore';
import { useGame } from '../store/gameStore';
import { useAccount } from '../net/session';
import { chatStore } from '../store/chatStore';

/**
 * Another player's public card: who they are, plus the three things you can do
 * with them. Opened by clicking their body in the world.
 */
export function PlayerCard() {
  const card = useSocial((s) => s.card);
  const closeCard = useSocial((s) => s.closeCard);
  const roster = useSocial((s) => s.roster);
  const friends = useSocial((s) => s.friends);
  const myParty = useSocial((s) => s.partyId);
  const connected = useSocial((s) => s.connected);
  const { user } = useAccount();
  useGame((s) => s.player.name); // keep the card in sync if the local player is renamed

  if (!card) return null;

  const me = presenceFor(roster, card);
  const online = me !== null;
  const isFriend = friends.some((f) => f.userId === card);
  const isSelf = user?.id === card;
  const sameParty = !!myParty && me?.party === myParty;

  return (
    <div className="menu-backdrop" onPointerDown={(e) => e.target === e.currentTarget && closeCard()}>
      <div className="player-card panel-ornate">
        <div className="menu-header">
          <h3>{me?.name ?? 'Đạo hữu'}</h3>
          <button className="close" onClick={closeCard} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="card-body">
          <div className="card-portrait" aria-hidden="true">
            <span className={`card-glyph ${me?.sex === 'male' ? 'male' : 'female'}`}>{me?.name?.[0] ?? '?'}</span>
          </div>
          <div className="card-info">
            <div className="card-row">
              <span className="card-label">Cảnh giới</span>
              <span className="card-value gold">{me?.realm ?? '—'}</span>
            </div>
            <div className="card-row">
              <span className="card-label">Giới tính</span>
              <span className="card-value">{me?.sex === 'male' ? 'Nam' : 'Nữ'}</span>
            </div>
            <div className="card-row">
              <span className="card-label">Bản đồ</span>
              <span className="card-value">{me?.mapId ?? '—'}</span>
            </div>
            <div className="card-row">
              <span className="card-label">Tổ đội</span>
              <span className="card-value">{me?.party ? (sameParty ? 'Cùng tổ đội' : 'Đã có tổ đội') : 'Đơn độc'}</span>
            </div>
            <div className="card-row">
              <span className="card-label">Trạng thái</span>
              <span className={`card-value ${online ? 'online' : 'offline'}`}>{online ? '● Trực tuyến' : '○ Ngoài tuyến'}</span>
            </div>
          </div>
        </div>
        {!isSelf && (
          <div className="card-actions">
            <button className="btn" disabled={!online} onClick={()=>{chatStore.getState().privateTo(card,me?.name??'Đạo hữu');closeCard();}}>Chat mật</button>
            <button className="btn gold" disabled={!connected} onClick={() => { challengeDuel(card); closeCard(); }}>
              Tỉ võ
            </button>
            <button
              className="btn"
              disabled={!connected || sameParty}
              onClick={() => { inviteToParty(card); closeCard(); }}
            >
              {sameParty ? 'Đã trong đội' : 'Mời tổ đội'}
            </button>
            {isFriend ? (
              <button className="btn danger" onClick={() => { removeFriend(card); closeCard(); }}>
                Hủy hảo hữu
              </button>
            ) : (
              <button className="btn" disabled={!connected} onClick={() => { requestFriend(card); closeCard(); }}>
                Kết hảo hữu
              </button>
            )}
          </div>
        )}
        {isSelf && <p className="muted card-note">Đây là bạn.</p>}
        {!connected && <p className="muted card-note">Chưa kết nối social — vào bản đồ để tìm đạo hữu.</p>}
        {connected && !me && !isSelf && <p className="muted card-note">Đạo hữu đã rời bản đồ.</p>}
      </div>
    </div>
  );
}
