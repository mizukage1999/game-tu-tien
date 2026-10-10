import type { QuestRewards } from '../data';
import { itemIconUrl } from '../game/art/icons';
import { itemName } from '../store/gameStore';

export function RewardList({ rewards }: { rewards: QuestRewards }) {
  const items = Object.entries(rewards.items ?? {});
  return (
    <div className="reward-list">
      {rewards.exp ? <span className="reward exp">{rewards.exp} EXP</span> : null}
      {rewards.linhKhi ? (
        <span className="reward" title="Linh Khí">
          <img src={itemIconUrl('linh_khi', 24)} alt="" /> {rewards.linhKhi}
        </span>
      ) : null}
      {items.map(([id, n]) => (
        <span key={id} className="reward" title={itemName(id)}>
          <img src={itemIconUrl(id, 24)} alt="" /> {itemName(id)} x{n}
        </span>
      ))}
    </div>
  );
}
