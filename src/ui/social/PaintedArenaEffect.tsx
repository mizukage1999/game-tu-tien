import type { ArenaEffect, ArenaFighter } from '../../game/systems/arena';
import { ARENA_H, ARENA_W } from '../../game/systems/arena';
import { wangEffect } from '../../data/wangSkills';
import { wangSheetUrl } from '../../game/art/wangEffects';
import { signatureHit } from '../../game/systems/skillHit';

export function PaintedArenaEffect({
  effect: e,
  elapsed,
  target,
}: {
  effect: ArenaEffect;
  elapsed: number;
  target: ArenaFighter;
}) {
  const art = wangEffect(e.skill)!;
  const url = wangSheetUrl(art);
  const river = e.skill === 'dao_hoa_hoang_tuyen',
    palm = e.skill === 'dich_linh_an',
    bind = e.skill === 'dinh_than_thuat';
  const age = Math.max(0, elapsed - (e.expires - (river ? 4500 : art.duration)));
  const progress = river ? (age % 1000) / 1000 : age / art.duration;
  const frame = Math.min(5, Math.floor(progress * 6));
  const x = bind
    ? signatureHit(e.skill, e, { x: e.dx, y: e.dy }, e.range, target)
      ? target.x
      : e.x + e.dx * e.range
    : e.x + (river ? 0 : e.dx * e.range * (palm ? 0.65 : 0.5));
  const y = bind
    ? signatureHit(e.skill, e, { x: e.dx, y: e.dy }, e.range, target)
      ? target.y
      : e.y + e.dy * e.range
    : e.y + (river ? 0 : e.dy * e.range * (palm ? 0.65 : 0.5));
  return (
    <span
      className="duel-painted-effect"
      data-skill={e.skill}
      aria-label={art.texture}
      style={{
        left: `${(x / ARENA_W) * 100}%`,
        top: `${(y / ARENA_H) * 100}%`,
        width: `${((river ? e.range * 4 : palm ? 220 : bind ? 150 : e.range * 1.6) / ARENA_W) * 100}%`,
        height: `${((river ? e.range * 2.6 : palm ? 200 : bind ? 180 : e.skill === 'tram_la_quyet' ? 185 : 115) / ARENA_H) * 100}%`,
        backgroundImage: url ? `url("${url}")` : `url("${art.url}")`,
        backgroundPosition: `${frame * 20}% 50%`,
        transform: `translate(-50%,${bind ? '-85%' : '-60%'})${river || palm || bind ? '' : ` rotate(${Math.atan2(e.dy, e.dx)}rad)`}`,
      }}
    />
  );
}
