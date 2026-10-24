import { useState } from 'react';
import { SKILLS, ZONE_NAMES } from '../../data';
import { gameStore, useGame } from '../../store/gameStore';
import { useSocial } from '../../store/socialStore';
import { useAccount } from '../../net/session';
import {
  adventure,
  battlePower,
  SECT_MISSIONS,
  SECT_RANKS,
  sectRank,
  type AdventureAction,
} from '../../game/systems/adventure';
import { lifeProgress } from '../../game/systems/life';
import { isChildhood } from '../../game/systems/origin';
import { realmNameAtLevel } from '../../game/systems/progression';
import { EventBus } from '../../game/EventBus';
import { practiceDuel } from '../../net/socialBridge';
import { CultHeading, SkillGlyph } from './CultivationUI';
import { QuestScenery } from './QuestJournal';
import { SectGlyph } from './SectGlyph';
import './quest-sect.css';

type SectTab = 'overview' | 'register' | 'quest' | 'contribution' | 'members';
type SectId = 'dai_thua_vien' | 'linh_son_tong';
const TABS = [
  ['overview', 'Tổng quan'],
  ['register', 'Ghi danh'],
  ['quest', 'Nhiệm vụ'],
  ['contribution', 'Cống hiến'],
  ['members', 'Thành viên'],
] as const;
const SECTS = {
  dai_thua_vien: {
    motto: 'Tĩnh tâm dưỡng khí, đặt nền tiên đạo.',
    desc: 'Sân viện của những bước đầu nhập đạo. Cùng đồng môn trừ yêu, hái dược và rèn luyện tâm tính.',
  },
  linh_son_tong: {
    motto: 'Giữ lòng như núi, cầu đạo như mây.',
    desc: 'Chính điện trên đỉnh Linh Sơn. Nơi đệ tử lĩnh nhiệm vụ, tích lũy danh vọng và học bí thuật từ trưởng lão.',
  },
};
const MISSION_SCENE: Record<string, number> = { hunt: 3, herbs: 2, forge: 4, dungeon: 3, duel: 5 };

function SectMembers({ compact = false }: { compact?: boolean }) {
  const player = useGame((s) => s.player),
    roster = useSocial((s) => s.roster);
  const connected = useSocial((s) => s.connected),
    openCard = useSocial((s) => s.openCard);
  const setMenu = useGame((s) => s.setMenu),
    { user } = useAccount();
  const sect = adventure(player).boundSect;
  const mine = isChildhood(player)
    ? []
    : [
        {
          userId: user?.id ?? 'local-player',
          name: player.name,
          level: player.level,
          realm: realmNameAtLevel(player.level),
          sex: player.sex ?? 'male',
          mine: true,
        },
      ];
  const members = [
    ...mine,
    ...(connected
      ? roster
          .filter((p) => p.sect === sect && p.userId !== user?.id)
          .map((p) => ({ ...p, mine: false }))
      : []),
  ];
  return (
    <section className="sect-framed sect-members-card">
      <CultHeading>
        {compact ? 'Đồng môn trực tuyến' : 'Thành viên trực tuyến'} · {members.length}
      </CultHeading>
      {!compact && (
        <p className="chronicle-muted">
          {connected
            ? 'Những đạo hữu đang trực tuyến và cùng ghi danh tông môn.'
            : 'Chưa kết nối. Hiện chỉ có hồ sơ của bạn.'}
        </p>
      )}
      <div className="sect-member-list">
        {(compact ? members.slice(0, 3) : members).map((m) => (
          <article className="sect-member" key={m.userId}>
            <span className="sect-member-avatar">
              <img
                src={`/assets/ui/cultivation/${m.sex === 'male' ? 'wang' : 'li'}-full-v1.png`}
                alt=""
              />
            </span>
            <div>
              <b>
                {m.name}
                {m.mine ? ' (bạn)' : ''}
              </b>
              <span>
                Lv.{m.level} · {m.mine ? SECT_RANKS[sectRank(player)].name : m.realm}
              </span>
            </div>
            {!m.mine && !compact ? (
              <button
                className="cult-btn"
                onClick={() => {
                  setMenu(null);
                  openCard(m.userId);
                }}
              >
                Xem đạo hữu
              </button>
            ) : (
              <span className="sect-member-state">{m.mine && !connected ? 'Bạn' : '●'}</span>
            )}
          </article>
        ))}
      </div>
      {!members.length && (
        <p className="chronicle-muted">Hoàn thành chương mở đầu để ghi danh tông môn.</p>
      )}
      {!compact && (
        <p className="sect-members-note">
          Danh sách trực tuyến, không bao gồm thành viên đã rời mạng.
        </p>
      )}
    </section>
  );
}

export function SectPanel() {
  const player = useGame((s) => s.player),
    stats = useGame((s) => s.stats),
    map = useGame((s) => s.mapId);
  const act = useGame((s) => s.adventureAction),
    setMenu = useGame((s) => s.setMenu);
  const status = useGame((s) => s.status),
    tribulation = useGame((s) => s.tribulation);
  const [tab, setTab] = useState<SectTab>('overview'),
    [joinTarget, setJoinTarget] = useState<SectId>(adventure(player).boundSect);
  const [feedback, setFeedback] = useState('');
  const a = adventure(player),
    rank = sectRank(player),
    nextRank = SECT_RANKS[rank + 1];
  const sectName = ZONE_NAMES[a.boundSect],
    childhood = isChildhood(player);
  const atSect = ['dai_thua_vien', 'linh_son_tong'].includes(map);
  const canAct = status === 'alive' && !tribulation && !childhood;
  const doneToday = a.missionDay === lifeProgress(player).days ? a.completedMissions : [];
  const rankPct = nextRank
    ? (100 * (a.reputation - SECT_RANKS[rank].reputation)) /
      (nextRank.reputation - SECT_RANKS[rank].reputation)
    : 100;

  function switchTab(next: SectTab) {
    setTab(next);
    setFeedback('');
  }
  function run(action: AdventureAction) {
    act(action);
    setFeedback(gameStore.getState().toasts.slice(-1)[0]?.text ?? 'Chưa thể thực hiện thao tác.');
  }
  function travel(id: string) {
    setMenu(null);
    EventBus.emit('cmd:travel', id);
  }
  function goMission(id: string) {
    if (id === 'forge') {
      setMenu('journey');
      gameStore.getState().patch({ journeySection: 'alchemy' });
    } else if (id === 'dungeon') setMenu('dungeon');
    else if (id === 'duel') practiceDuel();
    else travel(id === 'herbs' ? 'rung_linh_thu' : 'linh_thu_lam');
  }
  function missionCard(m: (typeof SECT_MISSIONS)[number], compact = false) {
    const active = a.mission?.id === m.id,
      finished = doneToday.includes(m.id) && !active;
    const ready = active && a.mission!.progress >= a.mission!.target;
    return (
      <article
        key={m.id}
        className={`sect-mission-card ${active ? 'active' : ''}`}
        data-mission={m.id}
      >
        <QuestScenery scene={MISSION_SCENE[m.id]} />
        <div className="sect-mission-copy">
          <h4>{m.name}</h4>
          <p>{m.desc}</p>
          <span className="sect-mission-rewards">
            +{m.reputation} danh vọng · +{m.contribution} cống hiến
          </span>
          <small>
            {active
              ? `${a.mission!.progress}/${a.mission!.target}${ready ? ' · Có thể trả' : ' · Đang thực hiện'}`
              : finished
                ? 'Đã hoàn thành hôm nay'
                : a.mission
                  ? 'Đang nhận nhiệm vụ khác'
                  : 'Chưa nhận'}
          </small>
        </div>
        <div className="sect-mission-buttons">
          <button
            className="cult-btn gold"
            disabled={
              !canAct || !atSect || finished || (!!a.mission && !active) || (active && !ready)
            }
            onClick={() => run(active ? { type: 'claimMission' } : { type: 'mission', id: m.id })}
          >
            {finished
              ? 'Đã hoàn thành'
              : active
                ? ready
                  ? 'Trả nhiệm vụ'
                  : 'Đang thực hiện'
                : 'Nhận'}
          </button>
          {active && !ready && !compact && (
            <button className="cult-btn" disabled={!canAct} onClick={() => goMission(m.id)}>
              Đến
            </button>
          )}
        </div>
      </article>
    );
  }
  const rankCard = (
    <section className="sect-framed sect-rank-card">
      <CultHeading>Cấp bậc đệ tử</CultHeading>
      <span className="sect-personal-rank">
        {childhood ? 'Chưa nhập môn' : SECT_RANKS[rank].name}
      </span>
      <div
        className="sect-rank-meter"
        role="progressbar"
        aria-label="Danh vọng tới cấp bậc tiếp theo"
        aria-valuemin={SECT_RANKS[rank].reputation}
        aria-valuemax={nextRank?.reputation ?? Math.max(1, a.reputation)}
        aria-valuenow={a.reputation}
      >
        <i style={{ width: `${Math.max(0, Math.min(100, rankPct))}%` }} />
      </div>
      <p className="sect-rank-numbers">
        {a.reputation.toLocaleString('vi-VN')} /{' '}
        {nextRank?.reputation.toLocaleString('vi-VN') ?? 'Tối đa'} danh vọng
      </p>
      <p className="chronicle-muted">
        {nextRank
          ? `Tích lũy danh vọng để trở thành ${nextRank.name}.`
          : 'Đã đạt cấp bậc cao nhất.'}
      </p>
      <ul className="sect-benefits">
        <li>Nhận nhiệm vụ Chấp Sự mỗi ngày game</li>
        <li>Nội Môn mở Tàng Kinh Các</li>
        <li>Chân Truyền mở Linh Địa Hậu Sơn</li>
      </ul>
    </section>
  );

  return (
    <div className="cult-sect">
      <nav className="cult-side chronicle-side" aria-label="Mục tông môn">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => switchTab(key)}
          >
            <SectGlyph kind={key} />
            <span>{label}</span>
            {key === 'quest' && a.mission && <small>1</small>}
          </button>
        ))}
        <div className="chronicle-side-poem">
          <small>ĐỒNG MÔN</small>Giữ một lời hẹn,
          <br />
          cùng bước tiên lộ.
        </div>
      </nav>
      <div className="sect-main">
        <div className="sect-content-scroll">
          {tab === 'overview' && (
            <div className="sect-overview-grid">
              <section className="sect-hero">
                <div className="sect-hero-caption">
                  <span className="sect-crest">
                    <SectGlyph kind="overview" />
                  </span>
                  <div>
                    <small>{childhood ? 'SƠN MÔN ĐANG ĐỢI' : 'TÔNG MÔN CỦA BẠN'}</small>
                    <h2>{sectName}</h2>
                    <p>{SECTS[a.boundSect].motto}</p>
                    <span className="chronicle-tag">
                      {childhood ? 'Chưa ghi danh' : SECT_RANKS[rank].name}
                    </span>
                  </div>
                </div>
                <div className="sect-hero-stats">
                  <span>
                    Lực chiến <b>{battlePower(stats).toLocaleString('vi-VN')}</b>
                  </span>
                  <span>
                    Danh vọng <b>{a.reputation.toLocaleString('vi-VN')}</b>
                  </span>
                  <span>
                    Cống hiến <b>{a.contribution.toLocaleString('vi-VN')}</b>
                  </span>
                </div>
              </section>
              {rankCard}
              <section className="sect-framed sect-overview-missions">
                <div className="sect-section-heading">
                  <CultHeading>Nhiệm vụ tông môn</CultHeading>
                  <button onClick={() => switchTab('quest')}>Xem tất cả ›</button>
                </div>
                {SECT_MISSIONS.slice(0, 3).map((m) => missionCard(m, true))}
              </section>
              <div className="sect-overview-side">
                <section className="sect-framed">
                  <CultHeading>Cống hiến cá nhân</CultHeading>
                  <div className="sect-contribution-amount">
                    <SectGlyph kind="contribution" />
                    <b>{a.contribution.toLocaleString('vi-VN')}</b>
                  </div>
                  <p className="chronicle-muted">
                    Dùng cống hiến để lĩnh ngộ bí thuật từ trưởng lão.
                  </p>
                  <button className="cult-btn gold" onClick={() => switchTab('contribution')}>
                    Trưởng Lão truyền pháp
                  </button>
                </section>
                <SectMembers compact />
              </div>
            </div>
          )}
          {tab === 'register' && (
            <div className="sect-register-layout">
              <section className="sect-register-art sect-framed">
                <div className="sect-register-copy">
                  <span className="chronicle-tag">Ghi danh tông môn</span>
                  <h2>{ZONE_NAMES[joinTarget]}</h2>
                  <p>{SECTS[joinTarget].desc}</p>
                </div>
              </section>
              <section className="sect-framed sect-register-details">
                <CultHeading>Chọn sơn môn</CultHeading>
                <div className="sect-registration-options">
                  {(Object.keys(SECTS) as SectId[]).map((id) => (
                    <button
                      key={id}
                      aria-pressed={joinTarget === id}
                      className={joinTarget === id ? 'selected' : ''}
                      onClick={() => {
                        setJoinTarget(id);
                        setFeedback('');
                      }}
                    >
                      <SectGlyph kind="overview" />
                      <span>
                        <b>{ZONE_NAMES[id]}</b>
                        <small>
                          {!childhood && a.boundSect === id
                            ? 'Đã ghi danh · điểm hồi sinh'
                            : 'Có thể ghi danh khi tới sơn môn'}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
                <CultHeading>Điều kiện ghi danh</CultHeading>
                <ul className="sect-registration-checks">
                  <li className={childhood ? '' : 'complete'}>
                    {childhood ? '◇' : '✓'} Hoàn thành chương mở đầu
                  </li>
                  <li className={map === joinTarget ? 'complete' : ''}>
                    {map === joinTarget ? '✓' : '◇'} Có mặt tại {ZONE_NAMES[joinTarget]}
                  </li>
                </ul>
                <p className="chronicle-muted">
                  Khi ngã xuống, bạn trở về tông môn đã ghi danh. Đổi sơn môn vẫn giữ danh vọng và
                  cống hiến.
                </p>
                <div className="sect-registration-actions">
                  <button
                    className="cult-btn gold"
                    disabled={!canAct || map !== joinTarget || a.boundSect === joinTarget}
                    onClick={() => run({ type: 'bindSect', id: joinTarget })}
                  >
                    {!childhood && a.boundSect === joinTarget ? 'Đã ghi danh' : 'Ghi danh tại đây'}
                  </button>
                  <button
                    className="cult-btn"
                    disabled={!canAct || map === joinTarget}
                    onClick={() => travel(joinTarget)}
                  >
                    Đến sơn môn
                  </button>
                </div>
              </section>
            </div>
          )}
          {tab === 'quest' && (
            <section className="sect-framed sect-quest-board">
              <div className="sect-section-heading">
                <CultHeading>Nhiệm vụ Chấp Sự</CultHeading>
                <span>Ngày game {lifeProgress(player).days + 1}</span>
              </div>
              <p className="chronicle-muted">
                Mỗi nhiệm vụ một lần mỗi ngày game. Nhận và trả tại tông môn; chỉ nhận một nhiệm vụ
                cùng lúc.
              </p>
              {!atSect && (
                <p className="sect-location-note">Về tông môn để nhận hoặc trả nhiệm vụ.</p>
              )}
              <div className="sect-mission-list">{SECT_MISSIONS.map((m) => missionCard(m))}</div>
              <div className="sect-practice-actions">
                <button className="cult-btn" disabled={!canAct} onClick={practiceDuel}>
                  Luyện tay với Mộc Nhân
                </button>
                <button className="cult-btn" onClick={() => setMenu('social')}>
                  Mời đạo hữu tỉ võ
                </button>
              </div>
            </section>
          )}
          {tab === 'contribution' && (
            <div className="sect-contribution-layout">
              {rankCard}
              <section className="sect-framed sect-secrets">
                <CultHeading>Trưởng Lão truyền pháp</CultHeading>
                <p className="sect-contribution-balance">
                  Cống hiến hiện có <b>{a.contribution.toLocaleString('vi-VN')}</b>
                </p>
                <p className="chronicle-muted">
                  Tích lũy cống hiến qua nhiệm vụ, đến tông môn để học bí thuật.
                </p>
                {(['loi_kich', 'phong_nhan'] as const).map((id, i) => {
                  const known = a.learnedSecrets.includes(id),
                    requirement = i + 2;
                  return (
                    <article className="sect-secret" key={id}>
                      <SkillGlyph id={id} />
                      <div>
                        <h3>{SKILLS[id].name}</h3>
                        <p>{SKILLS[id].desc}</p>
                        <small className={rank < requirement || a.contribution < 60 ? 'short' : ''}>
                          Cần {SECT_RANKS[requirement].name} · 60 cống hiến
                        </small>
                      </div>
                      <button
                        className="cult-btn gold"
                        disabled={
                          known || !canAct || !atSect || rank < requirement || a.contribution < 60
                        }
                        onClick={() => run({ type: 'learnSecret', id })}
                      >
                        {known ? 'Đã lĩnh ngộ' : 'Học bí thuật'}
                      </button>
                    </article>
                  );
                })}
                <button className="cult-btn" onClick={() => setMenu('skills')}>
                  Đến kỹ năng
                </button>
              </section>
              <section className="sect-framed sect-rank-ladder">
                <CultHeading>Con đường đệ tử</CultHeading>
                <div>
                  {SECT_RANKS.map((r, i) => (
                    <span className={i <= rank ? 'unlocked' : ''} key={r.name}>
                      <b>{r.name}</b>
                      <small>{r.reputation} danh vọng</small>
                    </span>
                  ))}
                </div>
                <p className="chronicle-muted">Cấp bậc tự tăng khi đạt đủ danh vọng.</p>
              </section>
            </div>
          )}
          {tab === 'members' && <SectMembers />}
        </div>
        <footer className="sect-bottom-bar">
          <p role="status">
            {feedback ||
              (childhood
                ? 'Hoàn thành chương mở đầu để gia nhập tông môn.'
                : `Đã ghi danh ${sectName} · ${SECT_RANKS[rank].name}`)}
          </p>
          <button
            className="cult-btn"
            disabled={!canAct || map === a.boundSect}
            onClick={() => travel(a.boundSect)}
          >
            Về tông môn
          </button>
        </footer>
      </div>
    </div>
  );
}
