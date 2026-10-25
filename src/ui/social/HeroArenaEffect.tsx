import type { ArenaEffect } from '../../game/systems/arena';
import { ARENA_W, ARENA_H } from '../../game/systems/arena';
import { heroSpell } from '../../data/heroSkills';
import { HeroEffectArt } from '../HeroArt';

/** Position the painted effect over the same line/circle used by the hit test. */
export function HeroArenaEffect({ effect: e, elapsed }: { effect: ArenaEffect; elapsed: number }) {
  const art = heroSpell(e.skill);
  if (!art) return null;
  const directed = art.shape === 'line' || art.shape === 'cone';
  const x = e.x + (directed ? e.dx * e.range * 0.5 : 0),
    y = e.y + (directed ? e.dy * e.range * 0.5 : 0);
  const age = elapsed - (e.ready - (art.shape === 'self' ? 0 : 400)),
    progress = Math.max(0, Math.min(1, age / 900));
  const size = art.shape === 'self' ? 130 : directed ? e.range : e.range * 2;
  const h =
    art.shape === 'self'
      ? 145
      : art.shape === 'line'
        ? 85
        : directed
          ? e.range * 1.1
          : e.range * 1.6;
  const alpha = progress < 0.4 ? progress / 0.4 : Math.max(0, (1 - progress) / 0.6);
  return (
    <HeroEffectArt
      id={e.skill}
      className="duel-hero-effect"
      style={{
        left: `${(x / ARENA_W) * 100}%`,
        top: `${(y / ARENA_H) * 100}%`,
        width: `${(size / ARENA_W) * 100}%`,
        height: `${(h / ARENA_H) * 100}%`,
        opacity: alpha,
        transform: `translate(-50%,-55%) ${directed ? `rotate(${Math.atan2(e.dy, e.dx)}rad)` : ''} scale(${0.7 + Math.min(1, progress * 2) * 0.3})`,
      }}
    />
  );
}
