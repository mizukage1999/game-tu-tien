import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { REALMS } from '../../data';
import { heroFor } from '../../data/heroes';
import { itemIconUrl } from '../../game/art/icons';
import { EventBus } from '../../game/EventBus';
import { breakthroughBlocker, meditateGain, tribulationPlan } from '../../game/systems/cultivation';
import { homeMeditateRate, immortalProgress } from '../../game/systems/immortal';
import { lifeProgress } from '../../game/systems/life';
import { isChildhood } from '../../game/systems/origin';
import { expToNext, playerStats, realmFor } from '../../game/systems/progression';
import { REALM_COLORS, REALM_PHASES, realmStyle } from '../../game/systems/realmStyle';
import { itemName, useGame } from '../../store/gameStore';
import { HeroMeditation } from '../HeroArt';
import { RealmBadge } from '../RealmBadge';
import { CultHeading } from './CultivationUI';
import './cultivation-panel.css';

const number = (n: number) => Math.floor(n).toLocaleString('vi-VN');

function Crest({ index }: { index: number }) {
  return (
    <i
      className="training-crest"
      aria-hidden="true"
      style={{ backgroundPosition: `${(index % 3) * 50}% ${(Math.floor(index / 3) * 100) / 3}%` }}
    />
  );
}

function Frame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`training-frame ${className}`}>{children}</section>;
}

export function CultivationPanel() {
  const player = useGame((s) => s.player),
    stats = useGame((s) => s.stats),
    zone = useGame((s) => s.zone),
    mapId = useGame((s) => s.mapId),
    status = useGame((s) => s.status),
    meditating = useGame((s) => s.meditating),
    trial = useGame((s) => s.tribulation),
    setMenu = useGame((s) => s.setMenu),
    tryBreakthrough = useGame((s) => s.tryBreakthrough);
  const [mode, setMode] = useState<'train' | 'breakthrough'>('train');
  const [inspected, setInspected] = useState<number | null>(null),
    [phase, setPhase] = useState<number | null>(null);
  const strip = useRef<HTMLElement>(null);
  const current = realmStyle({ level: player.level }),
    index = inspected ?? player.realmIndex,
    realm = realmFor(index),
    next = REALMS[player.realmIndex + 1],
    child = isChildhood(player),
    hero = heroFor(player),
    viewPhase = phase ?? (index === player.realmIndex ? current.phaseIndex : 0),
    viewLevel = realm.minLevel + [0, 3, 6, 9][viewPhase],
    preview = index !== player.realmIndex || viewPhase !== current.phaseIndex;
  const cost = realmFor(player.realmIndex).breakthrough,
    need = expToNext(player.level),
    percent = Math.min(100, Math.floor((player.exp / need) * 100)),
    plan = tribulationPlan(player.realmIndex),
    blocker = trial
      ? 'Thiên Kiếp đang diễn ra.'
      : breakthroughBlocker(player, mapId, status === 'alive'),
    trainingBlocked = child
      ? 'Hoàn thành câu chuyện Vương Gia Thôn để mở tu luyện.'
      : status !== 'alive'
        ? 'Cần hồi phục trước khi tu luyện.'
        : trial
          ? 'Hãy vượt qua Thiên Kiếp trước.'
          : lifeProgress(player).retreat
            ? 'Nhân vật đang bế quan trong tĩnh thất.'
            : null;
  const gains = meditateGain(
    player.level,
    mapId === 'dong_phu'
      ? homeMeditateRate(immortalProgress(player).homeLevel) +
          lifeProgress(player).facilities.array -
          1
      : (zone?.rate ?? null),
  );
  const projected = playerStats({
    ...player,
    level: preview ? viewLevel : (next?.minLevel ?? player.level),
    realmIndex: preview ? index : next ? player.realmIndex + 1 : player.realmIndex,
  });
  const attributes = [
    ['♥', 'Sinh lực', stats.maxHp, projected.maxHp],
    ['⚔', 'Công kích', stats.atk, projected.atk],
    ['◇', 'Phòng ngự', stats.def, projected.def],
    ['◈', 'Linh lực', stats.maxMp, projected.maxMp],
  ] as const;
  const materials = cost
    ? [
        { id: 'linh_khi', have: player.linhKhi, need: cost.linhKhi },
        { id: 'linh_thach', have: player.inventory.linh_thach ?? 0, need: cost.linhThach },
        { id: 'pha_canh_dan', have: player.inventory.pha_canh_dan ?? 0, need: 1 },
      ]
    : [];
  useEffect(() => {
    strip.current
      ?.querySelector(`[data-realm-index="${index}"]`)
      ?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [index]);

  const resourceList = (
    <div className="training-materials">
      {materials.map((m) => (
        <div key={m.id} className={m.have >= m.need ? 'enough' : 'short'}>
          <img src={itemIconUrl(m.id, 60)} alt="" />
          <span>
            {itemName(m.id)}
            <small>
              {number(m.have)} / {number(m.need)}
            </small>
          </span>
          <b aria-label={m.have >= m.need ? 'Đủ' : 'Thiếu'}>{m.have >= m.need ? '✓' : '!'}</b>
        </div>
      ))}
    </div>
  );
  const attributeList = (
    <dl className="training-attributes">
      {attributes.map(([icon, label, before, after]) => (
        <div key={label}>
          <dt>
            <i aria-hidden="true">{icon}</i>
            {label}
          </dt>
          <dd>
            {number(before)}
            <b aria-hidden="true">→</b>
            <strong>{number(after)}</strong>
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div
      className={`training-panel mode-${mode}`}
      style={{ '--training-color': REALM_COLORS[index] } as CSSProperties}
    >
      <nav className="training-realms" aria-label="Mười hai cảnh giới" ref={strip}>
        {REALMS.map((r, i) => (
          <button
            type="button"
            key={r.name}
            data-realm-index={i}
            aria-pressed={index === i}
            className={`${i === player.realmIndex ? 'current' : ''} ${i > player.realmIndex ? 'locked' : ''}`}
            style={{ '--crest-color': REALM_COLORS[i] } as CSSProperties}
            onClick={() => {
              setInspected(i === player.realmIndex ? null : i);
              setPhase(null);
              setMode('train');
            }}
          >
            <Crest index={i} />
            <span>{r.name}</span>
            {i === player.realmIndex && <small>Hiện tại</small>}
          </button>
        ))}
      </nav>
      {mode === 'train' ? (
        <div className="training-body">
          <Frame className="training-phases">
            <h4>
              <Crest index={index} />
              {realm.name}
            </h4>
            <nav aria-label="Giai đoạn tu luyện">
              {REALM_PHASES.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={viewPhase === i}
                  onClick={() => setPhase(i)}
                >
                  <span aria-hidden="true">
                    {index > player.realmIndex ||
                    (index === player.realmIndex && i > current.phaseIndex)
                      ? '♙'
                      : '✦'}
                  </span>
                  {label}
                  <small>
                    {index === player.realmIndex && i === current.phaseIndex ? 'Đang tu' : 'Xem'}
                  </small>
                </button>
              ))}
            </nav>
            <p>
              Rèn tâm · Tụ khí
              <br />
              Từng bước đăng tiên
            </p>
          </Frame>
          <section
            className={`training-scene ${meditating ? 'meditating' : ''}`}
            aria-label="Tọa thiền hấp thu linh khí"
          >
            <div className="training-scene-label">
              {preview
                ? 'XEM TRƯỚC CẢNH GIỚI'
                : child
                  ? 'KHỞI ĐẦU TIÊN LỘ'
                  : meditating
                    ? 'ĐANG TỌA THIỀN'
                    : 'TĨNH TÂM · NGỘ ĐẠO'}
            </div>
            <HeroMeditation id={hero.id} className="training-figure" />
            <div className="training-progress">
              <b>{child ? 'Phàm Nhân' : `${current.name} · ${current.phase}`}</b>
              <progress
                value={Math.min(player.exp, need)}
                max={need}
                aria-label="Tiến độ EXP tu luyện"
              />
              <small>
                {number(player.exp)} / {number(need)} EXP · {percent}%
              </small>
            </div>
          </section>
          <Frame className="training-details">
            <div className="training-details-scroll">
              <h3>
                {realm.name} · {REALM_PHASES[viewPhase]}
              </h3>
              <p className="training-intro">
                {preview
                  ? 'Thuộc tính dự kiến với trang bị hiện tại. Tu luyện để từng bước đạt tới cảnh giới này.'
                  : 'Tĩnh tâm hấp thu linh khí, tích lũy EXP. Khi đại viên mãn, chuẩn bị đan dược và vượt Thiên Kiếp để đột phá.'}
              </p>
              <CultHeading>
                {preview
                  ? 'Thuộc tính xem trước'
                  : next
                    ? `Sau đột phá · ${next.name}`
                    : 'Cảnh giới tối cao'}
              </CultHeading>
              {attributeList}
              <div className="training-rate">
                <span>+{number(gains.exp)} EXP / giây</span>
                <span>+{number(gains.linhKhi)} Linh Khí / giây</span>
                <small>
                  {zone?.name ??
                    (mapId === 'dong_phu' ? 'Tụ linh trận động phủ' : 'Tọa thiền tại chỗ')}
                </small>
              </div>
              {cost && (
                <>
                  <CultHeading>Chuẩn bị đột phá</CultHeading>
                  {resourceList}
                </>
              )}
              <p className="training-inline-note" role="status">
                {trainingBlocked ??
                  (preview
                    ? 'Đây là cảnh giới xem trước. Bạn vẫn tu luyện ở cảnh giới hiện tại.'
                    : 'Tọa thiền không tiêu hao vật phẩm. Di chuyển để dừng.')}
              </p>
            </div>
            <button
              type="button"
              className="btn gold training-primary"
              disabled={!!trainingBlocked}
              onClick={() => {
                EventBus.emit('cmd:meditate');
                setMenu(null);
              }}
            >
              {meditating ? 'Dừng tu luyện' : 'Tu Luyện'}
            </button>
          </Frame>
        </div>
      ) : (
        <div className="training-break-body">
          <section className="training-transformation" aria-label="Cảnh giới trước và sau đột phá">
            <div className="training-transform-title">VƯỢT THIÊN KIẾP · PHÁ CẢNH THÀNH CÔNG</div>
            <div className="training-before">
              <HeroMeditation id={hero.id} />
              <RealmBadge level={player.level} child={child} />
            </div>
            <span className="training-transform-arrow" aria-hidden="true">
              ➜
            </span>
            <div className="training-after">
              <HeroMeditation id={hero.id} />
              <RealmBadge level={next?.minLevel ?? player.level} />
            </div>
            <div className="training-transform-stats">{attributeList}</div>
          </section>
          <Frame className="training-details">
            <div className="training-details-scroll">
              <CultHeading>Điều kiện đột phá</CultHeading>
              <ul className="training-requirements">
                {[
                  [!child, 'Đã nhập môn tu tiên'],
                  [player.level >= realmFor(player.realmIndex).maxLevel, 'Đạt Đại Viên Mãn'],
                  [player.exp >= need, `Tích lũy đủ EXP (${percent}%)`],
                  [['dai_thua_vien', 'linh_son_tong'].includes(mapId), 'Ở Linh Đài trong tông môn'],
                ].map(([ok, label]) => (
                  <li key={String(label)} className={ok ? 'enough' : 'short'}>
                    <b>{ok ? '✓' : '○'}</b>
                    {label}
                  </li>
                ))}
              </ul>
              {cost && (
                <>
                  <CultHeading>Nguyên liệu đột phá</CultHeading>
                  {resourceList}
                </>
              )}
              <div className="training-trial-card">
                <b>ϟ Thiên Kiếp · {plan.waves} đợt sét</b>
                <span>
                  {Math.ceil(plan.durationMs / 1000)} giây · {plan.threats} vùng nguy hiểm mỗi đợt
                </span>
                <p>
                  Di chuyển, lướt để né sét và sống sót đến cuối. Cảnh giới chỉ tăng khi vượt hết
                  Thiên Kiếp.
                </p>
                <small>
                  Nguyên liệu tiêu hao khi bắt đầu. Thất bại giữ nguyên cảnh giới và EXP.
                </small>
              </div>
              <p className={`training-inline-note ${blocker ? 'short' : 'enough'}`} role="status">
                {next
                  ? (blocker ?? 'Đã sẵn sàng. Hãy chuẩn bị kỹ năng né đòn trước khi bắt đầu.')
                  : 'Đã đạt cảnh giới tối cao.'}
              </p>
            </div>
            <button
              type="button"
              className="btn gold training-primary"
              disabled={!!blocker || !next}
              onClick={tryBreakthrough}
            >
              Bắt đầu Thiên Kiếp
            </button>
          </Frame>
        </div>
      )}
      <nav className="training-tabs" aria-label="Chức năng tu luyện">
        <button type="button" aria-pressed={mode === 'train'} onClick={() => setMode('train')}>
          <span>♨</span> Tu Luyện
        </button>
        <button
          type="button"
          aria-pressed={mode === 'breakthrough'}
          onClick={() => {
            setMode('breakthrough');
            setInspected(null);
            setPhase(null);
          }}
        >
          <span>ϟ</span> Đột Phá
        </button>
        <button type="button" onClick={() => setMenu('skills')}>
          <span>✧</span> Kỹ Năng
        </button>
        <button type="button" onClick={() => setMenu('sect')}>
          <span>⌘</span> Bí Thuật Tông Môn
        </button>
      </nav>
    </div>
  );
}
