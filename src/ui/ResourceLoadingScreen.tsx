import './resource-loading.css';

/** Same lightweight artwork as the HTML boot shell; map transfers keep their own loader. */
export function ResourceLoadingScreen({
  progress,
  error = '',
  onRetry,
}: {
  progress: number;
  error?: string;
  onRetry: () => void;
}) {
  const value = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="resource-loading loading-overlay" aria-label="Chuẩn bị game">
      <section className="resource-loading-content">
        <p className="resource-loading-eyebrow">NGHỊCH MỆNH TRƯỜNG SINH</p>
        <h1>Cửu Huyền</h1>
        <div className="resource-loading-stage">
          <span role={error ? 'alert' : 'status'}>
            {error || 'Đang hoàn tất thế giới và đưa nhân vật vào game…'}
          </span>
          <b>{value}%</b>
        </div>
        <div
          className="resource-loading-track"
          role="progressbar"
          aria-label="Tiến độ tải game"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
        >
          <span className="resource-loading-fill" style={{ width: `${value}%` }} />
        </div>
        <p className="resource-loading-detail">
          Cảnh vật đã chuẩn bị được dùng lại cho hành trình của bạn.
        </p>
        {error && (
          <div className="resource-loading-actions">
            <button onClick={onRetry} data-action="retry-game">
              Thử lại với cấu hình nhẹ
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
