import { useGame } from '../store/gameStore';
import { realmFor } from '../game/systems/progression';
import { playerArt } from '../game/systems/character';
import { itemIconUrl, portraitUrl } from '../game/art/icons';

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
  const realm = realmFor(player.realmIndex);

  return (
    <div className="status panel-glass">
      <div className={`avatar ${status === 'downed' ? 'avatar-down' : ''}`}>
        <img src={portraitUrl(playerArt(player.sex), 128)} alt="" />
        <span className="avatar-level">{player.level}</span>
      </div>
      <div className="status-info">
        <div className="status-name">{player.name}</div>
        <div className="status-realm">
          Lv. {player.level} <span>{realm.name}</span>
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
