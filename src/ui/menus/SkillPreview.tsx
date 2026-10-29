import { useEffect, useState } from 'react';
import type { SkillId } from '../../data';
import { wangEffect, wangVisual } from '../../data/wangSkills';
import { wangSheetUrl } from '../../game/art/wangEffects';
import { useGame } from '../../store/gameStore';
import { SkillGlyph } from './CultivationUI';
import { heroFor } from '../../data/heroes';
import { heroSpell } from '../../data/heroSkills';
import { HeroEffectArt, HeroPose } from '../HeroArt';
import { spellFrame } from '../../data/heroSpellArt';
import { WangEffectFrame } from '../WangSkillArt';

function SignaturePreview({ id, age }: { id: SkillId; age: number }) {
  const art = wangEffect(id)!,
    bind = art.motion === 'bind',
    casting = bind && age < 400;
  const pose = wangVisual(
    art,
    bind && !casting ? age - 400 : age,
    360,
    casting ? { castOnly: true, duration: 400 } : {},
  );
  const left = art.motion === 'vortex' ? 48 : bind ? (casting ? 20 : 78) : 18 + pose.advance * 60;
  return (
    <div className="cult-preview-wang">
      <WangEffectFrame
        id={id}
        frame={pose.frame}
        className="wang-effect-frame"
        style={{
          left: `${left}%`,
          top: '65%',
          width: `${Math.min(110, (pose.width / 360) * 80)}%`,
          height: `${Math.min(130, (pose.height / 200) * 88)}%`,
          opacity: pose.alpha,
          transform: `translate(-50%,${bind || art.motion === 'vortex' ? '-83%' : '-50%'})`,
        }}
      />
    </div>
  );
}

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
    if (!playing || (!spell && !art?.grid)) return;
    const duration = spell?.duration ?? art!.duration + (art!.motion === 'bind' ? 400 : 0);
    const start = performance.now();
    let request = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      setAge(elapsed);
      if (elapsed >= duration) setPlaying(false);
      else request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing, spell, art, play]);
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
      ) : art?.grid ? (
        <SignaturePreview
          id={id}
          age={playing ? age : art.motion === 'vortex' ? 1000 : art.motion === 'bind' ? 800 : 300}
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
