import { useEffect, useState, type CSSProperties } from 'react';
import { useStore } from 'zustand';
import { activityNow, activityAction, activityStore } from '../../net/worldActivities';
import { activityPlan, ACTIVITY_ART, type ActivityKind } from '../../game/systems/worldActivities';
import { EventBus } from '../../game/EventBus';
import { getMap } from '../../game/maps';
import { useGame } from '../../store/gameStore';
import { isChildhood } from '../../game/systems/origin';
import './competitive.css';
import { SkyRacePanel } from './SkyRacePanel';
export function ActivitySprite({
  row,
  col = 0,
  className = '',
}: {
  row: number;
  col?: number;
  className?: string;
}) {
  return (
    <span
      className={`activity-sprite ${className}`}
      style={
        {
          backgroundImage: `url(${ACTIVITY_ART})`,
          backgroundPosition: `${(col * 100) / 7}% ${(row * 100) / 5}%`,
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
}
export function ActivitiesPanel() {
  const [kind, setKind] = useState<ActivityKind | 'race'>('treasure'),
    [now, setNow] = useState(activityNow),
    { error, synced } = useStore(activityStore),
    p = useGame((s) => s.player),
    status = useGame((s) => s.status);
  useEffect(() => {
    void activityAction('treasure');
    const t = setInterval(() => setNow(activityNow()), 1000);
    return () => clearInterval(t);
  }, []);
  const plan = activityPlan(kind === 'race' ? 'treasure' : kind, now),
    seconds = Math.max(0, Math.ceil(((plan.open ? plan.end : plan.next) - now) / 1000));
  return (
    <section className="activities-panel">
      <nav>
        {(['treasure', 'ruins', 'race'] as const).map((k) => (
          <button className={`btn ${k === kind ? 'gold' : ''}`} key={k} onClick={() => setKind(k)}>
            {k === 'treasure'
              ? 'Thiên Giáng Dị Bảo'
              : k === 'ruins'
                ? 'Động Phủ Viễn Cổ'
                : 'Ngự Kiếm Vượt Thiên Quan'}
          </button>
        ))}
      </nav>
      {kind === 'race' ? (
        <SkyRacePanel />
      ) : (
        <>
          <div className={`activity-feature ${kind}`}>
            <div className="activity-illustration">
              <ActivitySprite row={kind === 'treasure' ? 0 : 1} col={kind === 'treasure' ? 7 : 4} />
              <ActivitySprite row={kind === 'treasure' ? 2 : 3} col={0} />
            </div>
            <article>
              <small>HOẠT ĐỘNG THEO GIỜ · TOÀN SERVER</small>
              <h2>{plan.name}</h2>
              <p>
                {kind === 'treasure'
                  ? 'Bảo vật thiên giới rơi xuống một khu vực ngẫu nhiên. Hạ thủ vệ, giữ vị trí 5 giây để tranh đoạt. Đạo hữu khác có thể ngắt việc đoạt bảo bằng giao chiến.'
                  : 'Mỗi đợt mở một mê cung khác nhau. Né bẫy, phá hai phong ấn, tìm rương ẩn rồi đánh bại Cổ Đại Thạch Vệ.'}
              </p>
              <div className="activity-clock">
                <b>{plan.open ? 'Đang mở' : 'Đợt kế tiếp'}</b>
                <strong>
                  {Math.floor(seconds / 3600)
                    .toString()
                    .padStart(2, '0')}
                  :{Math.floor(seconds / 60) % 60 < 10 ? '0' : ''}
                  {Math.floor(seconds / 60) % 60}:{String(seconds % 60).padStart(2, '0')}
                </strong>
              </div>
              <p>
                {kind === 'treasure'
                  ? getMap(plan.mapId).name
                  : 'Động phủ riêng · bố cục đổi mỗi đợt'}{' '}
                · Cấp đề xuất {plan.level}
              </p>
              <div className="activity-rewards">
                <ActivitySprite row={5} col={kind === 'treasure' ? 0 : 6} />
                <span>
                  Linh Thạch · Đá Cường Hóa · Yêu Đan
                  <br />
                  <small>
                    1,5% nhận thêm Ngọc Hộ Thân từ thưởng chính. Trang bị rơi từ boss: 55% cùng
                    phái.
                  </small>
                </span>
              </div>
              <p>
                Phần thưởng chính nhận qua Thư. Dị Bảo chỉ có một người đoạt được mỗi đợt; Động Phủ
                nhận thưởng một lần mỗi rương/đợt.
              </p>
              {error && (
                <p role="alert" className="competitive-error">
                  {error}
                </p>
              )}
              <button
                className="btn gold"
                disabled={!synced || !plan.open || isChildhood(p) || status !== 'alive'}
                onClick={() => EventBus.emit('cmd:activityEnter', kind)}
              >
                {plan.open ? 'Tham gia ngay' : 'Chưa đến giờ'}
              </button>
              <p className="competitive-note">
                Giờ Việt Nam · Dị Bảo mở 25 phút mỗi 3 giờ từ 00:00; Động Phủ mở 40 phút mỗi 3 giờ
                từ 01:00. Điện thoại và PC cùng lịch.
              </p>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
