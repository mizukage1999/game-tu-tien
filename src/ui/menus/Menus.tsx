import { useState } from 'react';
import {
  bonusText,
  DUNGEONS,
  EQUIP_SLOTS,
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
import { itemIconUrl, skillSpriteUrl } from '../../game/art/icons';
import { attemptsLeft, canEnter } from '../../game/systems/dungeon';
import { DIFFICULTIES, DUNGEON_TIERS, dungeonId, type DifficultyId } from '../../game/systems/scale';
import { canEquip, expToNext, isBottleneck, realmFor, realmNameAtLevel } from '../../game/systems/progression';
import { objectiveText } from '../../game/systems/quest';
import { checkUpgrade, effectiveSkill, skillLevel, SKILL_BONUS_LEVEL, SKILL_MAX_LEVEL } from '../../game/systems/skills';
import { itemName, npcName, questNames, useGame, type MenuTab } from '../../store/gameStore';
import { useAccount } from '../../net/session';
import { AccountPanel } from '../AccountPanel';
import { SocialPanel } from '../social/SocialPanel';
import { DropChanceList, RewardList } from '../Rewards';
import { Journey } from './Journey';
import { heroName, isChildhood, originText } from '../../game/systems/origin';
import { battlePower, enhanceCost, enhanceChance, MAX_ENHANCEMENT } from '../../game/systems/adventure';
import { enhancementLevel, ENHANCEMENT_STONE } from '../../game/systems/enhancement';
import { skillLoadout, skillUnlocked, skillLockReason } from '../../game/systems/skills';
import { SectPanel, PremiumPanel } from './AdventurePanels';
import { MapPanel } from './MapPanel';

const GEAR_SLOTS = EQUIP_SLOTS;
function EnhanceButton({id}:{id:string}) {
  const p=useGame(s=>s.player),act=useGame(s=>s.adventureAction),n=enhancementLevel(p.adventure?.enhancements[id]),qty=enhanceCost(n)[ENHANCEMENT_STONE]??0;
  const capped=n>=MAX_ENHANCEMENT,chance=Math.round(enhanceChance(n)*100);
  return <div className="gear-enhance"><button className="btn small" disabled={capped||(p.inventory[ENHANCEMENT_STONE]??0)<qty} title={capped?'Đã đạt tối đa +12':`Đá Cường Hóa ×${qty} · Thành công ${chance}%. Thất bại mất đá, giữ cấp đồ.`} onClick={()=>act({type:'enhance',id})}>{capped?'Tối đa +12':`Đập +${n+1} · ${chance}%`}</button>{!capped&&<small>Đá ×{qty} · có {p.inventory[ENHANCEMENT_STONE]??0}</small>}</div>;
}

const TITLES: Record<MenuTab, string> = {
  character: 'Nhân Vật',
  bag: 'Túi Đồ',
  cultivate: 'Tu Luyện',
  skills: 'Kỹ Năng',
  dungeon: 'Phó Bản',
  mail: 'Thư',
  quests: 'Nhiệm Vụ',
  shop: 'Cửa Hàng',
  social: 'Xã Hội',
  settings: 'Cài Đặt',
  journey: 'Tiên Lộ · Hành Trình Tu Tiên',
  sect:'Tông Môn & Danh Vọng',premium:'Tiên Ngọc Các',map:'Sơn Hà Đồ',
};

function rarityColor(id: string) {
  const def = ITEMS[id];
  return def?.rarity ? rarityOf(def.rarity).color : undefined;
}

function ItemIcon({ id, size, rotatingBorder = false }: { id: string; size: number; rotatingBorder?: boolean }) {
  const color = rarityColor(id);
  return (
    <span
      className={`item-icon-frame${rotatingBorder && color ? ' equip-rarity-orbit' : ''}`}
      style={{
        width: size,
        height: size,
        ...(color ? { color, borderColor: color, boxShadow: `0 0 6px ${color}` } : {}),
      }}
    >
      <img className="item-icon" src={itemIconUrl(id, size)} alt="" />
    </span>
  );
}

function ItemLabel({ id }: { id: string }) {
  const enhancement=useGame(s=>s.player.adventure?.enhancements[id]??0);
  return <b style={{ color: rarityColor(id) }}>{itemName(id)}{enhancement>0?` +${enhancement}`:''}</b>;
}

function Character() {
  const player = useGame((s) => s.player);
  const stats = useGame((s) => s.stats);
  const unequip = useGame((s) => s.unequip);
  const expNeeded = expToNext(player.level);
  const hpPct = Math.max(0, Math.min(100, (player.hp / Math.max(1, stats.maxHp)) * 100));
  const mpPct = Math.max(0, Math.min(100, (player.mp / Math.max(1, stats.maxMp)) * 100));
  const expPct = Math.max(0, Math.min(100, (player.exp / Math.max(1, expNeeded)) * 100));
  const rows: [string, string | number][] = [
    ['Cảnh giới', isChildhood(player) ? 'Phàm Nhân' : realmNameAtLevel(player.level)],
    ['Cấp độ', player.level],
    ['Lực chiến', battlePower(stats)],
    ['Sinh lực (HP)', stats.maxHp],
    ['Linh lực (MP)', stats.maxMp],
    ['Công kích', stats.atk],
    ['Phòng ngự', stats.def],
    ['Bạo kích', `${Math.round(stats.critRate * 100)}% (x${stats.critMul})`],
    ['Tốc độ', stats.speed],
  ];
  return (
    <>
      <div className="character-hero">
        <img
          className="character-portrait"
          src={player.sex === 'male' ? '/assets/sprites/wang-lin-portrait.png' : '/assets/sprites/li-mu-uyen-portrait.png'}
          alt=""
          aria-hidden="true"
        />
        <div className="character-hero-info">
          <div className="character-name">
            {heroName(player)} <span>Lv.{player.level}</span>
          </div>
          <div className="character-realm">{isChildhood(player) ? 'Phàm Nhân' : realmNameAtLevel(player.level)}</div>
          <div className="bar bar-hp">
            <div className="bar-fill" style={{ width: `${hpPct}%` }} />
            <span className="bar-text">HP {Math.round(player.hp)} / {stats.maxHp}</span>
          </div>
          <div className="bar bar-mp">
            <div className="bar-fill" style={{ width: `${mpPct}%` }} />
            <span className="bar-text">MP {Math.round(player.mp)} / {stats.maxMp}</span>
          </div>
          <div className="character-exp">
            <span>EXP {player.exp} / {expNeeded}</span>
            <div className="character-exp-track">
              <span style={{ width: `${expPct}%` }} />
            </div>
          </div>
        </div>
      </div>
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
          <p className="muted enhancement-note">Cường hóa tối đa +12 bằng Đá Cường Hóa. Thất bại mất đá, giữ cấp đồ.</p>
          <div className="equip-list">
            {GEAR_SLOTS.map((slot) => {
              const id = player.equipment[slot.id];
              return (
                <div key={slot.id} className="equip-slot">
                  <span className="equip-slot-name">{slot.name}</span>
                  {id ? (
                    <>
                      <ItemIcon id={id} size={32} rotatingBorder />
                      <div className="equip-info">
                        <ItemLabel id={id} />
                        <small className="muted">{bonusText(ITEMS[id]?.bonus)}</small>
                      </div>
                      <button className="btn small" onClick={() => unequip(slot.id)}>
                        Tháo
                      </button>
                      <EnhanceButton id={id}/>
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
    </>
  );
}

function Bag() {
  const inv = useGame((s) => s.player.inventory);
  const linhKhi = useGame((s) => s.player.linhKhi);
  const level = useGame((s) => s.player.level);
  const consumeItem = useGame((s) => s.consumeItem);
  const salvageLegacy = useGame((s) => s.salvageLegacy);
  const entries = Object.entries(inv).filter(([, q]) => q > 0);
  return (
    <>
      <div className="bag-overview">
        <img src="/assets/ui/menu-bag.png" alt="" aria-hidden="true" />
        <span>{entries.length} loại vật phẩm</span>
      </div>
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
              {locked && <small className="req-bad">Cần Lv.{def.reqLevel ?? 1}</small>}
              {def?.kind==='equipment'&&def.slot!=='weapon'&&<button className="btn small" onClick={() => salvageLegacy(id)}>Phân giải · 2 Huyền Thiết</button>}
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

function Mail() {
  return (
    <div className="mail-empty">
      <img src="/assets/ui/menu-mail.png" alt="" aria-hidden="true" />
      <h4>Hộp thư</h4>
      <p className="muted">Hiện chưa có thư mới.</p>
    </div>
  );
}

function Cultivate() {
  const player = useGame((s) => s.player);
  const zone = useGame((s) => s.zone);
  const meditating = useGame((s) => s.meditating);
  const setMenu = useGame((s) => s.setMenu);
  const tryBreakthrough = useGame((s) => s.tryBreakthrough);
  const realm = realmFor(player.realmIndex);
  const next = REALMS[player.realmIndex + 1];
  const need = expToNext(player.level);
  const expPct = Math.min(100, (player.exp / Math.max(1, need)) * 100);
  const capped = isBottleneck(player) && player.exp >= need;
  const cost = realm.breakthrough;
  return (
    <div className="cultivate">
      <div className="cultivate-hero">
        <img src="/assets/ui/cultivation-meditation.png" alt="" aria-hidden="true" />
        <div className="cultivate-progress">
          <b>{realmNameAtLevel(player.level)} · Lv.{player.level}</b>
          <div className="cultivate-progress-track" role="progressbar" aria-label="EXP" aria-valuenow={player.exp} aria-valuemin={0} aria-valuemax={need}>
            <span style={{ width: `${expPct}%` }} />
          </div>
          <small>{player.exp} / {need}</small>
          <button
            className="btn gold cultivate-action"
            onClick={() => {
              EventBus.emit('cmd:meditate');
              setMenu(null);
            }}
          >
            {meditating ? 'Dừng tu luyện' : 'Tu luyện'}
          </button>
        </div>
      </div>
      <div className="realm-ladder">
        {REALMS.map((r, i) => (
          <div key={r.name} className={`realm-step ${i === player.realmIndex ? 'current' : i < player.realmIndex ? 'past' : ''}`}>
            {r.name}
            <small>
              Sơ kỳ → Viên mãn
            </small>
          </div>
        ))}
      </div>
      <p className="muted">
        Tọa thiền (F) để hấp thu linh khí. Linh Đài (x1), Linh Tuyền (x5).
        {zone ? ` Bạn đang ở ${zone.name}.` : ''}
      </p>
      {next && cost ? (
        <div className="breakthrough">
          <div>
            Đột phá lên <b>{realmNameAtLevel(next.minLevel)}</b> cần: đạt đại viên mãn, đầy EXP, {cost.linhKhi} Linh Khí ({player.linhKhi}),{' '}
            {cost.linhThach} Linh Thạch ({player.inventory.linh_thach ?? 0}) và 1 Phá Cảnh Đan ({player.inventory.pha_canh_dan ?? 0}).
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

export function Skills() {
  const player = useGame((s) => s.player);
  const maxMp = useGame(s=>s.stats.maxMp);
  const choose=useGame(s=>s.chooseSkill),[slot,setSlot]=useState(1),loadout=skillLoadout(player);
  const [assigned, setAssigned] = useState('');
  const upgrade = useGame((s) => s.upgradeSkill);
  const wallet = {
    linhKhi: player.linhKhi,
    linhThach: player.inventory.linh_thach ?? 0,
    kiemPho: player.inventory.kiem_pho ?? 0,
  };
  return (
    <div className="skill-list">
      <p className="muted">Đánh thường cố định ở ô 1. Chọn ô 2–4 để đổi chiêu; Lướt có nút riêng và phím Shift.</p>
      <div className="skill-loadout" role="group" aria-label="Chọn ô để thay chiêu">{loadout.map((id,i)=><button type="button" key={i} disabled={i===0} aria-pressed={slot===i} className={slot===i?'active':''} onClick={()=>{setSlot(i);setAssigned('');}}><img src={skillSpriteUrl(id,player.sex)} alt=""/>Ô {i+1} · {SKILLS[id].name}</button>)}</div>
      <p className="skill-assignment" role="status">{assigned || `Đang chọn ô ${slot+1}. Nhấn “Dùng ở ô ${slot+1}” tại chiêu muốn thay.`}</p>
      <p className="muted">
        Nâng cấp tăng sát thương và giảm hồi chiêu. Cấp {SKILL_BONUS_LEVEL} lĩnh ngộ tuyệt kỹ. Từ cấp 4 cần thêm Kiếm Phổ Tàn Trang (rơi trong phó bản).
      </p>
      {(Object.keys(SKILLS) as SkillId[]).filter(id=>!SKILLS[id].character||SKILLS[id].character===(player.sex??'female')).map((id) => {
        const lv = skillLevel(player.skills, id);
        const cur = effectiveSkill(id, lv);
        const next = lv < SKILL_MAX_LEVEL ? effectiveSkill(id, lv + 1) : null;
        const check = checkUpgrade(lv, player.level, wallet);
        const cost = check.cost;
        const locked = skillLockReason(player,id);
        return (
          <div key={id} data-skill={id} className={`skill-row upgrade ${loadout[slot]===id?'selected-skill':''}`}>
            <div className="skill-icon">
              <img src={skillSpriteUrl(id, player.sex)} alt="" />
              <span className="skill-lv">{lv}</span>
            </div>
            <div className="skill-info">
              <b>{cur.name}</b> <kbd>{id==='than_phap'?'Shift':loadout.includes(id)?loadout.indexOf(id)+1:'—'}</kbd>{' '}
              <span className="skill-level">
                Cấp {lv}/{SKILL_MAX_LEVEL}
              </span>
              <div className="muted">{cur.desc}</div>
              {locked && <small className="req-bad">{locked}</small>}
              {cur.mpCost>player.mp && <small className="skill-mp-note">Cần {cur.mpCost} MP để thi triển · Hiện có {Math.floor(player.mp)}/{maxMp}</small>}
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
              <button type="button" className="btn small" disabled={id==='basic'||id==='than_phap'||!!locked||loadout[slot]===id} onClick={()=>{choose(slot,id);setAssigned(`Đã đặt ${cur.name} vào ô ${slot+1}. Thanh chiêu ngoài map và sân tỷ võ đã cập nhật.`);}}>{id==='basic'?'Đánh thường cố định':id==='than_phap'?'Nút lướt riêng':locked?'Chưa mở':loadout[slot]===id?`Đang ở ô ${slot+1}`:`Dùng ở ô ${slot+1}`}</button>
              {cost ? (
                <>
                  <div className="cost-row">
                    <span className={`cost-chip ${player.level < cost.reqLevel ? 'short' : ''}`}>{realmNameAtLevel(cost.reqLevel)}</span>
                    <CostChip item="linh_khi" need={cost.linhKhi} have={wallet.linhKhi} />
                    <CostChip item="linh_thach" need={cost.linhThach} have={wallet.linhThach} />
                    <CostChip item="kiem_pho" need={cost.kiemPho} have={wallet.kiemPho} />
                  </div>
                  <button className="btn gold small" disabled={!check.ok||!skillUnlocked(player,id)} title={check.ok ? '' : check.reason} onClick={() => upgrade(id)}>
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

function DungeonCard({ id }: { id: string }) {
  const player = useGame((s) => s.player);
  const stats=useGame(s=>s.stats);
  const inDungeon = useGame((s) => s.dungeon);
  const def = DUNGEONS[id];
  const left = attemptsLeft(player.dungeons, id, def);
  const check = canEnter(player.dungeons, id, def, player.level);
  const clears = player.dungeons?.clears[id] ?? 0;
  const boss = MONSTERS[def.boss];
  return (
    <div className="dungeon-card">
      <div className="dungeon-card-head">
        <b>{def.name}</b>
        <span className="muted">
          Đề nghị Lv.{def.minLevel} · Đã vượt {clears} lần
        </span>
      </div>
      <p className="muted">{def.desc}</p>
      <p className={battlePower(stats)<(def.recommendedPower??0)?'req-bad':'muted'}>Lực chiến đề nghị {def.recommendedPower??'—'} · Bạn {battlePower(stats)}. Boss cuồng nộ dưới 50% HP; hãy né vùng báo chiêu.</p>
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
      {def.drops && def.drops.length > 0 && (
        <>
          <h4>Có thể rơi</h4>
          <DropChanceList drops={def.drops} />
        </>
      )}
      {clears === 0 && (
        <>
          <h4>Thưởng lần đầu</h4>
          <RewardList rewards={def.firstClear} />
        </>
      )}
      <div className="dungeon-enter">
        {!check.ok && <span className="muted">{check.reason}</span>}
        <button className="btn gold" disabled={!check.ok || !!inDungeon} onClick={() => EventBus.emit('cmd:enterDungeon', id)}>
          Tiến vào
        </button>
      </div>
    </div>
  );
}

function Dungeons() {
  const player = useGame((s) => s.player);
  const inDungeon = useGame((s) => s.dungeon);
  const [picked, setPicked] = useState<Record<number, DifficultyId>>({});
  const legacy = Object.keys(DUNGEONS).filter((id) => !DUNGEONS[id].tier);
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
      <p className="muted">Phó bản không khóa theo cấp. Mốc Lv chỉ là đề nghị; chọn độ khó phù hợp, boss mạnh cần chuẩn bị kỹ năng và trang bị.</p>
      {DUNGEON_TIERS.map((tier) => {
        const diff = picked[tier.level] ?? 'de';
        const id = dungeonId(tier.level, diff);
        const locked = player.level < tier.level;
        return (
          <div key={tier.level} className="dungeon-tier">
            <div className="dungeon-card-head">
              <b>
                {realmNameAtLevel(tier.level)} · {tier.name}
              </b>
              {locked && <span className="req-bad">Đề nghị Lv.{tier.level} · vẫn có thể thử</span>}
            </div>
            <div className="diff-row">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  className={diff === d.id ? 'active' : ''}
                  style={{ color: d.color, borderColor: diff === d.id ? d.color : undefined }}
                  onClick={() => setPicked((prev) => ({ ...prev, [tier.level]: d.id }))}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <DungeonCard id={id} />
          </div>
        );
      })}
      {legacy.length > 0 && (
        <>
          <h4>Phó bản sư môn</h4>
          {legacy.map((id) => (
            <DungeonCard key={id} id={id} />
          ))}
        </>
      )}
    </div>
  );
}

function Quests() {
  const quests = useGame((s) => s.quests);
  const player = useGame((s) => s.player);
  const entries = Object.entries(quests).sort(([, a], [, b]) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0));
  return (
    <div className="quest-detail">
      {entries.map(([id, q]) => {
        const def = QUESTS[id];
        const r = def.rewards;
        return (
          <div
            key={id}
            className={`quest-card ${q.status}${q.status === 'done' ? '' : ' quest-go'}`}
            onClick={() => q.status !== 'done' && EventBus.emit('cmd:questGo', id)}
            title={q.status === 'done' ? undefined : 'Bấm để tự chạy tới'}
          >
            <div className="quest-title">
              <span className={`quest-kind ${def.kind}`}>[{def.kind === 'main' ? 'Chính' : 'Phụ'}]</span> {def.name}
              <span className="quest-status">
                {q.status === 'done' ? 'Hoàn thành' : q.status === 'ready' ? 'Chờ trả' : 'Đang làm'}
              </span>
            </div>
            <p className="muted">{originText(def.desc, player)}</p>
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
          Vật tư & đan dược
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
          <b style={{ color: rarityOf(tab).color }}>{rarityOf(tab).name}</b> · Yêu cầu {realmNameAtLevel(rarityOf(tab).reqLevel)}
          {player.level >= rarityOf(tab).reqLevel ? (
            <span className="req-ok"> · Bạn có thể cầm</span>
          ) : (
            <span className="req-bad"> · Cần tinh tiến EXP (có thể mua trước)</span>
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
                <small className={player.level >= def.reqLevel ? 'req-ok' : 'req-bad'}>Yêu cầu {realmNameAtLevel(def.reqLevel)}</small>
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
  const account = useAccount();
  return (
    <div>
      <h4>Tài khoản</h4>
      <AccountPanel />
      <h4>Dữ liệu</h4>
      <p>
        Game tự động lưu mỗi 5 giây và khi chuyển bản đồ
        {account.user ? ' — vào cả trình duyệt và cloud.' : ' vào trình duyệt (localStorage).'}
      </p>
    </div>
  );
}

const CONTENT: Record<MenuTab, () => JSX.Element> = {
  character: Character,
  bag: Bag,
  cultivate: Cultivate,
  skills: Skills,
  dungeon: Dungeons,
  mail: Mail,
  quests: Quests,
  shop: Shop,
  social: SocialPanel,
  settings: Settings,
  journey: Journey,
  sect:SectPanel,premium:PremiumPanel,map:MapPanel,
};

export function Menus() {
  const menu = useGame((s) => s.menu);
  const setMenu = useGame((s) => s.setMenu);
  if (!menu) return null;
  const Content = CONTENT[menu];
  return (
    <div className="menu-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setMenu(null)}>
      <div className={`menu-window panel-ornate menu-${menu}`}>
        <div className="menu-header">
          <h3>
            <img src={`/assets/ui/menu-${menu === 'journey'||menu==='map' ? 'cultivate' : menu==='sect'?'quests':menu==='premium'?'shop':menu}.png`} alt="" aria-hidden="true" />
            {TITLES[menu]}
          </h3>
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
