import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { SkyRaceRun, type SkyRun } from '../SkyRaceRun';
import { SKY_ART, SKY_ROWS } from '../skyRaceArt';
import { skyTime, skyWeek } from '../../game/systems/skyRace';
import { skyRaceAction, type SkyRacePage } from '../../net/skyRace';
import { gameStore, useGame } from '../../store/gameStore';
import { socialStore } from '../../store/socialStore';
import { isChildhood } from '../../game/systems/origin';
import { lifeProgress } from '../../game/systems/life';
import { skyRaceStore } from '../../store/skyRaceStore';
import {
  ActivityArtwork,
  ActivityClock,
  ActivityMark,
  ActivityTitle,
} from './ActivityPresentation';
import '../sky-race.css';
import './activities.css';

export function SkyRaceSprite({ cell, className = '' }: { cell: number; className?: string }) {
  const [top, height] = SKY_ROWS[Math.floor(cell / 8)];
  return (
    <span
      aria-hidden="true"
      className={`sky-sprite ${className}`}
      style={
        {
          backgroundImage: `url(${SKY_ART})`,
          backgroundSize: `800% ${(1086 / height) * 100}%`,
          backgroundPosition: `${((cell % 8) * 100) / 7}% ${(top / (1086 - height)) * 100}%`,
        } as CSSProperties
      }
    />
  );
}
export function SkyRacePanel() {
  const [page, setPage] = useState<SkyRacePage | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [starting, setStarting] = useState(false),
    [run, setRun] = useState<SkyRun | null>(null),
    [board, setBoard] = useState(false);
  const p = useGame((s) => s.player),
    alive = useRef(true);
  const canPlay = () => {
    const s = gameStore.getState();
    return (
      !skyRaceStore.getState().active &&
      s.status === 'alive' &&
      !s.dungeon &&
      !s.tribulation &&
      !socialStore.getState().duel &&
      !s.mapId.startsWith('activity_ruins_') &&
      !lifeProgress(s.player).retreat
    );
  };
  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const p = await skyRaceAction('status');
      if (alive.current) {
        setPage(p);
        setError('');
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);
  const close = useCallback(() => setRun(null), []);
  const start = async (ranked: boolean) => {
    if (starting) return;
    if (!canPlay()) return setError('Hãy hoàn thành hoạt động hiện tại trước khi vào đường bay.');
    setStarting(true);
    try {
      if (ranked) {
        const p = await skyRaceAction('start');
        if (alive.current && p.run && canPlay()) {
          setPage(p);
          setError('');
          setRun(p.run);
        }
      } else {
        setError('');
        setRun(page ? { week: page.week, seed: page.seed } : skyWeek());
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setStarting(false);
    }
  };
  return (
    <div className="sky-lobby activity-race">
      {board ? (
        <section className="sky-lobby-board">
          <header className="activity-board-header">
            <div>
              <small>NGỰ KIẾM VƯỢT THIÊN QUAN</small>
              <h3>Nhanh nhất tuần</h3>
            </div>
            <div>
              <button
                className="btn activity-secondary"
                data-activity-action="back"
                onClick={() => setBoard(false)}
              >
                ‹ Quay lại
              </button>
              <button
                className="btn activity-secondary"
                disabled={busy}
                onClick={() => void refresh()}
              >
                Làm mới
              </button>
            </div>
          </header>
          <div className="sky-podium">
            {[1, 0, 2].map((i) => (
              <div key={i} className={`place-${i + 1}`}>
                <SkyRaceSprite cell={31} />
                <b>#{i + 1}</b>
                <span>{page?.rows[i]?.name ?? 'Chờ đạo hữu'}</span>
                <strong>{page?.rows[i] ? skyTime(page.rows[i].score) : '—'}</strong>
              </div>
            ))}
          </div>
          <div className="sky-ranking-list">
            {page?.rows.map((r, i) => (
              <div key={r.userId}>
                <b>{i + 1}</b>
                <span>
                  {r.name}
                  <small>
                    ✦ {r.energy} linh khí · {r.hits} va chạm
                  </small>
                </span>
                <strong>{skyTime(r.score)}</strong>
              </div>
            ))}
            {!page?.rows.length && (
              <p>
                {page
                  ? 'Chưa có lượt bay hoàn thành tuần này.'
                  : 'Kết nối server để xem thành tích thật.'}
              </p>
            )}
          </div>
          <p className="activity-caption">
            Tuần {page?.week ?? skyWeek().week} · Lấy lượt tốt nhất · Đổi đường bay 00:00 thứ Hai,
            giờ Việt Nam.
          </p>
          {error && (
            <p className="activity-caption is-error" role="status">
              {error}
            </p>
          )}
        </section>
      ) : (
        <div className="activity-feature activity-flight">
          <ActivityArtwork kind="race" />
          <article className="activity-copy">
            <ActivityTitle eyebrow="Mini-game · Ngự Hành · Thi Đấu">
              Ngự Kiếm Vượt Thiên Quan
            </ActivityTitle>
            <p className="activity-description">
              Đua ngự hành vượt chướng ngại vật, thu thập linh khí và hoàn thành đường bay trong
              thời gian ngắn nhất. Chinh phục chín thiên môn, ghi tên trên bảng tốc độ hàng tuần.
            </p>
            <ActivityClock label="Thời gian mở:" open>
              Luôn mở
            </ActivityClock>
            <div className="activity-facts">
              <ActivityMark kind="trophy" />
              <span>Đua thời gian</span>
              <i />
              <span>Cá nhân</span>
            </div>
            <section className="activity-prizes activity-race-record" aria-label="Thành tích tuần">
              <h4>
                <span />
                Kỷ lục tuần của bạn
                <span />
              </h4>
              <div className="activity-record-body">
                <SkyRaceSprite cell={31} />
                <div>
                  <strong>{page?.self ? skyTime(page.self.score) : 'Chưa có thành tích'}</strong>
                  <small>Tuần {page?.week ?? skyWeek().week}</small>
                </div>
                <span className="activity-course-badge">
                  9 cổng<small>3 lượt tăng tốc</small>
                </span>
              </div>
            </section>
            <div className="activity-actions sky-lobby-actions">
              <button
                className="btn gold activity-primary"
                data-activity-action="join"
                aria-label="Đua xếp hạng tuần"
                disabled={busy || starting || isChildhood(p) || !page}
                onClick={() => void start(true)}
              >
                Tham Gia
              </button>
              <button
                className="btn activity-secondary"
                data-activity-action="ranking"
                onClick={() => setBoard(true)}
              >
                <ActivityMark kind="trophy" />
                Bảng Xếp Hạng
              </button>
              <button
                className="activity-practice"
                disabled={starting}
                onClick={() => void start(false)}
              >
                Bay thử
              </button>
            </div>
            <p
              className={`activity-caption${error ? ' is-error' : ''}`}
              role={error ? 'status' : undefined}
              title={error || undefined}
            >
              {error ||
                (isChildhood(p)
                  ? 'Hoàn thành nhập môn để đua xếp hạng. Có thể bay thử ngay.'
                  : 'Cùng đường bay, cùng tốc độ · Lấy lượt nhanh nhất tuần.')}
            </p>
          </article>
        </div>
      )}
      {run && (
        <SkyRaceRun
          key={run.id ?? `practice-${run.seed}`}
          run={run}
          onClose={close}
          onResult={setPage}
        />
      )}
    </div>
  );
}
