import { useEffect, useRef } from 'react';
import { useSocial } from '../../store/socialStore';
import { closeArena, readyArena, sendArenaInput } from '../../net/socialBridge';
import { ARENA_H, ARENA_ROCKS, ARENA_W } from '../../game/systems/arena';
import { DEFAULT_LOADOUT } from '../../game/systems/skills';
import { SKILLS, type SkillId } from '../../data';
import { skillSpriteUrl } from '../../game/art/icons';
import './duel.css';

export function DuelOverlay() {
  const duel = useSocial((s) => s.duel),
    nonce = duel?.nonce;
  const move = useRef({ x: 0, y: 0 }),
    keys = useRef(new Set<string>()),
    cast = useRef<SkillId | null>(null),
    seq = useRef(0),
    drag = useRef<{ x: number; y: number } | null>(null);
  const live = useRef(duel);
  live.current = duel;
  useEffect(() => {
    if (!nonce) return;
    seq.current = 0;
    move.current = { x: 0, y: 0 };
    keys.current.clear();
    readyArena();
    const tick = () => {
      const p = live.current?.snapshot.fighters.find((p) => p.userId === live.current?.localId);
      if (!p) return;
      const k = keys.current,
        x =
          (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
        y = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
      sendArenaInput({
        seq: ++seq.current,
        x: x || move.current.x,
        y: y || move.current.y,
        cast: cast.current,
      });
      cast.current = null;
    };
    const key = (e: KeyboardEvent) => {
      if ((e.target as Element)?.closest('input,textarea,select')) return;
      const k = e.key.toLowerCase();
      if (
        ![
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          '1',
          '2',
          '3',
          '4',
          ' ',
          'escape',
        ].includes(k)
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type === 'keyup') keys.current.delete(k);
      else {
        keys.current.add(k);
        const me = live.current?.snapshot.fighters.find((p) => p.userId === live.current?.localId),
          loadout = me?.loadout ?? DEFAULT_LOADOUT;
        if ('1234'.includes(k)) cast.current = loadout[Number(k) - 1];
        if (k === ' ' && loadout.includes('basic')) cast.current = 'basic';
        if (k === 'escape') closeArena();
      }
    };
    const blur = () => {
      keys.current.clear();
      move.current = { x: 0, y: 0 };
    };
    window.addEventListener('keydown', key, true);
    window.addEventListener('keyup', key, true);
    window.addEventListener('blur', blur);
    const timer = setInterval(tick, 80);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('keyup', key, true);
      window.removeEventListener('blur', blur);
    };
  }, [nonce]);
  if (!duel) return null;
  const s = duel.snapshot,
    me = s.fighters.find((p) => p.userId === duel.localId)!,
    loadout = me.loadout ?? DEFAULT_LOADOUT;
  return (
    <div className="duel-screen">
      <section className="duel-arena panel-ornate">
        <header>
          <div>
            <h3>{duel.practice ? 'Luận kiếm · Mộc Nhân' : 'Tỷ Võ · Điều Khiển Tay'}</h3>
            <small>Di chuyển để né đòn · 4 ô chiêu theo bộ kỹ năng của bạn</small>
          </div>
          <b>
            {Math.ceil(
              Math.max(0, s.remaining - (s.phase === 'countdown' ? 3000 - s.elapsed : 0)) / 1000,
            )}
            s
          </b>
          <button className="close" aria-label="Rời tỷ võ" onClick={closeArena}>
            ×
          </button>
        </header>
        <div
          className="duel-stage"
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            let x = (e.clientX - drag.current.x) / 35,
              y = (e.clientY - drag.current.y) / 35;
            if (e.currentTarget.closest('.app.turned')) [x, y] = [y, -x];
            const d = Math.max(1, Math.hypot(x, y));
            move.current = { x: x / d, y: y / d };
          }}
          onPointerUp={() => {
            drag.current = null;
            move.current = { x: 0, y: 0 };
          }}
          onPointerCancel={() => {
            drag.current = null;
            move.current = { x: 0, y: 0 };
          }}
        >
          <span className="duel-floor-title">LUẬN KIẾM ĐÀI</span>
          {ARENA_ROCKS.map((r, i) => (
            <span
              key={i}
              className="duel-rock"
              style={{ left: `${(r.x / ARENA_W) * 100}%`, top: `${(r.y / ARENA_H) * 100}%` }}
            />
          ))}
          {s.effects.map((e) => (
            <span
              key={e.id}
              className={`duel-effect ${e.kind} ${e.resolved ? 'landed' : ''}`}
              style={{
                left: `${(e.x / ARENA_W) * 100}%`,
                top: `${(e.y / ARENA_H) * 100}%`,
                width: `${((e.kind === 'line' ? e.range : e.range * 2) / ARENA_W) * 100}%`,
                height: e.kind === 'line' ? '12%' : `${((e.range * 2) / ARENA_H) * 100}%`,
                ...(e.kind === 'cone'
                  ? {
                      background: `conic-gradient(from ${(Math.atan2(e.dy, e.dx) * 180) / Math.PI + 90 - e.arc / 2}deg, ${e.resolved ? '#eee8ff99' : '#ff6b3855'} 0deg ${e.arc}deg, transparent ${e.arc}deg 360deg)`,
                    }
                  : {}),
                transform:
                  e.kind === 'line'
                    ? `translateY(-50%) rotate(${Math.atan2(e.dy, e.dx)}rad)`
                    : 'translate(-50%,-50%)',
              }}
            />
          ))}
          {s.fighters.map((p) => (
            <div
              className={`duel-fighter ${p.userId === duel.localId ? 'mine' : 'enemy'}`}
              key={p.userId}
              style={{ left: `${(p.x / ARENA_W) * 100}%`, top: `${(p.y / ARENA_H) * 100}%` }}
            >
              <div className="duel-fighter-name">
                {p.name} · Lv.{p.level}
              </div>
              <div className="duel-hp">
                <i style={{ width: `${(p.hp / p.maxHp) * 100}%` }} />
              </div>
              <small>
                {Math.ceil(p.hp)}/{p.maxHp}
                {p.shield > 0 ? ` · Khiên ${p.shield}` : ''}
              </small>
              <span
                className={`duel-body ${p.sex === 'male' ? 'wang' : 'li'}`}
                style={{ transform: p.dx < 0 ? 'scaleX(-1)' : '' }}
              />
            </div>
          ))}
          {(s.phase === 'waiting' || s.phase === 'countdown') && (
            <div className="duel-countdown">
              {s.phase === 'waiting'
                ? 'Chờ đối thủ sẵn sàng…'
                : Math.max(1, Math.ceil((3000 - s.elapsed) / 1000))}
            </div>
          )}
          {s.phase === 'finished' && (
            <div className="duel-finish">
              <h2>{!s.winner ? 'Hòa' : s.winner === duel.localId ? 'Chiến thắng' : 'Bại trận'}</h2>
              <p>{s.reason}</p>
              <button className="btn gold" onClick={closeArena}>
                Trở về
              </button>
            </div>
          )}
        </div>
        <footer>
          <div className="duel-directions">
            {[
              ['↑', 0, -1],
              ['←', -1, 0],
              ['↓', 0, 1],
              ['→', 1, 0],
            ].map(([label, x, y]) => (
              <button
                key={String(label)}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  move.current = { x: Number(x), y: Number(y) };
                }}
                onPointerUp={() => (move.current = { x: 0, y: 0 })}
                onPointerCancel={() => (move.current = { x: 0, y: 0 })}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="duel-mp">
            MP {Math.floor(me.mp)}/{me.maxMp}
            <small>Kéo sân để di chuyển · WASD / 1–4</small>
          </span>
          <div className="duel-abilities">
            {loadout.map((id, i) => {
              const cooldown = Math.max(0, (me.cooldowns[id] ?? 0) - s.elapsed);
              return (
                <button
                  key={i}
                  disabled={!!cooldown || s.phase !== 'fighting' || me.mp < SKILLS[id].mpCost}
                  onPointerDown={() => (cast.current = id)}
                  title={SKILLS[id].desc}
                >
                  <img src={skillSpriteUrl(id, me.sex)} alt="" />
                  <span>
                    {i + 1} · {SKILLS[id].name}
                  </span>
                  {cooldown > 0 && <b>{(cooldown / 1000).toFixed(1)}</b>}
                </button>
              );
            })}
          </div>
        </footer>
      </section>
    </div>
  );
}
