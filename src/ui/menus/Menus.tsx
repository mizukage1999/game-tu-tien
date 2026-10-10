import { useState } from 'react';
import {
  bonusText,
  DUNGEONS,
  EQUIP_SLOTS,
  equipmentId,
  ITEMS,
  MONSTERS,
  NPCS,
  QUESTS,
  RARITIES,
  REALMS,
  rarityOf,
  SKILLS,
  type RarityId,
  type SkillId,
} from '../../data';
import { EventBus } from '../../game/EventBus';
import { itemIconUrl, skillIconUrl } from '../../game/art/icons';
import { attemptsLeft, canEnter } from '../../game/systems/dungeon';
import { canEquip, expToNext, isBottleneck, realmFor } from '../../game/systems/progression';
import { objectiveText } from '../../game/systems/quest';
import { clearSave, disableSaving } from '../../game/systems/save';
import { checkUpgrade, effectiveSkill, skillLevel, SKILL_BONUS_LEVEL, SKILL_MAX_LEVEL } from '../../game/systems/skills';
import { itemName, npcName, questNames, useGame, type MenuTab } from '../../store/gameStore';
import { RewardList } from '../Rewards';

const TITLES: Record<MenuTab, string> = {
  character: 'Nhân Vật',
  bag: 'Túi Đồ',
  cultivate: 'Tu Luyện',
  skills: 'Kỹ Năng',
  dungeon: 'Phó Bản',
  quests: 'Nhiệm Vụ',
  shop: 'Cửa Hàng',
  settings: 'Cài Đặt',
};

function rarityColor(id: string) {
  const def = ITEMS[id];
  return def?.rarity ? rarityOf(def.rarity).color : undefined;
}

function ItemIcon({ id, size }: { id: string; size: number }) {
  const color = rarityColor(id);
  return (
    <img
      className="item-icon"
      src={itemIconUrl(id, size)}
      alt=""
      style={color ? { borderColor: color, boxShadow: `0 0 6px ${color}` } : undefined}
    />
  );
}

function ItemLabel({ id }: { id: string }) {
  return <b style={{ color: rarityColor(id) }}>{itemName(id)}</b>;
}

function Wardrobe() {
  const player = useGame((s) => s.player);
  const equip = useGame((s) => s.equip);
  return (
    <div className="wardrobe">
      <h4>Trang bị có thể mặc</h4>
      <p className="muted">
        Cấp hiện tại: <b>{player.level}</b>. Phẩm chất sáng màu là đã đủ điều kiện mặc.
      </p>
      {RARITIES.map((r) => {
        const unlocked = player.level >= r.reqLevel;
        return (
          <div key={r.id} className={`wardrobe-tier ${unlocked ? 'unlocked' : 'locked'}`} style={{ borderColor: r.color }}>
            <div className="wardrobe-head">
              <span className="rarity-name" style={{ color: r.color }}>
                {r.name} · {r.label}
              </span>
              <span className="muted">Yêu cầu cấp {r.reqLevel}</span>
              <span className={`wardrobe-badge ${unlocked ? 'ok' : 'no'}`}>
                {unlocked ? 'Có thể mặc' : `Còn thiếu ${r.reqLevel - player.level} cấp`}
              </span>
            </div>
            <div className="wardrobe-items">
              {EQUIP_SLOTS.map((slot) => {
                const id = equipmentId(slot.id, r.id);
                const owned = player.inventory[id] ?? 0;
                const worn = player.equipment[slot.id] === id;
                return (
                  <div key={id} className="wardrobe-item" title={`${itemName(id)} — ${bonusText(ITEMS[id].bonus)}`}>
                    <ItemIcon id={id} size={36} />
                    <small>{slot.name}</small>
                    {worn ? (
                      <em className="tag worn">Đang mặc</em>
                    ) : owned > 0 ? (
                      unlocked ? (
                        <button className="btn small" onClick={() => equip(id)}>
                          Mặc
                        </button>
                      ) : (
                        <em className="tag">Có x{owned}</em>
                      )
                    ) : (
                      <em className="tag muted">Chưa có</em>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Character() {
  const player = useGame((s) => s.player);
  const stats = useGame((s) => s.stats);
  const unequip = useGame((s) => s.unequip);
  const rows: [string, string | number][] = [
    ['Cảnh giới', realmFor(player.realmIndex).name],
    ['Cấp độ', player.level],
    ['Sinh lực (HP)', stats.maxHp],
    ['Linh lực (MP)', stats.maxMp],
    ['Công kích', stats.atk],
    ['Phòng ngự', stats.def],
    ['Bạo kích', `${Math.round(stats.critRate * 100)}% (x${stats.critMul})`],
    ['Tốc độ', stats.speed],
  ];
  return (
    <>
      <div className="menu-grid two">
        <table className="stat-table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <h4>Đang trang bị</h4>
          <div className="equip-list">
            {EQUIP_SLOTS.map((slot) => {
              const id = player.equipment[slot.id];
              return (
                <div key={slot.id} className="equip-slot">
                  <span className="equip-slot-name">{slot.name}</span>
                  {id ? (
                    <>
                      <ItemIcon id={id} size={32} />
                      <div className="equip-info">
                        <ItemLabel id={id} />
                        <small className="muted">{bonusText(ITEMS[id]?.bonus)}</small>
                      </div>
                      <button className="btn small" onClick={() => unequip(slot.id)}>
                        Tháo
                      </button>
                    </>
                  ) : (
                    <i className="muted">Trống</i>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Wardrobe />
    </>
  );
}

function Bag() {
  const inv = useGame((s) => s.player.inventory);
  const linhKhi = useGame((s) => s.player.linhKhi);
  const level = useGame((s) => s.player.level);
  const consumeItem = useGame((s) => s.consumeItem);
  const entries = Object.entries(inv).filter(([, q]) => q > 0);
  return (
    <>
      <div className="bag-currency">
        <img src={itemIconUrl('linh_khi', 32)} alt="" /> Linh Khí: <b>{linhKhi}</b>
      </div>
      <div className="bag-grid">
        {entries.length === 0 && <div className="muted">Túi đồ trống.</div>}
        {entries.map(([id, qty]) => {
          const def = ITEMS[id];
          const usable = def?.kind === 'consumable' || def?.kind === 'equipment';
          const locked = def?.kind === 'equipment' && !canEquip(id, level).ok;
          return (
            <div key={id} className="bag-item" title={def?.desc} style={{ borderColor: rarityColor(id) }}>
              <ItemIcon id={id} size={48} />
              <span className="bag-qty">{qty}</span>
              <div className="bag-name" style={{ color: rarityColor(id) }}>
                {def?.name ?? id}
              </div>
              {locked && <small className="req-bad">Cần cấp {def.reqLevel}</small>}
              {usable && (
                <button className="btn small" disabled={locked} onClick={() => consumeItem(id)}>
                  {def.kind === 'equipment' ? 'Trang bị' : 'Dùng'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Cultivate() {
  const player = useGame((s) => s.player);
  const zone = useGame((s) => s.zone);
  const tryBreakthrough = useGame((s) => s.tryBreakthrough);
  const realm = realmFor(player.realmIndex);
  const next = REALMS[player.realmIndex + 1];
  const need = expToNext(player.level);
  const capped = isBottleneck(player) && player.exp >= need;
  const cost = realm.breakthrough;
  return (
    <div className="cultivate">
      <div className="realm-ladder">
        {REALMS.map((r, i) => (
          <div key={r.name} className={`realm-step ${i === player.realmIndex ? 'current' : i < player.realmIndex ? 'past' : ''}`}>
            {r.name}
            <small>
              Lv {r.minLevel}-{r.maxLevel}
            </small>
          </div>
        ))}
      </div>
      <p>
        Tu vi: <b>{player.exp}</b> / {need} · Cảnh giới hiện tại: <b>{realm.name}</b>
      </p>
      <p className="muted">
        Tọa thiền (F) để hấp thu linh khí. Linh Đài (x3) và Linh Tuyền (x5) cho tốc độ cao nhất.
        {zone ? ` Bạn đang ở ${zone.name}.` : ''}
      </p>
      {next && cost ? (
        <div className="breakthrough">
          <div>
            Đột phá lên <b>{next.name}</b> cần: đạt cấp {realm.maxLevel} đầy tu vi, {cost.linhKhi} Linh Khí ({player.linhKhi}),{' '}
            {cost.linhThach} Linh Thạch ({player.inventory.linh_thach ?? 0}).
          </div>
          <button className={`btn gold ${capped ? 'pulse' : ''}`} onClick={tryBreakthrough}>
            Đột Phá
          </button>
        </div>
      ) : (
        <p>Đã đạt cảnh giới cao nhất của bản demo.</p>
      )}
    </div>
  );
}

function Delta({ cur, next, suffix = '' }: { cur: number | string; next?: number | string; suffix?: string }) {
  return (
    <>
      {cur}
      {suffix}
      {next !== undefined && next !== cur && (
        <span className="delta">
          {' '}
          → {next}
          {suffix}
        </span>
      )}
    </>
  );
}

function CostChip({ item, need, have }: { item: string; need: number; have: number }) {
  if (need <= 0) return null;
  return (
    <span className={`cost-chip ${have < need ? 'short' : ''}`} title={itemName(item)}>
      <img src={itemIconUrl(item, 20)} alt="" /> {need}
    </span>
  );
}

function Skills() {
  const player = useGame((s) => s.player);
  const upgrade = useGame((s) => s.upgradeSkill);
  const wallet = {
    linhKhi: player.linhKhi,
    linhThach: player.inventory.linh_thach ?? 0,
    kiemPho: player.inventory.kiem_pho ?? 0,
  };
  return (
    <div className="skill-list">
      <p className="muted">
        Nâng cấp tăng sát thương và giảm hồi chiêu. Cấp {SKILL_BONUS_LEVEL} lĩnh ngộ tuyệt kỹ. Từ cấp 4 cần thêm Kiếm Phổ Tàn Trang (rơi trong phó bản).
      </p>
      {(Object.keys(SKILLS) as SkillId[]).map((id) => {
        const lv = skillLevel(player.skills, id);
        const cur = effectiveSkill(id, lv);
        const next = lv < SKILL_MAX_LEVEL ? effectiveSkill(id, lv + 1) : null;
        const check = checkUpgrade(lv, player.level, wallet);
        const cost = check.cost;
        return (
          <div key={id} className="skill-row upgrade">
            <div className="skill-icon">
              <img src={skillIconUrl(id, 56)} alt="" />
              <span className="skill-lv">{lv}</span>
            </div>
            <div className="skill-info">
              <b>{cur.name}</b> <kbd>{cur.key}</kbd>{' '}
              <span className="skill-level">
                Cấp {lv}/{SKILL_MAX_LEVEL}
              </span>
              <div className="muted">{cur.desc}</div>
              <small>
                MP {cur.mpCost} · Hồi chiêu <Delta cur={(cur.cooldownMs / 1000).toFixed(1)} next={next ? (next.cooldownMs / 1000).toFixed(1) : undefined} suffix="s" />
                {cur.multiplier ? (
                  <>
                    {' '}
                    · Sát thương x<Delta cur={cur.multiplier} next={next?.multiplier} />
                  </>
                ) : null}
                {next && next.range !== cur.range ? (
                  <>
                    {' '}
                    · Tầm <Delta cur={cur.range} next={next.range} />
                  </>
                ) : null}
              </small>
              <div className={`skill-bonus ${cur.active ? 'on' : ''}`}>
                {cur.active ? '✦ ' : `Cấp ${SKILL_BONUS_LEVEL}: `}
                {cur.bonus.desc}
              </div>
            </div>
            <div className="skill-upgrade">
              {cost ? (
                <>
                  <div className="cost-row">
                    <span className={`cost-chip ${player.level < cost.reqLevel ? 'short' : ''}`}>Lv {cost.reqLevel}</span>
                    <CostChip item="linh_khi" need={cost.linhKhi} have={wallet.linhKhi} />
                    <CostChip item="linh_thach" need={cost.linhThach} have={wallet.linhThach} />
                    <CostChip item="kiem_pho" need={cost.kiemPho} have={wallet.kiemPho} />
                  </div>
                  <button className="btn gold small" disabled={!check.ok} title={check.ok ? '' : check.reason} onClick={() => upgrade(id)}>
                    Nâng cấp
                  </button>
                </>
              ) : (
                <span className="skill-max">Tối đa</span>
              )}
            </div>
          </div>
        );
      })}
      <div className="controls-help">
        Di chuyển: WASD / phím mũi tên / joystick · Tương tác: E · Tọa thiền: F · Đổi mục tiêu: Tab · Tự động: T · Đan dược: Q
      </div>
    </div>
  );
}

function Dungeons() {
  const player = useGame((s) => s.player);
  const inDungeon = useGame((s) => s.dungeon);
  return (
    <div className="dungeon-list">
      {inDungeon && (
        <div className="breakthrough">
          <div>
            Bạn đang ở trong <b>{inDungeon.name}</b>.
          </div>
          <button className="btn" onClick={() => EventBus.emit('cmd:leaveDungeon')}>
            Rời phó bản
          </button>
        </div>
      )}
      {Object.entries(DUNGEONS).map(([id, def]) => {
        const left = attemptsLeft(player.dungeons, id, def);
        const check = canEnter(player.dungeons, id, def, player.level);
        const clears = player.dungeons?.clears[id] ?? 0;
        const boss = MONSTERS[def.boss];
        return (
          <div key={id} className={`dungeon-card ${player.level < def.minLevel ? 'locked' : ''}`}>
            <div className="dungeon-card-head">
              <b>{def.name}</b>
              <span className="muted">
                Yêu cầu Lv {def.minLevel} · Đã vượt {clears} lần
              </span>
            </div>
            <p className="muted">{def.desc}</p>
            <div className="dungeon-facts">
              <span>
                {def.waves.length} đợt quái + thủ lĩnh <b>{boss.name}</b> (Lv {boss.level})
              </span>
              <span>Giới hạn {Math.round(def.timeLimitSec / 60)} phút</span>
              <span className={left === 0 ? 'short' : ''}>
                Lượt hôm nay: {left}/{def.attemptsPerDay}
              </span>
            </div>
            <h4>Phần thưởng</h4>
            <RewardList rewards={def.rewards} />
            {clears === 0 && (
              <>
                <h4>Thưởng lần đầu</h4>
                <RewardList rewards={def.firstClear} />
              </>
            )}
            <div className="dungeon-enter">
              {!check.ok && <span className="muted">{check.reason}</span>}
              <button
                className="btn gold"
                disabled={!check.ok || !!inDungeon}
                onClick={() => EventBus.emit('cmd:enterDungeon', id)}
              >
                Tiến vào
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Quests() {
  const quests = useGame((s) => s.quests);
  const entries = Object.entries(quests).sort(([, a], [, b]) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0));
  return (
    <div className="quest-detail">
      {entries.map(([id, q]) => {
        const def = QUESTS[id];
        const r = def.rewards;
        return (
          <div key={id} className={`quest-card ${q.status}`}>
            <div className="quest-title">
              <span className={`quest-kind ${def.kind}`}>[{def.kind === 'main' ? 'Chính' : 'Phụ'}]</span> {def.name}
              <span className="quest-status">
                {q.status === 'done' ? 'Hoàn thành' : q.status === 'ready' ? 'Chờ trả' : 'Đang làm'}
              </span>
            </div>
            <p className="muted">{def.desc}</p>
            {def.objectives.map((o, i) => (
              <div key={i} className="quest-obj">
                {objectiveText(o, questNames)} ({q.progress[i] ?? 0}/{o.count})
              </div>
            ))}
            <small>
              Thưởng: {[r.exp && `${r.exp} EXP`, r.linhKhi && `${r.linhKhi} Linh Khí`, ...Object.entries(r.items ?? {}).map(([it, n]) => `${itemName(it)} x${n}`)]
                .filter(Boolean)
                .join(', ')}
              {def.turnIn && q.status !== 'done' ? ` · Trả cho ${npcName(def.turnIn)}` : ''}
            </small>
          </div>
        );
      })}
    </div>
  );
}

type ShopTab = 'misc' | RarityId;

function Shop() {
  const buy = useGame((s) => s.buy);
  const player = useGame((s) => s.player);
  const [tab, setTab] = useState<ShopTab>('misc');
  const offers = (NPCS.thuong_nhan.shop ?? []).map((o, index) => ({ ...o, index }));
  const shown = offers.filter((o) => (ITEMS[o.item]?.slot ? ITEMS[o.item].rarity : 'misc') === tab);
  const have = (id: string) => (id === 'linh_khi' ? player.linhKhi : (player.inventory[id] ?? 0));
  return (
    <div>
      <p className="muted">Tiền Đa Bảo: "Hàng tốt giá hời, đạo hữu cứ xem!"</p>
      <div className="shop-tabs">
        <button className={tab === 'misc' ? 'active' : ''} onClick={() => setTab('misc')}>
          Đan dược
        </button>
        {RARITIES.map((r) => (
          <button
            key={r.id}
            className={tab === r.id ? 'active' : ''}
            style={{ color: r.color, borderColor: tab === r.id ? r.color : undefined }}
            onClick={() => setTab(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {tab !== 'misc' && (
        <p className="shop-tier-info">
          <b style={{ color: rarityOf(tab).color }}>{rarityOf(tab).name}</b> · Yêu cầu cấp {rarityOf(tab).reqLevel}
          {player.level >= rarityOf(tab).reqLevel ? (
            <span className="req-ok"> · Bạn có thể mặc</span>
          ) : (
            <span className="req-bad"> · Bạn chưa đủ cấp (vẫn có thể mua trước)</span>
          )}
        </p>
      )}
      {shown.map((o) => {
        const def = ITEMS[o.item];
        const affordable = Object.entries(o.price).every(([id, n]) => have(id) >= n);
        return (
          <div key={o.index} className="shop-row">
            <ItemIcon id={o.item} size={40} />
            <div>
              <ItemLabel id={o.item} /> {o.qty > 1 && `x${o.qty}`}
              <div className="muted">{def?.desc}</div>
              {def?.reqLevel && (
                <small className={player.level >= def.reqLevel ? 'req-ok' : 'req-bad'}>Yêu cầu cấp {def.reqLevel}</small>
              )}
            </div>
            <div className="shop-price">
              {Object.entries(o.price).map(([id, n]) => (
                <span key={id} className={have(id) >= n ? '' : 'req-bad'}>
                  <img src={itemIconUrl(id, 24)} alt="" /> {n}
                </span>
              ))}
            </div>
            <button className="btn gold" disabled={!affordable} onClick={() => buy('thuong_nhan', o.index)}>
              Mua
            </button>
          </div>
        );
      })}
      <p className="muted">
        Bạn có {player.linhKhi} Linh Khí · {player.inventory.linh_thach ?? 0} Linh Thạch.
      </p>
    </div>
  );
}

function Settings() {
  return (
    <div>
      <p>Game tự động lưu vào trình duyệt (localStorage) mỗi 5 giây và khi chuyển bản đồ.</p>
      <button
        className="btn danger"
        onClick={() => {
          if (window.confirm('Xóa toàn bộ tiến trình và chơi lại từ đầu?')) {
            disableSaving();
            clearSave();
            window.location.reload();
          }
        }}
      >
        Chơi lại từ đầu
      </button>
    </div>
  );
}

const CONTENT: Record<MenuTab, () => JSX.Element> = {
  character: Character,
  bag: Bag,
  cultivate: Cultivate,
  skills: Skills,
  dungeon: Dungeons,
  quests: Quests,
  shop: Shop,
  settings: Settings,
};

export function Menus() {
  const menu = useGame((s) => s.menu);
  const setMenu = useGame((s) => s.setMenu);
  if (!menu) return null;
  const Content = CONTENT[menu];
  return (
    <div className="menu-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setMenu(null)}>
      <div className="menu-window panel-ornate">
        <div className="menu-header">
          <h3>{TITLES[menu]}</h3>
          <button className="close" onClick={() => setMenu(null)} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="menu-content">
          <Content />
        </div>
      </div>
    </div>
  );
}
