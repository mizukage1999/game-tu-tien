import { useState } from 'react';
import { QUESTS } from '../data';
import { EventBus } from '../game/EventBus';
import { objectiveText } from '../game/systems/quest';
import { npcName, questNames, useGame } from '../store/gameStore';

export function QuestPanel() {
  const quests = useGame((s) => s.quests);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'quest' | 'team'>('quest');
  const active = Object.entries(quests)
    .filter(([, q]) => q.status !== 'done')
    .sort(([a], [b]) => (QUESTS[a].kind === QUESTS[b].kind ? a.localeCompare(b) : QUESTS[a].kind === 'main' ? -1 : 1));

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
        <ul className="quest-list">
          {active.length === 0 && <li className="muted">Không có nhiệm vụ. Hãy tìm NPC có dấu !</li>}
          {active.map(([id, q]) => {
            const def = QUESTS[id];
            return (
              <li key={id} className={`quest-go ${q.status === 'ready' ? 'ready' : ''}`} onClick={() => EventBus.emit('cmd:questGo', id)} title="Bấm để tự chạy tới">
                <div className="quest-title">
                  <span className={`quest-kind ${def.kind}`}>[{def.kind === 'main' ? 'Chính' : 'Phụ'}]</span> {def.name}
                </div>
                {q.status === 'ready' && def.turnIn ? (
                  <div className="quest-obj done">Trả nhiệm vụ: {npcName(def.turnIn)}</div>
                ) : (
                  def.objectives.map((o, i) => (
                    <div key={i} className="quest-obj">
                      {objectiveText(o, questNames)} ({q.progress[i] ?? 0}/{o.count})
                    </div>
                  ))
                )}
              </li>
            );
          })}
        </ul>
      )}
      {open && tab === 'team' && <div className="muted pad">Bản demo offline chưa hỗ trợ tổ đội.</div>}
    </div>
  );
}
