import type { Sex } from '../game/systems/save';

/** Crop the front pose from the authored atlas, keeping the UI and world hero consistent. */
export function HeroPortrait({
  sex,
  label = '',
  className = '',
}: {
  sex: Sex;
  label?: string;
  className?: string;
}) {
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
