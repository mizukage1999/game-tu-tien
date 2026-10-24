import { useState } from 'react';
import { QUESTS } from '../../data';
import { EventBus } from '../../game/EventBus';
import { itemIconUrl } from '../../game/art/icons';
import { storyOrder, storyChapter } from '../../game/systems/immortal';
import { isChildhood, originText } from '../../game/systems/origin';
import { objectiveText } from '../../game/systems/quest';
import { itemName, questNames, useGame } from '../../store/gameStore';
import { JourneyScenery } from './JourneyScenery';

export function StoryChapters() {
  const player = useGame(s => s.player), quests = useGame(s => s.quests);
  const acceptQuest = useGame(s => s.acceptQuest);
  const order = storyOrder(player);
  const chapters = [...new Set(order.map(storyChapter))];
  const current = order.find(id => quests[id]?.status !== 'done');
  const [selected, setSelected] = useState(current ? storyChapter(current) : chapters[0]);
  const ids = order.filter(id => storyChapter(id) === selected);
  const done = ids.filter(id => quests[id]?.status === 'done').length;
  const focus = ids.find(id => quests[id]?.status !== 'done') ?? ids[0];
  const village = ids[0]?.startsWith('village_');
  const title = village ? 'Vương Gia Thôn' : selected.split(' · ').slice(1).join(' · ') || selected;
  return <div className="journey-book">
    <nav className="journey-chapters" aria-label="Chương truyện">{chapters.map((chapter, i) => {
      const entries = order.filter(id => storyChapter(id) === chapter);
      const count = entries.filter(id => quests[id]?.status === 'done').length;
      const locked = !entries.some(id => quests[id] || (!QUESTS[id].requires || quests[QUESTS[id].requires!]?.status === 'done'));
      return <button key={chapter} className={`${selected === chapter ? 'selected' : ''} ${locked ? 'locked' : ''}`} aria-current={selected === chapter ? 'step' : undefined} onClick={() => setSelected(chapter)}>
        <span className="chapter-medallion">{String(i + 1).padStart(2, '0')}</span><span><b>{originText(chapter.split(' · ').slice(1).join(' · ') || chapter,player)}</b><small>{locked ? 'Chưa mở' : `${count}/${entries.length} nhiệm vụ`}</small></span><span className="chapter-state" aria-hidden="true">{locked ? '◇' : count === entries.length ? '✓' : '›'}</span>
      </button>;
    })}</nav>
    <section className="journey-chapter-content" aria-label={selected}>
      <header className="journey-chapter-hero"><JourneyScenery village={village}/><div><small>{selected.split(' · ')[0]}</small><h2>{title}</h2><p>{originText(focus ? QUESTS[focus].story ?? QUESTS[focus].desc : 'Một đời cầu đạo, từng bước đi xa.',player)}</p></div></header>
      <div className="journey-task-list">{ids.map((id, i) => {
        const def = QUESTS[id], q = quests[id];
        const available = !q && (!def.requires || quests[def.requires]?.status === 'done') && (!isChildhood(player) || id.startsWith('village_'));
        const active = q && q.status !== 'done';
        const total = def.objectives.reduce((n, o) => n + o.count, 0);
        const progress = def.objectives.reduce((n, o, j) => n + Math.min(q?.progress[j] ?? 0, o.count), 0);
        return <article key={id} className={`journey-task ${active || available ? 'current' : ''} ${q?.status === 'done' ? 'complete' : ''}`}>
          <span className="task-medallion" aria-hidden="true">{q?.status === 'done' ? '✓' : String(i + 1).padStart(2, '0')}</span>
          <div className="journey-task-copy"><h4>{originText(def.name,player)}</h4><p>{q?.status === 'ready' ? 'Đã đủ điều kiện · trở về trả nhiệm vụ' : originText(def.desc,player)}</p>
            <div className="journey-task-progress" role="progressbar" aria-label={def.name} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${100 * progress / total}%` }}/><small>{progress}/{total}</small></div>
            {active && <details><summary>Mục tiêu chi tiết</summary>{def.objectives.map((o, j) => <div key={j}>{objectiveText(o, questNames)} · {q.progress[j] ?? 0}/{o.count}</div>)}</details>}
          </div>
          <div className="journey-task-rewards" aria-label="Phần thưởng">{!!def.rewards.exp && <span className="journey-exp"><b>EXP</b><small>+{def.rewards.exp}</small></span>}{Object.entries(def.rewards.items ?? {}).map(([item, count]) => <span key={item} title={itemName(item)}><img src={itemIconUrl(item)} alt={itemName(item)}/><small>×{count}</small></span>)}{!!def.rewards.linhKhi && <span className="journey-qi"><b>氣</b><small>+{def.rewards.linhKhi}</small></span>}</div>
          <button className={`btn ${active || available ? 'gold' : ''}`} disabled={!active && !available} onClick={() => available ? acceptQuest(id) : EventBus.emit('cmd:questGo', id)}>{q?.status === 'done' ? 'Hoàn thành' : available ? 'Nhận' : q?.status === 'ready' ? 'Trả nhiệm vụ' : active ? 'Đến' : 'Chưa mở'}</button>
        </article>;
      })}</div>
      <footer className="journey-chapter-footer"><span>Tiến trình chương</span><progress max={ids.length} value={done}/><b>{done}/{ids.length}</b><span>{done === ids.length ? 'Đã hoàn thành chương' : 'Hoàn thành nhiệm vụ để mở tiếp cốt truyện'}</span></footer>
    </section>
  </div>;
}
