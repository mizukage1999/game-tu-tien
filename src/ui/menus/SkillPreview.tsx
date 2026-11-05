import { useEffect, useRef, useState } from 'react';
import type { SkillId } from '../../data';
import { wangEffect, wangVisual } from '../../data/wangSkills';
import { wangSheetUrl } from '../../game/art/wangEffects';
import { useGame } from '../../store/gameStore';
import { SkillGlyph } from './CultivationUI';
import { heroFor } from '../../data/heroes';
import { heroSpell } from '../../data/heroSkills';
import { HeroEffectArt, HeroPose } from '../HeroArt';
import { spellAsset, spellFrame } from '../../data/heroSpellArt';
import { WangEffectFrame } from '../WangSkillArt';
import { optimizedAsset } from '../../data/assetDelivery';

function SignaturePreview({ id, age }: { id: SkillId; age: number }) {
  const art = wangEffect(id)!,
    bind = art.motion === 'bind',
    ground = bind || ['vortex', 'palm', 'banner', 'gate'].includes(art.motion ?? ''),
    casting = bind && age < 400;
  const pose = wangVisual(
    art,
    bind && !casting ? age - 400 : age,
    360,
    casting ? { castOnly: true, duration: 400 } : {},
  );
  const left = art.motion === 'vortex' ? 48 : bind ? (casting ? 20 : 78) : 18 + pose.advance * 60;
  const ritualGround = art.motion === 'palm' || art.motion === 'banner' || art.motion === 'gate';
  return (
    <div className="cult-preview-wang">
      <WangEffectFrame
        id={id}
        frame={pose.frame}
        className="wang-effect-frame"
        style={{
          left: `${ritualGround ? 56 : left}%`,
          top: ritualGround ? '80%' : '65%',
          width: `${Math.min(ritualGround ? 75 : 110, (pose.width / 360) * 80)}%`,
          height: `${Math.min(ritualGround ? 92 : 130, (pose.height / 200) * 88)}%`,
          opacity: pose.alpha,
          transform: `translate(-50%,${ground ? '-83%' : '-50%'})`,
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
    [requested, setRequested] = useState(false),
    [preparing, setPreparing] = useState(false),
    [previewError, setPreviewError] = useState(false),
    [age, setAge] = useState(0);
  const request = useRef(0),
    previewImages = useRef<HTMLImageElement[]>([]);
  const art = wangEffect(id),
    sheet = art && !art.grid && wangSheetUrl(art),
    spell = heroSpell(id);
  useEffect(
    () => () => {
      request.current++;
      previewImages.current = [];
    },
    [],
  );
  const showPreview = async () => {
    if (preparing) return;
    const ticket = ++request.current;
    setPreparing(true);
    setPreviewError(false);
    const urls = spell
      ? [spellAsset(spell.hero), '/assets/heroes-v7/poses.png']
      : art
        ? [art.url, `/assets/ui/cultivation/${sex === 'male' ? 'wang' : 'li'}-full-v1.png`]
        : [];
    previewImages.current = urls.map((url) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = optimizedAsset(url);
      return image;
    });
    try {
      await Promise.all(previewImages.current.map((image) => image.decode()));
      if (ticket !== request.current) return;
      setRequested(true);
      setPlay((n) => n + 1);
      setAge(0);
      setPlaying(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    } catch {
      if (ticket === request.current) setPreviewError(true);
    } finally {
      if (ticket === request.current) setPreparing(false);
    }
  };
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
      {requested &&
        (heroSpell(id) ? (
          <HeroPose
            id={heroFor(player).id}
            pose={playing ? 4 : 0}
            className="cult-preview-hero roster-preview-hero"
          />
        ) : (
          <img
            className="cult-preview-hero"
            src={optimizedAsset(
              `/assets/ui/cultivation/${sex === 'male' ? 'wang' : 'li'}-full-v1.png`,
            )}
            alt=""
          />
        ))}
      <span className="cult-preview-target" aria-hidden="true">
        ◆
      </span>
      {!requested ? (
        <span className="cult-preview-symbol-wrap">
          <SkillGlyph id={id} className="cult-preview-symbol" />
        </span>
      ) : spell ? (
        <HeroEffectArt
          key={`${id}-${play}`}
          id={id}
          frame={playing ? spellFrame(spell.id, age) : 3}
          className={`cult-preview-roster-spell ${spell.shape}`}
          style={{ opacity: playing ? Math.min(1, age / 100, (spell.duration - age) / 180) : 0.65 }}
        />
      ) : art?.grid ? (
        <SignaturePreview
          id={id}
          age={
            playing
              ? age
              : art.motion === 'gate'
                ? 1500
                : art.motion === 'vortex'
                  ? 1000
                  : art.motion === 'bind'
                    ? 800
                    : 300
          }
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
        disabled={preparing}
        onClick={() => void showPreview()}
      >
        <span aria-hidden="true">▶</span>
        <b>
          {preparing ? 'Đang tải chiêu…' : previewError ? 'Chưa tải được · Thử lại' : 'Xem chiêu'}
        </b>
      </button>
      <small>Diễn võ · Xem trước</small>
    </div>
  );
}
