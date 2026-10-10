import { useMemo } from 'react';
import { NPCS, QUESTS } from '../data';
import { CHARACTERS } from '../game/art/generate';
import { portraitUrl } from '../game/art/icons';
import { availableQuests, turnInQuests } from '../game/systems/quest';
import { useGame } from '../store/gameStore';

export function DialogBox() {
  const npcId = useGame((s) => s.dialogNpc);
  const quests = useGame((s) => s.quests);
  const turnInQuest = useGame((s) => s.turnInQuest);
  const acceptQuest = useGame((s) => s.acceptQuest);
  const setDialog = useGame((s) => s.setDialog);
  const setMenu = useGame((s) => s.setMenu);
  const def = npcId ? NPCS[npcId] : null;
  const line = useMemo(() => (def ? def.lines[Math.floor(Math.random() * def.lines.length)] : ''), [def]);
  if (!npcId || !def) return null;

  const ready = turnInQuests(quests, QUESTS, npcId);
  const available = availableQuests(quests, QUESTS, npcId);
  const palette = CHARACTERS[def.art]?.palette ?? 'elder';

  return (
    <div className="dialog panel-ornate">
      <img className="dialog-portrait" src={portraitUrl(palette, 112)} alt="" />
      <div className="dialog-body">
        <div className="dialog-name">
          {def.name} <span>《{def.title}》</span>
        </div>
        <p className="dialog-line">{line}</p>
        <div className="dialog-options">
          {ready.map((id) => (
            <button key={id} className="opt turnin" onClick={() => turnInQuest(id)}>
              ? Trả nhiệm vụ: {QUESTS[id].name}
            </button>
          ))}
          {available.map((id) => (
            <button key={id} className="opt accept" onClick={() => acceptQuest(id)}>
              ! Nhận nhiệm vụ: {QUESTS[id].name}
              <small>{QUESTS[id].desc}</small>
            </button>
          ))}
          {def.dungeon && (
            <button
              className="opt"
              onClick={() => {
                setDialog(null);
                setMenu('dungeon');
              }}
            >
              Vào bí cảnh (phó bản)
            </button>
          )}
          {def.shop && (
            <button
              className="opt"
              onClick={() => {
                setDialog(null);
                setMenu('shop');
              }}
            >
              Giao dịch
            </button>
          )}
          <button className="opt" onClick={() => setDialog(null)}>
            Tạm biệt <kbd>E</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
