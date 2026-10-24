import type { LootEntry, QuestRewards, RarityId } from '../data';
import { rarityOf } from '../data';
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

function chanceText(chance: number) {
  const pct = chance * 100;
  return pct < 1 ? `${pct.toFixed(1)}%` : `${Math.round(pct * 10) / 10}%`;
}

/** Possible bonus drops. These are not guaranteed. */
export function DropChanceList({ drops }: { drops: LootEntry[] }) {
  return (
    <div className="reward-list">
      {drops.map((d) => {
        const gear = d.item.startsWith('gear:') ? rarityOf(d.item.slice(5) as RarityId) : null;
        const name = gear ? `Trang bị ${gear.label}` : itemName(d.item);
        return (
          <span key={d.item} className="reward" style={gear ? { color: gear.color } : undefined} title="Tỉ lệ thấp, không phải lần nào cũng có">
            {name} · {chanceText(d.chance)}
          </span>
        );
      })}
    </div>
  );
}
