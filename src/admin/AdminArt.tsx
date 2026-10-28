import { useId } from 'react';
import { inventoryIconRegion } from '../game/art/inventoryIcons';
import { optimizedAsset } from '../data/assetDelivery';
import { HEROES } from '../data/heroes';
export function AdminPortrait({ hero }: { hero: string | null }) {
  const clip = useId().replace(/:/g, ''),
    row = HEROES.findIndex((h) => h.id === hero);
  if (row < 0)
    return (
      <span className="admin-avatar-fallback" aria-hidden="true">
        ♙
      </span>
    );
  const x = (row % 4) * 384 + 74,
    y = Math.floor(row / 4) * 512 + 12;
  return (
    <svg className="admin-portrait" viewBox={`${x} ${y} 236 226`} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y} width="236" height="226" />
        </clipPath>
      </defs>
      <image
        href={optimizedAsset('/assets/heroes-v7/roster.png')}
        clipPath={`url(#${clip})`}
        width="1536"
        height="1024"
      />
    </svg>
  );
}
export function AdminItemArt({ id }: { id: string }) {
  const clip = useId().replace(/:/g, ''),
    region = inventoryIconRegion(id);
  if (!region)
    return (
      <span className="admin-item-fallback" aria-hidden="true">
        ◇
      </span>
    );
  const [x, y, w, h] = region;
  return (
    <svg className="admin-item-art" viewBox={region.join(' ')} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <image
        href={optimizedAsset('/assets/ui/cultivation/bag-items-v1.png')}
        clipPath={`url(#${clip})`}
        width="1536"
        height="1024"
      />
    </svg>
  );
}
export type AdminIconName =
  | 'overview'
  | 'accounts'
  | 'items'
  | 'logs'
  | 'quests'
  | 'boss'
  | 'events'
  | 'jade'
  | 'settings'
  | 'search'
  | 'refresh'
  | 'export'
  | 'eye';
const PATHS: Record<AdminIconName, string> = {
  overview: 'M3 13 16 3l13 10M7 11v18h7v-9h5v9h6V11',
  accounts:
    'M21 29H3v-4a9 9 0 0 1 18 0Zm-9-15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm11-9a5 5 0 0 1 0 10m1 4a8 8 0 0 1 6 8v2h-5',
  items: 'm3 9 13-6 13 6v15l-13 6L3 24Zm0 0 13 6 13-6M16 15v15M9 6l14 6',
  logs: 'M7 3h14l6 6v20H7ZM21 3v7h6M11 15h12M11 20h12M11 25h7',
  quests: 'M9 5h19v23H8M4 4h7v9H4Zm8 12h12m-12 5h9m-9 5h10',
  boss: 'm8 9-4-6 9 3h6l9-3-4 6 4 6-3 10-9 5-9-5-3-10Zm1 7 5 3m9-3-5 3M13 25l3-3 3 3',
  events: 'M3 11h26v7H3Zm4 7v12h18V18M16 11v19M16 10C2 12 8-2 16 10Zm0 0C30 12 24-2 16 10Z',
  jade: 'M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26Zm0 8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  settings:
    'm12 3-1 4-4 2-4-1-2 5 4 2v4l-4 2 2 5 4-1 4 2 1 4h6l1-4 4-2 4 1 2-5-4-2v-4l4-2-2-5-4 1-4-2-1-4ZM16 12a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  search: 'M23 23l7 7M15 3a12 12 0 1 0 0 24 12 12 0 0 0 0-24Z',
  refresh: 'M27 11A12 12 0 1 0 28 22M27 3v9h-9',
  export: 'M16 2v18m-6-6 6 6 6-6M4 21v8h24v-8',
  eye: 'M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16Zm14-5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
};
export function AdminIcon({ name }: { name: AdminIconName }) {
  return (
    <svg className="admin-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
