import type { CSSProperties } from 'react';
import { realmStyle, type RealmIdentity } from '../game/systems/realmStyle';
import './realm-badge.css';

export function RealmBadge({
  compact = false,
  className = '',
  ...identity
}: RealmIdentity & { compact?: boolean; className?: string }) {
  const realm = realmStyle(identity);
  return (
    <span
      className={`realm-badge ${compact ? 'compact ' : ''}${realm.index < 0 ? 'mortal ' : ''}${className}`}
      role="img"
      aria-label={[realm.name, realm.phase].filter(Boolean).join(' ')}
      data-realm={realm.index}
      data-phase={realm.phaseIndex}
      style={{ '--realm-color': realm.color } as CSSProperties}
    >
      {realm.index >= 0 && (
        <span
          className="realm-badge-art"
          aria-hidden="true"
          style={{
            backgroundPosition: `${(realm.index % 3) * 50}% ${(Math.floor(realm.index / 3) * 100) / 3}%`,
            opacity: [0.64, 0.8, 0.95, 1][realm.phaseIndex],
          }}
        />
      )}
      <span className="realm-badge-name">{realm.name}</span>
      {realm.phase && <small>{realm.phase}</small>}
    </span>
  );
}
