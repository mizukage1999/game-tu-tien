import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EventBus } from '../game/EventBus';
import { SkyRaceEngine, SKY_STEP, SKY_LENGTH, skyTime } from '../game/systems/skyRace';
import { skyRaceStore } from '../store/skyRaceStore';
import { performanceStore } from '../store/performanceStore';
import { useGame } from '../store/gameStore';
import { screenToTurnedGame, usePhoneLayout, usePortrait } from './TouchPlay';
import { drawSkyRace, SKY_ART } from './skyRaceArt';
import { skyRaceAction, type SkyRacePage } from '../net/skyRace';
import './sky-race.css';
export interface SkyRun {
  id?: string;
  seed: number;
  week: string;
}
export function SkyRaceRun({
  run,
  onClose,
  onResult,
}: {
  run: SkyRun;
  onClose: () => void;
  onResult: (p: SkyRacePage) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    engine = useRef(new SkyRaceEngine(run.seed));
  const input = useRef({ target: 0, axis: 0, boost: false, keyboard: false });
  const [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [countdown, setCountdown] = useState(3);
  const [view, setView] = useState({
    time: 0,
    gate: 0,
    energy: 0,
    charges: 3,
    shield: 0,
    progress: 0,
    phase: 'flying',
    hits: 0,
    penalty: 0,
    cooldown: 0,
  });
  const [sending, setSending] = useState(false),
    [saved, setSaved] = useState(false);
  const valid = useRef(true),
    submitted = useRef(false),
    mounted = useRef(true),
    attempted = useRef(false);
  const phone = usePhoneLayout(),
    portrait = usePortrait(),
    turned = phone && portrait;
  const accountKey = useGame((s) => `${s.player.name}:${s.player.heroId}`);
  const initialAccount = useRef(accountKey);
  useEffect(() => {
    if (accountKey !== initialAccount.current) onClose();
  }, [accountKey, onClose]);
  const submit = async () => {
    if (!run.id || submitted.current || !valid.current) return;
    submitted.current = true;
    setSending(true);
    setError('');
    try {
      const p = await skyRaceAction('finish', { id: run.id, inputs: engine.current.inputs });
      if (mounted.current) {
        onResult(p);
        setSaved(true);
      }
    } catch (e) {
      submitted.current = false;
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setSending(false);
    }
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    mounted.current = true;
    skyRaceStore.setState({ active: true });
    EventBus.emit('cmd:save');
    EventBus.emit('cmd:duelPause', true);
    return () => {
      mounted.current = false;
      skyRaceStore.setState({ active: false });
      EventBus.emit('cmd:duelPause', false);
      if (run.id && !submitted.current)
        void skyRaceAction('cancel', { id: run.id }).catch(() => {});
    };
  }, [run.id]);
  useEffect(() => {
    const image = new Image();
    let alive = true;
    image.onload = () => {
      if (alive) setReady(true);
    };
    image.onerror = () => {
      if (alive) setError('Chưa tải được sprite đường bay. Hãy quay lại và thử lại.');
    };
    image.src = SKY_ART;
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) {
      setError('Trình duyệt chưa mở được màn hình đường bay.');
      return;
    }
    let raf = 0,
      last = 0,
      accumulator = 0,
      w = 960,
      h = 480,
      started = 0,
      ui = 0,
      shownCountdown = 3;
    const resize = () => {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        performanceStore.getState().tier === 2 ? 1.5 : 2,
      );
      w = c.clientWidth || 960;
      h = c.clientHeight || 480;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    resize();
    const hidden = () => {
      keys.clear();
      input.current.axis = 0;
      input.current.keyboard = false;
      input.current.target = engine.current.x;
      if (document.hidden && run.id) {
        valid.current = false;
        setError(
          'Lượt xếp hạng bị gián đoạn khi đổi ứng dụng. Kết quả này không gửi lên bảng tuần.',
        );
      }
    };
    const keys = new Set<string>();
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!['arrowleft', 'arrowright', 'a', 'd', ' ', 'escape'].includes(k)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (k === 'escape' && e.type === 'keydown') {
        onClose();
        return;
      }
      if (e.type === 'keydown') keys.add(k);
      else keys.delete(k);
      input.current.keyboard = keys.size > 0;
      input.current.axis =
        Number(keys.has('arrowright') || keys.has('d')) -
        Number(keys.has('arrowleft') || keys.has('a'));
      if (!input.current.keyboard) input.current.target = engine.current.x;
      if (k === ' ' && e.type === 'keydown' && !e.repeat) input.current.boost = true;
    };
    window.addEventListener('keydown', key, true);
    window.addEventListener('keyup', key, true);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', hidden);
    const loop = (now: number) => {
      if (!alive) return;
      const delta = last ? now - last : 0;
      last = now;
      if (image.complete && image.naturalWidth) {
        if (!started) started = now;
        const remaining = Math.max(0, 3 - Math.floor((now - started) / 1000));
        if (remaining !== shownCountdown) {
          shownCountdown = remaining;
          setCountdown(remaining);
        }
        if (now - started >= 3000 && engine.current.phase === 'flying' && !document.hidden) {
          // Catch up every physics tick after a slow frame. No race time is discarded.
          accumulator += delta;
          while (accumulator >= SKY_STEP && engine.current.phase === 'flying') {
            const s = engine.current,
              control = input.current;
            const axis = control.keyboard
              ? control.axis
              : Math.max(-1, Math.min(1, (control.target - s.x) / 0.022));
            control.axis = axis;
            s.step(axis, control.boost);
            control.boost = false;
            accumulator -= SKY_STEP;
          }
        }
        drawSkyRace(ctx, image, engine.current, w, h, input.current.axis, accumulator / SKY_STEP);
        if (now - ui > 100) {
          ui = now;
          const s = engine.current;
          setView({
            time:
              s.phase === 'finished'
                ? s.score
                : Math.max(0, s.elapsed + s.penalty - s.energy * 250),
            gate: s.gate,
            energy: s.energy,
            charges: s.charges,
            shield: s.shields,
            progress: s.distance / SKY_LENGTH,
            phase: s.phase,
            hits: s.hits,
            penalty: s.penalty,
            cooldown: Math.max(0, s.cooldownUntil - s.elapsed),
          });
        }
        if (engine.current.phase === 'finished' && run.id && valid.current && !attempted.current) {
          attempted.current = true;
          void submitRef.current();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      image.onload = null;
      image.onerror = null;
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('keyup', key, true);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', hidden);
    };
  }, [run.id, onClose]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'mouse' && e.type === 'pointermove' && !e.buttons) return;
    const c = canvas.current!,
      b = c.getBoundingClientRect();
    const p = turned
      ? screenToTurnedGame(
          e.clientX,
          e.clientY,
          { x: b.x, y: b.y, width: b.width, height: b.height },
          c.clientWidth,
          c.clientHeight,
        )
      : { x: ((e.clientX - b.left) * c.clientWidth) / b.width, y: 0 };
    input.current.keyboard = false;
    input.current.target = Math.max(-1, Math.min(1, (p.x / c.clientWidth - 0.5) / 0.31));
  };
  const screen = (
    <div
      className="sky-race-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Ngự Kiếm Vượt Thiên Quan"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header>
        <div>
          <small>{run.id ? 'THI ĐẤU TUẦN' : 'BAY THỬ · KHÔNG XẾP HẠNG'}</small>
          <h2>Ngự Kiếm Vượt Thiên Quan</h2>
        </div>
        <button className="btn" onClick={onClose}>
          Rời đường bay
        </button>
      </header>
      <div className="sky-race-stage">
        <canvas
          ref={canvas}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            point(e);
          }}
          onPointerMove={point}
          aria-label="Rê chuột hoặc kéo để điều khiển ngự kiếm"
        />
        <div className="sky-race-vitals">
          <strong>{skyTime(view.time)}</strong>
          <span>Cổng {view.gate}/9</span>
          <span>✦ {view.energy} linh khí</span>
          {view.shield > 0 && <span>◇ Hộ thuẫn</span>}
        </div>
        <div className="sky-race-track">
          <i style={{ width: `${Math.min(100, view.progress * 100)}%` }} />
        </div>
        {(!ready || countdown > 0) && (
          <div className="sky-race-countdown">{ready ? countdown : 'Đang mở thiên môn…'}</div>
        )}
        <button
          className="sky-race-boost"
          disabled={
            !ready || countdown > 0 || view.phase !== 'flying' || !view.charges || view.cooldown > 0
          }
          onPointerDown={(e) => {
            e.preventDefault();
            input.current.boost = true;
          }}
        >
          »
          <span>
            {view.cooldown > 0
              ? `${Math.ceil(view.cooldown / 1000)}s`
              : `Tăng tốc · ${view.charges}`}
          </span>
        </button>
        {view.phase !== 'flying' && (
          <div className="sky-race-result">
            <small>
              {view.phase === 'finished' ? 'VƯỢT THIÊN QUAN' : 'CHƯA VƯỢT QUA THIÊN QUAN'}
            </small>
            <h2>{skyTime(view.time)}</h2>
            <p>
              {view.gate}/9 cổng · {view.energy} linh khí · {view.hits} va chạm
            </p>
            <p>
              Phạt {view.penalty / 1000}s · Linh khí giảm {view.energy * 0.25}s
            </p>
            <p>
              {saved
                ? 'Đã ghi nhận thành tích trên bảng tuần.'
                : sending
                  ? 'Đang xác nhận đường bay…'
                  : run.id && !valid.current
                    ? 'Lượt bay bị gián đoạn · không ghi bảng tuần.'
                    : run.id
                      ? 'Kết quả xếp hạng cần server xác nhận.'
                      : 'Lượt luyện tập không ghi vào bảng tuần.'}
            </p>
            {run.id && valid.current && !saved && !sending && view.phase === 'finished' && (
              <button className="btn" onClick={() => void submit()}>
                Gửi lại kết quả
              </button>
            )}
            <button className="btn gold" onClick={onClose}>
              Về sảnh đường bay
            </button>
          </div>
        )}
        {error && (
          <p className="sky-race-alert" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer>
        <span>
          {phone
            ? 'Kéo ngang trên đường bay để né và qua cổng'
            : 'Rê chuột để đổi hướng · ← → hỗ trợ · Space tăng tốc'}
        </span>
        <span>Va chạm +2s · Lỡ cổng phải bay lại · Linh khí −0,25s</span>
      </footer>
    </div>
  );
  return createPortal(screen, document.querySelector('.hud') ?? document.body);
}
