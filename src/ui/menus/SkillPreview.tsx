import { useState } from 'react';
import type { SkillId } from '../../data';
import { wangEffect } from '../../data/wangSkills';
import { wangSheetUrl } from '../../game/art/wangEffects';
import { useGame } from '../../store/gameStore';
import { SkillGlyph } from './CultivationUI';

/** An isolated visual preview: it never spends MP or fires an attack into the world. */
export function SkillPreview({ id }: { id: SkillId }) {
  const sex = useGame((s) => s.player.sex),
    [play, setPlay] = useState(0),
    [playing, setPlaying] = useState(false);
  const art = wangEffect(id),
    sheet = art && wangSheetUrl(art);
  return (
    <div className={`cult-skill-preview ${playing ? 'playing' : ''}`} key={id}>
      <div className="cult-preview-floor" />
      <img
        className="cult-preview-hero"
        src={`/assets/ui/cultivation/${sex === 'male' ? 'wang' : 'li'}-full-v1.png`}
        alt=""
      />
      <span className="cult-preview-target" aria-hidden="true">
        ◆
      </span>
      {sheet ? (
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
