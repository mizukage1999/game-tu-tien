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
import '../../ui/sky-race.css';
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
    [run, setRun] = useState<SkyRun | null>(null);
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
    <div className="sky-lobby">
      <section className="sky-lobby-hero">
        <div className="sky-lobby-art">
          <SkyRaceSprite cell={8} />
          <SkyRaceSprite cell={4} />
          <SkyRaceSprite cell={40} />
          <SkyRaceSprite cell={41} />
        </div>
        <article>
          <small>NGỰ HÀNH · THI ĐẤU TỐC ĐỘ</small>
          <h2>
            Ngự Kiếm
            <br />
            Vượt Thiên Quan
          </h2>
          <p>
            Chín thiên môn giữa biển mây. Né đá nổi, gió xoáy và sấm sét; thu linh khí, chọn thời
            điểm tăng tốc để vượt kỷ lục của chính mình.
          </p>
          <div className="sky-lobby-best">
            <SkyRaceSprite cell={29} />
            <div>
              <small>Kỷ lục của bạn · tuần {page?.week ?? skyWeek().week}</small>
              <strong>{page?.self ? skyTime(page.self.score) : 'Chưa có thành tích'}</strong>
            </div>
          </div>
          <div className="sky-lobby-actions">
            <button
              className="btn gold"
              disabled={busy || starting || isChildhood(p) || !page}
              onClick={() => void start(true)}
            >
              Đua xếp hạng tuần
            </button>
            <button className="btn" disabled={starting} onClick={() => void start(false)}>
              Bay thử
            </button>
          </div>
          {error && (
            <p className="competitive-error" role="status">
              {error}
            </p>
          )}
          {isChildhood(p) && (
            <p>Hoàn thành nhập môn để ghi tên trên bảng tuần. Bạn có thể bay thử ngay.</p>
          )}
        </article>
      </section>
      <section className="sky-lobby-board">
        <header>
          <div>
            <small>THIÊN QUAN TỐC BẢNG</small>
            <h3>Nhanh nhất tuần</h3>
          </div>
          <button className="btn" disabled={busy} onClick={() => void refresh()}>
            Làm mới
          </button>
        </header>
        <div className="sky-podium">
          {[1, 0, 2].map((i) => (
            <div key={i} className={`place-${i + 1}`}>
              <SkyRaceSprite cell={i === 0 ? 31 : 8 + i} />
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
                  ✦ {r.energy} · {r.hits} va chạm
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
        <p className="competitive-note">
          Đổi đường bay mỗi thứ Hai, giờ Việt Nam. Cùng đường đua, cùng tốc độ; lấy lượt tốt nhất.
          Server kiểm tra lại điều khiển trước khi ghi thành tích.
        </p>
      </section>
      <section className="sky-lobby-rules">
        <span>
          <SkyRaceSprite cell={24} />
          <b>Linh khí</b>−0,25s mỗi viên
        </span>
        <span>
          <SkyRaceSprite cell={27} />
          <b>Tăng tốc</b>3 lượt · hồi 5s
        </span>
        <span>
          <SkyRaceSprite cell={16} />
          <b>Va chạm</b>+2s, chậm ngắn
        </span>
        <span>
          <SkyRaceSprite cell={28} />
          <b>Hộ thuẫn</b>Chặn 1 va chạm
        </span>
      </section>
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
