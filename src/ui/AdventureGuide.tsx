import { EventBus } from '../game/EventBus';
import { adventure } from '../game/systems/adventure';
import { lifeProgress } from '../game/systems/life';
import { fieldForLevel } from '../game/systems/scale';
import { breakthroughPillCount, expToNext, realmFor } from '../game/systems/progression';
import { useGame } from '../store/gameStore';
import './opening-guide.css';

/** Continue the same contextual guide after the first guaranteed weapon. */
export function AdventureGuide() {
  const player = useGame((s) => s.player),
    quests = useGame((s) => s.quests);
  const dungeon = useGame((s) => s.dungeon),
    status = useGame((s) => s.status);
  const setMenu = useGame((s) => s.setMenu),
    patch = useGame((s) => s.patch);
  const s = { player, quests, dungeon, status, setMenu, patch };
  if (s.quests.first_return?.status !== 'done' || s.dungeon || s.status !== 'alive') return null;
  const p = s.player,
    field = fieldForLevel(p.level),
    pills = breakthroughPillCount(p.realmIndex);
  const bottled =
    !!realmFor(p.realmIndex).breakthrough &&
    p.level >= realmFor(p.realmIndex).maxLevel &&
    p.exp >= expToNext(p.level);
  const openAlchemy = () => {
    s.setMenu('journey');
    s.patch({ journeySection: 'alchemy' });
  };
  let text: string, label: string, action: () => void;
  if (!p.equipment.weapon) {
    text = 'Kiếm đầu tiên đã nhận · mở Nhân Vật để trang bị.';
    label = 'Trang bị';
    action = () => s.setMenu('character');
  } else if ((adventure(p).enhancements[p.equipment.weapon] ?? 0) < 1) {
    text = 'Cường hóa vũ khí lên +1 · Đá Cường Hóa nhận khi vượt phó bản.';
    label = 'Nhân vật';
    action = () => s.setMenu('character');
  } else if (bottled) {
    const enough = (p.inventory.pha_canh_dan ?? 0) >= pills;
    text = enough
      ? 'Đã đủ đan · về Linh Đài tông môn để chuẩn bị vượt Thiên Kiếp.'
      : `Bình cảnh · cần ${pills.toLocaleString('vi-VN')} Phá Cảnh Đan. Hái linh thảo ở ${field.name}, săn yêu thú và vượt phó bản cùng cấp.`;
    label = enough ? 'Tu luyện' : 'Đan Phòng';
    action = enough ? () => s.setMenu('cultivate') : openAlchemy;
  } else if (!lifeProgress(p).companion && p.level < 30) {
    text = 'Tự đánh bại Linh Thú để tích dấu thu phục; linh thú hỗ trợ chiến đấu.';
    label = 'Linh thú';
    action = () => {
      s.setMenu('journey');
      s.patch({ journeySection: 'companions' });
    };
  } else {
    text =
      p.level >= 80
        ? `Thử phó bản phù hợp cấp ${p.level} hoặc mời đội 2–3 người. Boss cấp cao cần diệt hộ vệ để phá lá chắn.`
        : `Tiếp tục ở ${field.name} · tăng EXP, thu nguyên liệu và chuẩn bị đột phá tiếp theo.`;
    label = p.level >= 80 ? 'Phó bản' : 'Đến vùng luyện';
    action =
      p.level >= 80 ? () => s.setMenu('dungeon') : () => EventBus.emit('cmd:travel', field.id);
  }
  return (
    <aside className="opening-guide" aria-label="Mục tiêu tiếp theo">
      <span title={text}>✧ {text}</span>
      <button type="button" onClick={action}>
        {label} ›
      </button>
    </aside>
  );
}
