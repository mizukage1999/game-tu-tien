import { useState } from 'react';
import { ITEMS, ZONE_NAMES } from '../../data';
import { EventBus } from '../../game/EventBus';
import { itemIconUrl } from '../../game/art/icons';
import {
  HOME_QUEST,
  RECIPES,
  herbNodes,
  immortalProgress,
  recipeCapacity,
  recipeCheck,
  recipeCost,
} from '../../game/systems/immortal';
import { facilityCost, lifeProgress } from '../../game/systems/life';
import { missingMaterials } from '../../game/systems/crafting';
import { itemName, useGame } from '../../store/gameStore';
import './alchemy.css';

type Tab = 'furnace' | 'brew' | 'recipes' | 'pills' | 'herbs';
const TABS = [
  ['furnace', 'Lò đan'],
  ['brew', 'Luyện đan'],
  ['recipes', 'Công thức'],
  ['pills', 'Đan dược'],
  ['herbs', 'Linh dược'],
] as const;
const HERBS = ['thanh_linh_thao', 'ngung_lo', 'linh_chi', 'linh_thach', 'yeu_dan'];
const GATHER_MAPS = [
  'dai_thua_vien',
  'linh_thu_lam',
  'dinh_ta',
  'rung_linh_thu',
  'thac_ngoc',
  'bi_canh_thach_linh',
];

function Materials({ cost }: { cost: Record<string, number> }) {
  const p = useGame((s) => s.player);
  return (
    <div className="alchemy-materials">
      {Object.entries(cost).map(([id, need]) => {
        const have = id === 'linh_khi' ? p.linhKhi : (p.inventory[id] ?? 0);
        return (
          <div className={have >= need ? 'enough' : 'short'} key={id} title={itemName(id)}>
            <img src={itemIconUrl(id)} alt="" />
            <span>{itemName(id)}</span>
            <b>
              {have}/{need}
            </b>
          </div>
        );
      })}
    </div>
  );
}

export function AlchemyPanel() {
  const [tab, setTab] = useState<Tab>('furnace');
  const [selected, setSelected] = useState<string>(RECIPES[0].id);
  const [quantity, setQuantity] = useState(1);
  const [filter, setFilter] = useState('all');
  const [herb, setHerb] = useState(HERBS[0]);
  const p = useGame((s) => s.player),
    status = useGame((s) => s.status),
    feedback = useGame((s) => s.craftFeedback);
  const craft = useGame((s) => s.craftPill),
    consume = useGame((s) => s.consumeItem),
    patch = useGame((s) => s.patch);
  const lifeAction = useGame((s) => s.lifeAction),
    map = useGame((s) => s.mapId),
    quests = useGame((s) => s.quests);
  const recipe = RECIPES.find((r) => r.id === selected) ?? RECIPES[0];
  const progress = immortalProgress(p),
    life = lifeProgress(p),
    level = life.facilities.furnace;
  const total = Object.values(progress.crafted).reduce((sum, n) => sum + n, 0);
  const reason =
    status !== 'alive' ? 'Cần hồi phục trước khi luyện đan.' : recipeCheck(p, recipe.id, quantity);
  const upgradeReason =
    quests[HOME_QUEST]?.status !== 'done'
      ? 'Mở động phủ sau nhiệm vụ Lò Đan Khai Hỏa.'
      : map !== 'dong_phu'
        ? 'Về động phủ để nâng cấp lò đan.'
        : missingMaterials(p, facilityCost(level));
  function choose(id: string) {
    setSelected(id);
    setQuantity(1);
  }
  function openBrew(id: string) {
    choose(id);
    setFilter('all');
    setTab('brew');
  }
  function travel(id: string) {
    patch({ menu: null });
    EventBus.emit('cmd:travel', id);
  }
  const sources = GATHER_MAPS.filter((id) => herbNodes(id).some((n) => n.item === herb));
  const recipes = RECIPES.filter(
    (r) =>
      filter === 'all' ||
      (filter === 'heal'
        ? r.id === 'hoi_xuan_dan'
        : filter === 'exp'
          ? r.id === 'tu_linh_dan'
          : r.id === 'pha_canh_dan'),
  );
  return (
    <section className="alchemy-panel" aria-label="Đan Phòng">
      <nav className="alchemy-tabs" aria-label="Hoạt động đan phòng" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            id={`alchemy-tab-${id}`}
            aria-controls="alchemy-content"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div
        id="alchemy-content"
        className={`alchemy-content alchemy-${tab}`}
        role="tabpanel"
        aria-labelledby={`alchemy-tab-${tab}`}
      >
        {tab === 'furnace' && (
          <>
            <div className="alchemy-furnace-art">
              <div className="alchemy-intro">
                <small>ĐAN ĐẠO · GIỮ LỬA KẾT ĐAN</small>
                <h2>Đan Phòng</h2>
                <p>
                  Góp nhặt linh thảo, dung hòa dược tính.
                  <br />
                  Một lò linh đan, một bước tiên lộ.
                </p>
              </div>
              <div className="alchemy-furnace-actions">
                <button className="cult-btn gold" onClick={() => setTab('brew')}>
                  Khai lò luyện đan
                </button>
                <span>
                  Đã luyện <b>{total}</b> viên · {RECIPES.length} đan phương
                </span>
              </div>
            </div>
            <aside className="alchemy-furnace-info">
              <small>LÒ ĐAN CỦA BẠN</small>
              <h3>
                Thanh Linh Lô <em>Cấp {level}</em>
              </h3>
              <p>Luyện đan dược hồi phục, tích lũy EXP và chuẩn bị cho đột phá cảnh giới.</p>
              <div
                className="alchemy-furnace-level"
                role="progressbar"
                aria-label="Cấp lò đan"
                aria-valuenow={level}
                aria-valuemin={1}
                aria-valuemax={3}
              >
                <i style={{ width: `${(level / 3) * 100}%` }} />
              </div>
              <p>Cấp {level} / 3 · Công trình động phủ</p>
              {level < 3 ? (
                <>
                  <h4>Nguyên liệu nâng cấp</h4>
                  <Materials cost={facilityCost(level)} />
                  <p className={upgradeReason ? 'short' : 'enough'}>
                    {upgradeReason ?? 'Đủ nguyên liệu nâng cấp.'}
                  </p>
                  <button
                    className="cult-btn gold"
                    disabled={!!upgradeReason || status !== 'alive'}
                    onClick={() => lifeAction({ type: 'facility', facility: 'furnace' })}
                  >
                    Nâng cấp lò đan
                  </button>
                </>
              ) : (
                <p className="enough">Lò đan đã đạt cấp tối đa.</p>
              )}
              {map !== 'dong_phu' && quests[HOME_QUEST]?.status === 'done' && (
                <button
                  className="cult-btn"
                  onClick={() => {
                    patch({ menu: null });
                    EventBus.emit('cmd:home');
                  }}
                >
                  Về động phủ
                </button>
              )}
              <p className="alchemy-note">
                Đan phương đột phá dùng nguyên liệu hiếm; cấp lò không thay đổi số đan dược cần để
                đột phá.
              </p>
            </aside>
          </>
        )}
        {tab === 'brew' && (
          <>
            <nav className="alchemy-filters" aria-label="Loại đan dược">
              {[
                ['all', 'Tất cả'],
                ['heal', 'Hồi phục'],
                ['exp', 'EXP · Linh khí'],
                ['break', 'Đột phá'],
              ].map(([id, name]) => (
                <button
                  key={id}
                  className={filter === id ? 'active' : ''}
                  aria-pressed={filter === id}
                  onClick={() => {
                    setFilter(id);
                    const r = RECIPES.find(
                      (r) =>
                        id === 'all' ||
                        (id === 'heal'
                          ? r.id === 'hoi_xuan_dan'
                          : id === 'exp'
                            ? r.id === 'tu_linh_dan'
                            : r.id === 'pha_canh_dan'),
                    );
                    if (r) choose(r.id);
                  }}
                >
                  {name}
                </button>
              ))}
            </nav>
            <div className="alchemy-recipe-list">
              {recipes.map((r) => (
                <button
                  key={r.id}
                  className={r.id === recipe.id ? 'selected' : ''}
                  onClick={() => choose(r.id)}
                >
                  <img src={itemIconUrl(r.id)} alt="" />
                  <span>
                    <b>{r.name}</b>
                    <small
                      className={p.level < r.level ? 'short' : recipeCheck(p, r.id) ? '' : 'enough'}
                    >
                      {p.level < r.level
                        ? `Mở ở cấp ${r.level}`
                        : recipeCheck(p, r.id)
                          ? 'Thiếu nguyên liệu'
                          : 'Có thể luyện'}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <article className="alchemy-recipe-detail" data-recipe={recipe.id}>
              <header>
                <h3>{recipe.name}</h3>
                <span>Đã có {p.inventory[recipe.id] ?? 0} viên</span>
              </header>
              <div className="alchemy-recipe-body">
                <div className="alchemy-pill-display">
                  <img src={itemIconUrl(recipe.id)} alt={recipe.name} />
                  <div>
                    <small>THUỘC TÍNH</small>
                    <p>{recipe.desc}</p>
                    <span>Đã luyện: {progress.crafted[recipe.id] ?? 0} viên</span>
                  </div>
                </div>
                <h4>Nguyên liệu cần · {quantity} viên</h4>
                <Materials cost={recipeCost(recipe.id, quantity)} />
                <div className="alchemy-quantity">
                  <span>Số lượng</span>
                  <button
                    aria-label="Giảm số lượng"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((n) => n - 1)}
                  >
                    −
                  </button>
                  <input
                    aria-label="Số lượng luyện đan"
                    type="number"
                    min="1"
                    max="99"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Math.min(99, Math.floor(Number(e.target.value) || 1))),
                      )
                    }
                  />
                  <button
                    aria-label="Tăng số lượng"
                    disabled={quantity >= 99}
                    onClick={() => setQuantity((n) => n + 1)}
                  >
                    +
                  </button>
                  <button
                    disabled={!recipeCapacity(p, recipe.id)}
                    onClick={() => setQuantity(Math.max(1, recipeCapacity(p, recipe.id)))}
                  >
                    MAX
                  </button>
                </div>
              </div>
              <footer>
                <p className={`craft-availability ${reason ? 'short' : 'enough'}`}>
                  {reason ?? 'Đủ nguyên liệu · Có thể khai lò.'}
                </p>
                {feedback?.id === recipe.id && (
                  <p className={`craft-feedback ${feedback.ok ? 'enough' : 'short'}`} role="status">
                    {feedback.text}
                  </p>
                )}
                <div className="alchemy-brew-actions">
                  <small>Phối phương ổn định · Kết đan chắc chắn khi đủ nguyên liệu</small>
                  <button
                    className="cult-btn gold"
                    disabled={!!reason}
                    onClick={() => craft(recipe.id, quantity)}
                  >
                    Luyện đan
                  </button>
                </div>
              </footer>
            </article>
          </>
        )}
        {tab === 'recipes' && (
          <div className="alchemy-formulas">
            <header>
              <small>ĐAN PHƯƠNG · LĨNH NGỘ THEO CẤP</small>
              <h3>Công thức luyện đan</h3>
              <p>Chọn đan phương để xem nguyên liệu và khai lò.</p>
            </header>
            {RECIPES.map((r, i) => (
              <button
                className={`alchemy-formula ${p.level < r.level ? 'locked' : ''}`}
                key={r.id}
                onClick={() => openBrew(r.id)}
              >
                <span className="alchemy-formula-number">0{i + 1}</span>
                <img src={itemIconUrl(r.id)} alt="" />
                <h4>{r.name}</h4>
                <p>{r.desc}</p>
                <span className={p.level < r.level ? 'short' : 'enough'}>
                  {p.level < r.level
                    ? `Khóa · cần cấp ${r.level}`
                    : 'Đã lĩnh ngộ · Xem công thức →'}
                </span>
              </button>
            ))}
          </div>
        )}
        {tab === 'pills' && (
          <div className="alchemy-pill-cabinet">
            <header>
              <small>ĐAN DƯỢC TRONG TÚI</small>
              <h3>Dược các</h3>
              <p>Sử dụng đan dược hoặc chọn luyện thêm.</p>
            </header>
            {RECIPES.map((r) => (
              <article key={r.id}>
                <img src={itemIconUrl(r.id)} alt="" />
                <div>
                  <h4>
                    {r.name} <span>×{p.inventory[r.id] ?? 0}</span>
                  </h4>
                  <p>{r.desc}</p>
                  <div>
                    <button className="cult-btn" onClick={() => openBrew(r.id)}>
                      Luyện thêm
                    </button>
                    <button
                      className="cult-btn gold"
                      disabled={!(p.inventory[r.id] > 0) || status !== 'alive'}
                      onClick={() =>
                        r.id === 'pha_canh_dan' ? patch({ menu: 'cultivate' }) : consume(r.id)
                      }
                    >
                      {r.id === 'pha_canh_dan' ? 'Đến đột phá' : 'Sử dụng'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {tab === 'herbs' && (
          <>
            <div className="alchemy-herb-grid">
              {HERBS.map((id) => (
                <button
                  className={herb === id ? 'selected' : ''}
                  key={id}
                  onClick={() => setHerb(id)}
                >
                  <img src={itemIconUrl(id)} alt="" />
                  <b>{itemName(id)}</b>
                  <span>{p.inventory[id] ?? 0}</span>
                </button>
              ))}
            </div>
            <aside className="alchemy-herb-detail">
              <img src={itemIconUrl(herb)} alt="" />
              <h3>{itemName(herb)}</h3>
              <span>Đang có: {p.inventory[herb] ?? 0}</span>
              <p>{ITEMS[herb]?.desc}</p>
              <h4>Cách thu thập</h4>
              {sources.length ? (
                sources.map((id) => (
                  <div className="alchemy-source" key={id}>
                    <span>Hái tại {ZONE_NAMES[id] ?? id}</span>
                    <button className="cult-btn" onClick={() => travel(id)}>
                      Đi đến
                    </button>
                  </div>
                ))
              ) : (
                <p>
                  {herb === 'yeu_dan'
                    ? 'Đánh quái tinh anh và boss. Vật phẩm hiếm, không bảo đảm rơi mỗi lần.'
                    : 'Nhận qua nhiệm vụ, đánh quái và khám phá.'}
                </p>
              )}
              <button
                className="cult-btn"
                onClick={() => patch({ journeySection: 'home', homeSection: 'field' })}
              >
                Xem linh điền
              </button>
            </aside>
          </>
        )}
      </div>
    </section>
  );
}
