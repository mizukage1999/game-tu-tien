import { useId, type CSSProperties, type ReactNode } from 'react';
import { optimizedAsset } from '../../data/assetDelivery';
import { ACTIVITY_ART } from '../../game/systems/worldActivities';
import { inventoryIconRegion } from '../../game/art/inventoryIcons';
import { SKY_ART, SKY_ROWS } from '../skyRaceArt';

export type ActivityPage = 'treasure' | 'ruins' | 'race';
const SCENES = optimizedAsset('/assets/ui/activities-scenes-v2.png');
const FRAME = optimizedAsset('/assets/ui/activities-frame-v2.png');

export function ActivitiesFrame() {
  return (
    <div
      className="activities-frame-art"
      style={{ borderImageSource: `url(${FRAME})` }}
      aria-hidden="true"
    />
  );
}
export function ActivityArtwork({ kind }: { kind: ActivityPage }) {
  const index = ['treasure', 'ruins', 'race'].indexOf(kind);
  return (
    <div
      className={`activity-painting ${kind}`}
      style={{ backgroundImage: `url(${SCENES})`, backgroundPosition: `${index * 50}% center` }}
      aria-hidden="true"
    />
  );
}
export function ActivityTabIcon({ kind }: { kind: ActivityPage }) {
  const [top, height] = SKY_ROWS[4];
  const style: CSSProperties =
    kind === 'race'
      ? {
          backgroundImage: `url(${SKY_ART})`,
          backgroundSize: `800% ${(1086 / height) * 100}%`,
          backgroundPosition: `100% ${(top / (1086 - height)) * 100}%`,
        }
      : {
          backgroundImage: `url(${ACTIVITY_ART})`,
          backgroundSize: kind === 'ruins' ? `800% ${(1086 / 184) * 100}%` : '800% 600%',
          backgroundPosition:
            kind === 'treasure' ? '0% 0%' : `${(4 * 100) / 7}% ${(208 / (1086 - 184)) * 100}%`,
        };
  return <span className={`activity-tab-icon ${kind}`} style={style} aria-hidden="true" />;
}
export function ActivityMark({ kind }: { kind: 'time' | 'place' | 'trophy' | 'book' | 'people' }) {
  const path = {
    time: 'M6 3h12M6 21h12M8 3v4c0 2 2 3 4 5-2 2-4 3-4 5v4m8-18v4c0 2-2 3-4 5 2 2 4 3 4 5v4M9 17h6',
    place: 'M12 22S4 14 4 9a8 8 0 1 1 16 0c0 5-8 13-8 13ZM12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    trophy:
      'M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H3v3a5 5 0 0 0 5 5m9-8h4v3a5 5 0 0 1-5 5m-4 2v6m-5 0h10',
    book: 'M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Zm0 0v15M5 8h4m-4 4h4m6-4h4m-4 4h4',
    people:
      'M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 20v-5a6 6 0 0 1 12 0v5H3ZM17 4a3 3 0 0 1 0 6m1 2a5 5 0 0 1 3 5v3h-3',
  }[kind];
  return (
    <svg
      className="activity-mark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
export function ActivityTitle({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <header className="activity-title">
      <small>{eyebrow}</small>
      <h2>{children}</h2>
    </header>
  );
}
export function ActivityClock({
  label,
  children,
  open = false,
}: {
  label: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <div className={`activity-timeplate${open ? ' is-open' : ''}`}>
      <ActivityMark kind="time" />
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}
export function ActivityItemArt({ id }: { id: string }) {
  const region = inventoryIconRegion(id),
    clip = `activity-item-${useId().replace(/:/g, '')}`;
  if (!region) return null;
  const [x, y, width, height] = region;
  return (
    <svg viewBox={region.join(' ')} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      <image
        href={optimizedAsset('/assets/ui/cultivation/bag-items-v1.png')}
        width="1536"
        height="1024"
        clipPath={`url(#${clip})`}
      />
    </svg>
  );
}
export function ActivityRewards() {
  const rewards = [
    { id: 'linh_thach', label: '150 Linh Thạch', qty: '150', tone: 'gold' },
    { id: 'tinh_luyen_thach', label: '3 Đá Cường Hóa', qty: '3', tone: 'blue' },
    { id: 'yeu_dan', label: '2 Yêu Đan', qty: '2', tone: 'red' },
    { id: 'phap_bao_ngoc', label: '1,5% nhận thêm Ngọc Hộ Thân', qty: '1,5%', tone: 'violet' },
    {
      id: 'weapon_orange',
      label: 'Trang bị từ boss · 55% thuộc phái bản thân',
      qty: 'Boss',
      tone: 'gold',
    },
  ];
  return (
    <section className="activity-prizes" aria-label="Phần thưởng có thể nhận">
      <h4>
        <span />
        Thưởng có thể nhận
        <span />
      </h4>
      <div className="activity-prize-list">
        {rewards.map((r) => (
          <div
            key={r.id}
            className={`activity-prize ${r.tone}`}
            title={r.label}
            aria-label={r.label}
          >
            <ActivityItemArt id={r.id} />
            <b>{r.qty}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
