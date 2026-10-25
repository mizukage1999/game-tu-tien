import { useState } from 'react';
import { QUESTS } from '../data';
import { EventBus } from '../game/EventBus';
import { objectiveText } from '../game/systems/quest';
import { npcName, questNames, useGame } from '../store/gameStore';
import { storyOrder, storyChapter } from '../game/systems/immortal';
import { usePhoneLayout } from './TouchPlay';
import { originText } from '../game/systems/origin';
import { useTrackedQuest } from './useTrackedQuest';
import { OpeningGuide } from './OpeningGuide';

export function QuestPanel() {
  const quests = useGame((s) => s.quests);
  const phone = usePhoneLayout();
  const setMenu = useGame((s) => s.setMenu);
  const player = useGame((s) => s.player);
  const nextStory = storyOrder(player).find((id) => quests[id]?.status !== 'done');
  const tracked = useTrackedQuest();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'quest' | 'team'>('quest');
  const active = Object.entries(quests)
    .filter(([, q]) => q.status !== 'done')
    .filter(([id]) => !!QUESTS[id])
    .sort(([a], [b]) => a === tracked ? -1 : b === tracked ? 1 : a === nextStory ? -1 : b === nextStory ? 1 : (QUESTS[a].kind === QUESTS[b].kind ? a.localeCompare(b) : QUESTS[a].kind === 'main' ? -1 : 1));

  return (
    <div className={`quest-panel panel-glass ${open ? '' : 'collapsed'}`}>
      <div className="quest-tabs">
        <button className={tab === 'quest' ? 'active' : ''} onClick={() => setTab('quest')}>
          Nhiệm Vụ
        </button>
        <button className={tab === 'team' ? 'active' : ''} onClick={() => setTab('team')}>
          Đội
        </button>
        <button className="quest-toggle" onClick={() => setOpen(!open)} aria-label="Thu gọn">
          {open ? '‹' : '›'}
        </button>
      </div>
      {open && tab === 'quest' && (
        <>
        <button className="story-tracker" onClick={() => setMenu('journey')}>
          <small>{originText(nextStory ? storyChapter(nextStory) : 'Thanh Vân Truyện',player)}</small>
          <span>{nextStory ? QUESTS[nextStory].name : 'Tiên lộ đang viết tiếp'} <b>›</b></span>
        </button>
        <ul className="quest-list">
          {active.length === 0 && <li className="muted">Không có nhiệm vụ. Hãy tìm NPC có dấu !</li>}
          {(phone ? active.slice(0, 1) : active).map(([id, q]) => {
            const def = QUESTS[id];
            const remaining = def.objectives.map((o, i) => ({ o, i })).filter(({ o, i }) => (q.progress[i] ?? 0) < o.count);
            return (
              <li key={id} className={`quest-go ${q.status === 'ready' ? 'ready' : ''}`} onClick={() => EventBus.emit('cmd:questGo', id)} title="Bấm để tự chạy tới">
                <div className="quest-title">
                  <span className={`quest-kind ${def.kind}`}>[{def.kind === 'main' ? 'Chính' : 'Phụ'}]</span> {def.name}
                </div>
                {q.status === 'ready' && def.turnIn ? (
                  <div className="quest-obj done">Trả nhiệm vụ: {npcName(def.turnIn)}</div>
                ) : (
                  (phone ? remaining.slice(0, 1) : def.objectives.map((o, i) => ({ o, i }))).map(({ o, i }) => (
                    <div key={i} className="quest-obj">
                      {objectiveText(o, questNames)} ({q.progress[i] ?? 0}/{o.count})
                    </div>
                  ))
                )}
              </li>
            );
          })}
        </ul>
        <OpeningGuide />
        {phone && <button className="quest-details" onClick={() => setMenu('journey')}>Tiên Lộ · Xem chi tiết ›</button>}
        </>
      )}
      {open && tab === 'team' && <div className="muted pad">Bản demo offline chưa hỗ trợ tổ đội.</div>}
    </div>
  );
}
