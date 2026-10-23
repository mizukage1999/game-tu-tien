import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { SkillId } from '../data';
import { EventBus } from '../game/EventBus';
import { itemIconUrl, skillSpriteUrl } from '../game/art/icons';
import { effectiveSkill, skillLevel } from '../game/systems/skills';
import { useGame } from '../store/gameStore';
import { heroName, isChildhood } from '../game/systems/origin';

function SkillButton({ id, className }: { id: SkillId; className: string }) {
  const cd = useGame((s) => s.cooldowns[id] ?? 0);
  const mp = useGame((s) => s.player.mp);
  const sex = useGame((s) => s.player.sex);
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
      <img src={skillSpriteUrl(id, sex)} alt={sk.name} draggable={false} />
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
  const childhood = useGame((s) => isChildhood(s.player));
  const name = useGame(s=>heroName(s.player));
  const setMenu = useGame((s) => s.setMenu);
  if (childhood) return <div className="childhood-actions panel-glass"><small>NHỮNG NGÀY CÒN THƠ</small><button className="btn gold" onClick={() => setMenu('journey')}>Nhật ký {name}</button><button className="btn" onClick={() => EventBus.emit('cmd:interact')}>Trò chuyện / Tương tác <kbd>E</kbd></button></div>;

  return (
    <div className="skill-bar">
      <button className={`round-btn auto-btn ${auto ? 'on' : ''}`} onClick={() => setAuto(!auto)} title="Tự động chiến đấu [T]">
        <img src="/assets/ui/skill-auto.svg" alt="" aria-hidden="true" draggable={false} />
        <span className="auto-label">{auto ? 'ON' : 'T'}</span>
      </button>
      <button className="round-btn target-btn" onPointerDown={() => EventBus.emit('cmd:target')} title="Đổi mục tiêu [Tab]">
        <img src="/assets/ui/skill-target.png" alt="" aria-hidden="true" draggable={false} />
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
