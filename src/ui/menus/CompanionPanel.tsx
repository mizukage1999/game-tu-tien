import { useState, type CSSProperties } from 'react';
import { COMPANIONS, lifeProgress, type CompanionId } from '../../game/systems/life';
import { adventure } from '../../game/systems/adventure';
import { isChildhood } from '../../game/systems/origin';
import { useGame, itemName } from '../../store/gameStore';
import { itemIconUrl } from '../../game/art/icons';
import { BeastArt } from '../SpiritArt';
import './companions.css';

const LORE: Record<
  CompanionId,
  { element: string; color: string; skill: string; effect: string; source: string }
> = {
  snow_fox: {
    element: 'Thủy',
    color: '#71cfff',
    skill: 'Hàn Tức',
    effect: 'Công kích và làm chậm mục tiêu. Hồi chiêu 8 giây.',
    source: 'Linh Thú · Linh Thú Lâm',
  },
  gold_tiger: {
    element: 'Kim',
    color: '#ffcf70',
    skill: 'Hổ Khiếu',
    effect: 'Đòn công kích mạnh bằng 3 lần công kích linh thú. Hồi chiêu 8 giây.',
    source: 'Thạch Linh Thú · Bí Cảnh Thạch Linh',
  },
  white_crane: {
    element: 'Thủy',
    color: '#b4dfff',
    skill: 'Linh Vũ',
    effect: 'Khi chủ nhân yếu sức, hồi 12% sinh lực tối đa và 20 linh lực. Hồi chiêu 12 giây.',
    source: 'Tinh anh · Hàn Băng Nguyên',
  },
  jade_deer: {
    element: 'Mộc',
    color: '#78eab1',
    skill: 'Mộc Giáp',
    effect:
      'Tạo khiên bằng 12% sinh lực chủ nhân khi bị tấn công, duy trì 5 giây. Hồi chiêu 12 giây.',
    source: 'Thanh Mộc Thú · Rừng Linh Thú',
  },
  shadow_wolf: {
    element: 'Ám',
    color: '#bc9aff',
    skill: 'Ảnh Tập',
    effect: 'Công kích và làm chậm bước chân đối thủ. Hồi chiêu 8 giây.',
    source: 'Tinh anh · U Minh Trạch',
  },
  red_fox: {
    element: 'Hỏa',
    color: '#ffa26d',
    skill: 'Hồ Hỏa',
    effect: 'Công kích lan lên những kẻ địch quanh mục tiêu. Hồi chiêu 8 giây.',
    source: 'Hỏa Hồ · Linh Thú Lâm',
  },
};
const TABS = [
  { id: 'collection', name: 'Linh Thú' },
  { id: 'info', name: 'Thông Tin' },
  { id: 'nurture', name: 'Nuôi Dưỡng' },
  { id: 'evolve', name: 'Tiến Hóa' },
  { id: 'skills', name: 'Kỹ Năng' },
] as const;
type Tab = (typeof TABS)[number]['id'];
function Stars({ rank }: { rank: number }) {
  return (
    <span className="beast-stars" aria-label={`Bậc ${rank} trên 5`}>
      {'★'.repeat(rank)}
      <span>{'☆'.repeat(5 - rank)}</span>
    </span>
  );
}

export function CompanionPanel() {
  const p = useGame((s) => s.player),
    status = useGame((s) => s.status),
    act = useGame((s) => s.lifeAction),
    train = useGame((s) => s.adventureAction);
  const life = lifeProgress(p),
    progress = adventure(p);
  const [tab, setTab] = useState<Tab>('collection'),
    [selected, setSelected] = useState<CompanionId>(life.companion ?? COMPANIONS[0].id),
    [element, setElement] = useState('Tất cả');
  const beast = COMPANIONS.find((c) => c.id === selected)!,
    lore = LORE[selected],
    own = life.companions[selected],
    rank = own?.rank ?? 1,
    evolution = progress.evolution[selected] ?? 0;
  const factor = rank * (1 + evolution * 0.5),
    seals = progress.beastSeals[selected] ?? 0;
  const unavailable = isChildhood(p) || status !== 'alive' || !!life.retreat;
  const evolutionCost = { yeu_dan: 3 + evolution * 3, linh_chi: 2 + evolution * 2 };
  const canEvolve =
    !!own &&
    own.rank >= 3 + evolution &&
    evolution < 2 &&
    Object.entries(evolutionCost).every(([id, n]) => (p.inventory[id] ?? 0) >= n);
  const owned = COMPANIONS.filter((c) => life.companions[c.id]).length;
  const stats = [
    ['Sinh lực', Math.round(beast.hp * factor)],
    ['Công kích', Math.round(beast.atk * factor)],
    ['Phòng thủ', Math.round(beast.def * factor)],
  ] as const;
  const action = (
    <button
      className="btn gold beast-deploy"
      disabled={unavailable || (!own && seals < beast.cost)}
      onClick={() =>
        act(
          own
            ? { type: 'companion', id: life.companion === selected ? null : selected }
            : { type: 'tame', id: selected },
        )
      }
    >
      {!own ? 'Thu phục' : life.companion === selected ? 'Thu hồi' : 'Xuất chiến'}
    </button>
  );
  return (
    <section
      className="beast-panel"
      style={{ '--beast-color': lore.color } as CSSProperties}
      aria-label="Linh thú"
    >
      <nav className="beast-tabs" aria-label="Chức năng linh thú">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </nav>
      {tab === 'collection' ? (
        <div className="beast-collection">
          <section className="beast-gallery">
            <div className="beast-filters" aria-label="Thuộc tính linh thú">
              {['Tất cả', 'Thủy', 'Kim', 'Mộc', 'Ám', 'Hỏa'].map((e) => (
                <button
                  key={e}
                  className={element === e ? 'active' : ''}
                  onClick={() => setElement(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="beast-cards">
              {COMPANIONS.filter((c) => element === 'Tất cả' || LORE[c.id].element === element).map(
                (c) => (
                  <button
                    key={c.id}
                    className={`beast-card ${selected === c.id ? 'selected' : ''} ${life.companions[c.id] ? 'owned' : ''}`}
                    style={{ '--card-color': LORE[c.id].color } as CSSProperties}
                    aria-pressed={selected === c.id}
                    onClick={() => setSelected(c.id)}
                  >
                    <span className="beast-card-element">{LORE[c.id].element}</span>
                    <BeastArt id={c.id} />
                    <b>{c.name}</b>
                    <Stars rank={life.companions[c.id]?.rank ?? 0} />
                    <small>
                      {life.companion === c.id
                        ? 'Đang xuất chiến'
                        : life.companions[c.id]
                          ? 'Đã thu phục'
                          : 'Chưa nhận chủ'}
                    </small>
                  </button>
                ),
              )}
            </div>
            <footer>
              Đã thu phục{' '}
              <b>
                {owned}/{COMPANIONS.length}
              </b>{' '}
              · Tự chiến đấu để kết duyên linh thú
            </footer>
          </section>
          <section className="beast-preview">
            <div className="beast-stage">
              <BeastArt id={selected} />
              <span className="beast-stage-ring" />
            </div>
            <div className="beast-preview-info">
              <h2>
                {beast.name} <small>{lore.element}</small>
              </h2>
              <Stars rank={own?.rank ?? 0} />
              <p>{beast.desc}</p>
              <div className="beast-mini-stats">
                {stats.map(([name, n]) => (
                  <span key={name}>
                    {name}
                    <b>+{n.toLocaleString('vi-VN')}</b>
                  </span>
                ))}
              </div>
              <p className="beast-source">
                {own
                  ? `${lore.skill} · Tiến hóa ${evolution}/2`
                  : `${lore.source} · Dấu ấn ${seals}/${beast.cost}`}
              </p>
              {action}
            </div>
          </section>
        </div>
      ) : (
        <div className="beast-detail-layout">
          <aside className="beast-roster" aria-label="Chọn linh thú">
            {COMPANIONS.map((c) => (
              <button
                key={c.id}
                className={selected === c.id ? 'active' : ''}
                aria-label={c.name}
                aria-pressed={selected === c.id}
                onClick={() => setSelected(c.id)}
              >
                <BeastArt id={c.id} />
                <span>{c.name}</span>
              </button>
            ))}
          </aside>
          <div className="beast-detail-stage">
            <div className="beast-stage">
              <BeastArt id={selected} />
              <span className="beast-stage-ring" />
            </div>
            <h2>{beast.name}</h2>
            <Stars rank={own?.rank ?? 0} />
            <p>{own ? `Bậc ${rank}/5 · Tiến hóa ${evolution}/2` : 'Chưa kết khế ước'}</p>
            {action}
          </div>
          <section className="beast-detail-info">
            <header>
              <span className="beast-element">{lore.element}</span>
              <h2>{beast.name}</h2>
              <p>{beast.desc}</p>
            </header>
            {tab === 'info' && (
              <>
                <h3>Thuộc tính {own ? 'hỗ trợ chủ nhân' : 'sau thu phục'}</h3>
                <dl>
                  {stats.map(([name, n]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>+{n.toLocaleString('vi-VN')}</dd>
                    </div>
                  ))}
                </dl>
                <h3>{lore.skill}</h3>
                <p>{lore.effect}</p>
                <p className="beast-source">
                  Tiến hóa tăng sức mạnh kỹ năng. Chỉ linh thú xuất chiến mới hỗ trợ chiến đấu.
                </p>
                <h3>Thu phục qua chiến đấu</h3>
                <p>{lore.source}</p>
                <p>
                  Dấu ấn đã tích lũy:{' '}
                  <b>
                    {seals}/{beast.cost}
                  </b>
                </p>
              </>
            )}
            {tab === 'nurture' && (
              <>
                <h3>Nuôi dưỡng · Tăng bậc</h3>
                <p>Linh Thú Đan tăng thân mật. Đủ thân mật sẽ tăng bậc, tối đa bậc 5.</p>
                <div
                  className="beast-bond"
                  role="progressbar"
                  aria-label="Thân mật linh thú"
                  aria-valuemin={0}
                  aria-valuemax={rank * 2}
                  aria-valuenow={own?.bond ?? 0}
                >
                  <span
                    style={{ width: `${own ? Math.min(100, (own.bond / (rank * 2)) * 100) : 0}%` }}
                  />
                  <b>
                    {own?.bond ?? 0}/{rank * 2}
                  </b>
                </div>
                <div className="beast-material">
                  <img src={itemIconUrl('thuc_an_linh_thu')} alt="" />
                  <span>
                    Linh Thú Đan <b>{p.inventory.thuc_an_linh_thu ?? 0}/1</b>
                  </span>
                </div>
                <p className="beast-source">
                  {!own
                    ? 'Cần thu phục linh thú trước.'
                    : rank >= 5
                      ? 'Linh thú đã đạt bậc tối đa.'
                      : `Bậc ${rank} → ${rank + 1} · Cần thêm ${rank * 2 - own.bond} lần nuôi dưỡng.`}
                </p>
                <button
                  className="btn gold"
                  disabled={unavailable || !own || rank >= 5 || !(p.inventory.thuc_an_linh_thu > 0)}
                  onClick={() => act({ type: 'feed', id: selected })}
                >
                  Nuôi dưỡng
                </button>
              </>
            )}
            {tab === 'evolve' && (
              <>
                <h3>Tiến hóa {evolution}/2</h3>
                <p>Mỗi lần tiến hóa tăng 50% chỉ số gốc theo bậc và tăng sức mạnh kỹ năng.</p>
                <dl>
                  {stats.map(([name, n]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>
                        +{n}{' '}
                        <span>
                          → +
                          {Math.round(
                            (n / (1 + 0.5 * evolution)) * (1 + 0.5 * Math.min(2, evolution + 1)),
                          )}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
                {Object.entries(evolutionCost).map(([id, n]) => (
                  <div className="beast-material" key={id}>
                    <img src={itemIconUrl(id)} alt="" />
                    <span>
                      {itemName(id)}{' '}
                      <b className={(p.inventory[id] ?? 0) < n ? 'short' : ''}>
                        {p.inventory[id] ?? 0}/{n}
                      </b>
                    </span>
                  </div>
                ))}
                <p className="beast-source">
                  {evolution >= 2
                    ? 'Đã tiến hóa tối đa.'
                    : `Cần thu phục và nuôi đến bậc ${3 + evolution}.`}
                </p>
                <button
                  className="btn gold"
                  disabled={unavailable || !canEvolve}
                  onClick={() => train({ type: 'evolve', id: selected })}
                >
                  Tiến hóa
                </button>
              </>
            )}
            {tab === 'skills' && (
              <>
                <h3>Kỹ năng chiến đấu</h3>
                <article className="beast-skill">
                  <BeastArt id={selected} />
                  <div>
                    <h4>{lore.skill}</h4>
                    <p>{lore.effect}</p>
                    <small>Thi triển tự động khi xuất chiến · Tiến hóa {evolution}/2</small>
                  </div>
                </article>
                <h3>Hỗ trợ thường trực</h3>
                <dl>
                  {stats.map(([name, n]) => (
                    <div key={name}>
                      <dt>{name}</dt>
                      <dd>+{n}</dd>
                    </div>
                  ))}
                </dl>
                <p className="beast-source">
                  Nuôi dưỡng và tiến hóa để tăng chỉ số cùng hiệu quả kỹ năng. Linh thú hồi phục,
                  tạo khiên hoặc công kích theo đặc tính từng loài.
                </p>
              </>
            )}
            {unavailable && (
              <p className="beast-source">
                {isChildhood(p)
                  ? 'Hoàn thành nhập môn để kết duyên linh thú.'
                  : life.retreat
                    ? 'Hãy xuất quan trước khi thao tác.'
                    : 'Cần hồi phục nhân vật trước khi thao tác.'}
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
