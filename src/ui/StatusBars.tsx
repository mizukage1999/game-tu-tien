import { useGame } from '../store/gameStore';
import { realmNameAtLevel } from '../game/systems/progression';
import { itemIconUrl } from '../game/art/icons';

function Bar({ value, max, kind }: { value: number; max: number; kind: 'hp' | 'mp' }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={`bar bar-${kind}`}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
      <span className="bar-text">
        {Math.round(value)} / {max}
      </span>
    </div>
  );
}

export function StatusBars() {
  const player = useGame((s) => s.player);
  const stats = useGame((s) => s.stats);
  const status = useGame((s) => s.status);

  return (
    <div className="status panel-glass">
      <div className={`avatar ${status === 'downed' ? 'avatar-down' : ''}`}>
        <img
          src={player.sex === 'male' ? '/assets/sprites/wang-lin-portrait.png' : '/assets/sprites/li-mu-uyen-portrait.png'}
          alt=""
        />
        <span className="avatar-level">{player.level}</span>
      </div>
      <div className="status-info">
        <div className="status-name">{player.name}</div>
        <div className="status-realm">
          Lv. {player.level} <span>{realmNameAtLevel(player.level)}</span>
        </div>
        <Bar value={player.hp} max={stats.maxHp} kind="hp" />
        <Bar value={player.mp} max={stats.maxMp} kind="mp" />
        <div className="status-res">
          <span title="Linh Khí">
            <img src={itemIconUrl('linh_khi', 32)} alt="" /> {player.linhKhi}
          </span>
          <span title="Linh Thạch">
            <img src={itemIconUrl('linh_thach', 32)} alt="" /> {player.inventory.linh_thach ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}
