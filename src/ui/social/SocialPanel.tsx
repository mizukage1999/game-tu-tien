import { useState } from 'react';
import {
  challengeDuel,
  inviteToParty,
  leaveParty,
  removeFriend,
  respondInvite,
} from '../../net/socialBridge';
import { FRIEND_CAP, type FriendRef, type SocialPresence } from '../../net/social';
import { useSocial } from '../../store/socialStore';
import { useGame } from '../../store/gameStore';
import { ZONE_NAMES } from '../../data';
import { isChildhood } from '../../game/systems/origin';
import { useAccount } from '../../net/session';
import { CultHeading } from '../menus/CultivationUI';
import { CorrespondenceIcon } from './CorrespondenceIcon';
import './correspondence.css';

type SocialTab = 'friends' | 'invites';
type StatusFilter = 'all' | 'online' | 'offline';
const INVITE_LABEL = { friend: 'Kết hảo hữu', party: 'Mời vào tổ đội', duel: 'Mời tỉ võ' };
const searchName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi');
const portrait = (sex: SocialPresence['sex']) =>
  `/assets/ui/cultivation/${sex === 'male' ? 'wang' : 'li'}-full-v1.png`;

function FriendAvatar({ profile }: { profile?: SocialPresence }) {
  return (
    <span className={`correspondence-avatar ${profile ? 'online' : ''}`}>
      {profile ? <img src={portrait(profile.sex)} alt="" /> : <CorrespondenceIcon kind="friends" />}
    </span>
  );
}

/** Two sections only. Profiles and invitations reflect the real social channel. */
export function SocialPanel() {
  const [tab, setTab] = useState<SocialTab>('friends');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const roster = useSocial((s) => s.roster);
  const party = useSocial((s) => s.partyId);
  const leader = useSocial((s) => s.partyLeaderId);
  const friends = useSocial((s) => s.friends);
  const invites = useSocial((s) => s.invites);
  const connected = useSocial((s) => s.connected);
  const duel = useSocial((s) => s.duel);
  const player = useGame((s) => s.player);
  const status = useGame((s) => s.status);
  const dungeon = useGame((s) => s.dungeon);
  const tribulation = useGame((s) => s.tribulation);
  const setMenu = useGame((s) => s.setMenu);
  const { user } = useAccount();
  const profileFor = (id: string) => (connected ? roster.find((p) => p.userId === id) : undefined);
  const shown = friends
    .filter(
      (f) =>
        searchName(f.name).includes(searchName(query.trim())) &&
        (!connected || filter === 'all' || (filter === 'online') === !!profileFor(f.userId)),
    )
    .sort(
      (a, b) =>
        Number(!!profileFor(b.userId)) - Number(!!profileFor(a.userId)) ||
        a.name.localeCompare(b.name, 'vi'),
    );
  const friend = shown.find((f) => f.userId === selectedId) ?? shown[0];
  const profile = friend ? profileFor(friend.userId) : undefined;
  const sameParty = !!party && profile?.party === party;
  const partyRoster = connected && party ? roster.filter((p) => p.party === party) : [];
  const canFight =
    status === 'alive' &&
    !isChildhood(player) &&
    !dungeon &&
    !tribulation &&
    !duel &&
    !player.life?.retreat;
  const onlineCount = connected ? friends.filter((f) => profileFor(f.userId)).length : 0;

  function changeTab(next: SocialTab) {
    setTab(next);
    setConfirmRemove(null);
    setNotice('');
  }
  function pick(next: FriendRef) {
    setSelectedId(next.userId);
    setConfirmRemove(null);
    setNotice('');
  }

  return (
    <div className="cult-correspondence cult-friends">
      <nav className="cult-side correspondence-nav" aria-label="Mục bạn bè">
        <button
          className={tab === 'friends' ? 'active' : ''}
          aria-current={tab === 'friends' ? 'page' : undefined}
          onClick={() => changeTab('friends')}
        >
          <CorrespondenceIcon kind="friends" />
          <span>Bạn bè</span>
          <small>{friends.length}</small>
        </button>
        <button
          className={tab === 'invites' ? 'active' : ''}
          aria-current={tab === 'invites' ? 'page' : undefined}
          onClick={() => changeTab('invites')}
        >
          <CorrespondenceIcon kind="invites" />
          <span>Lời mời</span>
          {invites.length > 0 && <small className="correspondence-badge">{invites.length}</small>}
        </button>
        <div className="correspondence-side-note">
          <span>ĐỒNG HÀNH</span>Đường tu tiên,
          <br />
          có người cùng bước.
        </div>
        <button className="correspondence-map-button" onClick={() => setMenu(null)}>
          <span>Về bản đồ</span>
          <span aria-hidden="true">↗</span>
        </button>
      </nav>
      {tab === 'friends' ? (
        <>
          <section className="correspondence-list" aria-label="Danh sách bạn bè">
            <header className="correspondence-list-heading">
              <h4>Danh sách bạn bè</h4>
              <span>
                {friends.length}/{FRIEND_CAP}
              </span>
            </header>
            <div className="correspondence-search-row">
              <label className="correspondence-search">
                <CorrespondenceIcon kind="search" />
                <input
                  aria-label="Tìm bạn bè"
                  placeholder="Nhập tên đạo hữu…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setNotice('');
                    setConfirmRemove(null);
                  }}
                />
                {query && (
                  <button aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}>
                    ×
                  </button>
                )}
              </label>
              <select
                aria-label="Lọc trạng thái bạn bè"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as StatusFilter);
                  setNotice('');
                  setConfirmRemove(null);
                }}
                disabled={!connected}
              >
                <option value="all">Tất cả</option>
                <option value="online">Trực tuyến</option>
                <option value="offline">Ngoại tuyến</option>
              </select>
            </div>
            <div className="correspondence-roster">
              {shown.length ? (
                shown.map((f) => {
                  const p = profileFor(f.userId);
                  return (
                    <button
                      key={f.userId}
                      className={`correspondence-friend ${friend?.userId === f.userId ? 'selected' : ''}`}
                      data-friend={f.userId}
                      aria-pressed={friend?.userId === f.userId}
                      onClick={() => pick(f)}
                    >
                      <FriendAvatar profile={p} />
                      <span className="correspondence-friend-meta">
                        <b>{f.name}</b>
                        <span>{p ? `Lv.${p.level} · ${p.realm}` : 'Đạo hữu kết giao'}</span>
                        <small>
                          {p
                            ? (ZONE_NAMES[p.mapId] ?? 'Đang du ngoạn')
                            : 'Thông tin cập nhật khi trực tuyến'}
                        </small>
                      </span>
                      <span className={`correspondence-status ${p ? 'online' : ''}`}>
                        {!connected ? 'Chưa rõ' : p ? 'Trực tuyến' : 'Ngoại tuyến'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="correspondence-empty">
                  <CorrespondenceIcon kind="friends" />
                  <h4>{friends.length ? 'Không tìm thấy đạo hữu' : 'Chưa có bạn bè'}</h4>
                  <p>
                    {friends.length
                      ? 'Thử tên khác hoặc đổi bộ lọc.'
                      : 'Chạm vào người chơi trên bản đồ và chọn Kết hảo hữu.'}
                  </p>
                </div>
              )}
            </div>
            <footer className="correspondence-list-foot">
              <span className={`correspondence-dot ${connected ? 'online' : ''}`} />
              {connected ? `${onlineCount} đạo hữu trực tuyến` : 'Chưa kết nối'}
            </footer>
          </section>
          <section className="correspondence-profile" aria-label="Thông tin bạn bè">
            {friend ? (
              <>
                <div className="correspondence-profile-scroll">
                  <div className={`correspondence-friend-hero ${profile ? '' : 'unknown'}`}>
                    {profile ? (
                      <img
                        src={`/assets/ui/cultivation/${profile.sex === 'male' ? 'wang' : 'li'}-full-v1.png`}
                        className="correspondence-hero-person"
                        alt=""
                      />
                    ) : (
                      <CorrespondenceIcon kind="friends" />
                    )}
                    <div className="correspondence-hero-identity">
                      <small>ĐẠO HỮU ĐỒNG HÀNH</small>
                      <h2>{friend.name}</h2>
                      <span className={`correspondence-status ${profile ? 'online' : ''}`}>
                        {!connected
                          ? 'Chưa xác định trạng thái'
                          : profile
                            ? 'Trực tuyến'
                            : 'Ngoại tuyến'}
                      </span>
                    </div>
                  </div>
                  <div className="correspondence-profile-body">
                    <CultHeading>Thông tin đạo hữu</CultHeading>
                    <dl className="correspondence-profile-facts">
                      <div>
                        <dt>Cấp</dt>
                        <dd>{profile ? `Lv.${profile.level}` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Cảnh giới</dt>
                        <dd>{profile?.realm || '—'}</dd>
                      </div>
                      <div>
                        <dt>Khu vực</dt>
                        <dd>{profile ? (ZONE_NAMES[profile.mapId] ?? 'Đang du ngoạn') : '—'}</dd>
                      </div>
                      <div>
                        <dt>Tổ đội</dt>
                        <dd>
                          {!profile
                            ? '—'
                            : sameParty
                              ? 'Cùng tổ đội'
                              : profile.party
                                ? 'Đã có tổ đội'
                                : 'Chưa có tổ đội'}
                        </dd>
                      </div>
                      <div>
                        <dt>ID đạo hữu</dt>
                        <dd title={friend.userId}>{friend.userId}</dd>
                      </div>
                    </dl>
                    {!profile && (
                      <p className="correspondence-muted">
                        Thông tin đạo hữu được cập nhật khi cả hai trực tuyến.
                      </p>
                    )}
                    {party && (
                      <div className="correspondence-party">
                        <CultHeading>Tổ đội hiện tại · {partyRoster.length + 1}</CultHeading>
                        <p>
                          {player.name} (bạn){partyRoster.map((m) => ` · ${m.name}`).join('')}
                        </p>
                        <button
                          className="cult-btn"
                          disabled={!connected}
                          onClick={() => {
                            leaveParty();
                            setNotice('Đã rời tổ đội.');
                          }}
                        >
                          {leader === user?.id ? 'Giải tán tổ đội' : 'Rời tổ đội'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="correspondence-profile-actions">
                  <p className="correspondence-feedback" role="status">
                    {notice ||
                      (!connected
                        ? 'Kết nối lại để mời đạo hữu.'
                        : !profile
                          ? 'Đạo hữu hiện ngoại tuyến.'
                          : 'Cùng nhau vượt bí cảnh, luận bàn tiên đạo.')}
                  </p>
                  {confirmRemove === friend.userId ? (
                    <div className="correspondence-action-row">
                      <span>Xóa {friend.name} khỏi bạn bè?</span>
                      <button
                        className="cult-btn danger"
                        onClick={() => {
                          removeFriend(friend.userId);
                          setConfirmRemove(null);
                          setNotice('Đã xóa bạn bè.');
                        }}
                      >
                        Xác nhận xóa
                      </button>
                      <button className="cult-btn" onClick={() => setConfirmRemove(null)}>
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div className="correspondence-action-row">
                      <button
                        className="cult-btn gold"
                        disabled={!profile || sameParty || !!profile.party}
                        onClick={() => {
                          inviteToParty(friend.userId);
                          setNotice(`Đã gửi lời mời tổ đội đến ${friend.name}.`);
                        }}
                      >
                        {sameParty ? 'Cùng tổ đội' : 'Mời tổ đội'}
                      </button>
                      <button
                        className="cult-btn"
                        disabled={!profile || !canFight}
                        onClick={() => {
                          challengeDuel(friend.userId);
                          setNotice(`Đã gửi lời mời tỉ võ đến ${friend.name}.`);
                        }}
                      >
                        Tỉ võ
                      </button>
                      <button
                        className="cult-btn danger"
                        onClick={() => setConfirmRemove(friend.userId)}
                      >
                        Xóa bạn
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="correspondence-empty correspondence-profile-placeholder">
                <CorrespondenceIcon kind="friends" />
                <h2>Tri kỷ trên tiên lộ</h2>
                <p>
                  {friends.length
                    ? 'Chọn đạo hữu trong danh sách để xem thông tin.'
                    : 'Gặp gỡ đạo hữu trên bản đồ để kết bạn và cùng nhau tu hành.'}
                </p>
                {party && (
                  <button className="cult-btn" disabled={!connected} onClick={() => leaveParty()}>
                    Rời tổ đội hiện tại
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="correspondence-invites" aria-label="Danh sách lời mời">
          <header className="correspondence-list-heading">
            <h4>Lời mời đang chờ</h4>
            <span>{invites.length} lời mời</span>
          </header>
          {!connected && (
            <p className="correspondence-connection-note">
              Chưa kết nối. Bạn có thể từ chối hoặc chờ kết nối lại để đồng ý.
            </p>
          )}
          <div className="correspondence-invite-scroll">
            {invites.length ? (
              invites.map((inv) => (
                <article className="correspondence-invite-card" key={inv.id}>
                  <FriendAvatar profile={profileFor(inv.from.userId)} />
                  <div>
                    <small>{INVITE_LABEL[inv.kind]}</small>
                    <h3>{inv.from.name}</h3>
                    <p>
                      {inv.kind === 'friend'
                        ? 'Muốn kết giao và đồng hành cùng bạn.'
                        : inv.kind === 'party'
                          ? 'Mời bạn cùng lập đội vượt bí cảnh.'
                          : 'Muốn cùng bạn luận bàn võ học.'}
                    </p>
                  </div>
                  <div className="correspondence-invite-actions">
                    <button
                      className="cult-btn gold"
                      disabled={
                        !connected ||
                        (inv.kind === 'duel' && !canFight) ||
                        (inv.kind === 'friend' && friends.length >= FRIEND_CAP)
                      }
                      onClick={() => respondInvite(inv, true)}
                    >
                      Đồng ý
                    </button>
                    <button className="cult-btn" onClick={() => respondInvite(inv, false)}>
                      Từ chối
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="correspondence-empty">
                <CorrespondenceIcon kind="invites" />
                <h2>Chưa có lời mời</h2>
                <p>Lời mời kết bạn, tổ đội và tỉ võ sẽ xuất hiện tại đây.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
