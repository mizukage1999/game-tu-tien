import type { ArenaEffect } from '../../game/systems/arena';
import { ARENA_W, ARENA_H } from '../../game/systems/arena';
import { heroSpell, spellVisualId } from '../../data/heroSkills';
import type { HeroId } from '../../data/heroes';
import { HeroEffectArt } from '../HeroArt';
import { spellFrame } from '../../data/heroSpellArt';

/** Position the painted effect over the same line/circle used by the hit test. */
export function HeroArenaEffect({
  effect: e,
  elapsed,
  heroId,
}: {
  effect: ArenaEffect;
  elapsed: number;
  heroId: HeroId;
}) {
  const visual = spellVisualId(e.skill, heroId);
  const art = heroSpell(visual);
  if (!art) return null;
  const shape = e.range === 0 ? 'self' : e.kind;
  const directed = shape === 'line' || shape === 'cone';
  const windup = heroSpell(e.skill)?.windupMs ?? (e.skill === 'basic' ? 150 : 400);
  const age = Math.max(0, elapsed - (e.ready - (shape === 'self' ? 0 : windup))),
    progress = Math.max(0, Math.min(1, age / art.duration));
  const advance =
    art.motion === 'travel' && directed
      ? (Math.min(1, age / art.windupMs) - 1) * e.range * 0.35
      : 0;
  const x = e.x + (directed ? e.dx * (e.range * 0.5 + advance) : 0),
    y = e.y + (directed ? e.dy * (e.range * 0.5 + advance) : 0);
  const size = shape === 'self' ? 130 : directed ? e.range : e.range * 2;
  const h =
    shape === 'self' ? 145 : shape === 'line' ? Math.max(160, e.range * .65) : directed ? e.range * 1.1 : e.range * 1.6;
  const alpha = Math.max(0, Math.min(1, age / 100, (art.duration - age) / 180));
  const scale =
    art.motion === 'bloom'
      ? 0.75 + 0.25 * Math.min(1, age / art.windupMs)
      : art.motion === 'ward'
        ? 0.92 + 0.08 * Math.sin(progress * Math.PI)
        : 1;
  return (
    <HeroEffectArt
      id={visual}
      stretch
      frame={spellFrame(art.id, age)}
      className="duel-hero-effect"
      style={{
        left: `${(x / ARENA_W) * 100}%`,
        top: `${(y / ARENA_H) * 100}%`,
        width: `${(size / ARENA_W) * 100}%`,
        height: `${(h / ARENA_H) * 100}%`,
        opacity: alpha,
        transform: `translate(-50%,-55%) ${directed ? `rotate(${Math.atan2(e.dy, e.dx)}rad)` : ''} scale(${scale})`,
      }}
    />
  );
}
