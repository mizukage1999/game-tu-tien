import { StatusBars } from './StatusBars';
import { QuestPanel } from './QuestPanel';
import { TopMenu } from './TopMenu';
import { Minimap } from './Minimap';
import { ChatLog } from './ChatLog';
import { ExpBar } from './ExpBar';
import { SkillBar } from './SkillBar';
import { VirtualJoystick } from './VirtualJoystick';
import { ClockBar, DownedOverlay, InteractPrompt, TargetFrame, Toasts } from './Overlays';
import { DialogBox } from './DialogBox';
import { Menus } from './menus/Menus';
import { DungeonPanel, DungeonResultOverlay } from './DungeonPanel';
import { useGame } from '../store/gameStore';

export function Hud() {
  const inDungeon = useGame((s) => s.dungeon !== null);
  return (
    <div className="hud">
      <div className="hud-top-left">
        <StatusBars />
        {inDungeon ? <DungeonPanel /> : <QuestPanel />}
      </div>
      <div className="hud-top-right">
        <TopMenu />
        <Minimap />
      </div>
      <TargetFrame />
      <Toasts />
      <DownedOverlay />
      <div className="hud-bottom-left">
        <VirtualJoystick />
        <ClockBar />
      </div>
      <div className="hud-bottom-center">
        <InteractPrompt />
        <ChatLog />
      </div>
      <SkillBar />
      <ExpBar />
      <DialogBox />
      <DungeonResultOverlay />
      <Menus />
    </div>
  );
}
