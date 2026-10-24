import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import type { SkillId } from '../data';
import { EventBus } from '../game/EventBus';
import { itemIconUrl, skillSpriteUrl } from '../game/art/icons';
import { effectiveSkill, skillLevel, skillLoadout } from '../game/systems/skills';
import { useGame } from '../store/gameStore';
import { heroName, isChildhood } from '../game/systems/origin';

function SkillButton({ id, className, slot }: { id: SkillId; className: string; slot:number }) {
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
      data-skill={id}
      aria-label={`${sk.name} · ô ${slot+1}`}
      style={style}
      title={`${sk.name} cấp ${level} [${sk.key}] - ${sk.desc} (MP ${sk.mpCost})`}
      onPointerDown={(e) => {
        e.preventDefault();
        EventBus.emit('cmd:skill', id);
      }}
    >
      <img src={skillSpriteUrl(id, sex)} alt={sk.name} draggable={false} />
      {cd > 0 && id !== 'basic' && <span className="skill-cd">{(cd / 1000).toFixed(1)}</span>}
      <span className="skill-key">{slot+1}</span>
      {level > 1 && <span className={`skill-badge ${sk.active ? 'awakened' : ''}`}>{level}</span>}
    </button>
  );
}

export function SkillBar() {
  const player=useGame(s=>s.player);
  const loadout=useMemo(()=>skillLoadout(player),[player]);
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
      {loadout.map((id,i)=><SkillButton key={i} id={id} slot={i} className={['pos-main','pos-s1','pos-s2','pos-s3'][i]}/>)}
      <button className="skill-btn pos-potion" onPointerDown={() => consumeItem('hoi_xuan_dan')} title="Hồi Xuân Đan [Q]">
        <img src={itemIconUrl('hoi_xuan_dan', 64)} alt="Hồi Xuân Đan" draggable={false} />
        <span className="skill-count">{potions}</span>
        <span className="skill-key">Q</span>
      </button>
    </div>
  );
}
