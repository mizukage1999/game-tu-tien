import { DUNGEONS } from '../data';
import { EventBus } from '../game/EventBus';
import { useGame, type DungeonHud } from '../store/gameStore';
import type { QuestRewards } from '../data';
import { RewardList } from './Rewards';

function phaseText(d: DungeonHud) {
  switch (d.phase) {
    case 'intro':
      return 'Chuẩn bị...';
    case 'wave':
      return `Đợt ${d.wave}/${d.waves}`;
    case 'boss':
      return 'Thủ lĩnh xuất hiện';
    case 'cleared':
      return 'Đã vượt ải';
    case 'failed':
      return 'Thất bại';
  }
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

function droppedRewards(list: { item: string; qty: number }[]): QuestRewards {
  const items: Record<string, number> = {};
  for (const d of list) items[d.item] = (items[d.item] ?? 0) + d.qty;
  return { items };
}

export function DungeonPanel() {
  const d = useGame((s) => s.dungeon);
  if (!d) return null;
  const urgent = d.timeLeft <= 30 && d.phase !== 'cleared' && d.phase !== 'failed';
  return (
    <div className="dungeon-panel panel-glass">
      <div className="dungeon-head">
        <span className="dungeon-name">{d.name}</span>
        <span className={`dungeon-timer ${urgent ? 'urgent' : ''}`}>{clock(d.timeLeft)}</span>
      </div>
      <div className="dungeon-phase">
        {phaseText(d)}
        {(d.phase === 'wave' || d.phase === 'boss') && <span className="muted"> · Kẻ địch còn {d.remaining}</span>}
      </div>
      {d.boss && (
        <div className="dungeon-boss">
          <div className="dungeon-boss-name">{d.boss.name}</div>
          <div className="bar bar-hp small">
            <div className="bar-fill" style={{ width: `${(d.boss.hp / d.boss.maxHp) * 100}%` }} />
            <span className="bar-text">
              {d.boss.hp} / {d.boss.maxHp}
            </span>
          </div>
        </div>
      )}
      <button className="btn small" onClick={() => EventBus.emit('cmd:leaveDungeon')}>
        Rời phó bản
      </button>
    </div>
  );
}

export function DungeonResultOverlay() {
  const r = useGame((s) => s.dungeonResult);
  const patch = useGame((s) => s.patch);
  if (!r) return null;
  const def = DUNGEONS[r.id];
  const sec = Math.round(r.elapsedMs / 1000);
  return (
    <div className="dungeon-result panel-ornate">
      <h3 className={r.success ? 'win' : 'lose'}>{r.success ? 'Vượt Ải Thành Công' : 'Khiêu Chiến Thất Bại'}</h3>
      <p className="muted">
        {def.name} · {r.success ? `Thời gian ${clock(sec)}` : 'Đã hết thời gian'}
      </p>
      {r.success && (
        <>
          <h4>Phần thưởng</h4>
          <RewardList rewards={r.rewards} />
          {r.dropped.length > 0 ? (
            <>
              <h4>Đồ rơi thêm</h4>
              <RewardList rewards={droppedRewards(r.dropped)} />
            </>
          ) : (
            <p className="muted">Lần này không rơi thêm trang bị.</p>
          )}
          {r.firstClear && (
            <>
              <h4>Thưởng vượt ải lần đầu</h4>
              <RewardList rewards={r.firstClear} />
            </>
          )}
          <p className="muted">Vật phẩm thủ lĩnh rơi ra vẫn còn trên mặt đất.</p>
        </>
      )}
      <div className="dungeon-result-actions">
        {r.success && (
          <button className="btn" onClick={() => patch({ dungeonResult: null })}>
            Ở lại nhặt đồ
          </button>
        )}
        <button className="btn gold" onClick={() => EventBus.emit('cmd:leaveDungeon')}>
          Rời phó bản
        </button>
      </div>
    </div>
  );
}
