import { useRef, type CSSProperties } from 'react';
import { useStore } from 'zustand';
import { SKILLS } from '../data';
import { optimizedAsset } from '../data/assetDelivery';
import { statusEffectStore } from '../store/statusEffectStore';
import {
  activeStatusEffects,
  type ActiveStatusEffect,
  type StatusEffectId,
} from '../game/systems/statusEffects';
import type { ArenaFighter } from '../game/systems/arena';
import './status-effects.css';

const INFO: Record<StatusEffectId, { label: string; icon: number; tone: string }> = {
  shield: { label: 'Lá chắn', icon: 0, tone: 'buff' },
  invulnerable: { label: 'Miễn sát thương', icon: 1, tone: 'buff' },
  root: { label: 'Trói chân', icon: 2, tone: 'debuff' },
  weaken: { label: 'Suy yếu phòng ngự', icon: 3, tone: 'debuff' },
  slow: { label: 'Làm chậm', icon: 4, tone: 'debuff' },
};
export function StatusEffects({
  effects,
  compact = false,
}: {
  effects: ActiveStatusEffect[];
  compact?: boolean;
}) {
  const previous = useRef<Record<string, { remaining: number; duration: number }>>({});
  const visible = effects.filter((e) => e.remainingMs > 0);
  const next: typeof previous.current = {};
  const items = visible.map((effect) => {
    const old = previous.current[effect.id];
    const duration =
      effect.durationMs ??
      (!old || effect.remainingMs > old.remaining + 150 ? effect.remainingMs : old.duration);
    next[effect.id] = { remaining: effect.remainingMs, duration };
    const info = INFO[effect.id],
      label = effect.source ? (SKILLS[effect.source]?.name ?? info.label) : info.label;
    const seconds = effect.remainingMs / 1000,
      text = seconds < 1 ? `${seconds.toFixed(1)}s` : `${Math.ceil(seconds)}s`;
    return { effect, info, label, text, duration };
  });
  previous.current = next;
  if (!items.length) return null;
  return (
    <div
      className={`status-effects${compact ? ' compact' : ''}`}
      role="group"
      aria-label="Hiệu ứng đang có"
    >
      {items.map(({ effect, info, label, text, duration }) => {
        const x = (info.icon % 4) * 384,
          y = info.icon < 4 ? 94 : 534;
        const description = `${label} · Còn ${text}${effect.strength ? ` · Hấp thu ${Math.ceil(effect.strength).toLocaleString('vi-VN')}` : ''}`;
        return (
          <button
            type="button"
            key={effect.id}
            className={`status-effect ${info.tone}${effect.remainingMs < 2000 ? ' expiring' : ''}`}
            data-effect-id={effect.id}
            data-remaining-ms={Math.ceil(effect.remainingMs)}
            title={description}
            aria-label={description}
            style={
              {
                '--effect-progress': `${Math.min(1, effect.remainingMs / Math.max(1, duration)) * 360}deg`,
              } as CSSProperties
            }
          >
            <svg viewBox={`${x} ${y} 384 384`} aria-hidden="true">
              <image
                href={optimizedAsset('/assets/ui/buff-icons-v1.png')}
                width="1536"
                height="1024"
              />
            </svg>
            <span className="status-effect-time">{text}</span>
            <span className="status-effect-tip" aria-hidden="true">
              {description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
export function WorldStatusEffects() {
  const effects = useStore(statusEffectStore, (s) => s.effects);
  return <StatusEffects effects={effects} />;
}
export function ArenaStatusEffects({
  fighter,
  elapsed,
}: {
  fighter: ArenaFighter;
  elapsed: number;
}) {
  return (
    <StatusEffects
      compact
      effects={activeStatusEffects({
        alive: fighter.hp > 0,
        shield: fighter.shield,
        shieldMs: fighter.shieldUntil - elapsed,
        invulnerableMs: fighter.invulnUntil - elapsed,
        rootMs: fighter.rootUntil - elapsed,
        weakenMs: fighter.weakenUntil - elapsed,
        slowMs: fighter.slowUntil - elapsed,
      })}
    />
  );
}
