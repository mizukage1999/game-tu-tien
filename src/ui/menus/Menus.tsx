import { useState } from 'react';
import {
  DUNGEONS,
  ITEMS,
  MONSTERS,
  NPCS,
  RARITIES,
  REALMS,
  rarityOf,
  type RarityId,
} from '../../data';
import { EventBus } from '../../game/EventBus';
import { itemIconUrl } from '../../game/art/icons';
import { attemptsLeft, canEnter } from '../../game/systems/dungeon';
import { DIFFICULTIES, DUNGEON_TIERS, dungeonId, type DifficultyId } from '../../game/systems/scale';
import { expToNext, isBottleneck, realmFor, realmNameAtLevel } from '../../game/systems/progression';
import { itemName, useGame, type MenuTab } from '../../store/gameStore';
import { SocialPanel } from '../social/SocialPanel';
import { DropChanceList, RewardList } from '../Rewards';
import { Journey } from './Journey';
import { battlePower } from '../../game/systems/adventure';
import { SectPanel, PremiumPanel } from './AdventurePanels';
import { MapPanel } from './MapPanel';
import { Skills } from './SkillPanel';
export { Skills } from './SkillPanel';
import { CharacterPanel } from './CharacterPanel';
import { CultivationWallet, CultivationCorners } from './CultivationUI';
import { BagPanel } from './BagPanel';
import { MailPanel } from './MailPanel';
import { QuestJournal } from './QuestJournal';
import { SettingsPanel } from './SettingsPanel';

const TITLES: Record<MenuTab, string> = {
  character: 'Nhân Vật',
  bag: 'Túi Đồ',
  cultivate: 'Tu Luyện',
  skills: 'Kỹ Năng',
  dungeon: 'Phó Bản',
  mail: 'Thư',
  quests: 'Nhiệm Vụ',
  shop: 'Cửa Hàng',
  social: 'Bạn Bè',
  settings: 'Cài Đặt',
  journey: 'Tiên Lộ · Hành Trình Tu Tiên',
  sect:'Tông Môn',premium:'Tiên Ngọc Các',map:'Sơn Hà Đồ',
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

function ItemLabel({id}:{id:string}) {
  const enhancement=useGame(s=>s.player.adventure?.enhancements[id]??0);
  return <b style={{color:rarityColor(id)}}>{itemName(id)}{enhancement>0?` +${enhancement}`:''}</b>;
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

function DungeonCard({ id }: { id: string }) {
  const player = useGame((s) => s.player);
  const quests = useGame((s) => s.quests);
  const stats=useGame(s=>s.stats);
  const inDungeon = useGame((s) => s.dungeon);
  const def = DUNGEONS[id];
  const left = attemptsLeft(player.dungeons, id, def);
  const check = canEnter(player.dungeons, id, def, player.level, undefined, quests);
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
          {def.practice ? 'Thử luyện cốt truyện · có thể thử lại' : `Lượt hôm nay: ${left}/${def.attemptsPerDay}`}
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
  const legacy = Object.keys(DUNGEONS).filter((id) => !DUNGEONS[id].tier && !DUNGEONS[id].practice);
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
      <DungeonCard id="ngoc_an_thu_luyen" />
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
        {RARITIES.filter(r => offers.some(o => ITEMS[o.item]?.rarity === r.id)).map((r) => (
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
          <b style={{ color: rarityOf(tab).color }}>{rarityOf(tab).name}</b> · Xem yêu cầu cấp trên từng món.
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
                <small className={player.level >= def.reqLevel ? 'req-ok' : 'req-bad'}>Yêu cầu Lv.{def.reqLevel} · {realmNameAtLevel(def.reqLevel)}</small>
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
        Trang bị Tím trở lên nhận từ boss và bí cảnh. Thanh Khê Kiếm là thưởng lần đầu của Cổ Viện Ngọc Ấn.
      </p>
      <p className="muted">
        Bạn có {player.linhKhi} Linh Khí · {player.inventory.linh_thach ?? 0} Linh Thạch.
      </p>
    </div>
  );
}

const CONTENT: Record<MenuTab, () => JSX.Element> = {
  character: CharacterPanel,
  bag: BagPanel,
  cultivate: Cultivate,
  skills: Skills,
  dungeon: Dungeons,
  mail: MailPanel,
  quests: QuestJournal,
  shop: Shop,
  social: SocialPanel,
  settings: SettingsPanel,
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
        {['skills','character','bag','mail','social','quests','sect','settings'].includes(menu)&&<CultivationCorners/>}
        <div className="menu-header">
          <h3>
            <img src={`/assets/ui/menu-${menu === 'journey'||menu==='map' ? 'cultivate' : menu==='sect'?'quests':menu==='premium'?'shop':menu}.png`} alt="" aria-hidden="true" />
            {TITLES[menu]}
          </h3>
          {['skills','character','bag','mail','social','quests','sect','settings'].includes(menu)&&<CultivationWallet/>}
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
