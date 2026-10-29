import { useState } from 'react';
import { SKILLS, type SkillId } from '../../data';
import { useGame } from '../../store/gameStore';
import { itemIconUrl } from '../../game/art/icons';
import {
  checkUpgrade,
  effectiveSkill,
  skillLevel,
  skillLoadout,
  skillLockReason,
  SKILL_MAX_LEVEL,
} from '../../game/systems/skills';
import { wangEffect } from '../../data/wangSkills';
import { SkillGlyph, CultHeading, CultLock } from './CultivationUI';
import { SkillPreview } from './SkillPreview';
import { heroFor } from '../../data/heroes';
import { heroSkillIds, heroSpell } from '../../data/heroSkills';

const GROUPS = [
  ['all', '☯', 'Tất cả'],
  ['signature', '✦', 'Đặc trưng'],
  ['sword', '⚔', 'Kiếm pháp'],
  ['spell', '✧', 'Pháp thuật'],
  ['support', '❀', 'Hỗ trợ'],
  ['movement', '➶', 'Thân pháp'],
] as const;
type Group = (typeof GROUPS)[number][0];
const ORDER: SkillId[] = [
  'hoa_ma_chi',
  'dao_hoa_hoang_tuyen',
  'dinh_than_thuat',
  'tram_la_quyet',
  'dich_linh_an',
  'tich_diet_chi',
  'luyen_hon_thuat',
  'bang_tam_tram',
  'phi_kiem',
  'han_bang_tran',
  'loi_kich',
  'hoa_lien',
  'phong_nhan',
  'moc_linh',
  'kim_cang',
  'than_phap',
  'basic',
];
export function skillGroup(id: SkillId): Group {
  if (wangEffect(id) || heroSpell(id)) return 'signature';
  if (id === 'than_phap') return 'movement';
  if (['heal', 'shield'].includes(SKILLS[id].kind ?? '')) return 'support';
  return ['basic', 'bang_tam_tram', 'phi_kiem', 'phong_nhan'].includes(id) ? 'sword' : 'spell';
}
export function Skills() {
  const player = useGame((s) => s.player),
    choose = useGame((s) => s.chooseSkill),
    upgrade = useGame((s) => s.upgradeSkill);
  const [selected, setSelected] = useState<SkillId>(
    player.heroId ? heroSkillIds(player.heroId)[0] : player.sex === 'male' ? 'hoa_ma_chi' : 'bang_tam_tram',
  );
  const [group, setGroup] = useState<Group>('all'),
    [filter, setFilter] = useState<'all' | 'equipped' | 'locked'>('all');
  const [slot, setSlot] = useState(1),
    [notice, setNotice] = useState('');
  const loadout = skillLoadout(player),
    id = selected,
    lv = skillLevel(player.skills, id),
    cur = effectiveSkill(id, lv);
  const lock = skillLockReason(player, id),
    fixed = id === 'basic' || id === 'than_phap',
    equipped = loadout.indexOf(id);
  const check = checkUpgrade(lv, player.level, {
    linhKhi: player.linhKhi,
    linhThach: player.inventory.linh_thach ?? 0,
    kiemPho: player.inventory.kiem_pho ?? 0,
  });
  const hero = heroFor(player);
  const list = [...heroSkillIds(hero.id), ...ORDER].filter(
    (id) =>
      (!SKILLS[id].character || SKILLS[id].character === (player.sex ?? 'female')) &&
      (!SKILLS[id].character || !player.heroId || hero.id === 'wang_lam') &&
      (group === 'all' || skillGroup(id) === group || (group === 'support' && ['heal', 'shield'].includes(SKILLS[id].kind ?? ''))) &&
      (filter === 'all' ||
        (filter === 'equipped' ? loadout.includes(id) : !!skillLockReason(player, id))),
  );
  const select = (id: SkillId) => {
    setSelected(id);
    setNotice('');
  };
  const cost = check.cost;
  return (
    <div className="cult-skills">
      <nav className="cult-side" aria-label="Loại kỹ năng">
        {GROUPS.map(
          ([g, icon, name]) => (
            <button
              key={g}
              className={group === g ? 'active' : ''}
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
            >
              <i aria-hidden="true">{icon}</i>
              <span>{name}</span>
            </button>
          ),
        )}
        <div className="cult-side-caption">
          Một niệm thành tiên
          <br />
          Vạn pháp quy tâm
        </div>
      </nav>
      <section className="cult-skill-library" aria-label="Danh sách kỹ năng">
        <nav className="cult-library-tabs" aria-label="Lọc kỹ năng">
          {[
            ['all', 'Tất cả chiêu'],
            ['equipped', 'Đang dùng'],
            ['locked', 'Chưa mở'],
          ].map(([v, name]) => (
            <button
              key={v}
              aria-pressed={filter === v}
              className={filter === v ? 'active' : ''}
              onClick={() => setFilter(v as typeof filter)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="cult-skill-grid">
          {list.map((sid) => (
            <button
              type="button"
              key={sid}
              data-skill={sid}
              className={`cult-skill-card ${id === sid ? 'selected' : ''} ${skillLockReason(player, sid) ? 'locked' : ''}`}
              aria-pressed={id === sid}
              onClick={() => select(sid)}
            >
              <SkillGlyph id={sid} />
              <small>Lv.{skillLevel(player.skills, sid)}</small>
              <b>{SKILLS[sid].name}</b>
              {skillLockReason(player, sid) ? (
                <span className="cult-card-lock" aria-label="Chưa mở">
                  <CultLock />
                </span>
              ) : (
                loadout.includes(sid) && (
                  <span className="cult-card-slot">{loadout.indexOf(sid) + 1}</span>
                )
              )}
            </button>
          ))}
          {!list.length && <p className="cult-empty">Chưa có chiêu trong nhóm này.</p>}
        </div>
        <div className="cult-loadout-wrap">
          <CultHeading>
            Bộ chiêu chiến đấu <small>Chọn ô để thay</small>
          </CultHeading>
          <div
            className="skill-loadout cult-loadout"
            role="group"
            aria-label="Chọn ô để thay chiêu"
          >
            {loadout.map((sid, i) => (
              <button
                key={i}
                disabled={i === 0}
                aria-pressed={slot === i}
                className={slot === i ? 'active' : ''}
                onClick={() => {
                  setSlot(i);
                  setNotice('');
                }}
              >
                <SkillGlyph id={sid} />
                <span>
                  <b>Ô {i + 1}</b>
                  <small>{i === 0 ? 'Đánh thường' : SKILLS[sid].name}</small>
                </span>
              </button>
            ))}
            <div className="cult-fixed-dash">
              <SkillGlyph id="than_phap" />
              <span>
                Lướt<small>Shift</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="cult-skill-detail" aria-label="Chi tiết kỹ năng" data-skill={id}>
        <div className="cult-detail-scroll">
          <header className="cult-skill-title">
            <SkillGlyph id={id} />
            <div>
              <small>
                {heroSpell(id)
                  ? `${hero.school.toLocaleUpperCase('vi-VN')} · ${hero.name}`
                  : wangEffect(id)
                  ? 'TUYỆT KỸ VƯƠNG LÂM'
                  : skillGroup(id) === 'support'
                    ? 'PHÁP THUẬT HỖ TRỢ'
                    : 'PHÁP MÔN TU LUYỆN'}
              </small>
              <h2>{cur.name}</h2>
              <span>
                Lv.{lv} / {SKILL_MAX_LEVEL}
              </span>
            </div>
          </header>
          <div className="cult-skill-tags">
            <span>{cur.kind === 'heal' || cur.kind === 'shield' ? 'Hỗ trợ' : 'Chủ động'}</span>
            <span>
              {cur.kind === 'nova'
                ? 'Diện rộng'
                : cur.kind === 'projectile'
                  ? 'Tầm xa'
                  : cur.kind === 'dash'
                    ? 'Di chuyển'
                    : 'Cận chiến'}
            </span>
            {equipped >= 0 && <span className="on">Đang ở ô {equipped + 1}</span>}
          </div>
          <SkillPreview key={id} id={id} />
          <CultHeading>Mô tả kỹ năng</CultHeading>
          <p className="cult-skill-description">{cur.desc}</p>
          <CultHeading>Thông số hiện tại</CultHeading>
          <dl className="cult-skill-stats">
            <div>
              <dt>Uy lực</dt>
              <dd>
                {cur.multiplier
                  ? `${Math.round(cur.multiplier * 100)}% công kích`
                  : 'Hiệu ứng hỗ trợ'}
              </dd>
            </div>
            <div>
              <dt>Tầm chiêu</dt>
              <dd>
                {cur.range
                  ? `${cur.range} · ${cur.kind === 'nova' ? 'quanh người' : 'theo hướng đánh'}`
                  : 'Bản thân'}
              </dd>
            </div>
            <div>
              <dt>Hồi chiêu</dt>
              <dd>{(cur.cooldownMs / 1000).toFixed(1)} giây</dd>
            </div>
            <div>
              <dt>Tiêu hao linh lực</dt>
              <dd>{cur.mpCost} MP</dd>
            </div>
          </dl>
          <p className={`cult-mastery ${cur.active ? 'on' : ''}`}>
            ✦ {cur.active ? 'Đã lĩnh ngộ' : `Lĩnh ngộ ở cấp 5`}: {cur.bonus.desc}
          </p>
          {lock && <p className="cult-notice warn">{lock}</p>}
        </div>
        <footer className="cult-skill-actions">
          <p className="skill-assignment cult-notice" role="status">
            {notice ||
              (fixed
                ? id === 'basic'
                  ? 'Đánh thường cố định ở ô 1.'
                  : 'Lướt có nút riêng, không chiếm ô.'
                : `Chọn ô 2–7 bên trái để đặt ${cur.name}.`)}
          </p>
          <div className="cult-upgrade-cost">
            {cost ? (
              <>
                <span className={player.level < cost.reqLevel ? 'short' : ''}>
                  Lv.{cost.reqLevel}
                </span>
                {[
                  ['linh_khi', cost.linhKhi, player.linhKhi],
                  ['linh_thach', cost.linhThach, player.inventory.linh_thach ?? 0],
                  ['kiem_pho', cost.kiemPho, player.inventory.kiem_pho ?? 0],
                ]
                  .filter(([, qty]) => Number(qty) > 0)
                  .map(([item, qty, have]) => (
                    <span key={item} className={Number(have) < Number(qty) ? 'short' : ''}>
                      <img src={itemIconUrl(String(item), 24)} alt="" />
                      {have}/{qty}
                    </span>
                  ))}
              </>
            ) : (
              <span>Đã đạt cấp tối đa</span>
            )}
          </div>
          <div className="cult-action-row">
            <button
              className="cult-btn"
              data-action="assign"
              disabled={fixed || !!lock || loadout[slot] === id}
              onClick={() => {
                choose(slot, id);
                setNotice(`Đã đặt ${cur.name} vào ô ${slot + 1}.`);
              }}
            >
              {fixed
                ? 'Ô cố định'
                : loadout[slot] === id
                  ? `Đang ở ô ${slot + 1}`
                  : `Dùng ở ô ${slot + 1}`}
            </button>
            <button
              className="cult-btn gold"
              disabled={!check.ok || !!lock}
              title={check.ok ? '' : check.reason}
              onClick={() => {
                upgrade(id);
                setNotice(`Đã nâng ${cur.name} lên cấp ${lv + 1}.`);
              }}
            >
              Tăng cấp {lv < 10 ? `· ${lv + 1}` : ''}
            </button>
          </div>
          {!check.ok && cost && <small className="cult-upgrade-hint">{check.reason}</small>}
        </footer>
      </section>
    </div>
  );
}
