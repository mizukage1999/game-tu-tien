import { useState, type CSSProperties } from 'react';
import { bonusText, EQUIP_SLOTS, ITEMS, REALMS, rarityOf, type EquipSlot } from '../../data';
import { gameStore, itemName, useGame } from '../../store/gameStore';
import { heroName, isChildhood, usesChildSprite } from '../../game/systems/origin';
import { battlePower, adventure, sectRank, SECT_RANKS } from '../../game/systems/adventure';
import {
  enhancementLevel,
  enhanceCost,
  enhanceChance,
  MAX_ENHANCEMENT,
  ENHANCEMENT_STONE,
} from '../../game/systems/enhancement';
import {
  canEquip,
  computeStats,
  expToNext,
  realmNameAtLevel,
} from '../../game/systems/progression';
import { skillLoadout } from '../../game/systems/skills';
import { COMPANIONS, lifeProgress } from '../../game/systems/life';
import { SkillGlyph, EquipGlyph, CultHeading, CultMeter, CultLock } from './CultivationUI';
import { childProfileUrl } from '../../game/art/skillIcons';
import { HeroFigure } from '../HeroArt';

const SLOT_SYMBOLS: Record<EquipSlot, string> = {
  weapon: '⚔',
  armor: '♜',
  helmet: '♔',
  boots: '♟',
  ring: '◉',
  amulet: '☯',
};
function AttributeRadar() {
  const p = useGame((s) => s.player),
    stats = useGame((s) => s.stats),
    base = computeStats(p.level, p.realmIndex, {});
  const axes = [
    ['Công', stats.atk, base.atk],
    ['Phòng', stats.def, base.def],
    ['Sinh lực', stats.maxHp, base.maxHp],
    ['Linh lực', stats.maxMp, base.maxMp],
    ['Bạo kích', stats.critRate, base.critRate],
    ['Thân pháp', stats.speed, base.speed],
  ] as const;
  const point = (i: number, r: number) =>
    `${125 + Math.sin((i * Math.PI) / 3) * r},${105 - Math.cos((i * Math.PI) / 3) * r}`;
  return (
    <div className="cult-radar">
      <svg viewBox="0 0 250 215" role="img" aria-label="Biểu đồ sáu thuộc tính nhân vật">
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon
            key={r}
            points={axes.map((_, i) => point(i, 72 * r)).join(' ')}
            className="cult-radar-grid"
          />
        ))}
        {axes.map((_, i) => (
          <line
            key={i}
            x1="125"
            y1="105"
            x2={point(i, 72).split(',')[0]}
            y2={point(i, 72).split(',')[1]}
          />
        ))}
        <polygon
          className="cult-radar-value"
          points={axes
            .map(([, v, b], i) =>
              point(i, 72 * Math.min(0.95, Math.max(0.18, v / Math.max(1, b * 1.6)))),
            )
            .join(' ')}
        />
        {axes.map(([name, value], i) => {
          const [x, y] = point(i, 96).split(',');
          return (
            <g key={name}>
              <text x={x} y={Number(y) - 3} textAnchor="middle">
                {name}
              </text>
              <text className="value" x={x} y={Number(y) + 10} textAnchor="middle">
                {i === 4
                  ? `${Math.round(value * 100)}%`
                  : Math.round(value).toLocaleString('vi-VN')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
export function CharacterPanel() {
  const p = useGame((s) => s.player),
    status = useGame((s) => s.status),
    stats = useGame((s) => s.stats),
    setMenu = useGame((s) => s.setMenu),
    equip = useGame((s) => s.equip),
    unequip = useGame((s) => s.unequip),
    act = useGame((s) => s.adventureAction),
    patch = useGame((s) => s.patch);
  const [tab, setTab] = useState<'attributes' | 'equipment'>('attributes'),
    [selectedSlot, setSelectedSlot] = useState<EquipSlot>('weapon');
  const [notice, setNotice] = useState('');
  const child = isChildhood(p),
    realm = child ? 'Phàm Nhân' : realmNameAtLevel(p.level),
    a = adventure(p),
    life = lifeProgress(p);
  const selectedId = p.equipment[selectedSlot],
    slotDef = EQUIP_SLOTS.find((s) => s.id === selectedSlot)!;
  const enhancement = enhancementLevel(selectedId ? a.enhancements[selectedId] : 0),
    cost = enhanceCost(enhancement)[ENHANCEMENT_STONE] ?? 0;
  const candidate = Object.keys(p.inventory).filter(
    (id) => (p.inventory[id] ?? 0) > 0 && ITEMS[id]?.slot === selectedSlot,
  );
  const companion = COMPANIONS.find((c) => c.id === life.companion),
    loadout = skillLoadout(p);
  const paperdoll = child
    ? childProfileUrl(p.sex ?? 'female')
    : `/assets/ui/cultivation/${p.sex === 'male' ? 'wang' : 'li'}-full-v1.png`;
  const selectSlot = (slot: EquipSlot) => {
    setSelectedSlot(slot);
    setTab('equipment');
    setNotice('');
  };
  return (
    <div className="cult-character">
      <nav className="cult-side" aria-label="Mục nhân vật">
        <button
          className={tab === 'attributes' ? 'active' : ''}
          onClick={() => setTab('attributes')}
        >
          <i>☯</i>
          <span>Thuộc tính</span>
        </button>
        <button className={tab === 'equipment' ? 'active' : ''} onClick={() => setTab('equipment')}>
          <i>♜</i>
          <span>Trang bị</span>
        </button>
        <button onClick={() => setMenu('skills')}>
          <i>⚔</i>
          <span>Kỹ năng</span>
        </button>
        <button
          onClick={() => {
            patch({ journeySection: 'companions' });
            setMenu('journey');
          }}
        >
          <i>♘</i>
          <span>Linh thú</span>
        </button>
        <button onClick={() => setMenu('sect')}>
          <i>✦</i>
          <span>Tông môn</span>
        </button>
        <div className="cult-side-caption">
          Một đời cầu đạo
          <br />
          Nghịch thiên mà đi
        </div>
      </nav>
      <section className="cult-paperdoll" aria-label="Hình nhân vật và trang bị">
        <span className="cult-hero-seal" aria-hidden="true">
          道
        </span>
        {p.heroId && !usesChildSprite(p) ? <HeroFigure id={p.heroId} className="cult-hero-art" /> : <img
          className={`cult-hero-art ${child ? 'child' : ''}`}
          src={
            paperdoll ??
            (p.sex === 'male'
              ? '/assets/sprites/wang-lin-portrait.png'
              : '/assets/sprites/li-mu-uyen-portrait.png')
          }
          alt={heroName(p)}
        />}
        <div className="cult-paperdoll-caption">
          <span>{child ? 'VƯƠNG GIA THÔN' : 'NGƯỜI TU ĐẠO'}</span>
          <h2>{heroName(p)}</h2>
        </div>
        <div className="cult-gear-orbit">
          {EQUIP_SLOTS.map((slot, i) => {
            const id = p.equipment[slot.id],
              r = id ? ITEMS[id]?.rarity : undefined,
              color = r ? rarityOf(r).color : undefined;
            return (
              <button
                key={slot.id}
                className={`cult-gear-slot ${selectedSlot === slot.id && tab === 'equipment' ? 'selected' : ''}`}
                data-slot={slot.id}
                style={
                  {
                    '--gear-side': i < 3 ? '0' : '1',
                    '--gear-row': String(i % 3),
                    '--item-color': color ?? '#88764f',
                  } as CSSProperties
                }
                aria-label={`${slot.name}: ${id ? itemName(id) : 'Trống'}`}
                onClick={() => selectSlot(slot.id)}
              >
                <EquipGlyph id={id} empty={SLOT_SYMBOLS[slot.id]} color={color} />
                {id && <b>+{enhancementLevel(a.enhancements[id])}</b>}
                <small>{slot.name}</small>
              </button>
            );
          })}
        </div>
        <div className="cult-power">
          <span>⚔ Lực chiến</span>
          <b>{battlePower(stats).toLocaleString('vi-VN')}</b>
        </div>
      </section>
      <section
        className="cult-character-info"
        aria-label={tab === 'attributes' ? 'Thuộc tính nhân vật' : 'Chi tiết trang bị'}
      >
        <div className="cult-profile-scroll">
          {tab === 'attributes' ? (
            <>
              <div className="cult-profile-overview cult-framed">
                <div className="cult-profile-identity">
                  <small>{child ? 'THIẾU NIÊN VƯƠNG GIA' : 'HÀNH TRÌNH TU TIÊN'}</small>
                  <h2>{heroName(p)}</h2>
                  <div className="cult-skill-tags">
                    <span>{realm}</span>
                    <span>Nhân tộc</span>
                  </div>
                  <div className="cult-level-row">
                    <b>Lv.{p.level}</b>
                    <span>
                      {p.exp.toLocaleString('vi-VN')} / {expToNext(p.level).toLocaleString('vi-VN')}{' '}
                      EXP
                    </span>
                  </div>
                  <div className="cult-exp-track">
                    <i style={{ width: `${Math.min(100, (p.exp / expToNext(p.level)) * 100)}%` }} />
                  </div>
                  <dl className="cult-profile-meta">
                    <div>
                      <dt>Tông môn</dt>
                      <dd>
                        {child
                          ? 'Chưa nhập môn'
                          : a.boundSect === 'linh_son_tong'
                            ? 'Linh Sơn Tông'
                            : 'Đại Thừa Viện'}
                      </dd>
                    </div>
                    <div>
                      <dt>Thân phận</dt>
                      <dd>{child ? 'Thôn dân' : SECT_RANKS[sectRank(p)].name}</dd>
                    </div>
                    <div>
                      <dt>Danh vọng</dt>
                      <dd>{a.reputation.toLocaleString('vi-VN')}</dd>
                    </div>
                  </dl>
                  <CultMeter label="Sinh lực" value={p.hp} max={stats.maxHp} color="red" />
                  <CultMeter label="Linh lực" value={p.mp} max={stats.maxMp} />
                </div>
                <div className="cult-attributes">
                  <CultHeading>Thuộc tính</CultHeading>
                  <AttributeRadar />
                  <dl className="cult-attribute-values">
                    <div>
                      <dt>Công kích</dt>
                      <dd>{stats.atk}</dd>
                    </div>
                    <div>
                      <dt>Phòng ngự</dt>
                      <dd>{stats.def}</dd>
                    </div>
                    <div>
                      <dt>Bạo kích</dt>
                      <dd>{Math.round(stats.critRate * 100)}%</dd>
                    </div>
                    <div>
                      <dt>Sát thương bạo</dt>
                      <dd>×{stats.critMul.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Tốc độ</dt>
                      <dd>{stats.speed}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="cult-realms cult-framed">
                <CultHeading>Cảnh giới tu tiên</CultHeading>
                <div className="cult-realm-path">
                  {REALMS.map((r, i) => (
                    <span
                      key={r.name}
                      className={
                        !child && i === p.realmIndex
                          ? 'current'
                          : !child && i < p.realmIndex
                            ? 'passed'
                            : ''
                      }
                    >
                      <i>{!child && i <= p.realmIndex ? '✦' : <CultLock />}</i>
                      <small>{r.name}</small>
                    </span>
                  ))}
                </div>
                <div className="cult-realm-current">
                  <div>
                    <b>{realm}</b>
                    <small>
                      {child
                        ? 'Theo cốt truyện để bước vào tiên lộ.'
                        : p.exp >= expToNext(p.level)
                          ? 'Linh lực đã đầy, hãy đến Linh Đài để đột phá.'
                          : 'Tích lũy EXP, chuẩn bị đan dược cho lần đột phá kế tiếp.'}
                    </small>
                  </div>
                  <button className="cult-btn gold" onClick={() => setMenu('cultivate')}>
                    Tu luyện
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="cult-equipment-detail cult-framed">
              <CultHeading>{slotDef.name}</CultHeading>
              <div className="cult-equipped-summary">
                <EquipGlyph id={selectedId} empty={SLOT_SYMBOLS[selectedSlot]} />
                <div>
                  <h2>{selectedId ? itemName(selectedId) : 'Chưa trang bị'}</h2>
                  {selectedId && (
                    <>
                      <span className="cult-gear-rarity">
                        {ITEMS[selectedId].rarity ? rarityOf(ITEMS[selectedId].rarity!).name : ''} ·
                        +{enhancement}
                      </span>
                      <p>{bonusText(ITEMS[selectedId].bonus)}</p>
                    </>
                  )}
                </div>
              </div>
              {selectedId && (
                <>
                  <div className="cult-enhance-info">
                    <CultHeading>Cường hóa trang bị</CultHeading>
                    <span>
                      Đá Cường Hóa: {p.inventory[ENHANCEMENT_STONE] ?? 0}/{cost}
                    </span>
                    <p>
                      {enhancement >= MAX_ENHANCEMENT
                        ? 'Đã đạt tối đa +12.'
                        : `Lên +${enhancement + 1} · Tỷ lệ ${Math.round(enhanceChance(enhancement) * 100)}%. Thất bại mất đá, giữ cấp đồ.`}
                    </p>
                  </div>
                  <div className="cult-action-row">
                    <button
                      className="cult-btn"
                      onClick={() => {
                        unequip(selectedSlot);
                        setNotice('Đã cất trang bị vào túi.');
                      }}
                    >
                      Tháo trang bị
                    </button>
                    <button
                      className="cult-btn gold"
                      disabled={
                        status !== 'alive' || enhancement >= MAX_ENHANCEMENT ||
                        (p.inventory[ENHANCEMENT_STONE] ?? 0) < cost
                      }
                      onClick={() => {
                        act({ type: 'enhance', id: selectedId });
                        const current = gameStore.getState().player.equipment[selectedSlot]!;
                        const next = enhancementLevel(
                          gameStore.getState().player.adventure?.enhancements[current],
                        );
                        setNotice(
                          next > enhancement
                            ? `Cường hóa thành công lên +${next}.`
                            : `Cường hóa thất bại. Trang bị giữ +${enhancement}.`,
                        );
                      }}
                    >
                      Cường hóa +{Math.min(12, enhancement + 1)}
                    </button>
                  </div>
                </>
              )}
              <p className="cult-notice" role="status">
                {notice}
              </p>
              <CultHeading>
                Trang bị trong túi <small>{candidate.length} món</small>
              </CultHeading>
              <div className="cult-gear-candidates">
                {candidate.map((id) => {
                  const check = canEquip(id, p.level);
                  return (
                    <button
                      className="cult-gear-candidate"
                      key={id}
                      disabled={status !== 'alive' || !check.ok}
                      onClick={() => {
                        equip(id);
                        setNotice(`Đã trang bị ${itemName(id)}.`);
                      }}
                    >
                      <EquipGlyph id={id} />
                      <span>
                        <b>{itemName(id)} +{enhancementLevel(a.enhancements[id])}</b>
                        <small>{bonusText(ITEMS[id].bonus)}</small>
                      </span>
                      <em>{check.ok ? 'Trang bị' : `Lv.${ITEMS[id].reqLevel}`}</em>
                    </button>
                  );
                })}
                {!candidate.length && (
                  <p className="cult-empty">Chưa có trang bị phù hợp trong túi.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      <div className="cult-profile-bottom">
        <section className="cult-framed cult-profile-skills">
          <CultHeading>
            Kỹ năng <button onClick={() => setMenu('skills')}>Tất cả kỹ năng ›</button>
          </CultHeading>
          <div>
            {[...loadout, 'than_phap' as const].map((id) => (
              <button key={id} title="Mở bảng kỹ năng" onClick={() => setMenu('skills')}>
                <SkillGlyph id={id} />
              </button>
            ))}
          </div>
        </section>
        <section className="cult-framed cult-profile-companion">
          <CultHeading>Linh thú</CultHeading>
          <b>{companion?.name ?? 'Chưa kết khế ước'}</b>
          <small>
            {companion
              ? `Bậc ${life.companions[companion.id]?.rank ?? 1} · Đồng hành cùng chủ nhân`
              : 'Giao chiến với yêu thú để nhận dấu ấn thu phục.'}
          </small>
          <button
            className="cult-text-link"
            onClick={() => {
              patch({ journeySection: 'companions' });
              setMenu('journey');
            }}
          >
            Xem linh thú ›
          </button>
        </section>
      </div>
    </div>
  );
}
