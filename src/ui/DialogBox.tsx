import { useMemo } from 'react';
import { NPCS, QUESTS } from '../data';
import { CHARACTERS } from '../game/art/generate';
import { characterSpriteUrl } from '../game/art/icons';
import { NPC_SPRITES } from '../game/systems/npcArt';
import { availableQuests, turnInQuests } from '../game/systems/quest';
import { useGame } from '../store/gameStore';
import { isChildhood } from '../game/systems/origin';
import { worldNpcPortraits } from '../game/art/world';

export function DialogBox() {
  const npcId = useGame((s) => s.dialogNpc);
  const quests = useGame((s) => s.quests);
  const turnInQuest = useGame((s) => s.turnInQuest);
  const acceptQuest = useGame((s) => s.acceptQuest);
  const setDialog = useGame((s) => s.setDialog);
  const setMenu = useGame((s) => s.setMenu);
  const player = useGame((s) => s.player);
  const def = npcId ? NPCS[npcId] : null;
  const line = useMemo(() => (def ? def.lines[Math.floor(Math.random() * def.lines.length)] : ''), [def]);
  if (!npcId || !def) return null;

  const ready = turnInQuests(quests, QUESTS, npcId);
  const available = availableQuests(quests, QUESTS, npcId).filter((id) => isChildhood(player) ? id.startsWith('village_') : !id.startsWith('village_'));
  const storyId = [...ready, ...available, ...Object.keys(quests).filter((id) => quests[id].status === 'active' && QUESTS[id]?.giver === npcId)]
    .find((id) => QUESTS[id]?.story);
  const palette = CHARACTERS[def.art]?.palette ?? 'elder';
  const portrait = worldNpcPortraits[npcId] ?? NPC_SPRITES[npcId]?.src ?? characterSpriteUrl(palette, 136);

  return (
    <div className="dialog panel-ornate">
      <img className="dialog-portrait" src={portrait} alt="" />
      <div className="dialog-body">
        <div className="dialog-name">
          {def.name} <span>《{def.title}》</span>
        </div>
        <p className="dialog-line">{storyId ? QUESTS[storyId].story : line}</p>
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
