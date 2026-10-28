import { useEffect, useId, useState, type CSSProperties } from 'react';
import {
  DUNGEONS,
  ITEMS,
  MONSTERS,
  rarityOf,
  type LootEntry,
  type MonsterDef,
  type QuestRewards,
  type RarityId,
} from '../../data';
import { bossCatalog, bossTheme, BOSS_CATEGORIES, type BossCategory } from '../../data/bossCatalog';
import { dungeonVariant } from '../../data/dungeonCatalog';
import { speciesForArt } from '../../data/bestiary';
import { optimizedAsset } from '../../data/assetDelivery';
import { DIFFICULTIES, killExp, type DifficultyId } from '../../game/systems/scale';
import { attemptsLeft, canEnter } from '../../game/systems/dungeon';
import { mapGateReason } from '../../game/systems/worldAccess';
import { portalToward } from '../../game/systems/questNav';
import { isChildhood } from '../../game/systems/origin';
import { lifeProgress } from '../../game/systems/life';
import { getMap } from '../../game/maps';
import { EventBus } from '../../game/EventBus';
import { itemIconUrl } from '../../game/art/icons';
import { itemName, useGame, type MenuTab } from '../../store/gameStore';
import {
  bossSighting,
  bossStatus,
  useBossSightings,
  type BossSighting,
} from '../../store/bossHuntStore';
import { CultHeading } from './CultivationUI';
import './boss-hunt.css';

const number = (n: number) => n.toLocaleString('vi-VN');
function duration(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')}:${Math.floor((seconds / 60) % 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
function Scenery({
  art,
  map = false,
  quiet = false,
}: {
  art: number;
  map?: boolean;
  quiet?: boolean;
}) {
  if (map)
    return (
      <img className="hunt-scenery hunt-world-art" src="/assets/ui/boss-hunt-world-v1.png" alt="" />
    );
  return (
    <svg
      className="hunt-scenery"
      viewBox={`${(art % 2) * 1024} ${Math.floor(art / 2) * 256} ${quiet ? 384 : 1024} 256`}
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
    >
      <image href="/assets/ui/boss-hunt-scenes-v1.png" width="2048" height="768" />
    </svg>
  );
}
function Portrait({ def }: { def: MonsterDef }) {
  const clip = useId().replace(/:/g, ''),
    species = speciesForArt(def.art),
    match = /dungeon_boss_(\d)/.exec(def.art),
    index = match ? Number(match[1]) : def.art.includes('fire') ? 1 : 0;
  const box = species
    ? [0, species.row * 209, 313.5, 209]
    : [(index % 3) * 512, Math.floor(index / 3) * 512, 512, 512];
  return (
    <svg className="hunt-portrait" viewBox={box.join(' ')} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect x={box[0]} y={box[1]} width={box[2]} height={box[3]} />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clip})`}
        href={optimizedAsset(
          species
            ? `/assets/monsters/${species.sheet}-v6.png`
            : '/assets/maps/dungeon-bosses-v3.png',
        )}
        width={species ? 1254 : 1536}
        height={species ? 1254 : 1024}
      />
    </svg>
  );
}
function Drop({ drop }: { drop: LootEntry }) {
  const gear = drop.item.startsWith('gear:') ? rarityOf(drop.item.slice(5) as RarityId) : null;
  return (
    <div
      className="hunt-drop"
      style={gear ? ({ '--drop-color': gear.color } as CSSProperties) : undefined}
      title={`${gear ? `Trang bị ${gear.label}` : itemName(drop.item)} · ${Number((drop.chance * 100).toFixed(2))}%`}
    >
      <img src={itemIconUrl(gear ? 'moc_kiem' : drop.item)} alt="" />
      <b>
        {drop.chance < 1
          ? `${Number((drop.chance * 100).toFixed(2))}%`
          : `×${drop.qty[0] === drop.qty[1] ? drop.qty[0] : drop.qty.join('–')}`}
      </b>
      <small>{gear ? `Đồ ${gear.label}` : (ITEMS[drop.item]?.name ?? drop.item)}</small>
    </div>
  );
}
function FixedRewards({ rewards }: { rewards: QuestRewards }) {
  return (
    <div className="hunt-drops">
      {!!rewards.exp && (
        <div className="hunt-drop exp">
          <span>EXP</span>
          <b>{number(rewards.exp)}</b>
          <small>Kinh nghiệm</small>
        </div>
      )}
      {[
        ...(rewards.linhKhi ? [['linh_khi', rewards.linhKhi] as const] : []),
        ...Object.entries(rewards.items ?? {}),
      ].map(([item, qty]) => (
        <Drop key={item} drop={{ item, qty: [qty, qty], chance: 1 }} />
      ))}
    </div>
  );
}
function Health({ sighting }: { sighting: BossSighting }) {
  return (
    <div className="hunt-health" aria-label="Sinh lực boss">
      <i
        style={{ width: `${Math.max(0, Math.min(100, (sighting.hp / sighting.maxHp) * 100))}%` }}
      />
      <span>
        {number(Math.ceil(sighting.hp))} / {number(sighting.maxHp)} HP
      </span>
    </div>
  );
}
const SIDE: [MenuTab | 'stall', string, string][] = [
  ['character', 'Nhân vật', '♙'],
  ['cultivate', 'Tu luyện', '♨'],
  ['journey', 'Tiên lộ', '♧'],
  ['dungeon', 'Phó bản', '◇'],
  ['boss', 'Săn Boss', '♛'],
  ['shop', 'Giao dịch', '⚖'],
  ['stall', 'Bày bán', '▤'],
];

export function BossHuntPanel() {
  const player = useGame((s) => s.player),
    here = useGame((s) => s.mapId),
    quests = useGame((s) => s.quests),
    status = useGame((s) => s.status),
    run = useGame((s) => s.dungeon),
    tribulation = useGame((s) => s.tribulation),
    setMenu = useGame((s) => s.setMenu),
    patch = useGame((s) => s.patch);
  const snapshot = useBossSightings();
  const [catalog] = useState(bossCatalog),
    [category, setCategory] = useState<BossCategory>('world'),
    [selectedKey, setSelectedKey] = useState(''),
    [tab, setTab] = useState('info'),
    [difficulty, setDifficulty] = useState<DifficultyId>('de'),
    [query, setQuery] = useState(''),
    [mapOpen, setMapOpen] = useState(false),
    [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const text = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .toLowerCase();
  const entries = catalog.filter(
    (e) =>
      e.category === category &&
      text(`${MONSTERS[e.type].name} ${getMap(e.mapId).name}`).includes(text(query.trim())),
  );
  const base = entries.find((e) => e.key === selectedKey) ?? entries[0];
  const dungeonId = base?.dungeon ? dungeonVariant(base.dungeon, difficulty) : null;
  const dungeon = dungeonId ? DUNGEONS[dungeonId] : null;
  const entry = base && dungeon ? { ...base, type: dungeon.boss } : base;
  const def = entry ? MONSTERS[entry.type] : null,
    theme = def ? bossTheme(def) : null;
  const illustrated =
    !!def &&
    ['cuu_vi_thien_ho', 'ma_ton', 'u_minh_co_thu', 'thien_dao_kim_o', 'hon_don_thu'].includes(
      speciesForArt(def.art)?.id ?? '',
    );
  const sighting = entry ? bossSighting(entry, snapshot, here) : undefined;
  const observed = bossStatus(sighting, now);
  const context = {
    childhood: isChildhood(player),
    quests,
    reputation: player.adventure?.reputation ?? 0,
  };
  const dungeonCheck = dungeon
    ? canEnter(player.dungeons, dungeonId!, dungeon, player.level, undefined, quests)
    : null;
  const block =
    status !== 'alive'
      ? 'Hãy trở về tông môn để hồi phục.'
      : tribulation
        ? 'Hãy hoàn thành thiên kiếp trước.'
        : lifeProgress(player).retreat
          ? 'Hãy xuất quan trước khi đi săn.'
          : run
            ? 'Hãy rời phó bản hiện tại trước.'
            : isChildhood(player)
              ? 'Hoàn thành chương mở đầu và nhập môn để săn boss.'
              : dungeonCheck && !dungeonCheck.ok
                ? dungeonCheck.reason
                : entry
                  ? (mapGateReason(getMap(entry.mapId), context) ??
                    (here !== entry.mapId &&
                    !dungeon &&
                    !portalToward(getMap(here), entry.mapId, player.level, context)
                      ? 'Chưa mở đường đến khu vực này.'
                      : null))
                  : null;
  const select = (key: string) => {
    setSelectedKey(key);
    setTab('info');
    setMapOpen(false);
  };
  const go = () => {
    if (!entry || block) return;
    if (dungeonId) EventBus.emit('cmd:enterDungeon', dungeonId);
    else if (here === entry.mapId) EventBus.emit('cmd:mapWalk', { x: entry.x, y: entry.y });
    else EventBus.emit('cmd:travel', entry.mapId);
  };
  const maps = [...new Map(entries.map((e) => [e.mapId, e])).values()];
  const mapView = (
    <section className="hunt-map" aria-label="Khu vực săn boss">
      <Scenery art={0} map />
      <div className="hunt-map-heading">
        <small>SƠN HÀ ĐỒ</small>
        <h3>Dấu chân yêu vương</h3>
        <p>Chọn khu vực để xem mục tiêu</p>
      </div>
      <div className={`hunt-map-pins ${maps.length > 5 ? 'dense' : ''}`}>
        {maps.map((e, i) => {
          const t = bossTheme(MONSTERS[e.type]);
          return (
            <button
              key={e.mapId}
              data-hunt-map={e.mapId}
              className={entry?.mapId === e.mapId ? 'selected' : ''}
              style={
                {
                  ...(maps.length <= 5
                    ? {
                        left: `${Math.min(85, t.x + (i % 2) * 5)}%`,
                        top: `${Math.min(83, t.y + Math.floor(i / 5) * 5)}%`,
                      }
                    : {}),
                  '--hunt-accent': t.color,
                } as CSSProperties
              }
              onClick={() => select(e.key)}
            >
              <i>♛</i>
              <b>{getMap(e.mapId).name}</b>
              <small>Lv.{MONSTERS[e.type].level}</small>
            </button>
          );
        })}
      </div>
      <footer>
        <span>♛ Đã chọn</span>
        <span>◇ Chưa dò</span>
        <small>{maps.length} khu vực</small>
      </footer>
    </section>
  );
  return (
    <section className="boss-hunt-shell" aria-label="Săn Boss">
      <aside className="hunt-side">
        <small>TIÊN ĐỒ</small>
        <nav aria-label="Tính năng">
          {SIDE.map(([id, name, glyph]) => (
            <button
              key={id}
              className={id === 'boss' ? 'active' : ''}
              disabled={isChildhood(player) && ['character', 'cultivate'].includes(id)}
              onClick={() => {
                if (id === 'stall') {
                  setMenu('shop');
                  patch({ marketSection: 'stall' });
                } else setMenu(id);
              }}
            >
              <i>{glyph}</i>
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <span className="hunt-side-note">
          Tru yêu hộ đạo
          <br />
          Uy chấn sơn hà
        </span>
      </aside>
      <div className="hunt-main">
        <nav className="hunt-categories" aria-label="Loại boss">
          {BOSS_CATEGORIES.map(([id, name]) => (
            <button
              key={id}
              data-boss-category={id}
              className={category === id ? 'active' : ''}
              aria-pressed={category === id}
              onClick={() => {
                setCategory(id);
                setSelectedKey('');
                setQuery('');
                setMapOpen(false);
                setTab('info');
              }}
            >
              {name}
            </button>
          ))}
        </nav>
        {category !== 'sect' && category !== 'event' ? (
          <div className={`hunt-layout ${mapOpen ? 'show-map' : ''}`}>
            <section className="hunt-targets">
              <header>
                <span>{entries.length} mục tiêu</span>
                <button
                  className="hunt-mobile-map"
                  aria-pressed={mapOpen}
                  onClick={() => setMapOpen((v) => !v)}
                >
                  {mapOpen ? 'Thông tin' : 'Bản đồ'}
                </button>
              </header>
              <input
                className="hunt-search"
                aria-label="Tìm boss"
                placeholder="Tên boss, khu vực…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="hunt-boss-list">
                {entries.map((e) => {
                  const m = MONSTERS[e.type],
                    live = bossStatus(bossSighting(e, snapshot, here), now);
                  return (
                    <button
                      key={e.key}
                      data-boss={e.key}
                      className={base?.key === e.key ? 'selected' : ''}
                      aria-pressed={base?.key === e.key}
                      onClick={() => select(e.key)}
                    >
                      <Portrait def={m} />
                      <span>
                        <b>{m.name}</b>
                        <small>
                          Lv.{m.level} · {getMap(e.mapId).name}
                        </small>
                        <em className={`hunt-state ${e.dungeon ? 'personal' : live.tone}`}>
                          {e.dungeon ? 'Thử luyện phó bản' : live.label}
                        </em>
                        {!e.dungeon && live.remaining > 0 && (
                          <time>{duration(live.remaining)}</time>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            {entries.length ? (
              mapView
            ) : (
              <div className="hunt-no-results">
                <div>
                  <p>Không có mục tiêu phù hợp.</p>
                  <button className="cult-btn" onClick={() => setQuery('')}>
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            )}
            {entry && def && theme && (
              <section
                className="hunt-detail"
                data-selected-boss={entry.key}
                style={{ '--hunt-accent': theme.color } as CSSProperties}
              >
                <div className="hunt-hero">
                  <Scenery art={theme.art} quiet={!illustrated} />
                  {!illustrated && (
                    <span className="hunt-hero-creature">
                      <Portrait def={def} />
                    </span>
                  )}
                  <div>
                    <span className="hunt-kicker">
                      {dungeon
                        ? 'BOSS PHÓ BẢN'
                        : category === 'elite'
                          ? 'TINH ANH DÃ NGOẠI'
                          : 'BOSS THẾ GIỚI'}
                    </span>
                    <h2>{def.name}</h2>
                    <p>
                      Lv.{def.level} <span>◇ {getMap(entry.mapId).name}</span>
                    </p>
                    <small className={`hunt-state ${dungeon ? 'personal' : observed.tone}`}>
                      {dungeon ? 'Vượt các đợt quái để gặp boss' : observed.label}
                      {observed.remaining > 0 ? ` · ${duration(observed.remaining)}` : ''}
                    </small>
                  </div>
                </div>
                <nav className="hunt-detail-tabs" aria-label="Chi tiết boss">
                  {[
                    ['info', 'Thông tin'],
                    ['damage', 'Sát thương'],
                    ['rewards', 'Thưởng'],
                  ].map(([id, name]) => (
                    <button
                      key={id}
                      data-boss-tab={id}
                      className={tab === id ? 'active' : ''}
                      aria-pressed={tab === id}
                      onClick={() => setTab(id)}
                    >
                      {name}
                    </button>
                  ))}
                </nav>
                <div className="hunt-detail-body">
                  {tab === 'info' && (
                    <>
                      <CultHeading>Thông tin boss</CultHeading>
                      <dl className="hunt-stats">
                        <div>
                          <dt>Cấp đề xuất</dt>
                          <dd>Lv.{def.level}</dd>
                        </div>
                        <div>
                          <dt>Sinh lực</dt>
                          <dd>{number(def.hp)}</dd>
                        </div>
                        <div>
                          <dt>Công / Phòng</dt>
                          <dd>
                            {number(def.atk)} / {number(def.def)}
                          </dd>
                        </div>
                        <div>
                          <dt>Vị trí</dt>
                          <dd>
                            {entry.x}, {entry.y} <small>(tọa độ map)</small>
                          </dd>
                        </div>
                        <div>
                          <dt>{dungeon ? 'Thời gian thử luyện' : 'Chu kỳ hồi sinh'}</dt>
                          <dd>{duration(dungeon ? dungeon.timeLimitSec * 1000 : def.respawnMs)}</dd>
                        </div>
                      </dl>
                      {sighting && <Health sighting={sighting} />}
                      <CultHeading>Có thể nhận</CultHeading>
                      <div className="hunt-drops compact">
                        <div className="hunt-drop exp">
                          <span>EXP</span>
                          <b>{number(killExp(def))}</b>
                        </div>
                        {def.loot.slice(0, 4).map((drop, i) => (
                          <Drop key={i} drop={drop} />
                        ))}
                      </div>
                      <p className="hunt-tip">
                        {def.boss
                          ? `Né vùng báo chiêu trước khi boss giáng đòn.${def.boss.summon ? ' Boss có thể gọi thêm hộ vệ khi yếu máu.' : ''}`
                          : 'Tinh anh có thể mạnh hơn quái thường trong cùng khu vực.'}
                      </p>
                    </>
                  )}
                  {tab === 'damage' && (
                    <>
                      <CultHeading>Diễn biến giao tranh</CultHeading>
                      {sighting ? (
                        <>
                          <Health sighting={sighting} />
                          <div className="hunt-combat-metrics">
                            <div>
                              <small>HP đã mất</small>
                              <b>{number(Math.max(0, sighting.maxHp - sighting.hp))}</b>
                            </div>
                            <div>
                              <small>HP còn lại</small>
                              <b>{number(sighting.hp)}</b>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="hunt-inline-empty">
                          Đến đúng khu vực để theo dõi sinh lực boss.
                        </p>
                      )}
                      <table className="hunt-ranking">
                        <thead>
                          <tr>
                            <th>Hạng</th>
                            <th>Người chơi</th>
                            <th>Sát thương</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan={3}>Chưa có bảng xếp hạng sát thương cho cuộc săn này.</td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  )}
                  {tab === 'rewards' && (
                    <>
                      <CultHeading>Thưởng hạ mục tiêu</CultHeading>
                      <FixedRewards
                        rewards={{
                          exp: killExp(def),
                          items: Object.fromEntries(
                            def.loot
                              .filter(
                                (d) =>
                                  d.chance >= 1 &&
                                  d.qty[0] === d.qty[1] &&
                                  !d.item.startsWith('gear:'),
                              )
                              .map((d) => [d.item, d.qty[0]]),
                          ),
                        }}
                      />
                      <div className="hunt-drops">
                        {def.loot
                          .filter((d) => d.chance >= 1 && d.qty[0] !== d.qty[1])
                          .map((d, i) => (
                            <Drop key={i} drop={d} />
                          ))}
                      </div>
                      <CultHeading>Vật phẩm ngẫu nhiên</CultHeading>
                      <div className="hunt-drops">
                        {def.loot
                          .filter((d) => d.chance < 1)
                          .map((d, i) => (
                            <Drop key={i} drop={d} />
                          ))}
                      </div>
                      {(!dungeon || def.boss) && (
                        <>
                          <CultHeading>Vật phẩm có thể rơi thêm</CultHeading>
                          <div className="hunt-drops">
                            {!dungeon && (
                              <Drop drop={{ item: 'huyen_thiet', chance: 0.25, qty: [1, 1] }} />
                            )}
                            {def.boss &&
                              ['cong_thuc_ngoc', 'cong_thuc_pha_canh'].map((item) => (
                                <Drop key={item} drop={{ item, chance: 0.15, qty: [1, 1] }} />
                              ))}
                          </div>
                        </>
                      )}
                      {dungeon && (
                        <>
                          <CultHeading>Thưởng hoàn thành phó bản</CultHeading>
                          <FixedRewards rewards={dungeon.rewards} />
                          {!!dungeon.drops?.length && (
                            <div className="hunt-drops">
                              {dungeon.drops.map((d, i) => (
                                <Drop key={i} drop={d} />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <p className="hunt-tip">
                        Tỉ lệ hiển thị theo từng lần rơi. Vật phẩm hiếm có thể không xuất hiện sau
                        một lần hạ boss.
                      </p>
                    </>
                  )}
                </div>
                <footer className="hunt-launch">
                  {base?.dungeon?.tier && (
                    <label>
                      Độ khó
                      <select
                        aria-label="Độ khó săn boss"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value as DifficultyId)}
                      >
                        {DIFFICULTIES.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="hunt-launch-note" role="status">
                    {block ??
                      (dungeon
                        ? `Lượt hôm nay: ${attemptsLeft(player.dungeons, dungeonId!, dungeon)}/${dungeon.attemptsPerDay}`
                        : sighting
                          ? 'Đã dò mục tiêu trong khu vực hiện tại.'
                          : 'Di chuyển đến khu vực để dò boss.')}
                  </div>
                  <div className="hunt-actions">
                    <button className="cult-btn" onClick={() => setMenu('social')}>
                      Tìm đồng đội
                    </button>
                    <button
                      className="cult-btn gold"
                      data-action="hunt-boss"
                      disabled={!!block}
                      onClick={go}
                    >
                      ⚔ {dungeon ? 'Khiêu chiến' : 'Đến ngay'}
                    </button>
                  </div>
                </footer>
              </section>
            )}
          </div>
        ) : (
          <div className="hunt-empty">
            <Scenery art={category === 'sect' ? 3 : 5} />
            <div>
              <span>♛</span>
              <h2>
                {category === 'sect'
                  ? 'Chưa có lệnh săn tông môn'
                  : category === 'event'
                    ? 'Chưa có sự kiện săn boss'
                    : 'Không có mục tiêu phù hợp'}
              </h2>
              <p>
                {category === 'sect'
                  ? 'Các cuộc săn của tông môn sẽ xuất hiện tại đây khi có lệnh triệu tập.'
                  : category === 'event'
                    ? 'Chưa có cuộc săn sự kiện đang diễn ra.'
                    : 'Hãy thử một tên khác hoặc xem lại toàn bộ danh sách.'}
              </p>
              <button
                className="cult-btn gold"
                onClick={() => {
                  setCategory('world');
                  setQuery('');
                }}
              >
                Xem boss thế giới
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
