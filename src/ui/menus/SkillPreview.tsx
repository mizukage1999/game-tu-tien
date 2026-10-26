import { useEffect, useState } from 'react';
import type { SkillId } from '../../data';
import { wangEffect } from '../../data/wangSkills';
import { wangSheetUrl } from '../../game/art/wangEffects';
import { useGame } from '../../store/gameStore';
import { SkillGlyph } from './CultivationUI';
import { heroFor } from '../../data/heroes';
import { heroSpell } from '../../data/heroSkills';
import { HeroEffectArt, HeroPose } from '../HeroArt';
import { spellFrame } from '../../data/heroSpellArt';

/** An isolated visual preview: it never spends MP or fires an attack into the world. */
export function SkillPreview({ id }: { id: SkillId }) {
  const player = useGame((s) => s.player),
    sex = player.sex,
    [play, setPlay] = useState(0),
    [playing, setPlaying] = useState(false),
    [age, setAge] = useState(0);
  const art = wangEffect(id),
    sheet = art && wangSheetUrl(art),
    spell = heroSpell(id);
  useEffect(() => {
    if (!playing || !spell) return;
    const start = performance.now();
    let request = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      setAge(elapsed);
      if (elapsed >= spell.duration) setPlaying(false);
      else request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing, spell, play]);
  return (
    <div className={`cult-skill-preview ${playing ? 'playing' : ''}`} key={id}>
      <div className="cult-preview-floor" />
      {heroSpell(id) ? (
        <HeroPose
          id={heroFor(player).id}
          pose={playing ? 4 : 0}
          className="cult-preview-hero roster-preview-hero"
        />
      ) : (
        <img
          className="cult-preview-hero"
          src={`/assets/ui/cultivation/${sex === 'male' ? 'wang' : 'li'}-full-v1.png`}
          alt=""
        />
      )}
      <span className="cult-preview-target" aria-hidden="true">
        ◆
      </span>
      {spell ? (
        <HeroEffectArt
          key={`${id}-${play}`}
          id={id}
          frame={playing ? spellFrame(spell.id, age) : 2}
          className={`cult-preview-roster-spell ${spell.shape}`}
          style={{ opacity: playing ? Math.min(1, age / 100, (spell.duration - age) / 180) : 0.65 }}
        />
      ) : sheet ? (
        <span
          key={`${id}-${play}`}
          className={`cult-preview-spell ${id}`}
          style={{ backgroundImage: `url("${sheet}")`, animationDuration: `${art.duration}ms` }}
          onAnimationEnd={() => setPlaying(false)}
        />
      ) : (
        <span className="cult-preview-symbol-wrap" onAnimationEnd={() => setPlaying(false)}>
          <SkillGlyph id={id} className="cult-preview-symbol" />
        </span>
      )}
      <button
        className="cult-preview-play"
        aria-label="Xem thử hiệu ứng kỹ năng"
        onClick={() => {
          setPlay((n) => n + 1);
          setAge(0);
          setPlaying(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        }}
      >
        <span aria-hidden="true">▶</span>
        <b>Xem chiêu</b>
      </button>
      <small>Diễn võ · Xem trước</small>
    </div>
  );
}
