import { useId, useState, type CSSProperties } from 'react';
import { speciesForArt } from '../../data/bestiary';
import {
  DUNGEONS,
  ITEMS,
  MONSTERS,
  rarityOf,
  type DungeonDef,
  type QuestRewards,
  type RarityId,
} from '../../data';
import {
  DUNGEON_CATALOG,
  DUNGEON_GROUPS,
  DUNGEON_LEVELS,
  dungeonVariant,
  dungeonVariants,
  type DungeonGroup,
} from '../../data/dungeonCatalog';
import { optimizedAsset } from '../../data/assetDelivery';
import { DIFFICULTIES, type DifficultyId } from '../../game/systems/scale';
import { attemptsLeft, canEnter } from '../../game/systems/dungeon';
import { battlePower } from '../../game/systems/adventure';
import { isChildhood } from '../../game/systems/origin';
import { lifeProgress } from '../../game/systems/life';
import { EventBus } from '../../game/EventBus';
import { itemIconUrl } from '../../game/art/icons';
import { itemName, useGame } from '../../store/gameStore';
import { CultHeading } from './CultivationUI';
import './dungeon-select.css';

export function DungeonScenery({ art }: { art: number }) {
  return (
    <svg
      className="dungeon-scenery"
      viewBox={`${(art % 2) * 1024} ${Math.floor(art / 2) * 512} 1024 512`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <image href="/assets/ui/dungeon-environments-v1.png" width="2048" height="2048" />
    </svg>
  );
}
function DungeonGlyph({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="dungeon-glyph" fill="none">
      {kind === 'all' ? (
        <>
          <path d="M5 7h8v8H5zm14 0h8v8h-8zM5 21h8v8H5zm14 0h8v8h-8z" />
        </>
      ) : kind === 'story' ? (
        <>
          <path d="M9 4h18v23H9zM5 4h4v23H5zM12 10h11M12 15h8M12 20h11" />
        </>
      ) : kind === 'sect' ? (
        <>
          <path d="m3 13 13-9 13 9H3ZM5 27h22M7 15v9m6-9v9m6-9v9m6-9v9" />
        </>
      ) : (
        <>
          <path d="m4 4 21 19 3 5-5-3L4 4Zm24 0L7 23l-3 5 5-3L28 4ZM5 20l7 7m8-22 7 7" />
        </>
      )}
    </svg>
  );
}
function RewardTiles({ rewards }: { rewards: QuestRewards }) {
  return (
    <div className="dungeon-reward-grid">
      {!!rewards.exp && (
        <div
          className="dungeon-reward-tile exp"
          title={`${rewards.exp.toLocaleString('vi-VN')} EXP`}
        >
          <span className="dungeon-exp-icon">EXP</span>
          <b>{rewards.exp.toLocaleString('vi-VN')}</b>
          <small>EXP</small>
        </div>
      )}
      {[
        ...(rewards.linhKhi ? [['linh_khi', rewards.linhKhi] as const] : []),
        ...Object.entries(rewards.items ?? {}),
      ].map(([id, qty]) => (
        <div className="dungeon-reward-tile" key={id} title={`${itemName(id)} ×${qty}`}>
          <img src={itemIconUrl(id)} alt="" />
          <b>×{qty.toLocaleString('vi-VN')}</b>
          <small>{itemName(id)}</small>
        </div>
      ))}
    </div>
  );
}
function BossPortrait({ def }: { def: DungeonDef }) {
  const clip = useId().replace(/:/g, '');
  const boss = MONSTERS[def.boss],
    matched = /^dungeon_boss_(\d)$/.exec(boss.art);
  const species = speciesForArt(boss.art);
  const index = matched ? Number(matched[1]) : boss.art.includes('fire') ? 1 : 0;
  const [x, y, w, h] = species
    ? [0, species.row * 209, 313.5, 209]
    : [(index % 3) * 512, Math.floor(index / 3) * 512, 512, 512];
  return (
    <svg className="dungeon-boss-portrait" viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y} width={w} height={h} />
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
function DropTiles({ def }: { def: DungeonDef }) {
  return (
    <div className="dungeon-reward-grid">
      {def.drops?.map((drop) => {
        const gear = drop.item.startsWith('gear:')
          ? rarityOf(drop.item.slice(5) as RarityId)
          : null;
        return (
          <div
            className="dungeon-reward-tile bonus"
            key={drop.item}
            style={{ borderColor: gear?.color }}
            title={gear ? `Trang bị ${gear.label}, ngẫu nhiên bộ vị` : itemName(drop.item)}
          >
            <img src={itemIconUrl(gear ? 'moc_kiem' : drop.item)} alt="" />
            <b style={{ color: gear?.color }}>{Number((drop.chance * 100).toFixed(2))}%</b>
            <small>{gear ? `Trang bị ${gear.label}` : (ITEMS[drop.item]?.name ?? drop.item)}</small>
          </div>
        );
      })}
    </div>
  );
}

export function DungeonSelectPanel() {
  const player = useGame((s) => s.player),
    quests = useGame((s) => s.quests),
    stats = useGame((s) => s.stats);
  const run = useGame((s) => s.dungeon),
    status = useGame((s) => s.status),
    tribulation = useGame((s) => s.tribulation);
  const setMenu = useGame((s) => s.setMenu);
  const [group, setGroup] = useState<DungeonGroup>('all'),
    [band, setBand] = useState('all');
  const [selected, setSelected] = useState(DUNGEON_CATALOG[0].key);
  const [difficulties, setDifficulties] = useState<Record<string, DifficultyId>>({});
  const [rewardTab, setRewardTab] = useState<'clear' | 'first' | 'drops'>('clear');
  const range = DUNGEON_LEVELS.find((b) => b.id === band)!;
  const shown = DUNGEON_CATALOG.filter(
    (e) =>
      (group === 'all' || e.group === group) &&
      DUNGEONS[e.id].minLevel >= range.min &&
      DUNGEONS[e.id].minLevel <= range.max,
  );
  const entry = shown.find((e) => e.key === selected) ?? shown[0];
  const id = entry ? dungeonVariant(entry, difficulties[entry.key]) : '';
  const def = DUNGEONS[id];
  const cleared = (id: string) => player.dungeons?.clears[id] ?? 0;
  const destinations = DUNGEON_CATALOG.filter((e) =>
    dungeonVariants(e).some((id) => cleared(id) > 0),
  ).length;
  const totalClears = Object.values(player.dungeons?.clears ?? {}).reduce((a, b) => a + b, 0);
  const power = battlePower(stats);
  const check = def ? canEnter(player.dungeons, id, def, player.level, undefined, quests) : null;
  const reason = run
    ? `Đang ở trong ${run.name}. Hãy rời phó bản trước.`
    : status !== 'alive'
      ? 'Cần hồi phục trước khi vào phó bản.'
      : isChildhood(player)
        ? 'Hoàn thành chương mở đầu và nhập môn để vào phó bản.'
        : tribulation
          ? 'Hoàn thành thiên kiếp trước khi vào phó bản.'
          : lifeProgress(player).retreat
            ? 'Hãy xuất quan trước khi vào phó bản.'
            : check && !check.ok
              ? check.reason
              : null;
  const left = def ? attemptsLeft(player.dungeons, id, def) : 0;
  const monsters = def ? [...new Set(def.waves.flatMap((w) => w.map((m) => m.type)))] : [];
  function select(key: string) {
    setSelected(key);
    setRewardTab('clear');
  }
  return (
    <section className="dungeon-select" aria-label="Phó Bản">
      <aside className="dungeon-sidebar">
        <small>CHINH PHẠT</small>
        <nav aria-label="Loại phó bản">
          {DUNGEON_GROUPS.map((g) => (
            <button
              key={g.id}
              className={group === g.id ? 'active' : ''}
              aria-pressed={group === g.id}
              onClick={() => setGroup(g.id)}
            >
              <DungeonGlyph kind={g.glyph} />
              <span>{g.label}</span>
            </button>
          ))}
        </nav>
        <div className="dungeon-sidebar-note">
          <DungeonGlyph kind="trial" />
          <span>
            Thử sức
            <br />
            Vượt giới hạn
          </span>
        </div>
      </aside>
      <div className="dungeon-catalog">
        <nav className="dungeon-level-filters" aria-label="Cấp đề nghị">
          {DUNGEON_LEVELS.map((b) => (
            <button
              key={b.id}
              className={band === b.id ? 'active' : ''}
              aria-pressed={band === b.id}
              onClick={() => setBand(b.id)}
            >
              {b.label}
            </button>
          ))}
        </nav>
        <div className="dungeon-destinations" role="group" aria-label="Danh sách phó bản">
          {shown.map((e) => {
            const variant = dungeonVariant(e, difficulties[e.key]),
              d = DUNGEONS[variant],
              available = d.practice || attemptsLeft(player.dungeons, variant, d) > 0;
            return (
              <button
                key={e.key}
                data-dungeon={e.key}
                aria-pressed={entry?.key === e.key}
                className={`dungeon-destination ${entry?.key === e.key ? 'selected' : ''}`}
                onClick={() => select(e.key)}
              >
                <DungeonScenery art={e.art} />
                <span className="dungeon-card-seal">
                  {d.practice ? 'Cốt truyện' : e.group === 'sect' ? 'Sư môn' : 'Thử luyện'}
                </span>
                {dungeonVariants(e).some((id) => cleared(id) > 0) && (
                  <span className="dungeon-card-cleared" title="Đã vượt">
                    ✓
                  </span>
                )}
                <span className="dungeon-card-caption">
                  <strong>{e.name}</strong>
                  <span>
                    <small>Đề nghị Lv.{d.minLevel}+</small>
                    <em>
                      {d.practice
                        ? 'Có thể thử lại'
                        : available
                          ? `${attemptsLeft(player.dungeons, variant, d)} lượt hôm nay`
                          : 'Hết lượt'}
                    </em>
                  </span>
                </span>
              </button>
            );
          })}
          {!shown.length && (
            <div className="dungeon-empty">
              <DungeonGlyph kind="trial" />
              <h3>Chưa có phó bản phù hợp bộ lọc</h3>
              <button
                className="cult-btn"
                onClick={() => {
                  setGroup('all');
                  setBand('all');
                }}
              >
                Xem tất cả
              </button>
            </div>
          )}
        </div>
        <footer className="dungeon-record">
          <span className="dungeon-record-medal" aria-hidden="true">
            ✦
          </span>
          <div>
            <b>Dấu chân chinh phạt</b>
            <span>
              {destinations}/{DUNGEON_CATALOG.length} vùng đã vượt · {totalClears} lần chiến thắng
            </span>
          </div>
          <div
            className="dungeon-record-track"
            role="progressbar"
            aria-label="Vùng phó bản đã vượt"
            aria-valuenow={destinations}
            aria-valuemin={0}
            aria-valuemax={DUNGEON_CATALOG.length}
          >
            <i style={{ width: `${(destinations / DUNGEON_CATALOG.length) * 100}%` }} />
          </div>
        </footer>
      </div>
      {entry && def ? (
        <article className="dungeon-detail" data-selected-dungeon={id}>
          <div className="dungeon-detail-banner">
            <DungeonScenery art={entry.art} />
            <div>
              <small>
                {def.practice
                  ? 'PHÓ BẢN CỐT TRUYỆN'
                  : entry.group === 'sect'
                    ? 'PHÓ BẢN SƯ MÔN'
                    : 'THỬ LUYỆN CẢNH GIỚI'}
              </small>
              <h2>{entry.name}</h2>
              <p>{def.desc}</p>
              <span>
                ⚔ Cấp đề nghị {def.minLevel}+ <i>·</i> Thử luyện đơn
              </span>
            </div>
          </div>
          <div className="dungeon-difficulties" role="group" aria-label="Độ khó">
            {entry.tier ? (
              DIFFICULTIES.map((d) => (
                <button
                  data-difficulty={d.id}
                  key={d.id}
                  style={{ '--difficulty-color': d.color } as CSSProperties}
                  className={def.difficulty === d.id ? 'active' : ''}
                  aria-pressed={def.difficulty === d.id}
                  onClick={() => {
                    setDifficulties((s) => ({ ...s, [entry.key]: d.id }));
                    setRewardTab('clear');
                  }}
                >
                  {d.name}
                </button>
              ))
            ) : (
              <span>
                ✦ {def.practice ? 'Khảo hạch cốt truyện' : 'Thử thách sư môn'} ·{' '}
                {def.practice ? 'Có thể thử lại' : `${left}/${def.attemptsPerDay} lượt hôm nay`}
              </span>
            )}
          </div>
          <div className="dungeon-detail-body">
            <section className="dungeon-challenge-info">
              <div>
                <CultHeading>Thông tin thử thách</CultHeading>
                <dl>
                  <div>
                    <dt>Lực chiến đề nghị</dt>
                    <dd className={power < (def.recommendedPower ?? 0) ? 'warn' : ''}>
                      {def.recommendedPower?.toLocaleString('vi-VN') ?? 'Tự chọn'}
                    </dd>
                  </div>
                  <div>
                    <dt>Lực chiến của bạn</dt>
                    <dd>{power.toLocaleString('vi-VN')}</dd>
                  </div>
                  <div>
                    <dt>Đợt quái</dt>
                    <dd>
                      {def.waves.length} đợt · {def.waves.flat().reduce((n, m) => n + m.count, 0)}{' '}
                      quái
                    </dd>
                  </div>
                  <div>
                    <dt>Giới hạn</dt>
                    <dd>
                      {Math.floor(def.timeLimitSec / 60)} phút{' '}
                      {def.timeLimitSec % 60 ? `${def.timeLimitSec % 60} giây` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Đã vượt độ khó này</dt>
                    <dd>{cleared(id)} lần</dd>
                  </div>
                </dl>
              </div>
              <div className="dungeon-boss">
                <BossPortrait def={def} />
                <div>
                  <small>THỦ LĨNH · Lv.{MONSTERS[def.boss].level}</small>
                  <b>{MONSTERS[def.boss].name}</b>
                  <span>{MONSTERS[def.boss].hp.toLocaleString('vi-VN')} HP</span>
                </div>
              </div>
            </section>
            <div className="dungeon-enemies">
              <b>Quái chính</b>
              {monsters.map((type) => (
                <span key={type}>{MONSTERS[type]?.name ?? type}</span>
              ))}
            </div>
            <section className="dungeon-prizes">
              <CultHeading>Phần thưởng</CultHeading>
              <nav className="dungeon-reward-tabs" aria-label="Loại phần thưởng">
                {(
                  [
                    ['clear', 'Vượt ải'],
                    ['first', 'Lần đầu'],
                    ['drops', 'Có thể rơi'],
                  ] as const
                ).map(([tab, name]) => (
                  <button
                    key={tab}
                    className={rewardTab === tab ? 'active' : ''}
                    aria-pressed={rewardTab === tab}
                    onClick={() => setRewardTab(tab)}
                  >
                    {name}
                  </button>
                ))}
              </nav>
              {rewardTab === 'drops' ? (
                <>
                  {def.drops?.length ? (
                    <DropTiles def={def} />
                  ) : (
                    <p>Phó bản này không có trang bị rơi thêm.</p>
                  )}
                  <p className="dungeon-prize-note">
                    Tỉ lệ rơi độc lập, không bảo đảm nhận mỗi lượt.
                  </p>
                </>
              ) : (
                <>
                  <RewardTiles rewards={rewardTab === 'first' ? def.firstClear : def.rewards} />
                  <p className="dungeon-prize-note">
                    {rewardTab === 'first'
                      ? cleared(id) > 0
                        ? 'Đã nhận thưởng lần đầu của độ khó này.'
                        : 'Nhận thêm khi lần đầu vượt qua độ khó này.'
                      : 'Nhận khi đánh bại thủ lĩnh và hoàn thành phó bản.'}
                  </p>
                </>
              )}
            </section>
            <p className="dungeon-tactics">
              {def.practice
                ? 'Quan sát vùng báo chiêu, dùng lướt để né đòn rồi phản công.'
                : 'Boss cuồng nộ khi còn dưới 50% HP. Chuẩn bị đan dược và né vùng báo chiêu.'}{' '}
              Cấp chỉ là đề nghị.
            </p>
          </div>
          <footer className="dungeon-launch">
            <p className={reason ? 'blocked' : ''} role="status">
              {reason ??
                (def.practice
                  ? 'Thử luyện cốt truyện · Có thể thử lại'
                  : `Lượt hôm nay: ${left}/${def.attemptsPerDay}`)}
            </p>
            <div>
              {run ? (
                <button className="cult-btn" onClick={() => EventBus.emit('cmd:leaveDungeon')}>
                  Rời phó bản
                </button>
              ) : (
                <button className="cult-btn" onClick={() => setMenu('bag')}>
                  Chuẩn bị hành trang
                </button>
              )}
              <button
                className="cult-btn gold"
                data-action="enter-dungeon"
                disabled={!!reason}
                onClick={() => EventBus.emit('cmd:enterDungeon', id)}
              >
                Khai chiến <span aria-hidden="true">➜</span>
              </button>
            </div>
          </footer>
        </article>
      ) : (
        <aside className="dungeon-detail dungeon-empty">
          <DungeonGlyph kind="trial" />
          <h3>Chọn một phó bản</h3>
          <p>Thử bộ lọc khác để khám phá các thử thách.</p>
        </aside>
      )}
    </section>
  );
}
