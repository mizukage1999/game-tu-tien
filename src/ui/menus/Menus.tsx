import { useState } from 'react';
import {
  ITEMS,
  NPCS,
  RARITIES,
  rarityOf,
  type RarityId,
} from '../../data';
import { itemIconUrl } from '../../game/art/icons';
import { realmNameAtLevel } from '../../game/systems/progression';
import { itemName, useGame, type MenuTab } from '../../store/gameStore';
import { SocialPanel } from '../social/SocialPanel';
import { Journey } from './Journey';
import { SectPanel, PremiumPanel } from './AdventurePanels';
import { MapPanel } from './MapPanel';
import { Skills } from './SkillPanel';
export { Skills } from './SkillPanel';
import { CharacterPanel } from './CharacterPanel';
import { CultivationPanel } from './CultivationPanel';
import { CultivationWallet, CultivationCorners } from './CultivationUI';
import { BagPanel } from './BagPanel';
import { MailPanel } from './MailPanel';
import { QuestJournal } from './QuestJournal';
import { SettingsPanel } from './SettingsPanel';
import { DungeonSelectPanel } from './DungeonSelectPanel';

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
  cultivate: CultivationPanel,
  skills: Skills,
  dungeon: DungeonSelectPanel,
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
  const journeySection = useGame((s) => s.journeySection);
  const setMenu = useGame((s) => s.setMenu);
  if (!menu) return null;
  const Content = CONTENT[menu];
  return (
    <div className="menu-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setMenu(null)}>
      <div className={`menu-window panel-ornate menu-${menu}`}>
        {['skills','character','bag','mail','social','quests','sect','settings','cultivate','journey','dungeon'].includes(menu)&&<CultivationCorners/>}
        <div className="menu-header">
          <h3>
            <img src={`/assets/ui/menu-${menu === 'journey'||menu==='map' ? 'cultivate' : menu==='sect'?'quests':menu==='premium'?'shop':menu}.png`} alt="" aria-hidden="true" />
            {menu === 'journey' ? journeySection === 'alchemy' ? 'Đan Phòng' : <>Tiên Lộ<span className="journey-header-subtitle"> · Hành Trình Tu Tiên</span></> : TITLES[menu]}
          </h3>
          {['skills','character','bag','mail','social','quests','sect','settings','cultivate','journey','dungeon'].includes(menu)&&<CultivationWallet/>}
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
