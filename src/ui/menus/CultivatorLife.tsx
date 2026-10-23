import { useState } from 'react';
import { useGame, itemName } from '../../store/gameStore';
import { EventBus } from '../../game/EventBus';
import {
  CROPS,
  FACILITIES,
  COMPANIONS,
  WORKSHOP_RECIPES,
  facilityCost,
  gameDate,
  lifeProgress,
  type Facility,
} from '../../game/systems/life';
import { itemIconUrl } from '../../game/art/icons';
import './life.css';

function Materials({ cost }: { cost: Record<string, number> }) {
  const inventory = useGame((s) => s.player.inventory);
  return (
    <div className="life-materials">
      {Object.entries(cost).map(([id, n]) => (
        <span key={id} className={(inventory[id] ?? 0) >= n ? 'enough' : 'short'}>
          {itemName(id)} {inventory[id] ?? 0}/{n}
        </span>
      ))}
    </div>
  );
}

export function HomeBoard() {
  const p = useGame((s) => s.player),
    atHome = useGame((s) => s.mapId === 'dong_phu'),
    act = useGame((s) => s.lifeAction);
  const section = useGame((s) => s.homeSection),
    patch = useGame((s) => s.patch);
  const setSection = (homeSection: 'field' | 'chamber' | 'furnace' | 'artifact') =>
    patch({ homeSection });
  const l = lifeProgress(p),
    [crop, setCrop] = useState('thanh_linh_thao');
  return (
    <div className="life-board">
      <div className="life-toolbar">
        <span>
          {gameDate(p)} <small>· 30 giây chơi = 1 ngày game</small>
        </span>
        <button
          className="btn gold"
          disabled={!!l.retreat}
          onClick={() => EventBus.emit('cmd:home')}
        >
          {atHome ? 'Rời động phủ' : 'Về động phủ'}
        </button>
      </div>
      <nav className="life-tabs" aria-label="Công trình động phủ">
        {(
          [
            ['field', 'Linh điền'],
            ['chamber', 'Tĩnh thất'],
            ['furnace', 'Đan phòng'],
            ['artifact', 'Pháp bảo'],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            className={section === id ? 'active' : ''}
            onClick={() => setSection(id)}
          >
            {name}
          </button>
        ))}
      </nav>
      {!atHome && (
        <p className="immortal-note">
          Về động phủ để gieo trồng, bế quan, nâng cấp và chế tạo. Bạn có thể xem công trình từ xa.
        </p>
      )}
      {section === 'field' && (
        <>
          <div className="life-toolbar">
            <h4>Linh điền · cấp {l.facilities.field}</h4>
            <select
              aria-label="Chọn linh thảo"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.days} ngày
                </option>
              ))}
            </select>
          </div>
          <div className="life-plots">
            {l.plots.map((plot, i) => {
              const c = CROPS.find((c) => c.id === plot?.herb),
                remaining = plot ? Math.max(0, plot.readyDay - l.days) : 0;
              return (
                <article className={`life-plot ${plot ? 'planted' : ''}`} key={i}>
                  <span>Luống {i + 1}</span>
                  {c && <img src={itemIconUrl(c.id)} alt="" />}
                  <b>{c?.name ?? 'Đất trống'}</b>
                  <small>
                    {plot
                      ? remaining
                        ? `Còn ${remaining} ngày game`
                        : 'Đã trưởng thành'
                      : 'Mỗi lần gieo dùng 1 hạt giống'}
                  </small>
                  <button
                    className="btn gold"
                    disabled={!atHome || !!remaining}
                    onClick={() =>
                      act(
                        plot
                          ? { type: 'harvest', plot: i }
                          : { type: 'plant', plot: i, herb: crop },
                      )
                    }
                  >
                    {plot ? 'Thu hoạch' : 'Gieo trồng'}
                  </button>
                </article>
              );
            })}
          </div>
          <p className="immortal-note">
            Thu hoạch nhận linh thảo và hoàn lại 1 hạt giống. Mua hạt giống tại Tiền Đa Bảo.
          </p>
        </>
      )}
      {section === 'chamber' && (
        <article className="immortal-card">
          <h4>Tĩnh thất · cấp {l.facilities.chamber}</h4>
          <p>
            Tư chất {l.aptitude} · tụ linh trận cấp {l.facilities.array}. Tu vi thu được phụ thuộc
            thời gian bế quan và hiệu suất tu luyện.
          </p>
          {l.retreat ? (
            <>
              <p>
                {l.retreat.readyDay <= l.days
                  ? 'Bế quan viên mãn, có thể xuất quan.'
                  : `Còn ${l.retreat.readyDay - l.days} ngày game.`}
              </p>
              <button
                className="btn gold"
                disabled={!atHome || l.retreat.readyDay > l.days}
                onClick={() => act({ type: 'claimRetreat' })}
              >
                Xuất quan · nhận tu vi
              </button>
              <button className="btn" onClick={() => act({ type: 'cancelRetreat' })}>
                Dừng bế quan
              </button>
            </>
          ) : (
            <div className="life-actions">
              {[1, 3, 10].map((days) => (
                <button
                  key={days}
                  className="btn gold"
                  disabled={!atHome}
                  onClick={() => act({ type: 'retreat', days })}
                >
                  Bế quan {days} ngày
                </button>
              ))}
            </div>
          )}
          <p className="immortal-note">
            Khi bế quan, nhân vật ở lại tĩnh thất. Tuổi vẫn tăng theo thời gian, không tự chuyển
            thành tu vi.
          </p>
        </article>
      )}
      {section === 'furnace' && (
        <>
          <p className="immortal-note">
            Lò đan · cấp {l.facilities.furnace}. Đan dược thông dụng luyện tại tab Đan Phòng; công
            thức và pháp bảo chế tạo tại đây.
          </p>
          {WORKSHOP_RECIPES.map((r) => (
            <article className="immortal-card life-recipe" key={r.id}>
              <img src={itemIconUrl(r.id)} alt="" />
              <div>
                <h4>{r.name}</h4>
                <small>
                  Lò đan cấp {r.furnace}
                  {r.formula ? ' · cần học công thức' : ''}
                </small>
                <Materials cost={r.cost} />
              </div>
              {r.formula && !l.knownRecipes.includes(r.id) ? (
                <button className="btn" onClick={() => act({ type: 'learn', formula: r.formula! })}>
                  Học công thức
                </button>
              ) : (
                <button
                  className="btn gold"
                  disabled={!atHome || l.facilities.furnace < r.furnace}
                  onClick={() => act({ type: 'forge', recipe: r.id })}
                >
                  Chế tạo
                </button>
              )}
            </article>
          ))}
        </>
      )}
      {section === 'artifact' && (
        <article className="immortal-card">
          <h4>Ngọc Hộ Thân</h4>
          <p>
            Pháp bảo hỗ trợ: +12 phòng ngự, +100 sinh lực. Cần chế tạo từ Huyền Thiết, Linh Chi và
            công thức tương ứng.
          </p>
          <p>
            Đang có: {p.inventory.phap_bao_ngoc ?? 0} ·{' '}
            {l.artifact ? 'Đang vận dụng' : 'Chưa vận dụng'}
          </p>
          <button
            className="btn gold"
            disabled={!l.artifact && !(p.inventory.phap_bao_ngoc > 0)}
            onClick={() => act({ type: 'artifact', id: l.artifact ? null : 'phap_bao_ngoc' })}
          >
            {l.artifact ? 'Thu pháp bảo' : 'Vận dụng'}
          </button>
        </article>
      )}
      <h4 className="life-upgrade-title">Xây dựng & nâng cấp</h4>
      <div className="life-facilities">
        {Object.entries(FACILITIES).map(([id, name]) => {
          const level = l.facilities[id as Facility];
          return (
            <article className="immortal-card" key={id}>
              <h4>
                {name} · {level}/3
              </h4>
              <Materials cost={facilityCost(level)} />
              <button
                className="btn"
                disabled={!atHome || level >= 3 || !!l.retreat}
                onClick={() => act({ type: 'facility', facility: id as Facility })}
              >
                {level >= 3 ? 'Đã tối đa' : 'Nâng cấp'}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function CompanionPanel() {
  const p = useGame((s) => s.player),
    act = useGame((s) => s.lifeAction),
    l = lifeProgress(p);
  return (
    <div>
      <p className="immortal-note">
        Săn yêu thú để kiếm Yêu Đan rồi kết khế ước. Linh thú theo bạn qua các map, cộng chỉ số và
        hỗ trợ mục tiêu bạn đang tấn công. Linh Thú Đan giúp tăng thân mật và bậc.
      </p>
      <div className="life-pets">
        {COMPANIONS.map((c, i) => {
          const own = l.companions[c.id];
          return (
            <article
              className={`immortal-card ${l.companion === c.id ? 'pet-active' : ''}`}
              key={c.id}
            >
              <span
                className="pet-portrait"
                style={{ backgroundPosition: `${(i % 3) * 50}% ${Math.floor(i / 3) * 100}%` }}
              />
              <h4>{c.name}</h4>
              <p>{c.desc}</p>
              <small>
                Công {c.atk * (own?.rank ?? 1)} · Thủ {c.def * (own?.rank ?? 1)} · Sinh lực{' '}
                {c.hp * (own?.rank ?? 1)}
              </small>
              <p>
                {own
                  ? `Bậc ${own.rank}/5 · Thân mật ${own.bond}/${own.rank * 2}`
                  : `Kết khế ước: ${c.cost} Yêu Đan (có ${p.inventory.yeu_dan ?? 0})`}
              </p>
              <div className="life-actions">
                <button
                  className="btn gold"
                  onClick={() =>
                    act(
                      own
                        ? { type: 'companion', id: l.companion === c.id ? null : c.id }
                        : { type: 'tame', id: c.id },
                    )
                  }
                >
                  {!own ? 'Kết khế ước' : l.companion === c.id ? 'Nghỉ ngơi' : 'Đồng hành'}
                </button>
                {own && (
                  <button
                    className="btn"
                    disabled={own.rank >= 5}
                    onClick={() => act({ type: 'feed', id: c.id })}
                  >
                    Nuôi dưỡng
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
