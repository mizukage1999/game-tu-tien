import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { EQUIP_SLOTS, ITEMS, ZONE_NAMES, rarityOf } from '../../data';
import { heroFor } from '../../data/heroes';
import { COMPANIONS } from '../../game/systems/life';
import {
  personalRankingEntry,
  rankingScore,
  RANKING_CATEGORIES,
  type RankingCategory,
  type RankingEntry,
} from '../../game/systems/rankingUi';
import { itemIconUrl } from '../../game/art/icons';
import { useGame } from '../../store/gameStore';
import { HeroFigure, HeroDirectionalPose, RosterPortrait, ChildHeroPortrait } from '../HeroArt';
import { RealmBadge } from '../RealmBadge';
import { CultHeading, SkillGlyph } from './CultivationUI';
import { SectGlyph } from './SectGlyph';
import { useLeaderboard } from '../useLeaderboard';
import { LEADERBOARD_PAGE_SIZE } from '../../net/leaderboard';
import './ranking.css';

const PAGE_SIZE = LEADERBOARD_PAGE_SIZE;
const number = (n: number) => n.toLocaleString('vi-VN');
type DetailTab = 'overview' | 'equipment' | 'pets' | 'elements';

function RankingIcon({ kind = 'ranking' }: { kind?: string }) {
  return (
    <svg className="ranking-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {kind === 'ranking' ? (
        <>
          <path d="M10 5h12v8a6 6 0 0 1-12 0V5ZM10 8H5v3a6 6 0 0 0 6 6M22 8h5v3a6 6 0 0 1-6 6M16 19v7M10 28h12M12 24h8" />
          <path d="m16 8 1.4 2.8 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4L16 8Z" />
        </>
      ) : kind === 'search' ? (
        <>
          <circle cx="13" cy="13" r="8" />
          <path d="m19 19 9 9" />
        </>
      ) : kind === 'character' ? (
        <>
          <circle cx="16" cy="9" r="5" />
          <path d="M6 28v-4a10 10 0 0 1 20 0v4H6ZM12 20l4 4 4-4" />
        </>
      ) : kind === 'sect' ? (
        <>
          <path d="m3 12 13-8 13 8H3ZM5 28h22M8 14v10m8-10v10m8-10v10M3 25h26" />
        </>
      ) : kind === 'cultivate' ? (
        <>
          <path d="M16 3c3 6-4 7 1 12 3-2 5-4 5-7 9 11 5 20-6 20S1 20 9 12c-1 7 4 8 5 8 5-5-3-8 2-17Z" />
        </>
      ) : kind === 'skills' ? (
        <>
          <path d="m7 26 7-13 11-9-4 14L8 27ZM10 21l4 4M4 28l4-4M5 8l3 3m17 11 3 3" />
        </>
      ) : kind === 'pets' ? (
        <>
          <path d="M9 20c-5 5-1 10 7 6 8 4 12-1 7-6-5-6-9-6-14 0Z" />
          <ellipse cx="7" cy="12" rx="3" ry="4" />
          <ellipse cx="15" cy="8" rx="3" ry="4" />
          <ellipse cx="24" cy="12" rx="3" ry="4" />
        </>
      ) : (
        <>
          <path d="m16 3 12 9-5 15H9L4 12 16 3ZM16 8v14M9 14h14" />
        </>
      )}
    </svg>
  );
}
function RankCrest({
  rank,
  personal = false,
  small = false,
}: {
  rank: number;
  personal?: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={`ranking-crest place-${Math.min(rank, 3)} ${small ? 'small' : ''} ${personal ? 'personal' : ''}`}
      aria-label={personal ? 'Chưa xếp hạng' : `Hạng ${rank}`}
    >
      <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <path d="m40 3 9 11 14 1 2 14 11 11-11 11-2 14-14 1-9 11-9-11-14-1-2-14L4 40l11-11 2-14 14-1L40 3Z" />
        <circle cx="40" cy="40" r="25" />
        <path d="M22 60C6 47 9 29 19 20M58 60c16-13 13-31 3-40M17 48l-8-5m8-6-6-7m9-2-3-9M63 48l8-5m-8-6 6-7m-9-2 3-9M29 67l11 4 11-4" />
      </svg>
      <b>{personal ? '—' : rank}</b>
    </span>
  );
}
function Figure({ entry }: { entry: RankingEntry }) {
  const p = entry.inspection;
  return p.child ? <HeroDirectionalPose id={p.heroId} child /> : <HeroFigure id={p.heroId} />;
}
function Portrait({ entry }: { entry: RankingEntry }) {
  const p = entry.inspection;
  return p.child ? <ChildHeroPortrait id={p.heroId} /> : <RosterPortrait id={p.heroId} />;
}
function scoreLabel(entry: RankingEntry, category: RankingCategory) {
  if (category === 'realm') return entry.inspection.realm;
  const score = rankingScore(entry, category);
  return score === undefined ? 'Chưa ghi nhận' : number(score);
}
function Podium({
  entries,
  category,
  selected,
  select,
}: {
  entries: RankingEntry[];
  category: RankingCategory;
  selected?: string;
  select: (id: string) => void;
}) {
  return (
    <div className="ranking-podium" aria-label="Bục top 3 toàn server">
      <span className="ranking-podium-caption">VINH DANH TAM GIÁP · TOÀN SERVER</span>
      {[2, 1, 3].map((rank) => {
        const entry = entries[rank - 1];
        return entry ? (
          <button
            key={rank}
            className={`ranking-spot spot-${rank} ${selected === entry.id ? 'selected' : ''}`}
            onClick={() => select(entry.id)}
            aria-label={`Xem ${entry.name}`}
          >
            <div className="ranking-figure">
              <Figure entry={entry} />
              <span className="ranking-podium-mobile-portrait">
                <Portrait entry={entry} />
              </span>
            </div>
            <RankCrest rank={rank} />
            <span className="ranking-nameplate">
              <strong>{entry.name}</strong>
              <span>{scoreLabel(entry, category)}</span>
              <small>
                {entry.inspection.child
                  ? 'Vương Gia Thôn'
                  : (ZONE_NAMES[entry.inspection.sect ?? ''] ?? 'Tán tu')}
              </small>
            </span>
          </button>
        ) : (
          <div key={rank} className={`ranking-spot ranking-vacant spot-${rank}`} aria-hidden="true">
            <span>✧</span>
            <small>Chờ ghi danh</small>
          </div>
        );
      })}
    </div>
  );
}
function GearTiles({ entry, full = false }: { entry: RankingEntry; full?: boolean }) {
  return (
    <div
      className={full ? 'ranking-equipment' : 'ranking-gear-strip'}
      aria-label="Trang bị nhân vật"
    >
      {EQUIP_SLOTS.map((slot) => {
        const gear = entry.inspection.equipment.find((e) => e.slot === slot.id),
          item = gear && ITEMS[gear.id];
        return (
          <div
            className={`ranking-item ${item ? '' : 'empty'}`}
            key={slot.id}
            style={
              { '--item-color': item ? rarityOf(item.rarity).color : '#40515e' } as CSSProperties
            }
            title={
              item
                ? `${item.name}${gear?.enhancement ? ` +${gear.enhancement}` : ''}`
                : `${slot.name} · Chưa trang bị`
            }
          >
            {item ? (
              <img src={itemIconUrl(gear!.id)} alt={item.name} />
            ) : (
              <span aria-hidden="true">◇</span>
            )}
            {!!gear?.enhancement && <b>+{gear.enhancement}</b>}
            {full && <small>{item?.name ?? slot.name}</small>}
          </div>
        );
      })}
    </div>
  );
}
function RankingDetails({
  entry,
  category,
  rank,
  isSelf,
  tab,
  setTab,
}: {
  entry: RankingEntry;
  category: RankingCategory;
  rank: number;
  isSelf: boolean;
  tab: DetailTab;
  setTab: (t: DetailTab) => void;
}) {
  const data = entry.inspection,
    hero = heroFor(data),
    setMenu = useGame((s) => s.setMenu);
  return (
    <aside className="ranking-detail" aria-label={`Thông tin ${entry.name}`}>
      <div className="ranking-feature" style={{ '--hero-color': hero.color } as CSSProperties}>
        <div className="ranking-feature-art">
          <Figure entry={entry} />
        </div>
        <RankCrest rank={rank} personal={!entry.serverRank} />
        <div className="ranking-feature-info">
          <small>{isSelf ? 'NHÂN VẬT CỦA BẠN' : 'HỒ SƠ TIÊN BẢNG'}</small>
          <h2>{entry.name}</h2>
          <span>
            Lv.{data.level} · {hero.school}
          </span>
          <p>{data.child ? 'Chưa nhập môn' : (ZONE_NAMES[data.sect ?? ''] ?? 'Tán tu')}</p>
          <b>{scoreLabel(entry, category)}</b>
          <em>{RANKING_CATEGORIES.find((c) => c.id === category)!.metric}</em>
        </div>
        <RealmBadge level={data.level} child={data.child} compact />
      </div>
      <GearTiles entry={entry} />
      <nav className="ranking-detail-tabs" aria-label="Chi tiết nhân vật">
        {(
          [
            ['overview', 'Thông tin'],
            ['equipment', 'Trang bị'],
            ['pets', 'Linh thú'],
            ['elements', 'Ngũ hành'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="ranking-detail-body">
        {tab === 'overview' && (
          <>
            <div className="ranking-stats">
              {[
                ['Sinh lực', number(data.stats.maxHp)],
                ['Linh lực', number(data.stats.maxMp)],
                ['Công kích', number(data.stats.atk)],
                ['Phòng thủ', number(data.stats.def)],
                ['Bạo kích', `${Math.round(data.stats.critRate * 100)}%`],
                ['Tốc độ', number(data.stats.speed)],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
            <CultHeading>Kỹ năng đang chọn</CultHeading>
            <div className="ranking-skills">
              {data.skills
                .filter((s) => s.equipped)
                .slice(0, 7)
                .map((s) => (
                  <SkillGlyph key={s.id} id={s.id} />
                ))}
              {data.child && <p>Chiêu thức mở sau nhập môn.</p>}
            </div>
            <div className="ranking-honor">
              <small>Thân phận hiện tại</small>
              <strong>✦ {entry.title} ✦</strong>
            </div>
          </>
        )}
        {tab === 'equipment' && (
          <>
            <CultHeading>Trang bị đang mặc</CultHeading>
            <GearTiles entry={entry} full />
            <p className="ranking-muted">Cường hóa được hiển thị trên từng món trang bị.</p>
          </>
        )}
        {tab === 'pets' && (
          <>
            <CultHeading>Linh thú đã thu phục</CultHeading>
            {data.companions.length ? (
              data.companions.map((pet) => (
                <article className="ranking-pet" key={pet.id}>
                  <RankingIcon kind="pets" />
                  <div>
                    <b>{COMPANIONS.find((c) => c.id === pet.id)?.name ?? pet.id}</b>
                    <span>
                      Bậc {pet.rank} · Tiến hóa {pet.evolution}
                    </span>
                    <small>{pet.active ? 'Đang đồng hành' : 'Chưa xuất chiến'}</small>
                  </div>
                </article>
              ))
            ) : (
              <div className="ranking-detail-empty">
                <RankingIcon kind="pets" />
                <p>Chưa thu phục linh thú.</p>
              </div>
            )}
          </>
        )}
        {tab === 'elements' && (
          <div className="ranking-detail-empty">
            <span className="ranking-five-elements">金 木 水 火 土</span>
            <h3>Ngũ Hành</h3>
            <p>Chỉ số ngũ hành sẽ hiển thị khi hệ thống được mở.</p>
          </div>
        )}
      </div>
      <footer className="ranking-detail-footer">
        {isSelf ? (
          <button className="cult-btn gold" onClick={() => setMenu('character')}>
            Mở Nhân Vật <span aria-hidden="true">›</span>
          </button>
        ) : (
          <span>
            Tiến trình đã lưu ·{' '}
            {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString('vi-VN') : 'Chưa đồng bộ'}
          </span>
        )}
      </footer>
    </aside>
  );
}

export function RankingPanel() {
  const player = useGame((s) => s.player),
    stats = useGame((s) => s.stats),
    quests = useGame((s) => s.quests),
    mapId = useGame((s) => s.mapId);
  const personal = useMemo(
    () => personalRankingEntry(player, stats, quests, mapId),
    [player, stats, quests, mapId],
  );
  const [ownOnly, setOwnOnly] = useState(false),
    [category, setCategory] = useState<RankingCategory>('power');
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string>();
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const board = useLeaderboard(category, query, page),
    data = board.data;
  const own = data?.self ?? personal;
  const visible = ownOnly ? [own] : (data?.rows ?? []);
  const total = ownOnly ? 1 : (data?.total ?? 0);
  const pages = Math.max(1, Math.min(12501, Math.ceil(total / PAGE_SIZE))),
    activePage = ownOnly ? 0 : page;
  const pageNumbers = Array.from(
    { length: Math.min(5, pages) },
    (_, i) => Math.max(0, Math.min(activePage - 2, pages - 5)) + i,
  );
  const candidates = [...visible, ...(data?.top ?? []), own];
  const selectedEntry = candidates.find((e) => e.id === selected) ?? visible[0],
    definition = RANKING_CATEGORIES.find((c) => c.id === category)!;
  useEffect(() => {
    if (data && page >= pages) setPage(pages - 1);
  }, [data, page, pages]);
  const select = (id: string) => {
    setSelected(id);
    setDetailTab('overview');
  };
  const switchBoard = (next: RankingCategory) => {
    setCategory(next);
    setPage(0);
    setQuery('');
    setSelected(undefined);
    setDetailTab('overview');
  };
  const switchMode = (value: boolean) => {
    setOwnOnly(value);
    setPage(0);
    setQuery('');
    setSelected(undefined);
    setDetailTab('overview');
  };
  return (
    <section className="ranking-shell feature-focused" aria-label="Bảng Xếp Hạng">
      <div className="ranking-main">
        <nav className="ranking-tabs" aria-label="Loại bảng xếp hạng">
          {RANKING_CATEGORIES.filter((c) => c.id !== 'dungeons' && c.id !== 'elements').map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'active' : ''}
              aria-pressed={category === c.id}
              onClick={() => switchBoard(c.id)}
            >
              {c.label}
            </button>
          ))}
        </nav>
        <div className="ranking-controls">
          <p role="status">
            <span />
            {board.loading
              ? 'Đang cập nhật Tiên Bảng…'
              : data
                ? 'Bảng xếp hạng toàn server'
                : 'Chưa kết nối Tiên Bảng'}
            <small>
              {data
                ? `${number(data.population)} nhân vật · theo tiến trình đã lưu`
                : 'Gồm cả người chơi offline'}
            </small>
          </p>
          <div className="ranking-modes" aria-label="Nguồn hiển thị">
            <button
              aria-pressed={!ownOnly}
              className={!ownOnly ? 'active' : ''}
              onClick={() => switchMode(false)}
            >
              Toàn server
            </button>
            <button
              aria-pressed={ownOnly}
              className={ownOnly ? 'active' : ''}
              onClick={() => switchMode(true)}
            >
              Của tôi
            </button>
            <button
              aria-label="Làm mới bảng xếp hạng"
              onClick={board.refresh}
              disabled={board.loading}
            >
              ↻
            </button>
          </div>
        </div>
        {board.error && (
          <div className="ranking-notice" role="alert">
            <span>{board.error}</span>
            <button onClick={board.refresh} disabled={board.loading}>
              Thử lại
            </button>
          </div>
        )}
        <div className="ranking-board">
          <div className="ranking-center">
            <Podium
              entries={data?.top ?? []}
              category={category}
              selected={selectedEntry?.id}
              select={select}
            />
            <div className="ranking-list">
              <div className="ranking-list-tools">
                <span>
                  {definition.metric}
                  <small title={definition.hint}>
                    {ownOnly
                      ? own.serverRank
                        ? `Hạng ${number(own.serverRank)} toàn server`
                        : 'Chưa xếp hạng'
                      : `${number(total)} nhân vật`}
                  </small>
                </span>
                <label className="ranking-search">
                  <RankingIcon kind="search" />
                  <input
                    aria-label="Tìm tên nhân vật"
                    placeholder="Tìm tên nhân vật…"
                    value={query}
                    disabled={ownOnly}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(0);
                    }}
                    autoComplete="off"
                    maxLength={32}
                  />
                  {query && (
                    <button
                      aria-label="Xóa tìm kiếm"
                      onClick={() => {
                        setQuery('');
                        setPage(0);
                      }}
                    >
                      ×
                    </button>
                  )}
                </label>
              </div>
              <div className="ranking-table-scroll">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th>Hạng</th>
                      <th>Tên nhân vật</th>
                      <th>Cấp</th>
                      <th className="ranking-sect-col">Tông môn</th>
                      <th>{definition.metric}</th>
                      <th className="ranking-school-col">Pháp môn</th>
                      <th>
                        <span className="ranking-sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((entry) => {
                      const rank = entry.serverRank,
                        p = entry.inspection;
                      return (
                        <tr
                          key={entry.id}
                          data-ranking={entry.id}
                          className={selectedEntry?.id === entry.id ? 'selected' : ''}
                        >
                          <td>
                            {rank ? (
                              rank <= 3 ? (
                                <RankCrest rank={rank} small />
                              ) : (
                                number(rank)
                              )
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <div className="ranking-player-name">
                              <Portrait entry={entry} />
                              <span>
                                {entry.name}
                                {(entry.id === board.userId || entry.id === personal.id) && (
                                  <small>Bạn</small>
                                )}
                              </span>
                            </div>
                          </td>
                          <td>{p.level}</td>
                          <td className="ranking-sect-col">
                            <span className="ranking-sect-name">
                              <SectGlyph kind="overview" />
                              {p.child ? 'Chưa nhập môn' : (ZONE_NAMES[p.sect ?? ''] ?? 'Tán tu')}
                            </span>
                          </td>
                          <td className="ranking-score-cell">{scoreLabel(entry, category)}</td>
                          <td className="ranking-school-col" style={{ color: heroFor(p).color }}>
                            {heroFor(p).school}
                          </td>
                          <td>
                            <button
                              aria-label={`Xem thông tin ${entry.name}`}
                              onClick={() => select(entry.id)}
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!visible.length && (
                  <div className="ranking-list-empty">
                    <RankingIcon />
                    <b>
                      {board.loading
                        ? 'Đang tải thứ hạng…'
                        : board.error
                          ? 'Chưa tải được Tiên Bảng'
                          : data?.supported === false
                            ? 'Ngũ Hành chưa mở'
                            : query
                              ? 'Không tìm thấy nhân vật'
                              : 'Chưa có thành tích cho bảng này'}
                    </b>
                    <p>
                      {board.error
                        ? 'Chọn Của tôi để xem hồ sơ cá nhân hoặc thử làm mới.'
                        : query
                          ? 'Thử tên khác hoặc xóa tìm kiếm.'
                          : definition.hint}
                    </p>
                  </div>
                )}
              </div>
              <footer className="ranking-pagination">
                <small>
                  {ownOnly
                    ? data?.self
                      ? 'Hồ sơ đã lưu trên server'
                      : 'Hồ sơ trên thiết bị'
                    : `Trang ${activePage + 1}/${pages} · ${number(total)} nhân vật`}
                </small>
                <nav aria-label="Phân trang bảng xếp hạng">
                  <button
                    aria-label="Trang trước"
                    disabled={ownOnly || board.loading || activePage === 0}
                    onClick={() => {
                      setPage(activePage - 1);
                      setSelected(undefined);
                    }}
                  >
                    ‹
                  </button>
                  {pageNumbers.map((i) => (
                    <button
                      key={i}
                      aria-label={`Trang ${i + 1}`}
                      aria-current={i === activePage ? 'page' : undefined}
                      disabled={board.loading || ownOnly}
                      onClick={() => {
                        setPage(i);
                        setSelected(undefined);
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    aria-label="Trang sau"
                    disabled={ownOnly || board.loading || activePage >= pages - 1}
                    onClick={() => {
                      setPage(activePage + 1);
                      setSelected(undefined);
                    }}
                  >
                    ›
                  </button>
                </nav>
              </footer>
            </div>
            <div className="ranking-own-strip">
              <Portrait entry={own} />
              <div>
                <strong>{own.name}</strong>
                <span>
                  {own.inspection.realm} ·{' '}
                  {own.serverRank ? `Hạng ${number(own.serverRank)}` : 'Chưa xếp hạng'}
                </span>
              </div>
              <b>{scoreLabel(own, category)}</b>
              <button onClick={() => switchMode(true)}>Của tôi</button>
            </div>
          </div>
          {selectedEntry ? (
            <RankingDetails
              entry={selectedEntry}
              category={category}
              rank={selectedEntry.serverRank ?? 0}
              isSelf={selectedEntry.id === board.userId || selectedEntry.id === personal.id}
              tab={detailTab}
              setTab={setDetailTab}
            />
          ) : (
            <aside className="ranking-detail ranking-no-selection">
              <RankingIcon />
              <h3>Tiên Bảng đang chờ ghi danh</h3>
              <p>Chọn một nhân vật để xem thông tin, trang bị và linh thú.</p>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
