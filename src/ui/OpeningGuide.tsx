import { ITEMS, QUESTS } from '../data';
import { storyOrder } from '../game/systems/immortal';
import { EventBus } from '../game/EventBus';
import { isChildhood } from '../game/systems/origin';
import { useGame } from '../store/gameStore';
import { FIRST_TRIAL } from '../data/openingAdventure';
import './opening-guide.css';

/** One contextual hint inside the existing quest panel, never a modal over movement. */
export function OpeningGuide() {
  const player = useGame((s) => s.player),
    quests = useGame((s) => s.quests);
  const dungeon = useGame((s) => s.dungeon),
    auto = useGame((s) => s.auto);
  const stats = useGame((s) => s.stats),
    status = useGame((s) => s.status);
  const setMenu = useGame((s) => s.setMenu),
    patch = useGame((s) => s.patch);
  const setAuto = useGame((s) => s.setAuto),
    consume = useGame((s) => s.consumeItem);
  if (status !== 'alive' || quests.first_return?.status === 'done') return null;
  if (isChildhood(player) || quests.main_0?.status !== 'done') {
    const next = storyOrder(player).find((id) => quests[id]?.status !== 'done');
    if (!next) return null;
    const ready = quests[next]?.status === 'ready';
    return (
      <aside className="opening-guide" aria-label="Mục tiêu tiếp theo">
        <span>
          {ready
            ? 'Đã hoàn thành · trở về trả nhiệm vụ'
            : quests[next]
              ? 'Theo nhiệm vụ để tiếp tục hành trình'
              : 'Tìm người giao nhiệm vụ'}
          : {QUESTS[next].name}.
        </span>
        <button type="button" onClick={() => EventBus.emit('cmd:questGo', next)}>
          {ready ? 'Trả nhiệm vụ' : 'Đi tiếp'} ›
        </button>
      </aside>
    );
  }
  const practice = player.practice ?? {};
  let text = '',
    label = '',
    action: (() => void) | undefined;
  if (player.hp < stats.maxHp * 0.5 && player.inventory.hoi_xuan_dan > 0) {
    text = 'Sinh lực thấp · dùng Hồi Xuân Đan để hồi phục.';
    label = 'Dùng đan';
    action = () => consume('hoi_xuan_dan');
  } else if (dungeon?.id === FIRST_TRIAL) {
    text =
      dungeon.phase === 'cleared'
        ? 'Đã lấy ngọc ấn · rời bí cảnh rồi về gặp Vân Hạc.'
        : dungeon.phase === 'failed'
          ? 'Trở về tông môn chuẩn bị đan dược; có thể thử lại.'
          : dungeon.phase === 'boss'
            ? 'Vòng đỏ: lướt ra ngoài, chờ boss nghỉ rồi phản công.'
            : 'Giữ khoảng cách với linh vệ; để dành MP cho nút Lướt.';
  } else if (
    !player.equipment.weapon &&
    Object.keys(player.inventory).some(
      (id) => player.inventory[id] > 0 && ITEMS[id]?.slot === 'weapon',
    )
  ) {
    text = 'Trang bị vũ khí trước khi rời tông môn.';
    label = 'Trang bị';
    action = () => setMenu('character');
  } else if (auto && ((practice.basic ?? 0) < 3 || !practice.skill || !practice.dash)) {
    text = 'Tắt Auto để luyện đánh và lướt bằng tay.';
    label = 'Tắt Auto';
    action = () => setAuto(false);
  } else if ((practice.basic ?? 0) < 3) {
    text = `Bấm đánh thường khi ở gần quái (${Math.min(3, practice.basic ?? 0)}/3).`;
  } else if (!practice.skill) {
    text = 'Bấm một ô kỹ năng cạnh đánh thường để thi triển chiêu.';
  } else if (!practice.dash) {
    text = 'Kéo hướng di chuyển rồi bấm Lướt · PC dùng Shift.';
  } else if (quests.first_boss?.status === 'active') {
    text = 'Đã chuẩn bị xong · thử sức với Ngọc Ấn Thủ Hộ.';
    label = 'Bí cảnh';
    action = () => setMenu('dungeon');
  } else if (quests.first_return) {
    text = 'Mang ngọc ấn về gặp Vân Hạc để nối tiếp tiên lộ.';
    label = 'Trở về';
    action = () => EventBus.emit('cmd:questGo', 'first_return');
  } else if (quests.main_duoc?.status === 'done' && quests.main_dan?.status !== 'done') {
    text = 'Luyện đan tại Đan Phòng; yêu cầu nguyên liệu nằm ngay trên công thức.';
    label = 'Đan Phòng';
    action = () => {
      setMenu('journey');
      patch({ journeySection: 'alchemy' });
    };
  }
  if (!text) {
    const next = storyOrder(player).find((id) => quests[id]?.status !== 'done');
    if (!next) return null;
    text = `Tiếp tục nhiệm vụ: ${QUESTS[next].name}.`;
    label = 'Đi tiếp';
    action = () => EventBus.emit('cmd:questGo', next);
  }
  return (
    <aside className="opening-guide" aria-label="Hướng dẫn nhập môn">
      <span title={text}>✧ {text}</span>
      {action && (
        <button type="button" onClick={action}>
          {label} ›
        </button>
      )}
    </aside>
  );
}
