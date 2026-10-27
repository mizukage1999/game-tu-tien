import { useSocial } from '../store/socialStore';
import { useGame } from '../store/gameStore';
import { useAccount } from '../net/session';
import { leaveParty } from '../net/socialBridge';
import { partyMembers } from '../net/social';
import { heroFor } from '../data/heroes';
import { ZONE_NAMES } from '../data';
import { RosterPortrait } from './HeroArt';

export function PartyTracker() {
  const party = useSocial((s) => s.partyId),
    leader = useSocial((s) => s.partyLeaderId),
    roster = useSocial((s) => s.roster),
    connected = useSocial((s) => s.connected),
    openCard = useSocial((s) => s.openCard);
  const player = useGame((s) => s.player),
    map = useGame((s) => s.mapId),
    setMenu = useGame((s) => s.setMenu);
  const self = useAccount().user?.id;
  const members = party
    ? [
        ...new Map(
          partyMembers(roster, party)
            .filter((p) => p.userId !== self)
            .map((p) => [p.userId, p]),
        ).values(),
      ]
    : [];
  if (!party)
    return (
      <div className="party-tracker">
        <p>Bạn chưa có tổ đội.</p>
        <button onClick={() => setMenu('social')}>Tìm đồng đội</button>
      </div>
    );
  return (
    <section className="party-tracker" aria-label="Tổ đội hiện tại">
      <header>
        <b>Đội · {members.length + 1} người</b>
        <small>{connected ? '● Trực tuyến' : 'Đang kết nối…'}</small>
      </header>
      <div className="party-members">
        <button className="party-member self" onClick={() => setMenu('character')}>
          <RosterPortrait id={heroFor(player).id} />
          <span>
            <b>
              {leader === self ? '♛ ' : ''}
              {player.name} (bạn)
            </b>
            <small>{ZONE_NAMES[map] ?? map}</small>
          </span>
        </button>
        {members.map((member) => (
          <button
            className="party-member"
            key={member.userId}
            onClick={() => openCard(member.userId)}
          >
            <RosterPortrait id={heroFor(member).id} />
            <span>
              <b>
                {leader === member.userId ? '♛ ' : ''}
                {member.name}
              </b>
              <small>
                {member.realm} · {ZONE_NAMES[member.mapId] ?? member.mapId}
              </small>
            </span>
          </button>
        ))}
      </div>
      <footer>
        <button onClick={() => setMenu('social')}>Mời đạo hữu</button>
        <button disabled={!connected} onClick={leaveParty}>
          {leader === self ? 'Giải tán' : 'Rời đội'}
        </button>
      </footer>
    </section>
  );
}
