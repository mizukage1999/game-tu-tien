import { useId, type CSSProperties } from 'react';
import { wangIconArt, wangEffect, wangFrameRect, wangSheetLayout } from '../data/wangSkills';
import { optimizedAsset } from '../data/assetDelivery';
import { wangSheetUrl } from '../game/art/wangEffects';
import type { SkillId } from '../data';
import './wang-skills-v2.css';

function Crop({
  box,
  source,
  width,
  height,
  className,
  style,
  skill,
  frame,
}: {
  box: { x: number; y: number; width: number; height: number };
  source: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
  skill: string;
  frame?: number;
}) {
  const clip = useId().replace(/:/g, '');
  return (
    <svg
      className={className}
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-skill={frame === undefined ? undefined : skill}
      data-wang-icon={frame === undefined ? skill : undefined}
      data-wang-frame={frame}
      style={{ ...style, backgroundImage: 'none', overflow: 'hidden' }}
    >
      <defs>
        <clipPath id={clip} clipPathUnits="userSpaceOnUse">
          <rect x={box.x} y={box.y} width={box.width} height={box.height} />
        </clipPath>
      </defs>
      <image clipPath={`url(#${clip})`} href={source} width={width} height={height} />
    </svg>
  );
}
export function WangSkillGlyph({ id, className = '' }: { id: SkillId; className?: string }) {
  const art = wangIconArt(id);
  if (!art) return null;
  const { index, size } = art,
    columns = art.columns ?? 2,
    cell = size / columns;
  return (
    <Crop
      box={{
        x: (index % columns) * cell,
        y: Math.floor(index / columns) * cell,
        width: cell,
        height: cell,
      }}
      source={optimizedAsset(art.url)}
      width={size}
      height={size}
      className={`wang-skill-glyph ${className}`}
      skill={id}
    />
  );
}
export function WangEffectFrame({
  id,
  frame,
  className,
  style,
}: {
  id: SkillId;
  frame: number;
  className?: string;
  style?: CSSProperties;
}) {
  const art = wangEffect(id);
  if (!art) return null;
  const normalized = wangSheetUrl(art),
    grid = wangSheetLayout(art);
  const width = normalized ? grid.columns * grid.cell : (art.sourceSize?.width ?? 1536),
    height = normalized ? grid.rows * grid.cell : (art.sourceSize?.height ?? 1024);
  const box = normalized
    ? {
        x: (frame % grid.columns) * grid.cell,
        y: Math.floor(frame / grid.columns) * grid.cell,
        width: grid.cell,
        height: grid.cell,
      }
    : wangFrameRect(width, height, frame, art);
  return (
    <Crop
      box={box}
      source={normalized ?? optimizedAsset(art.url)}
      width={width}
      height={height}
      className={className}
      style={style}
      skill={id}
      frame={frame}
    />
  );
}
