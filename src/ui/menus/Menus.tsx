import { useGame, type MenuTab } from '../../store/gameStore';
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
import { MarketPanel } from './MarketPanel';

const TITLES: Record<MenuTab, string> = {
  character: 'Nhân Vật',
  bag: 'Túi Đồ',
  cultivate: 'Tu Luyện',
  skills: 'Kỹ Năng',
  dungeon: 'Phó Bản',
  mail: 'Thư',
  quests: 'Nhiệm Vụ',
  shop: 'Giao Dịch',
  social: 'Bạn Bè',
  settings: 'Cài Đặt',
  journey: 'Tiên Lộ · Hành Trình Tu Tiên',
  sect:'Tông Môn',premium:'Tiên Ngọc Các',map:'Sơn Hà Đồ',
};

const CONTENT: Record<MenuTab, () => JSX.Element> = {
  character: CharacterPanel,
  bag: BagPanel,
  cultivate: CultivationPanel,
  skills: Skills,
  dungeon: DungeonSelectPanel,
  mail: MailPanel,
  quests: QuestJournal,
  shop: MarketPanel,
  social: SocialPanel,
  settings: SettingsPanel,
  journey: Journey,
  sect:SectPanel,premium:PremiumPanel,map:MapPanel,
};

export function Menus() {
  const menu = useGame((s) => s.menu);
  const journeySection = useGame((s) => s.journeySection);
  const marketSection = useGame((s) => s.marketSection);
  const setMenu = useGame((s) => s.setMenu);
  if (!menu) return null;
  const Content = CONTENT[menu];
  return (
    <div className="menu-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setMenu(null)}>
      <div className={`menu-window panel-ornate menu-${menu}`}>
        {['skills','character','bag','mail','social','quests','sect','settings','cultivate','journey','dungeon','shop'].includes(menu)&&<CultivationCorners/>}
        <div className="menu-header">
          <h3>
            <img src={`/assets/ui/menu-${menu === 'journey'||menu==='map' ? 'cultivate' : menu==='sect'?'quests':menu==='premium'?'shop':menu}.png`} alt="" aria-hidden="true" />
            {menu === 'journey' ? journeySection === 'alchemy' ? 'Đan Phòng' : <>Tiên Lộ<span className="journey-header-subtitle"> · Hành Trình Tu Tiên</span></> : menu === 'shop' && marketSection === 'stall' ? 'Bày Bán' : TITLES[menu]}
          </h3>
          {['skills','character','bag','mail','social','quests','sect','settings','cultivate','journey','dungeon','shop'].includes(menu)&&<CultivationWallet/>}
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
