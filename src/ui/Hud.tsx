import { StatusBars } from './StatusBars';
import { WorldStatusEffects } from './StatusEffects';
import { PowerGrowthNotice } from './PowerGrowthNotice';
import { QuestPanel } from './QuestPanel';
import { TopMenu } from './TopMenu';
import { CloudBadge } from './CloudBadge';
import { Minimap } from './Minimap';
import { ChatLog } from './ChatLog';
import { ExpBar } from './ExpBar';
import { SkillBar } from './SkillBar';
import { SwipeMove, usePhoneLayout, usePortrait } from './TouchPlay';
import { ClockBar, DownedOverlay, InteractPrompt, TargetFrame, Toasts, TribulationOverlay } from './Overlays';
import { DialogBox } from './DialogBox';
import { Menus } from './menus/Menus';
import { PlayerCard } from './PlayerCard';
import { DuelOverlay } from './social/DuelOverlay';
import { InviteNotice } from './social/InviteNotice';
import { PartyDungeonNotice } from './social/PartyDungeonNotice';
import { MailNotice } from './social/MailNotice';
import { ServerAnnouncement } from './ServerAnnouncement';
import { ChatWindow } from './social/ChatWindow';
import { DungeonPanel, DungeonResultOverlay } from './DungeonPanel';
import { useGame } from '../store/gameStore';
import { usePerformanceTier } from '../store/performanceStore';
import './mobile.css';
import './presentation-v5.css';

export function Hud() {
  const inDungeon = useGame((s) => s.dungeon !== null);
  const phone = usePhoneLayout();
  const portrait = usePortrait();
  const turned = phone && portrait;
  const tier = usePerformanceTier();
  return (
    <div className={`hud hud-v5${phone ? ' phone' : ''}${turned ? ' turned' : ''}${tier === 2 ? ' performance-light' : ''}`}>
      <div className="hud-top-left">
        <StatusBars />
        <WorldStatusEffects />
        {inDungeon ? <DungeonPanel /> : <QuestPanel />}
      </div>
      <div className="hud-top-right">
        <div className="hud-top-stack">
          <CloudBadge />
          <TopMenu phone={phone}/>
        </div>
        <Minimap />
      </div>
      <TargetFrame />
      <ServerAnnouncement />
      <TribulationOverlay/>
      <Toasts />
      <PowerGrowthNotice />
      <DownedOverlay />
      <div className="hud-bottom-left">
        <ClockBar />
      </div>
      <SwipeMove active={phone} turned={turned} />
      <div className="hud-bottom-center">
        <InteractPrompt />
        <ChatLog />
      </div>
      <SkillBar />
      <ExpBar />
      <DialogBox />
      <DungeonResultOverlay />
      <DuelOverlay />
      <InviteNotice />
      <PartyDungeonNotice />
      <MailNotice />
      <ChatWindow />
      <PlayerCard />
      <Menus />
    </div>
  );
}
