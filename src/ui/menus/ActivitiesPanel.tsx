import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { activityNow, activityAction, activityStore } from '../../net/worldActivities';
import { activityPlan, type ActivityKind } from '../../game/systems/worldActivities';
import { EventBus } from '../../game/EventBus';
import { getMap } from '../../game/maps';
import { useGame } from '../../store/gameStore';
import { isChildhood } from '../../game/systems/origin';
import { SkyRacePanel } from './SkyRacePanel';
import {
  ActivityArtwork,
  ActivityClock,
  ActivityMark,
  ActivityRewards,
  ActivityTabIcon,
  ActivityTitle,
  type ActivityPage,
} from './ActivityPresentation';
import './competitive.css';
import './activities.css';

function duration(seconds: number) {
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function TimedActivity({ kind }: { kind: ActivityKind }) {
  const [now, setNow] = useState(activityNow),
    [details, setDetails] = useState(false);
  const { error, synced } = useStore(activityStore),
    p = useGame((s) => s.player),
    status = useGame((s) => s.status);
  useEffect(() => {
    const t = setInterval(() => setNow(activityNow()), 1000);
    return () => clearInterval(t);
  }, []);
  const plan = activityPlan(kind, now),
    seconds = Math.max(0, Math.ceil(((plan.open ? plan.end : plan.next) - now) / 1000));
  return (
    <div className={`activity-feature activity-${kind}`}>
      <ActivityArtwork kind={kind} />
      <article className="activity-copy">
        <ActivityTitle eyebrow="Hoạt Động Theo Giờ · Toàn Server">{plan.name}</ActivityTitle>
        <p className="activity-description">
          {kind === 'treasure'
            ? 'Bảo vật thiên giới rơi xuống một khu vực ngẫu nhiên. Hạ thủ vệ, giữ vị trí 5 giây để tranh đoạt. Đạo hữu khác có thể ngắt việc đoạt bảo bằng giao chiến.'
            : 'Một động phủ bí ẩn mở ra theo giờ. Khám phá mê cung, né cạm bẫy, phá phong ấn và đánh bại cổ thú. Mỗi đợt có bố cục và kho báu khác nhau.'}
        </p>
        <ActivityClock
          label={synced ? (plan.open ? 'Còn lại:' : 'Đợt kế tiếp:') : 'Lịch hoạt động:'}
          open={synced && plan.open}
        >
          {synced ? duration(seconds) : '—:—:—'}
        </ActivityClock>
        <div className="activity-facts">
          <ActivityMark kind={kind === 'treasure' ? 'place' : 'people'} />
          <span>{kind === 'treasure' ? getMap(plan.mapId).name : 'Động phủ cá nhân'}</span>
          <i />
          <span>Cấp đề xuất: {plan.level}</span>
        </div>
        <ActivityRewards />
        <div className="activity-actions">
          <button
            className="btn gold activity-primary"
            data-activity-action="join"
            disabled={!synced || !plan.open || isChildhood(p) || status !== 'alive'}
            onClick={() => EventBus.emit('cmd:activityEnter', kind)}
          >
            {!synced ? 'Chưa kết nối' : plan.open ? 'Tham Gia' : 'Chưa đến giờ'}
          </button>
          <button
            className="btn activity-secondary"
            data-activity-action="details"
            aria-expanded={details}
            onClick={() => setDetails(!details)}
          >
            <ActivityMark kind="book" />
            Xem chi tiết
          </button>
        </div>
        <p
          className={`activity-caption${error ? ' is-error' : ''}`}
          role={error ? 'alert' : undefined}
          title={error || undefined}
        >
          {error ||
            (isChildhood(p)
              ? 'Hoàn thành nhập môn để tham gia hoạt động.'
              : kind === 'treasure'
                ? 'Thưởng qua Thư · Một chủ Dị Bảo mỗi đợt.'
                : 'Thưởng qua Thư · Mỗi rương nhận một lần/đợt.')}
        </p>
        {details && (
          <section className="activity-details" aria-label={`Chi tiết ${plan.name}`}>
            <button
              className="activity-detail-close"
              onClick={() => setDetails(false)}
              aria-label="Đóng chi tiết hoạt động"
            >
              ×
            </button>
            <h4>{plan.name}</h4>
            {kind === 'treasure' ? (
              <>
                <p>
                  Mở 25 phút mỗi 3 giờ, từ 00:00 giờ Việt Nam. Cần hạ đúng thủ vệ và có đóng góp
                  trước khi giữ vị trí đoạt bảo.
                </p>
                <p>
                  Di chuyển, ra chiêu hoặc bị đánh sẽ gián đoạn việc giữ vị trí. Mỗi đợt chỉ một
                  người nhận thưởng chính.
                </p>
              </>
            ) : (
              <>
                <p>
                  Mở 40 phút mỗi 3 giờ, từ 01:00 giờ Việt Nam. Động phủ cá nhân gồm 24 phòng, hai
                  phong ấn, sáu bẫy và hai rương phụ.
                </p>
                <p>
                  Rương phụ nhận 20 Linh Thạch, 1 Đá Cường Hóa qua Thư. Phá hai phong ấn trước khi
                  đánh cổ thú.
                </p>
              </>
            )}
            <p>
              Thưởng chính: 150 Linh Thạch, 3 Đá Cường Hóa, 2 Yêu Đan; 1,5% nhận thêm Ngọc Hộ Thân.
              Trang bị rơi từ boss có 55% thuộc phái bản thân.
            </p>
          </section>
        )}
      </article>
    </div>
  );
}
export function ActivitiesPanel() {
  const [kind, setKind] = useState<ActivityPage>('treasure');
  useEffect(() => {
    void activityAction('treasure');
  }, []);
  return (
    <section className="activities-panel activities-v2">
      <nav className="activity-tabs" aria-label="Chọn hoạt động">
        {(['treasure', 'ruins', 'race'] as const).map((k) => (
          <button
            type="button"
            key={k}
            data-activity={k}
            aria-pressed={k === kind}
            className={`activity-tab${k === kind ? ' selected' : ''}`}
            onClick={() => setKind(k)}
          >
            <ActivityTabIcon kind={k} />
            <span>
              {k === 'treasure'
                ? 'Thiên Giáng Dị Bảo'
                : k === 'ruins'
                  ? 'Động Phủ Viễn Cổ'
                  : 'Ngự Kiếm Vượt Thiên Quan'}
            </span>
          </button>
        ))}
      </nav>
      <div className="activity-page">
        {kind === 'race' ? <SkyRacePanel /> : <TimedActivity key={kind} kind={kind} />}
      </div>
    </section>
  );
}
