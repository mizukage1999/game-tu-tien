import type { CSSProperties, ReactNode } from 'react';
import { ITEMS, type SkillId } from '../../data';
import { useGame } from '../../store/gameStore';
import { itemIconUrl } from '../../game/art/icons';
import './cultivation-ui.css';
import { SKILL_ATLAS_ORDER } from '../../game/art/skillIcons';
import { usePremium } from '../../net/premium';
import { heroSpell } from '../../data/heroSkills';
import { HeroSpellGlyph } from '../HeroArt';
import { wangEffect } from '../../data/wangSkills';
import { WangSkillGlyph } from '../WangSkillArt';

export function SkillGlyph({ id, className = '' }: { id: SkillId; className?: string }) {
  if (wangEffect(id)?.grid) return <WangSkillGlyph id={id} className={`cult-skill-glyph ${className}`} />;
  if (heroSpell(id)) return <HeroSpellGlyph id={id} className={`cult-skill-glyph ${className}`} />;
  const index = SKILL_ATLAS_ORDER.indexOf(id);
  return (
    <span
      aria-hidden="true"
      className={`cult-skill-glyph ${className}`}
      style={{ backgroundPosition: `${(index % 5) * 25}% ${Math.floor(index / 5) * 50}%` }}
    />
  );
}
export function CultivationWallet() {
  const p = useGame((s) => s.player);
  const premium = usePremium();
  return (
    <div className="cult-wallet" aria-label="Tài nguyên hiện có">
      {[
        ['linh_khi', p.linhKhi],
        ['linh_thach', p.inventory.linh_thach ?? 0],
        ['tien_ngoc', premium.balance],
      ].map(([id, n]) => (
        <span
          key={id}
          title={id === 'tien_ngoc' ? 'Tiên Ngọc' : (ITEMS[String(id)]?.name ?? String(id))}
        >
          {id === 'tien_ngoc' ? (
            <i className="cult-jade-icon" aria-hidden="true">
              ◈
            </i>
          ) : (
            <img src={itemIconUrl(String(id), 28)} alt="" />
          )}
          <b>{Number(n).toLocaleString('vi-VN')}</b>
        </span>
      ))}
    </div>
  );
}
export function CultivationCorners() {
  return (
    <div className="cult-frame-corners" aria-hidden="true">
      {['tl', 'tr', 'br', 'bl'].map((c) => (
        <svg key={c} className={c} viewBox="0 0 60 60">
          <path d="M2 56V18Q2 2 18 2H56M8 48V20Q8 8 20 8H48M2 30Q14 28 14 16Q25 15 30 2M8 38Q24 33 24 23Q35 23 38 8M14 16L19 21L14 26L9 21Z" />
        </svg>
      ))}
    </div>
  );
}
export function CultHeading({ children }: { children: ReactNode }) {
  return (
    <h4 className="cult-heading">
      <span aria-hidden="true">✦</span>
      {children}
    </h4>
  );
}
export function CultLock() {
  return (
    <svg className="cult-lock" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 9V6a4 4 0 0 1 8 0v3M5 9h10v8H5zM10 12v2" />
    </svg>
  );
}
export function CultMeter({
  label,
  value,
  max,
  color = 'blue',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) {
  return (
    <div className={`cult-meter ${color}`}>
      <span>{label}</span>
      <div>
        <i style={{ width: `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%` }} />
        <b>
          {Math.floor(value).toLocaleString('vi-VN')} / {max.toLocaleString('vi-VN')}
        </b>
      </div>
    </div>
  );
}
export function EquipGlyph({ id, empty, color }: { id?: string; empty?: string; color?: string }) {
  return (
    <span
      className="cult-equip-glyph"
      style={{ '--item-color': color ?? '#ba9e68' } as CSSProperties}
    >
      {id ? (
        <img src={itemIconUrl(id, 72)} alt="" />
      ) : (
        <span aria-hidden="true">{empty ?? '◇'}</span>
      )}
    </span>
  );
}
