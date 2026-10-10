import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { SkillId } from '../data';
import { EventBus } from '../game/EventBus';
import { itemIconUrl, skillIconUrl } from '../game/art/icons';
import { effectiveSkill, skillLevel } from '../game/systems/skills';
import { useGame } from '../store/gameStore';

function SkillButton({ id, className }: { id: SkillId; className: string }) {
  const cd = useGame((s) => s.cooldowns[id] ?? 0);
  const mp = useGame((s) => s.player.mp);
  const level = useGame((s) => skillLevel(s.player.skills, id));
  const sk = useMemo(() => effectiveSkill(id, level), [id, level]);
  const pct = cd > 0 ? Math.min(1, cd / sk.cooldownMs) : 0;
  const noMp = mp < sk.mpCost;
  const style = { '--cd': `${pct * 360}deg` } as CSSProperties;
  return (
    <button
      className={`skill-btn ${className} ${cd > 0 ? 'cooling' : ''} ${noMp ? 'no-mp' : ''}`}
      style={style}
      title={`${sk.name} cấp ${level} [${sk.key}] - ${sk.desc} (MP ${sk.mpCost})`}
      onPointerDown={(e) => {
        e.preventDefault();
        EventBus.emit('cmd:skill', id);
      }}
    >
      <img src={skillIconUrl(id, 96)} alt={sk.name} draggable={false} />
      {cd > 0 && id !== 'basic' && <span className="skill-cd">{(cd / 1000).toFixed(1)}</span>}
      <span className="skill-key">{sk.key.split(' ')[0]}</span>
      {level > 1 && <span className={`skill-badge ${sk.active ? 'awakened' : ''}`}>{level}</span>}
    </button>
  );
}

export function SkillBar() {
  const auto = useGame((s) => s.auto);
  const setAuto = useGame((s) => s.setAuto);
  const potions = useGame((s) => s.player.inventory.hoi_xuan_dan ?? 0);
  const consumeItem = useGame((s) => s.consumeItem);

  return (
    <div className="skill-bar">
      <button className={`round-btn auto-btn ${auto ? 'on' : ''}`} onClick={() => setAuto(!auto)} title="Tự động chiến đấu [T]">
        <span>{auto ? 'Đang' : 'Tự'}</span>
        <span>{auto ? 'Tự Động' : 'Động'}</span>
      </button>
      <button className="round-btn target-btn" onPointerDown={() => EventBus.emit('cmd:target')} title="Đổi mục tiêu [Tab]">
        ◎
      </button>
      <SkillButton id="phi_kiem" className="pos-s1" />
      <SkillButton id="bang_tam_tram" className="pos-s2" />
      <SkillButton id="han_bang_tran" className="pos-s3" />
      <SkillButton id="than_phap" className="pos-dash" />
      <button className="skill-btn pos-potion" onPointerDown={() => consumeItem('hoi_xuan_dan')} title="Hồi Xuân Đan [Q]">
        <img src={itemIconUrl('hoi_xuan_dan', 64)} alt="Hồi Xuân Đan" draggable={false} />
        <span className="skill-count">{potions}</span>
        <span className="skill-key">Q</span>
      </button>
      <SkillButton id="basic" className="pos-main" />
    </div>
  );
}
