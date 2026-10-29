import type { CSSProperties } from 'react';
import { optimizedAsset } from '../data/assetDelivery';
import { CrestArt } from './SpiritArt';
import './loading-screen.css';

export function LoadingScreen({
  progress,
  mapId = '',
  mapName = '',
  phase = 'game',
  error = '',
  onRetry,
}: {
  progress: number;
  mapId?: string;
  mapName?: string;
  phase?: 'game' | 'map';
  error?: string;
  onRetry: () => void;
}) {
  const variant = /hoa|viem|xich/.test(mapId)
    ? 4
    : /u_minh|bi_canh/.test(mapId)
      ? 2
      : /tong|vien/.test(mapId)
        ? 1
        : /rung|lam/.test(mapId)
          ? 3
          : 0;
  const color = ['#5dcaff', '#ffc96b', '#d58aff', '#60ebcb', '#ff9459'][variant];
  const value = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div
      className="loading-overlay immortal-loading"
      style={
        {
          '--loading-color': color,
          backgroundImage: `linear-gradient(180deg,#020a1940,#020917a8),url('${optimizedAsset('/assets/ui/loading-landscape-v2.png')}')`,
        } as CSSProperties
      }
    >
      <div className="loading-frame" aria-hidden="true" />
      <span className="loading-phase">
        {phase === 'map' ? 'DỊCH CHUYỂN LINH TRẬN' : 'KHỞI HÀNH TIÊN LỘ'}
      </span>
      <main className="loading-content">
        <div className="loading-crest">
          <span className="loading-orbit" />
          <CrestArt index={variant} />
        </div>
        <h1>Cửu Huyền</h1>
        <p className="loading-motto">NGHỊCH MỆNH TRƯỜNG SINH</p>
        <h2>{phase === 'map' ? `Đang đến ${mapName || 'bản đồ mới'}` : 'Bước vào cõi tu tiên'}</h2>
        <div
          className="immortal-loading-track"
          role="progressbar"
          aria-label={phase === 'map' ? 'Tiến độ tải bản đồ' : 'Tiến độ tải game'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
        >
          <span className="immortal-loading-fill" style={{ width: `${value}%` }} />
          <b>{value}%</b>
        </div>
        <p className="loading-status" role={error ? 'alert' : 'status'}>
          {error ||
            (value < 90 ? 'Đang hội tụ linh khí, chuẩn bị cảnh vật…' : 'Đang hoàn tất linh trận…')}
        </p>
        {error && (
          <button className="loading-retry" data-action="retry-game" onClick={onRetry}>
            Thử lại với cấu hình nhẹ
          </button>
        )}
      </main>
      <p className="loading-tip">
        {phase === 'map'
          ? 'Cảnh giới cao hơn giúp giảm sát thương từ đối thủ cảnh giới thấp.'
          : 'Linh thú nhận chủ qua chiến đấu và thu phục. Đừng quên cho đồng hành xuất chiến.'}
      </p>
    </div>
  );
}
