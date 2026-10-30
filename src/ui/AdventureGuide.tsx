import { EventBus } from '../game/EventBus';
import { adventureGoal } from '../game/systems/adventureGoal';
import { useGame } from '../store/gameStore';
import './opening-guide.css';

export function AdventureGuide() {
  const player = useGame((s) => s.player),
    quests = useGame((s) => s.quests),
    mapId = useGame((s) => s.mapId);
  const dungeon = useGame((s) => s.dungeon),
    status = useGame((s) => s.status);
  const setMenu = useGame((s) => s.setMenu),
    patch = useGame((s) => s.patch);
  if (quests.first_return?.status !== 'done' || dungeon || status !== 'alive') return null;
  const goal = adventureGoal(player, quests, mapId),
    to = goal.destination;
  const go = () => {
    if ('travel' in to) EventBus.emit('cmd:travel', to.travel);
    else if ('quest' in to) EventBus.emit('cmd:questGo', to.quest);
    else {
      setMenu(to.menu);
      if (to.section) patch({ journeySection: to.section });
    }
  };
  return (
    <aside className="opening-guide next-goal" aria-label="Mục tiêu tiếp theo" data-goal={goal.id}>
      <div>
        <small>TIẾP THEO</small>
        <span title={goal.text}>{goal.text}</span>
        {goal.progress && (
          <div className="goal-progress">
            <progress
              max={Math.max(1, goal.progress.max)}
              value={Math.min(goal.progress.max, goal.progress.value)}
              aria-label={goal.progress.label}
            />
            <small>
              {goal.progress.label} · {goal.progress.value.toLocaleString('vi-VN')}/
              {goal.progress.max.toLocaleString('vi-VN')}
            </small>
          </div>
        )}
      </div>
      <button type="button" onClick={go}>
        {goal.label} ›
      </button>
    </aside>
  );
}
