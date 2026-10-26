import { ITEMS, QUESTS } from '../../data';
import {
  HOME_QUEST,
  immortalProgress,
  MOUNTS,
  mountUnlocked,
  flightProfile,
  RECIPES,
  recipeCheck,
} from '../../game/systems/immortal';
import { StoryChapters } from './StoryChapters';
import { JourneyFeatureHeader } from './JourneyFeatureHeader';
import { itemIconUrl } from '../../game/art/icons';
import { itemName, useGame } from '../../store/gameStore';
import { isChildhood } from '../../game/systems/origin';
import { realmNameAtLevel } from '../../game/systems/progression';
import { WorldAtlas } from './WorldAtlas';
import './journey.css';
import './journey-v2.css';
import { HomeBoard, CompanionPanel } from './CultivatorLife';
import { JourneyGlyph } from './JourneyGlyph';

const TABS = [
  { id: 'story', label: 'Tiên Lộ' },
  { id: 'alchemy', label: 'Đan Phòng' },
  { id: 'home', label: 'Động Phủ' },
  { id: 'mounts', label: 'Ngự Hành' },
  { id: 'companions', label: 'Linh Thú' },
  { id: 'world', label: 'Sơn Hà Đồ' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function Costs({ cost }: { cost: Record<string, number> }) {
  const player = useGame((s) => s.player);
  return (
    <div className="immortal-costs">
      {Object.entries(cost).map(([id, qty]) => {
        const have = id === 'linh_khi' ? player.linhKhi : (player.inventory[id] ?? 0);
        return (
          <span key={id} className={have >= qty ? 'enough' : 'short'}>
            {itemName(id)}{' '}
            <b>
              {have}/{qty}
            </b>
          </span>
        );
      })}
    </div>
  );
}

export function Journey() {
  const player = useGame((s) => s.player);
  const quests = useGame((s) => s.quests);

  const status = useGame((s) => s.status);

  const craftPill = useGame((s) => s.craftPill);
  const feedback = useGame((s) => s.craftFeedback);

  const selectMount = useGame((s) => s.selectMount);
  const setMenu = useGame((s) => s.setMenu);
  const requestedTab = useGame((s) => s.journeySection);
  const childhood = isChildhood(player);
  const tab = childhood && !['story', 'world'].includes(requestedTab) ? 'story' : requestedTab;
  const patch = useGame((s) => s.patch);
  const setTab = (tab: Tab) => patch({ journeySection: tab });

  const progress = immortalProgress(player);
  const homeOpen = quests[HOME_QUEST]?.status === 'done';

  return (
    <div
      className={`immortal-journey journey-shell${tab === 'world' ? ' atlas-open' : tab === 'story' ? ' story-open' : ' feature-open'}`}
    >
      <nav
        className="immortal-tabs journey-sidebar"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Hoạt động tu tiên"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`journey-tab-${t.id}`}
            role="tab"
            aria-controls={`journey-panel-${t.id}`}
            aria-selected={tab === t.id}
            disabled={childhood && !['story', 'world'].includes(t.id)}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <JourneyGlyph kind={t.id} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <div
        className="journey-workspace"
        role="tabpanel"
        id={`journey-panel-${tab}`}
        aria-labelledby={`journey-tab-${tab}`}
      >
        {tab === 'story' && <StoryChapters />}
        {tab === 'world' && <WorldAtlas />}
        {tab === 'alchemy' && (
          <>
            <JourneyFeatureHeader
              type="alchemy"
              detail={`Đã luyện ${Object.values(progress.crafted).reduce((sum, n) => sum + n, 0)} viên · ${RECIPES.length} đan phương`}
            />
            <div className="immortal-recipes">
              {RECIPES.map((recipe) => {
                const reason = recipeCheck(player, recipe.id);
                return (
                  <article key={recipe.id} className="immortal-card">
                    <div className="immortal-card-heading">
                      <img className="journey-pill-icon" src={itemIconUrl(recipe.id)} alt="" />
                      <div>
                        <h4>{recipe.name}</h4>
                        <small>
                          Đã có {player.inventory[recipe.id] ?? 0} · Đã luyện{' '}
                          {progress.crafted[recipe.id] ?? 0}
                        </small>
                      </div>
                      <span className="immortal-tag">{realmNameAtLevel(recipe.level)}</span>
                    </div>
                    <p>{recipe.desc}</p>
                    <Costs cost={recipe.cost} />
                    <p className={`craft-availability ${reason ? 'short' : 'enough'}`}>
                      {reason ?? 'Đủ nguyên liệu · Có thể khai lò.'}
                    </p>
                    {feedback?.id === recipe.id && (
                      <p
                        className={`craft-feedback ${feedback.ok ? 'enough' : 'short'}`}
                        role="status"
                      >
                        {feedback.text}
                      </p>
                    )}
                    <button
                      className="btn gold"
                      disabled={!!reason || status !== 'alive'}
                      onClick={() => craftPill(recipe.id)}
                    >
                      Khai lò luyện đan
                    </button>
                  </article>
                );
              })}
            </div>
            <button className="btn" onClick={() => setMenu('bag')}>
              Mở túi dùng đan dược
            </button>
          </>
        )}
        {tab === 'home' && (
          <>
            <JourneyFeatureHeader
              type="home"
              detail={
                homeOpen
                  ? 'Linh điền · Tĩnh thất · Lò đan · Tụ linh trận'
                  : `Mở sau: ${QUESTS[HOME_QUEST].name}`
              }
            />
            {homeOpen ? (
              <HomeBoard />
            ) : (
              <p className="immortal-note">Hoàn thành Lò Đan Khai Hỏa để nhận động phủ riêng.</p>
            )}
          </>
        )}
        {tab === 'companions' && <CompanionPanel />}
        {tab === 'mounts' && (
          <>
            <JourneyFeatureHeader
              type="mounts"
              detail={`${MOUNTS.filter((m) => mountUnlocked(m.id, quests, player)).length}/${MOUNTS.length} duyên ngự hành · ${progress.mount ? MOUNTS.find((m) => m.id === progress.mount)?.name : 'Chưa chọn tọa kỵ'}`}
            />
            <div className="immortal-home-grid">
              {MOUNTS.map((mount) => {
                const open = mountUnlocked(mount.id, quests, player);
                return (
                  <article className="immortal-card" key={mount.id}>
                    <div className={`journey-mount-art mount-${mount.id}`}>
                      <img src="/assets/journey/mounts.png" alt="" />
                    </div>
                    <h4>{mount.name}</h4>
                    <p>{mount.desc}</p>
                    <p className="immortal-note">
                      {open
                        ? `Tốc độ di chuyển ×${flightProfile(player, mount.id).speed.toFixed(2)}`
                        : `Mở sau: ${QUESTS[mount.quest].name}`}
                    </p>
                    <button
                      className="btn gold"
                      disabled={!open || status !== 'alive'}
                      onClick={() => selectMount(progress.mount === mount.id ? null : mount.id)}
                    >
                      {progress.mount === mount.id
                        ? 'Hạ xuống'
                        : open
                          ? mount.id === 'sword'
                            ? 'Ngự kiếm'
                            : 'Cưỡi hạc'
                          : 'Chưa kết duyên'}
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {tab !== 'story' && tab !== 'world' && (
          <div className="immortal-wallet">
            {['thanh_linh_thao', 'ngung_lo', 'linh_chi', 'yeu_dan'].map((id) => (
              <span key={id} style={{ color: ITEMS[id].color }}>
                {itemName(id)} <b>{player.inventory[id] ?? 0}</b>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
