import type { Sex } from '../game/systems/save';
import type { HeroId } from '../data/heroes';
import { RosterPortrait } from './HeroArt';

/** Crop the front pose from the authored atlas, keeping the UI and world hero consistent. */
export function HeroPortrait({
  sex,
  label = '',
  className = '',
  heroId,
}: {
  sex: Sex;
  label?: string;
  className?: string;
  heroId?: HeroId;
}) {
  if (heroId) return <RosterPortrait id={heroId} className={className} />;
  return (
    <svg
      className={`hero-portrait ${className}`}
      viewBox="98 10 62 69"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={!label}
    >
      <image
        href={`/assets/sprites/hero-${sex === 'male' ? 'wang' : 'li'}-v5.png`}
        width="1774"
        height="887"
      />
    </svg>
  );
}
