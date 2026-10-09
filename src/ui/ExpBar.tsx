import { expToNext, isBottleneck } from '../game/systems/progression';
import { useGame } from '../store/gameStore';

export function ExpBar() {
  const player = useGame((s) => s.player);
  const need = expToNext(player.level);
  const pct = Math.min(100, (player.exp / need) * 100);
  const capped = isBottleneck(player) && player.exp >= need;
  return (
    <div className={`exp-bar ${capped ? 'capped' : ''}`}>
      <div className="exp-fill" style={{ width: `${pct}%` }} />
      <span>
        {player.exp} / {need} ({Math.floor(pct)}%){capped ? ' · Bình cảnh - cần đột phá' : ''}
      </span>
    </div>
  );
}
