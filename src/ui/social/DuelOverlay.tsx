import { useEffect, useRef } from 'react';
import { useSocial } from '../../store/socialStore';
import { closeArena, readyArena, sendArenaInput } from '../../net/socialBridge';
import { ARENA_H, ARENA_ROCKS, ARENA_W, type ArenaFighter } from '../../game/systems/arena';
import { DEFAULT_LOADOUT } from '../../game/systems/skills';
import { isTypingTarget } from '../../game/systems/typing';
import { arenaMouseMotion, arenaMousePoint } from '../../game/systems/arenaMouse';
import type { Vec2 } from '../../game/types';
import { optimizedAsset } from '../../data/assetDelivery';
import { SKILLS, type SkillId } from '../../data';
import { skillSpriteUrl } from '../../game/art/icons';
import './duel.css';
import { wangEffect } from '../../data/wangSkills';
import { PaintedArenaEffect } from './PaintedArenaEffect';
import { heroFor } from '../../data/heroes';
import { heroSpell } from '../../data/heroSkills';
import { HeroPose, HeroDirectionalPose, HeroSpellGlyph, RosterPortrait } from '../HeroArt';
import { heroDirection } from '../../game/art/heroDirections';
import { HeroArenaEffect } from './HeroArenaEffect';
import { RealmBadge } from '../RealmBadge';

function FighterCard({ fighter: p, enemy = false }: { fighter: ArenaFighter; enemy?: boolean }) {
  const hero = heroFor(p);
  return (
    <div className={`duel-vitals ${enemy ? 'rival' : ''}`}>
      <RosterPortrait id={hero.id} />
      <div>
        <b>
          {p.name}
          <small>Lv.{p.level}</small>
        </b>
        <span className="duel-school">{hero.school}</span>
        <div className="duel-vital-bar hp">
          <i style={{ width: `${(p.hp / p.maxHp) * 100}%` }} />
          <span>
            {Math.ceil(p.hp)} / {p.maxHp}
          </span>
        </div>
        <div className="duel-vital-bar mp">
          <i style={{ width: `${(p.mp / Math.max(1, p.maxMp)) * 100}%` }} />
          <span>
            {Math.floor(p.mp)} / {p.maxMp}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DuelOverlay() {
  const duel = useSocial((s) => s.duel),
    nonce = duel?.nonce;
  const move = useRef({ x: 0, y: 0 }),
    mouseGoal = useRef<Vec2 | null>(null),
    keys = useRef(new Set<string>()),
    cast = useRef<SkillId | null>(null),
    seq = useRef(0),
    drag = useRef<{ x: number; y: number } | null>(null);
  const live = useRef(duel);
  live.current = duel;
  useEffect(() => {
    if (!nonce) return;
    const heldKeys = keys.current;
    seq.current = 0;
    move.current = { x: 0, y: 0 };
    keys.current.clear();
    cast.current = null;
    drag.current = null;
    mouseGoal.current = null;
    readyArena();
    let lastReady = Date.now();
    const tick = () => {
      // Acceptance can arrive before the host has opened its arena. Retry the
      // ready handshake until a snapshot confirms that the countdown started.
      if (live.current?.snapshot.phase === 'waiting' && Date.now() - lastReady >= 500) {
        readyArena();
        lastReady = Date.now();
      }
      const p = live.current?.snapshot.fighters.find((p) => p.userId === live.current?.localId);
      if (!p) return;
      const k = keys.current,
        x =
          (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
        y = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
      let motion = move.current;
      if (x || y) { mouseGoal.current = null; motion = { x, y }; }
      else if (mouseGoal.current) {
        const next = arenaMouseMotion(p, mouseGoal.current, p.speed);
        if (next) motion = next;
        else { mouseGoal.current = null; motion = { x: 0, y: 0 }; }
      }
      sendArenaInput({
        seq: ++seq.current,
        x: motion.x,
        y: motion.y,
        cast: cast.current,
      });
      cast.current = null;
    };
    const key = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
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
          'shift',
          '5',
          '6',
          '7',
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
        if ('1234567'.includes(k)) cast.current = loadout[Number(k) - 1] ?? null;
        if (k === 'shift') cast.current = 'than_phap';
        if (k === ' ' && loadout.includes('basic')) cast.current = 'basic';
        if (k === 'escape') closeArena();
      }
    };
    const blur = () => {
      keys.current.clear();
      mouseGoal.current = null;
      move.current = { x: 0, y: 0 };
    };
    window.addEventListener('keydown', key, true);
    window.addEventListener('keyup', key, true);
    window.addEventListener('blur', blur);
    const timer = setInterval(tick, 80);
    return () => {
      clearInterval(timer);
      heldKeys.clear();
      move.current = { x: 0, y: 0 };
      cast.current = null;
      drag.current = null;
      mouseGoal.current = null;
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('keyup', key, true);
      window.removeEventListener('blur', blur);
    };
  }, [nonce]);
  if (!duel) return null;
  const s = duel.snapshot,
    me = s.fighters.find((p) => p.userId === duel.localId);
  const enemy = s.fighters.find((p) => p.userId !== duel.localId);
  if (!me || !enemy) return <div className="duel-screen"><p>Chưa nhận đủ thông tin trận đấu.</p><button className="btn" onClick={closeArena}>Trở về</button></div>;
  const loadout = me.loadout ?? DEFAULT_LOADOUT;
  const seconds = Math.ceil(
    Math.max(0, s.remaining - (s.phase === 'countdown' ? 3000 - s.elapsed : 0)) / 1000,
  );
  return (
    <div className="duel-screen">
      <section className="duel-arena panel-ornate">
        <header>
          <div className="duel-title">
            <h3>{duel.practice ? 'Luận kiếm · Mộc Nhân' : 'Tỷ Võ · 1 vs 1'}</h3>
            <small>Điều khiển tay · Né đòn và chọn thời điểm ra chiêu</small>
            <button className="close" aria-label="Rời tỷ võ" onClick={closeArena}>
              ×
            </button>
          </div>
          <div className="duel-scoreboard">
            <FighterCard fighter={me} />
            <div className="duel-versus">
              <b>VS</b>
              <time>
                {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                {String(seconds % 60).padStart(2, '0')}
              </time>
            </div>
            <FighterCard fighter={enemy} enemy />
          </div>
        </header>
        <div className="duel-battleground" style={{ backgroundImage: `url('${optimizedAsset('/assets/heroes-v7/arena.png')}')` }}>
          <div
            className="duel-stage"
            onPointerDown={(e) => {
              if (s.phase === 'finished' || (e.target as Element).closest('button,a,input')) return;
              if (e.pointerType === 'mouse') {
                if (e.button !== 0) return;
                mouseGoal.current = arenaMousePoint({ x: e.clientX, y: e.clientY }, e.currentTarget.getBoundingClientRect(), me, !!e.currentTarget.closest('.app.turned'));
                return;
              }
              mouseGoal.current = null;
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
              mouseGoal.current = null;
              move.current = { x: 0, y: 0 };
            }}
          >
            {mouseGoal.current && <span className="duel-move-marker" aria-hidden="true" style={{ left: `${mouseGoal.current.x / ARENA_W * 100}%`, top: `${mouseGoal.current.y / ARENA_H * 100}%` }} />}
            {ARENA_ROCKS.map((r, i) => (
              <span
                key={i}
                className="duel-rock"
                style={{ left: `${(r.x / ARENA_W) * 100}%`, top: `${(r.y / ARENA_H) * 100}%` }}
              />
            ))}
            {s.effects.map((e) =>
              wangEffect(e.skill) ? (
                <PaintedArenaEffect
                  key={e.id}
                  effect={e}
                  elapsed={s.elapsed}
                  target={s.fighters.find((f) => f.userId !== e.owner)!}
                />
              ) : (
                <HeroArenaEffect
                  key={e.id}
                  effect={e}
                  elapsed={s.elapsed}
                  heroId={heroFor(s.fighters.find((p) => p.userId === e.owner)!).id}
                />
              ),
            )}
            {s.fighters.map((p) => {
              const action = (p.actionUntil ?? 0) > s.elapsed;
              const pose =
                p.hp <= 0
                  ? 5
                  : action
                    ? p.lastSkill === 'basic'
                      ? 3
                      : p.lastSkill === 'than_phap'
                        ? 2
                        : 4
                    : p.moving
                      ? Math.floor(s.elapsed / 140) % 2
                        ? 1
                        : 2
                      : 0;
              return (
                <div
                  className={`duel-fighter ${p.userId === duel.localId ? 'mine' : 'enemy'} ${p.rootUntil > s.elapsed ? 'rooted' : ''}`}
                  key={p.userId}
                  style={{ left: 0, top: 0, transform: `translate3d(${(p.x / ARENA_W) * 100}cqw, ${(p.y / ARENA_H) * 100}cqh, 0) translate(-50%, -97%)` }}
                >
                  <div className="duel-fighter-name">
                    <RealmBadge level={p.level} realm={p.realm} compact />
                    <span>{p.name}</span>
                  </div>
                  <div className="duel-hp">
                    <i style={{ width: `${(p.hp / p.maxHp) * 100}%` }} />
                  </div>
                  {pose === 5 ? (
                    <HeroPose id={heroFor(p).id} pose={5} className="duel-body" />
                  ) : (
                    <HeroDirectionalPose
                      id={heroFor(p).id}
                      direction={heroDirection(p.dx, p.dy)}
                      cast={pose === 3 || pose === 4}
                      className={`duel-body ${(p.hurtUntil ?? 0) > s.elapsed ? 'hurt' : ''}`}
                    />
                  )}
                  {p.shield > 0 && <span className="duel-shield" aria-label="Đang có lá chắn" />}
                </div>
              );
            })}
            {(s.phase === 'waiting' || s.phase === 'countdown') && (
              <div className="duel-countdown">
                {s.phase === 'waiting'
                  ? 'Chờ đối thủ sẵn sàng…'
                  : Math.max(1, Math.ceil((3000 - s.elapsed) / 1000))}
              </div>
            )}
            {s.phase === 'finished' && (
              <div className="duel-finish">
                <h2>
                  {!s.winner ? 'Hòa' : s.winner === duel.localId ? 'Chiến thắng' : 'Bại trận'}
                </h2>
                <p>{s.reason}</p>
                <button className="btn gold" onClick={closeArena}>
                  Trở về
                </button>
              </div>
            )}
          </div>
        </div>
        <footer>
          <button className="btn duel-leave" onClick={closeArena} aria-label="Rời sân luyện võ">
            Trở về
          </button>
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
            <small className="duel-desktop-hint">Chuột trái chọn điểm đến · 1–7 ra chiêu · Shift lướt</small>
            <small className="duel-touch-hint">Kéo sân để di chuyển · Chạm chiêu để tấn công</small>
          </span>
          <div className="duel-abilities">
            {[...loadout, 'than_phap' as const].map((id, i) => {
              const cooldown = Math.max(0, (me.cooldowns[id] ?? 0) - s.elapsed);
              return (
                <button
                  key={i}
                  disabled={!!cooldown || s.phase !== 'fighting' || me.mp < SKILLS[id].mpCost}
                  onPointerDown={() => (cast.current = id)}
                  title={SKILLS[id].desc}
                  aria-label={id === 'than_phap' ? 'Lướt' : SKILLS[id].name}
                  data-skill={id}
                  className={id === 'basic' ? 'basic' : id === 'than_phap' ? 'dash' : ''}
                  onClick={() => {
                    cast.current = id;
                  }}
                >
                  {heroSpell(id) ? (
                    <HeroSpellGlyph id={id} />
                  ) : (
                    <img src={skillSpriteUrl(id, me.sex)} alt="" />
                  )}
                  <span>
                    <kbd>{id === 'than_phap' ? '⇧' : i + 1}</kbd>
                    <em className="duel-ability-name">
                      {' '}
                      {id === 'than_phap' ? 'Lướt' : SKILLS[id].name}
                    </em>
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
