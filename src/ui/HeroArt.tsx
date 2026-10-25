import { useId, type CSSProperties } from 'react';
import { HERO_ASSETS, heroRow, type HeroId } from '../data/heroes';
import { heroSpell } from '../data/heroSkills';
import type { SkillId } from '../data';

/** Clip to the atlas cell itself as well as the viewport, including letterboxed SVGs. */
function AtlasCrop({
  box,
  source,
  width,
  height,
  className,
  style,
  onAnimationEnd,
}: {
  box: [number, number, number, number];
  source: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
  onAnimationEnd?: () => void;
}) {
  const clip = useId().replace(/:/g, '');
  const [x, y, w, h] = box;
  return (
    <svg
      className={className}
      viewBox={box.join(' ')}
      style={style}
      onAnimationEnd={onAnimationEnd}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clip} clipPathUnits="userSpaceOnUse">
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clip})`}
        href={`${HERO_ASSETS}/${source}.png`}
        width={width}
        height={height}
      />
    </svg>
  );
}

export function HeroFigure({ id, className = '' }: { id: HeroId; className?: string }) {
  const row = heroRow(id);
  return (
    <AtlasCrop
      className={`hero-figure-v7 ${className}`}
      box={[(row % 4) * 384, Math.floor(row / 4) * 512, 384, 512]}
      source="roster"
      width={1536}
      height={1024}
    />
  );
}

export function RosterPortrait({ id, className = '' }: { id: HeroId; className?: string }) {
  const row = heroRow(id);
  return (
    <AtlasCrop
      className={`hero-portrait ${className}`}
      box={[(row % 4) * 384 + 74, Math.floor(row / 4) * 512 + 12, 236, 226]}
      source="roster"
      width={1536}
      height={1024}
    />
  );
}

/** Six authored poses: idle, walk, run, attack, cast, defeated. */
export function HeroPose({
  id,
  pose = 0,
  flip = false,
  className = '',
}: {
  id: HeroId;
  pose?: number;
  flip?: boolean;
  className?: string;
}) {
  return (
    <AtlasCrop
      className={`hero-pose-v7 ${className}`}
      box={[Math.max(0, Math.min(5, pose)) * 181, heroRow(id) * 181, 181, 181]}
      source="poses"
      width={1086}
      height={1448}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    />
  );
}

export function HeroSpellGlyph({ id, className = '' }: { id: SkillId; className?: string }) {
  const art = heroSpell(id);
  if (!art) return null;
  return (
    <span className={`hero-spell-glyph ${className}`} aria-hidden="true">
      <AtlasCrop
        box={[art.col * 217.2, art.row * 181, 217.2, 181]}
        source="effects"
        width={1086}
        height={1448}
      />
    </span>
  );
}

export function HeroEffectArt({
  id,
  className = '',
  style,
  onAnimationEnd,
}: {
  id: SkillId;
  className?: string;
  style?: CSSProperties;
  onAnimationEnd?: () => void;
}) {
  const art = heroSpell(id);
  if (!art) return null;
  return (
    <AtlasCrop
      className={`hero-effect-v7 ${className}`}
      box={[art.col * 217.2, art.row * 181, 217.2, 181]}
      source="effects"
      width={1086}
      height={1448}
      style={style}
      onAnimationEnd={onAnimationEnd}
    />
  );
}
