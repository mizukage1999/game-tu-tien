import { useSocial } from '../../store/socialStore';

/**
 * The duel result. Both duelists compute the same fight from the same seed, so
 * this panel is byte-identical on both machines — it is a record, not a dispute.
 */
export function DuelOverlay() {
  const duel = useSocial((s) => s.duel);
  const close = useSocial((s) => s.setDuel);

  if (!duel) return null;
  const { result, a, b } = duel;
  const winner = result.winnerId === a.userId ? a : b;
  const loser = winner === a ? b : a;

  return (
    <div className="menu-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close(null)}>
      <div className="duel-panel panel-ornate">
        <div className="menu-header">
          <h3>Tỉ Võ Kết Quả</h3>
          <button className="close" onClick={() => close(null)} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="duel-body">
          <div className={`duel-side ${winner === a ? 'win' : 'lose'}`}>
            <span className="duel-name">{a.name}</span>
            <span className="duel-tag">{winner === a ? 'Thắng' : 'Thua'}</span>
            <div className="bar bar-hp small">
              <div className="bar-fill" style={{ width: `${(result.hp[a.userId] / result.maxHp[a.userId]) * 100}%` }} />
              <span className="bar-text">
                {result.hp[a.userId]} / {result.maxHp[a.userId]}
              </span>
            </div>
          </div>
          <span className="duel-vs">VS</span>
          <div className={`duel-side ${winner === b ? 'win' : 'lose'}`}>
            <span className="duel-name">{b.name}</span>
            <span className="duel-tag">{winner === b ? 'Thắng' : 'Thua'}</span>
            <div className="bar bar-hp small">
              <div className="bar-fill" style={{ width: `${(result.hp[b.userId] / result.maxHp[b.userId]) * 100}%` }} />
              <span className="bar-text">
                {result.hp[b.userId]} / {result.maxHp[b.userId]}
              </span>
            </div>
          </div>
        </div>
        <div className="duel-log">
          {result.rounds.map((r, i) => (
            <div key={i} className={`duel-round ${r.crit ? 'crit' : ''}`}>
              <span className="duel-turn">Lượt {i + 1}</span>
              <span className="duel-hit">
                {(r.attackerId === a.userId ? a.name : b.name)} đánh {r.damage}
                {r.crit ? ' (bạo kích!)' : ''}
              </span>
              <span className="duel-hpleft">Còn {r.hp[r.targetId]}</span>
            </div>
          ))}
        </div>
        <p className="muted duel-note">
          {winner.name} thắng {loser.name} sau {result.turns} lượt — kết quả do cả hai máy cùng tính.
        </p>
      </div>
    </div>
  );
}
