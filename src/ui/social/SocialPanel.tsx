import { useState } from 'react';
import { leaveParty, removeFriend, respondInvite } from '../../net/socialBridge';
import { partyMembers, isOnline, FRIEND_CAP } from '../../net/social';
import { useSocial } from '../../store/socialStore';
import { useGame } from '../../store/gameStore';

type SocialTab = 'party' | 'friends' | 'invites';

/**
 * The Xã Hội menu: current party, friend list and pending invitations.
 * Everything here is derived from the social channel's presence, so it
 * updates live without polling.
 */
export function SocialPanel() {
  const [tab, setTab] = useState<SocialTab>('party');
  const roster = useSocial((s) => s.roster);
  const myParty = useSocial((s) => s.partyId);
  const partyLeaderId = useSocial((s) => s.partyLeaderId);
  const friends = useSocial((s) => s.friends);
  const invites = useSocial((s) => s.invites);
  const connected = useSocial((s) => s.connected);
  const myName = useGame((s) => s.player.name);

  const members = myParty ? partyMembers(roster, myParty) : [];
  const isLeader = !!partyLeaderId && members.some((m) => m.userId === partyLeaderId);

  return (
    <div>
      <div className="social-tabs">
        <button className={tab === 'party' ? 'active' : ''} onClick={() => setTab('party')}>
          Tổ Đội {myParty ? `(${members.length + 1})` : ''}
        </button>
        <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>
          Hảo Hữu ({friends.length})
        </button>
        <button className={tab === 'invites' ? 'active' : ''} onClick={() => setTab('invites')}>
          Lời Mời {invites.length > 0 && <span className="invite-badge">{invites.length}</span>}
        </button>
      </div>

      {!connected && (
        <p className="muted social-offline">Chưa kết nối — vào bản đồ ngoài để tìm đạo hữu.</p>
      )}

      {tab === 'party' && (
        <div className="social-section">
          {myParty ? (
            <>
              <div className="party-header">
                <span className="party-name">Tổ Đội</span>
                <button className="btn small danger" onClick={() => leaveParty()}>
                  {isLeader ? 'Giải tán' : 'Rời đội'}
                </button>
              </div>
              <ul className="social-list">
                {members.map((m) => (
                  <li key={m.userId} className="social-item">
                    <span className="social-avatar" aria-hidden="true">{m.name[0]}</span>
                    <div className="social-meta">
                      <span className="social-name">{m.name}{m.name === myName && ' (bạn)'}</span>
                      <span className="social-sub">Cấp {m.level} · {m.realm}</span>
                    </div>
                    <span className="social-map">{m.mapId}</span>
                  </li>
                ))}
              </ul>
              <p className="muted social-hint">Đồng đội ở bản đồ khác vẫn thấy trong danh sách. Nhấp một đạo hữu trên bản đồ để mời thêm.</p>
            </>
          ) : (
            <p className="muted">Chưa có tổ đội. Nhấp một đạo hữu trên bản đồ rồi chọn <b>Mời tổ đội</b>.</p>
          )}
        </div>
      )}

      {tab === 'friends' && (
        <div className="social-section">
          {friends.length === 0 ? (
            <p className="muted">Chưa có hảo hữu. Nhấp một đạo hữu trên bản đồ rồi chọn <b>Kết hảo hữu</b>.</p>
          ) : (
            <>
              <p className="muted social-cap">{friends.length}/{FRIEND_CAP} hảo hữu</p>
              <ul className="social-list">
                {friends.map((f) => {
                  const online = isOnline(roster, f.userId);
                  const p = roster.find((r) => r.userId === f.userId);
                  return (
                    <li key={f.userId} className="social-item">
                      <span className={`social-avatar ${online ? 'online' : ''}`} aria-hidden="true">{f.name[0]}</span>
                      <div className="social-meta">
                        <span className="social-name">{f.name}</span>
                        <span className="social-sub">{online && p ? p.realm : online ? 'Có mặt' : 'Ngoài tuyến'}</span>
                      </div>
                      <span className={`social-status ${online ? 'online' : 'offline'}`}>{online ? '●' : '○'}</span>
                      <button className="btn small danger" onClick={() => removeFriend(f.userId)}>Xóa</button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'invites' && (
        <div className="social-section">
          {invites.length === 0 ? (
            <p className="muted">Không có lời mời nào.</p>
          ) : (
            <ul className="social-list">
              {invites.map((inv) => (
                <li key={inv.id} className="social-item invite">
                  <span className="social-avatar" aria-hidden="true">{inv.from.name[0]}</span>
                  <div className="social-meta">
                    <span className="social-name">{inv.from.name}</span>
                    <span className="social-sub">
                      {inv.kind === 'duel' ? 'Mời tỉ võ' : inv.kind === 'party' ? 'Mời vào tổ đội' : 'Kết hảo hữu'}
                    </span>
                  </div>
                  <div className="social-actions">
                    <button className="btn small gold" onClick={() => respondInvite(inv, true)}>Đồng ý</button>
                    <button className="btn small" onClick={() => respondInvite(inv, false)}>Từ chối</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
