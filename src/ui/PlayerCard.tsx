import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  challengeDuel,
  inviteToParty,
  removeFriend,
  requestFriend,
  requestInspection,
} from '../net/socialBridge';
import { presenceFor, useSocial } from '../store/socialStore';
import { useGame } from '../store/gameStore';
import { useInspection } from '../store/inspectionStore';
import { useAccount } from '../net/session';
import { chatStore } from '../store/chatStore';
import { EQUIP_SLOTS, ITEMS, SKILLS, ZONE_NAMES, bonusText, type EquipSlot } from '../data';
import { heroFor } from '../data/heroes';
import { SECT_RANKS, battlePower } from '../game/systems/adventure';
import { COMPANIONS } from '../game/systems/life';
import { MOUNTS } from '../game/systems/immortal';
import { effectiveSkill } from '../game/systems/skills';
import { isChildhood } from '../game/systems/origin';
import type { PlayerInspection } from '../net/inspection';
import { ChildHeroPortrait, HeroDirectionalPose, HeroFigure, RosterPortrait } from './HeroArt';
import {
  CultivationCorners,
  CultHeading,
  CultMeter,
  EquipGlyph,
  SkillGlyph,
} from './menus/CultivationUI';
import './social/player-inspection.css';
import { RealmBadge } from './RealmBadge';

const TABS = [
  ['overview', '☯', 'Tổng quan'],
  ['equipment', '♜', 'Trang bị'],
  ['skills', '⚔', 'Kỹ năng'],
  ['mounts', '♘', 'Ngự hành'],
  ['companions', '✦', 'Linh thú'],
  ['achievements', '♔', 'Thành tựu'],
  ['relations', '♟', 'Quan hệ'],
] as const;
type Tab = (typeof TABS)[number][0];
const fmt = (n: number) => Math.round(n).toLocaleString('vi-VN');
const sectName = (id?: string) => (id ? (ZONE_NAMES[id] ?? 'Chưa rõ tông môn') : 'Chưa nhập môn');
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="inspect-empty">
      <span>◇</span>
      <p>{children}</p>
    </div>
  );
}
function StatList({ data }: { data: PlayerInspection }) {
  return (
    <dl className="inspect-stats">
      {[
        ['Công kích', fmt(data.stats.atk)],
        ['Phòng ngự', fmt(data.stats.def)],
        ['Bạo kích', `${Math.round(data.stats.critRate * 100)}%`],
        ['Sát thương bạo kích', `×${data.stats.critMul.toFixed(2)}`],
        ['Tốc độ di chuyển', fmt(data.stats.speed)],
        ['Chế độ PK', { peace: 'Hòa bình', sect: 'Tông môn', all: 'Toàn bộ' }[data.pkMode]],
      ].map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
function Comparison({ data }: { data: PlayerInspection }) {
  const own = useGame((s) => s.stats),
    rows = [
      ['Lực chiến', battlePower(own), data.power],
      ['Công kích', own.atk, data.stats.atk],
      ['Phòng ngự', own.def, data.stats.def],
      ['Sinh lực', own.maxHp, data.stats.maxHp],
    ] as const;
  return (
    <section className="inspect-comparison">
      <CultHeading>Đối chiếu thuộc tính</CultHeading>
      <div className="inspect-comparison-key">
        <span>Bạn</span>
        <span>Đối phương</span>
      </div>
      {rows.map(([name, a, b]) => (
        <div className="inspect-compare-row" key={name}>
          <span>{name}</span>
          <div>
            <i style={{ width: `${(a / Math.max(1, a, b)) * 100}%` }} />
            <b>{fmt(a)}</b>
          </div>
          <div>
            <i style={{ width: `${(b / Math.max(1, a, b)) * 100}%` }} />
            <b>{fmt(b)}</b>
          </div>
        </div>
      ))}
    </section>
  );
}
function ProgressCards({ data }: { data: PlayerInspection }) {
  return (
    <div className="inspect-badges">
      {[
        ['✧', 'Bí cảnh', data.progress.clears, 'lượt vượt'],
        ['⌖', 'Du ngoạn', data.progress.explored, 'khu vực'],
        ['❧', 'Linh thảo', data.progress.gathered, 'lần thu hái'],
        ['♜', 'Đan đạo', data.progress.crafted, 'lần chế tạo'],
      ].map(([icon, name, n, unit]) => (
        <article key={name}>
          <i>{icon}</i>
          <small>{name}</small>
          <b>{fmt(Number(n))}</b>
          <span>{unit}</span>
        </article>
      ))}
    </div>
  );
}
function PetArt({ id }: { id: string }) {
  const index = COMPANIONS.findIndex((c) => c.id === id);
  return index >= 0 ? (
    <div
      className="inspect-pet-art"
      style={{
        backgroundImage: "url('/assets/ui/cultivation/inspect-companions-v1.png')",
        backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 100}%`,
      }}
      aria-hidden="true"
    />
  ) : null;
}
function InspectionCard({ id }: { id: string }) {
  const close = useSocial((s) => s.closeCard),
    roster = useSocial((s) => s.roster),
    friends = useSocial((s) => s.friends),
    party = useSocial((s) => s.partyId),
    connected = useSocial((s) => s.connected);
  const { user } = useAccount(),
    local = useGame((s) => s.player),
    state = useInspection((s) => s);
  const [tab, setTab] = useState<Tab>('overview'),
    [slot, setSlot] = useState<EquipSlot>('weapon'),
    [skill, setSkill] = useState<string | null>(null),
    [compare, setCompare] = useState(false),
    [refresh, setRefresh] = useState(0),
    [notice, setNotice] = useState('');
  const modal = useRef<HTMLElement>(null);
  const profile = presenceFor(roster, id),
    online = !!profile || user?.id === id,
    isSelf = user?.id === id,
    isFriend = friends.some((f) => f.userId === id),
    sameParty = !!party && profile?.party === party;
  const data = state.target === id ? state.data : null,
    hero = heroFor(data ?? profile ?? {}),
    name =
      profile?.name ??
      friends.find((f) => f.userId === id)?.name ??
      (isSelf ? local.name : 'Đạo hữu');
  useEffect(() => requestInspection(id), [id, refresh, online, connected]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    modal.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
      if (e.key === 'Tab' && modal.current) {
        const els = [
            ...modal.current.querySelectorAll<HTMLElement>(
              'button:not(:disabled),[href],input:not(:disabled)',
            ),
          ],
          first = els[0],
          last = els[els.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === modal.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('keydown', key, true);
      before?.focus();
    };
  }, [close]);
  const selected = data?.equipment.find((e) => e.slot === slot),
    item = selected ? ITEMS[selected.id] : null;
  const selectedSkill =
    data?.skills.find((s) => s.id === skill) ??
    data?.skills.find((s) => s.equipped) ??
    data?.skills[0];
  const sk = selectedSkill ? effectiveSkill(selectedSkill.id, selectedSkill.level) : null;
  const act = (fn: () => void) => {
    fn();
    close();
  };
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setNotice('Đã sao chép ID đạo hữu.');
    } catch {
      setNotice(`ID: ${id}`);
    }
  };
  return (
    <div
      className="inspect-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className="player-inspection"
        role="dialog"
        aria-modal="true"
        aria-label={`Thông tin ${name}`}
        tabIndex={-1}
        ref={modal}
        style={{ '--inspect-accent': hero.color } as CSSProperties}
      >
        <CultivationCorners />
        <header className="inspect-header">
          <span className="inspect-title-seal" aria-hidden="true">
            ☯
          </span>
          <div>
            <small>ĐẠO HỮU TƯƠNG PHÙNG</small>
            <h2>Thông Tin Người Chơi</h2>
          </div>
          <span className={`inspect-online ${online ? '' : 'offline'}`}>
            {online ? '● Trực tuyến' : '○ Ngoại tuyến'}
          </span>
          <button className="inspect-close" onClick={close} aria-label="Đóng thông tin người chơi">
            ×
          </button>
        </header>
        <div className="inspect-layout">
          <nav className="inspect-nav" aria-label="Mục thông tin đối phương">
            {TABS.map(([key, icon, label]) => (
              <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>
                <i aria-hidden="true">{icon}</i>
                <span>{label}</span>
              </button>
            ))}
            <p>
              Gặp gỡ giữa
              <br />
              vạn dặm tiên đồ
            </p>
          </nav>
          <aside
            className={`inspect-hero ${tab === 'equipment' ? 'with-gear' : ''}`}
            aria-label="Ngoại hình đối phương"
          >
            <div className="inspect-hero-top">
              <span>{data?.child ? 'VƯƠNG GIA THÔN' : hero.school.toLocaleUpperCase('vi-VN')}</span>
              <h3>
                {name} <small>{(data?.sex ?? profile?.sex) === 'female' ? '♀' : '♂'}</small>
              </h3>
              <RealmBadge
                level={data?.level ?? profile?.level}
                realm={data?.realm ?? profile?.realm}
                child={data?.child}
                compact
              />
            </div>
            {data?.child ? (
              <HeroDirectionalPose id={hero.id} child className="inspect-figure child" />
            ) : (
              <HeroFigure id={hero.id} className="inspect-figure" />
            )}
            {tab === 'equipment' && (
              <div className="inspect-gear-orbit">
                {EQUIP_SLOTS.map((s, i) => {
                  const worn = data?.equipment.find((e) => e.slot === s.id),
                    def = worn ? ITEMS[worn.id] : null;
                  return (
                    <button
                      key={s.id}
                      aria-label={`${s.name}: ${def?.name ?? 'Chưa trang bị'}`}
                      aria-pressed={slot === s.id}
                      onClick={() => setSlot(s.id)}
                      style={
                        {
                          '--gear-side': i < 3 ? 0 : 1,
                          '--gear-row': i % 3,
                          '--item-color': def?.color ?? '#927b55',
                        } as CSSProperties
                      }
                    >
                      <EquipGlyph id={worn?.id} empty="◇" color={def?.color} />
                      {worn && <b>+{worn.enhancement}</b>}
                      <small>{s.name}</small>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="inspect-power">
              <span>⚔ Lực chiến</span>
              <b>{data ? fmt(data.power) : '—'}</b>
            </div>
            <p className="inspect-motto">{hero.motto}</p>
          </aside>
          <main className="inspect-content">
            <div className="inspect-identity">
              {data?.child ? <ChildHeroPortrait id={hero.id} /> : <RosterPortrait id={hero.id} />}
              <div>
                <h3>{name}</h3>
                <p>
                  Lv.{data?.level ?? profile?.level ?? '—'}{' '}
                  <RealmBadge
                    level={data?.level ?? profile?.level}
                    realm={data?.realm ?? profile?.realm}
                    child={data?.child}
                    compact
                  />
                </p>
              </div>
              <button
                className="inspect-refresh"
                disabled={state.status === 'loading' || !online}
                aria-label="Làm mới thông tin"
                onClick={() => setRefresh((n) => n + 1)}
              >
                ↻
              </button>
            </div>
            <div className="inspect-fetch" role="status">
              {state.status === 'loading'
                ? 'Đang xem thông tin đạo hữu…'
                : state.status === 'unavailable'
                  ? 'Chưa nhận được thông tin chi tiết. Đạo hữu có thể đã rời mạng hoặc đang dùng phiên bản cũ.'
                  : !online
                    ? 'Đạo hữu đã ngoại tuyến. Thông tin bên dưới là lần xem gần nhất.'
                    : 'Thông tin được cập nhật khi mở bảng.'}
            </div>
            {tab === 'overview' && (
              <>
                <section className="inspect-info">
                  <CultHeading>Thân thế đạo hữu</CultHeading>
                  <dl>
                    <div>
                      <dt>Tông môn</dt>
                      <dd>{sectName(data?.sect ?? profile?.sect)}</dd>
                    </div>
                    <div>
                      <dt>Cấp bậc</dt>
                      <dd>{data && !data.child ? SECT_RANKS[data.rank]?.name : '—'}</dd>
                    </div>
                    <div>
                      <dt>Khu vực</dt>
                      <dd>{ZONE_NAMES[data?.mapId ?? profile?.mapId ?? ''] ?? 'Chưa rõ'}</dd>
                    </div>
                    <div>
                      <dt>Tổ đội</dt>
                      <dd>
                        {sameParty
                          ? 'Cùng tổ đội'
                          : profile?.party
                            ? 'Đã có tổ đội'
                            : 'Chưa có tổ đội'}
                      </dd>
                    </div>
                    <div>
                      <dt>ID đạo hữu</dt>
                      <dd className="inspect-id">
                        <span title={id}>{id}</span>
                        <button onClick={() => void copyId()} aria-label="Sao chép ID đạo hữu">
                          ▣
                        </button>
                      </dd>
                    </div>
                  </dl>
                </section>
                {data && (
                  <>
                    <div className="inspect-bars">
                      <CultMeter
                        label="Sinh lực"
                        value={data.hp}
                        max={data.stats.maxHp}
                        color="red"
                      />
                      <CultMeter label="Linh lực" value={data.mp} max={data.stats.maxMp} />
                    </div>
                    <StatList data={data} />
                    <ProgressCards data={data} />
                    <button
                      className="inspect-compare-toggle"
                      aria-expanded={compare}
                      onClick={() => setCompare((v) => !v)}
                    >
                      {compare ? 'Ẩn' : 'Xem'} so sánh thuộc tính <span>⇄</span>
                    </button>
                    {compare && <Comparison data={data} />}
                  </>
                )}
              </>
            )}
            {tab === 'equipment' &&
              (data ? (
                <>
                  <CultHeading>Trang bị đang sử dụng</CultHeading>
                  <div className="inspect-gear-list">
                    {EQUIP_SLOTS.map((s) => {
                      const worn = data.equipment.find((e) => e.slot === s.id),
                        def = worn ? ITEMS[worn.id] : null;
                      return (
                        <button
                          key={s.id}
                          aria-pressed={slot === s.id}
                          onClick={() => setSlot(s.id)}
                        >
                          <EquipGlyph id={worn?.id} color={def?.color} />
                          <div>
                            <small>{s.name}</small>
                            <b style={{ color: def?.color }}>{def?.name ?? 'Chưa trang bị'}</b>
                          </div>
                          {worn && <strong>+{worn.enhancement}</strong>}
                        </button>
                      );
                    })}
                  </div>
                  <section className="inspect-item-detail">
                    <CultHeading>{EQUIP_SLOTS.find((s) => s.id === slot)?.name}</CultHeading>
                    {selected && item ? (
                      <>
                        <div>
                          <EquipGlyph id={selected.id} color={item.color} />
                          <h3 style={{ color: item.color }}>
                            {item.name}
                            <b>+{selected.enhancement}</b>
                          </h3>
                        </div>
                        <p>{item.desc}</p>
                        <dl>
                          <div>
                            <dt>Thuộc tính cơ bản</dt>
                            <dd>{bonusText(item.bonus)}</dd>
                          </div>
                          <div>
                            <dt>Cường hóa</dt>
                            <dd>+{selected.enhancement} / 12</dd>
                          </div>
                          <div>
                            <dt>Yêu cầu trang bị</dt>
                            <dd>Lv.{item.reqLevel ?? 1}</dd>
                          </div>
                        </dl>
                      </>
                    ) : (
                      <Empty>Chưa có trang bị ở vị trí này.</Empty>
                    )}
                  </section>
                </>
              ) : (
                <Empty>Trang bị sẽ hiện khi nhận được thông tin từ đối phương.</Empty>
              ))}
            {tab === 'skills' &&
              (data?.skills.length ? (
                <>
                  <CultHeading>Kỹ năng đạo hữu · {data.skills.length}</CultHeading>
                  <p className="inspect-hint">Viền vàng là chiêu đang sử dụng.</p>
                  <div className="inspect-skill-grid">
                    {data.skills.map((s) => (
                      <button
                        key={s.id}
                        className={s.equipped ? 'equipped' : ''}
                        aria-pressed={selectedSkill?.id === s.id}
                        onClick={() => setSkill(s.id)}
                      >
                        <SkillGlyph id={s.id} />
                        <b>{SKILLS[s.id].name}</b>
                        <small>
                          Lv.{s.level}
                          {s.equipped ? ' · Đang dùng' : ''}
                        </small>
                      </button>
                    ))}
                  </div>
                  {selectedSkill && sk && (
                    <section className="inspect-skill-detail">
                      <CultHeading>
                        {sk.name} · Lv.{selectedSkill.level}
                      </CultHeading>
                      <p>{sk.desc}</p>
                      <dl>
                        <div>
                          <dt>Hồi chiêu</dt>
                          <dd>{(sk.cooldownMs / 1000).toFixed(1)} giây</dd>
                        </div>
                        <div>
                          <dt>Linh lực tiêu hao</dt>
                          <dd>{sk.mpCost}</dd>
                        </div>
                        <div>
                          <dt>Uy lực</dt>
                          <dd>{Math.round(sk.multiplier * 100)}% công kích</dd>
                        </div>
                      </dl>
                    </section>
                  )}
                </>
              ) : (
                <Empty>
                  {data?.child
                    ? 'Đạo hữu còn là phàm nhân, chưa học tiên thuật.'
                    : 'Chưa có thông tin kỹ năng.'}
                </Empty>
              ))}
            {tab === 'mounts' &&
              (data?.mounts.length ? (
                <>
                  <CultHeading>Ngự hành đã lĩnh ngộ</CultHeading>
                  <div className="inspect-mounts">
                    {data.mounts.map((m) => (
                      <article key={m.id}>
                        <div className={`inspect-mount-art ${m.id}`}>
                          <img src="/assets/journey/mounts.png" alt="" />
                        </div>
                        <h3>{MOUNTS.find((v) => v.id === m.id)?.name}</h3>
                        <span className="inspect-tag">
                          {m.active ? 'Đang sử dụng' : 'Đã lĩnh ngộ'}
                        </span>
                        <p>
                          {m.id === 'sword' && !m.showMount
                            ? 'Đạp không · không hiện phi kiếm'
                            : MOUNTS.find((v) => v.id === m.id)?.desc}
                        </p>
                        <b>Tốc độ +{Math.round((m.speed - 1) * 100)}%</b>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <Empty>
                  {data ? 'Đạo hữu chưa mở khả năng ngự hành.' : 'Chưa có thông tin ngự hành.'}
                </Empty>
              ))}
            {tab === 'companions' &&
              (data?.companions.length ? (
                <>
                  <CultHeading>Linh thú đã kết khế ước</CultHeading>
                  <div className="inspect-companions">
                    {data.companions.map((p) => {
                      const c = COMPANIONS.find((c) => c.id === p.id)!,
                        mul = p.rank * (1 + p.evolution * 0.5);
                      return (
                        <article key={p.id}>
                          <PetArt id={p.id} />
                          <div>
                            <h3>{c.name}</h3>
                            <span className="inspect-stars">
                              {'★'.repeat(p.rank)}
                              {'☆'.repeat(5 - p.rank)}
                            </span>
                            <span className="inspect-tag">
                              {p.active ? 'Đang đồng hành' : 'Nghỉ ngơi'}
                            </span>
                            <p>{c.desc}</p>
                            <dl>
                              <div>
                                <dt>Công / Phòng / Sinh lực</dt>
                                <dd>
                                  {fmt(c.atk * mul)} / {fmt(c.def * mul)} / {fmt(c.hp * mul)}
                                </dd>
                              </div>
                              <div>
                                <dt>Tiến hóa</dt>
                                <dd>{p.evolution} / 2</dd>
                              </div>
                            </dl>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Empty>
                  {data ? 'Đạo hữu chưa thu phục linh thú.' : 'Chưa có thông tin linh thú.'}
                </Empty>
              ))}
            {tab === 'achievements' &&
              (data ? (
                <>
                  <CultHeading>Dấu chân trên tiên lộ</CultHeading>
                  <ProgressCards data={data} />
                  <section className="inspect-achievements">
                    {[
                      ['♔', 'Vượt bí cảnh', data.progress.clears, 'lượt hoàn thành'],
                      ['⌖', 'Khám phá sơn hà', data.progress.explored, 'khu vực đã đến'],
                      [
                        '✦',
                        'Phụng sự tông môn',
                        data.progress.missions,
                        'nhiệm vụ hôm nay',
                      ],
                      ['❧', 'Tìm kiếm linh thảo', data.progress.gathered, 'lần thu hái'],
                      ['♜', 'Luyện chế đan dược', data.progress.crafted, 'lần chế tạo'],
                    ].map(([icon, label, n, unit]) => (
                      <article key={label}>
                        <i>{icon}</i>
                        <div>
                          <h3>{label}</h3>
                          <small>{unit}</small>
                        </div>
                        <b>{fmt(Number(n))}</b>
                      </article>
                    ))}
                  </section>
                  <p className="inspect-hint">Chỉ hiển thị tiến trình đã ghi nhận trong game.</p>
                </>
              ) : (
                <Empty>Chưa có thông tin thành tựu.</Empty>
              ))}
            {tab === 'relations' && (
              <>
                <CultHeading>Quan hệ đạo hữu</CultHeading>
                <div className="inspect-relations">
                  <article>
                    <i>♥</i>
                    <b>{data?.friendCount ?? '—'}</b>
                    <small>Hảo hữu</small>
                  </article>
                  <article>
                    <i>♟</i>
                    <b>{sameParty ? 'Đồng đội' : profile?.party ? 'Có tổ đội' : 'Độc hành'}</b>
                    <small>Tổ đội hiện tại</small>
                  </article>
                  <article>
                    <i>☯</i>
                    <b>{sectName(data?.sect ?? profile?.sect)}</b>
                    <small>Tông môn</small>
                  </article>
                </div>
                <section className="inspect-info">
                  <CultHeading>Quan hệ với bạn</CultHeading>
                  <p>
                    {isSelf
                      ? 'Đây là nhân vật của bạn.'
                      : isFriend
                        ? 'Hai người đã kết hảo hữu.'
                        : 'Hai người chưa kết hảo hữu.'}
                  </p>
                  <p>
                    {sameParty
                      ? 'Bạn và đạo hữu đang cùng một tổ đội.'
                      : 'Có thể mời đạo hữu đồng hành bằng nút bên dưới.'}
                  </p>
                </section>
              </>
            )}
            {notice && (
              <p className="inspect-notice" role="status">
                {notice}
              </p>
            )}
          </main>
        </div>
        <footer className="inspect-actions">
          {!isSelf ? (
            <>
              <button
                disabled={!online || !connected}
                onClick={() => act(() => chatStore.getState().privateTo(id, name))}
              >
                ✉ <span>Chat mật</span>
              </button>
              <button
                disabled={!online || !connected || sameParty}
                onClick={() => act(() => inviteToParty(id))}
              >
                ♟ <span>{sameParty ? 'Cùng tổ đội' : 'Mời tổ đội'}</span>
              </button>
              <button
                disabled={!isFriend && (!connected || !online)}
                onClick={() => act(() => (isFriend ? removeFriend(id) : requestFriend(id)))}
              >
                ♧ <span>{isFriend ? 'Hủy hảo hữu' : 'Kết hảo hữu'}</span>
              </button>
              <button
                className="duel"
                disabled={!online || !connected || !!data?.child || isChildhood(local)}
                onClick={() => act(() => challengeDuel(id))}
              >
                ⚔ <span>Thách đấu</span>
              </button>
            </>
          ) : (
            <span>Đây là nhân vật của bạn.</span>
          )}
          <small>Xem thông tin công khai</small>
        </footer>
      </section>
    </div>
  );
}
export function PlayerCard() {
  const id = useSocial((s) => s.card);
  return id ? <InspectionCard key={id} id={id} /> : null;
}
