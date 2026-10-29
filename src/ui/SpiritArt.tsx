import { optimizedAsset } from '../data/assetDelivery';
import { COMPANIONS, type CompanionId } from '../game/systems/life';
import { useId } from 'react';

function AtlasArt({
  source,
  index,
  className = '',
}: {
  source: string;
  index: number;
  className?: string;
}) {
  const clip = useId(),
    x = (index % 3) * 512,
    y = Math.floor(index / 3) * 512;
  return (
    <svg
      className={`spirit-art ${className}`}
      viewBox={`${(index % 3) * 512} ${Math.floor(index / 3) * 512} 512 512`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip} clipPathUnits="userSpaceOnUse">
          <rect x={x} y={y} width="512" height="512" />
        </clipPath>
      </defs>
      <image clipPath={`url(#${clip})`} href={optimizedAsset(source)} width="1536" height="1024" />
    </svg>
  );
}
export function CrestArt({ index, className }: { index: number; className?: string }) {
  return <AtlasArt source="/assets/ui/loading-crests-v2.png" index={index} className={className} />;
}
export function BeastArt({ id, className }: { id: CompanionId; className?: string }) {
  return (
    <AtlasArt
      source="/assets/ui/spirit-beasts-v2.png"
      index={COMPANIONS.findIndex((beast) => beast.id === id)}
      className={className}
    />
  );
}
