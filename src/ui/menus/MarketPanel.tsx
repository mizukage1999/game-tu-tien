import { useState } from 'react';
import { ITEMS, RARITIES, rarityOf } from '../../data';
import {
  MARKET_OFFERS,
  STALL_HOURS,
  emptyMarketData,
  marketStorageKey,
  parseMarketData,
  stallDraftReason,
  type MarketLocalData,
  type MarketSection,
  type StallDraft,
} from '../../game/systems/marketUi';
import {
  inventoryGroup,
  INVENTORY_GROUPS,
  type InventoryGroup,
} from '../../game/systems/inventory';
import { saveKey } from '../../game/systems/save';
import { itemIconUrl } from '../../game/art/icons';
import { gameStore, itemName, useGame } from '../../store/gameStore';
import { useSocial } from '../../store/socialStore';
import { useAccount } from '../../net/session';
import { heroFor } from '../../data/heroes';
import { RosterPortrait } from '../HeroArt';
import { CultHeading } from './CultivationUI';
import './market.css';

const NAV = [
  ['overview', 'Thương hội', '⌂'],
  ['buy', 'Mua bán', '⚖'],
  ['stall', 'Bày bán', '▤'],
  ['direct', 'Trực tiếp', '⇄'],
  ['history', 'Lịch sử', '◷'],
] as const;
function money(n: number) {
  return n.toLocaleString('vi-VN');
}
function Price({ cost }: { cost: Record<string, number> }) {
  return (
    <span className="market-price">
      {Object.entries(cost).map(([id, n]) => (
        <span key={id} title={itemName(id)}>
          <img src={itemIconUrl(id)} alt="" />
          {money(n)}
        </span>
      ))}
    </span>
  );
}
function ItemArt({ id }: { id: string }) {
  return ITEMS[id] ? (
    <img className="market-item-art" src={itemIconUrl(id)} alt="" />
  ) : (
    <span className="market-item-art market-empty-art" aria-hidden="true">
      ◇
    </span>
  );
}
function Rarity({ id }: { id: string }) {
  const rarity = ITEMS[id]?.rarity;
  return (
    <span style={{ color: rarity ? rarityOf(rarity).color : '#a8d3de' }}>
      {rarity ? rarityOf(rarity).name : ITEMS[id]?.kind === 'consumable' ? 'Đan dược' : 'Vật phẩm'}
    </span>
  );
}
export function MarketPanel() {
  const account = useAccount();
  return <MarketSession key={`${account.user?.id ?? 'offline'}:${saveKey()}`} />;
}
function MarketSession() {
  const p = useGame((s) => s.player),
    section = useGame((s) => s.marketSection),
    patch = useGame((s) => s.patch),
    status = useGame((s) => s.status);
  const { user } = useAccount(),
    roster = useSocial((s) => s.roster);
  const storageKey = marketStorageKey(saveKey());
  const [local, setLocal] = useState<MarketLocalData>(() => {
    try {
      return parseMarketData(localStorage.getItem(storageKey));
    } catch {
      return emptyMarketData();
    }
  });
  const [notice, setNotice] = useState(''),
    [group, setGroup] = useState<InventoryGroup>('all'),
    [query, setQuery] = useState(''),
    [rarity, setRarity] = useState('all'),
    [sort, setSort] = useState('name'),
    [page, setPage] = useState(0),
    [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(MARKET_OFFERS[0]?.key ?? '');
  const bag = Object.entries(p.inventory).filter(([id, n]) => n > 0 && !!ITEMS[id]);
  const [item, setItem] = useState(bag[0]?.[0] ?? ''),
    [quantity, setQuantity] = useState(1),
    [price, setPrice] = useState(1),
    [hours, setHours] = useState(12);
  const [stallTab, setStallTab] = useState('create'),
    [editId, setEditId] = useState<string | null>(null),
    [partner, setPartner] = useState(''),
    [offered, setOffered] = useState<string[]>([]),
    [coins, setCoins] = useState(0);
  const selectSection = (next: MarketSection) => {
    patch({ marketSection: next });
    setNotice('');
    setGroup('all');
    setPage(0);
  };
  const persist = (next: MarketLocalData) => {
    setLocal(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setNotice('Chưa lưu được trên thiết bị. Bản nháp vẫn còn trong phiên này.');
    }
  };
  const search = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
  const offers = MARKET_OFFERS.filter(
    (o) =>
      (group === 'all' || inventoryGroup(o.item) === group) &&
      (rarity === 'all' || ITEMS[o.item]?.rarity === rarity) &&
      (!favoritesOnly || local.favorites.includes(o.key)) &&
      itemName(o.item)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .includes(search),
  ).sort((a, b) =>
    sort === 'level'
      ? (ITEMS[a.item]?.reqLevel ?? 1) - (ITEMS[b.item]?.reqLevel ?? 1)
      : itemName(a.item).localeCompare(itemName(b.item), 'vi'),
  );
  const pageCount = Math.max(1, Math.ceil(offers.length / 8)),
    currentPage = Math.min(page, pageCount - 1),
    shown = offers.slice(currentPage * 8, currentPage * 8 + 8);
  const offer = shown.find((o) => o.key === selectedOffer) ?? shown[0];
  const affordable =
    !!offer &&
    Object.entries(offer.price).every(
      ([id, n]) => (id === 'linh_khi' ? p.linhKhi : (p.inventory[id] ?? 0)) >= n,
    );
  const draftReason = stallDraftReason(p, item, quantity, price, hours);
  function saveDraft() {
    if (draftReason) return setNotice(draftReason);
    if (!editId && local.drafts.length >= 30)
      return setNotice('Đã có 30 bản nháp. Hãy xóa bản không dùng trước.');
    const draft: StallDraft = {
      id: editId ?? crypto.randomUUID(),
      item,
      quantity,
      price,
      hours,
      at: Date.now(),
    };
    persist({ ...local, drafts: [draft, ...local.drafts.filter((d) => d.id !== draft.id)] });
    setEditId(null);
    setStallTab('manage');
    setNotice('Đã lưu bản nháp quầy. Vật phẩm vẫn ở trong túi.');
  }
  function purchase() {
    if (!offer || !affordable || status !== 'alive') return;
    const before = gameStore.getState().player.inventory[offer.item] ?? 0;
    gameStore.getState().buy('thuong_nhan', offer.index);
    if ((gameStore.getState().player.inventory[offer.item] ?? 0) <= before) return;
    persist({
      ...local,
      purchases: [
        {
          id: crypto.randomUUID(),
          item: offer.item,
          quantity: offer.qty,
          price: offer.price,
          at: Date.now(),
        },
        ...local.purchases,
      ].slice(0, 50),
    });
    setNotice(`Đã mua ${itemName(offer.item)} ×${offer.qty}.`);
  }
  const peers = [
    ...new Map(roster.filter((r) => r.userId !== user?.id).map((r) => [r.userId, r])).values(),
  ];
  const peer = peers.find((r) => r.userId === partner);
  return (
    <section className="market-shell" aria-label="Giao Dịch và Bày Bán">
      <aside className="market-sidebar">
        <small>THƯƠNG HỘI</small>
        <nav aria-label="Mục giao dịch">
          {NAV.map(([id, label, glyph]) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              aria-pressed={section === id}
              onClick={() => selectSection(id)}
            >
              <i aria-hidden="true">{glyph}</i>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <span className="market-side-note">
          Linh bảo hữu duyên
          <br />
          Vạn vật thông thương
        </span>
      </aside>
      <main className={`market-content market-${section}`}>
        {section === 'overview' && (
          <div className="market-hero">
            <div className="market-intro">
              <small>THƯƠNG HỘI · THANH KHÊ</small>
              <h2>Chợ Giao Dịch</h2>
              <p>
                Thiên hạ vật phẩm, hội tụ tại đây.
                <br />
                Giao thương tự do, phồn hoa vạn giới.
              </p>
            </div>
            <div className="market-signs">
              {(
                [
                  ['buy', '⚖', 'Mua bán'],
                  ['stall', '▤', 'Bày bán'],
                  ['direct', '⇄', 'Giao dịch'],
                ] as const
              ).map(([id, glyph, label]) => (
                <button key={id} onClick={() => selectSection(id)}>
                  <i>{glyph}</i>
                  <b>{label}</b>
                  <small>
                    {id === 'buy'
                      ? 'Tiền Đa Bảo'
                      : id === 'stall'
                        ? 'Chuẩn bị quầy'
                        : 'Trao đổi trực tiếp'}
                  </small>
                </button>
              ))}
            </div>
          </div>
        )}
        {section === 'buy' && (
          <>
            <div className="market-toolbar">
              <input
                aria-label="Tìm vật phẩm"
                placeholder="Nhập tên vật phẩm…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
              <select
                aria-label="Phẩm chất"
                value={rarity}
                onChange={(e) => {
                  setRarity(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Tất cả phẩm chất</option>
                {RARITIES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select aria-label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="name">Theo tên</option>
                <option value="level">Theo cấp</option>
              </select>
              <button
                className={favoritesOnly ? 'active' : ''}
                aria-label="Chỉ xem yêu thích"
                aria-pressed={favoritesOnly}
                onClick={() => {
                  setFavoritesOnly((v) => !v);
                  setPage(0);
                }}
              >
                ♡
              </button>
            </div>
            <div className="market-buy-layout">
              <nav className="market-categories" aria-label="Loại vật phẩm">
                {INVENTORY_GROUPS.map(([id, glyph, name]) => (
                  <button
                    key={id}
                    className={group === id ? 'active' : ''}
                    aria-pressed={group === id}
                    onClick={() => {
                      setGroup(id);
                      setPage(0);
                    }}
                  >
                    <i>{glyph}</i>
                    {name}
                  </button>
                ))}
              </nav>
              <div className="market-catalog">
                <div className="market-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Vật phẩm</th>
                        <th>Cấp</th>
                        <th>Phẩm chất</th>
                        <th>Giá / gói</th>
                        <th> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((o) => (
                        <tr
                          key={o.key}
                          data-offer={o.key}
                          className={offer?.key === o.key ? 'selected' : ''}
                        >
                          <td>
                            <button onClick={() => setSelectedOffer(o.key)}>
                              <ItemArt id={o.item} />
                              <span>
                                {itemName(o.item)}
                                <small>Tiền Đa Bảo · ×{o.qty}</small>
                              </span>
                            </button>
                          </td>
                          <td>{ITEMS[o.item]?.reqLevel ?? 1}</td>
                          <td>
                            <Rarity id={o.item} />
                          </td>
                          <td>
                            <Price cost={o.price} />
                          </td>
                          <td>
                            <button
                              className="market-favorite"
                              aria-label={`Yêu thích ${itemName(o.item)}`}
                              aria-pressed={local.favorites.includes(o.key)}
                              onClick={() =>
                                persist({
                                  ...local,
                                  favorites: local.favorites.includes(o.key)
                                    ? local.favorites.filter((id) => id !== o.key)
                                    : [...local.favorites, o.key],
                                })
                              }
                            >
                              {local.favorites.includes(o.key) ? '♥' : '♡'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!shown.length && (
                    <p className="market-empty">Không có vật phẩm phù hợp bộ lọc.</p>
                  )}
                </div>
                <div className="market-pagination">
                  <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
                    ‹
                  </button>
                  <span>
                    {currentPage + 1} / {pageCount}
                  </span>
                  <button
                    disabled={currentPage >= pageCount - 1}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    ›
                  </button>
                  <small>{offers.length} vật phẩm</small>
                </div>
              </div>
            </div>
            <footer className="market-buy-footer">
              <div>
                {offer && (
                  <>
                    <b>{itemName(offer.item)}</b>
                    <p>{ITEMS[offer.item]?.desc}</p>
                    <Price cost={offer.price} />
                  </>
                )}
              </div>
              <button
                className="cult-btn gold"
                data-action="buy"
                disabled={!affordable || status !== 'alive'}
                onClick={purchase}
              >
                Mua vật phẩm
              </button>
            </footer>
          </>
        )}
        {section === 'stall' && (
          <>
            <nav className="market-tabs" aria-label="Quầy hàng">
              {[
                ['create', 'Bày bán vật phẩm'],
                ['manage', `Quản lý bản nháp (${local.drafts.length})`],
              ].map(([id, label]) => (
                <button
                  className={stallTab === id ? 'active' : ''}
                  aria-pressed={stallTab === id}
                  key={id}
                  onClick={() => setStallTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {stallTab === 'create' ? (
              <div className="market-stall-layout">
                <section className="market-bag">
                  <CultHeading>Túi đồ của tôi</CultHeading>
                  <nav className="market-bag-filters">
                    {[
                      ['all', 'Tất cả'],
                      ['weapon', 'Vũ khí'],
                      ['material', 'Nguyên liệu'],
                      ['pill', 'Đan dược'],
                    ].map(([id, name]) => (
                      <button
                        key={id}
                        className={group === id ? 'active' : ''}
                        onClick={() => setGroup(id as InventoryGroup)}
                      >
                        {name}
                      </button>
                    ))}
                  </nav>
                  <div className="market-bag-grid">
                    {bag
                      .filter(([id]) => group === 'all' || inventoryGroup(id) === group)
                      .map(([id, n]) => (
                        <button
                          key={id}
                          data-own-item={id}
                          className={item === id ? 'selected' : ''}
                          title={itemName(id)}
                          onClick={() => {
                            setItem(id);
                            setQuantity(1);
                            setEditId(null);
                          }}
                        >
                          <ItemArt id={id} />
                          <span>{n}</span>
                        </button>
                      ))}
                  </div>
                  {!bag.length && (
                    <p className="market-empty">Túi đồ chưa có vật phẩm để bày bán.</p>
                  )}
                  <small>Chỉ hiển thị vật phẩm đang có trong túi.</small>
                </section>
                <section className="market-listing-form">
                  <CultHeading>Đặt vật phẩm bày bán</CultHeading>
                  <div className="market-listing-fields">
                    <div className="market-selected-item">
                      <ItemArt id={item} />
                      <div>
                        <h3>{itemName(item) || 'Chọn vật phẩm'}</h3>
                        <Rarity id={item} />
                        <p>Đang có: {p.inventory[item] ?? 0}</p>
                      </div>
                    </div>
                    <label>
                      Số lượng
                      <input
                        aria-label="Số lượng bày bán"
                        type="number"
                        min="1"
                        max={p.inventory[item] ?? 1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Đơn giá · Linh Thạch
                      <input
                        aria-label="Đơn giá"
                        type="number"
                        min="1"
                        max="999999999"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                      />
                    </label>
                    <div className="market-total">
                      <span>Tổng giá</span>
                      <b>
                        {money(Number.isFinite(price * quantity) ? price * quantity : 0)}{' '}
                        <small>Linh Thạch</small>
                      </b>
                    </div>
                    <fieldset>
                      <legend>Thời gian bày bán</legend>
                      {STALL_HOURS.map((h) => (
                        <label key={h}>
                          <input
                            name="stall-hours"
                            type="radio"
                            checked={hours === h}
                            onChange={() => setHours(h)}
                          />
                          {h} giờ
                        </label>
                      ))}
                    </fieldset>
                    <p className="market-status">{draftReason ?? 'Có thể lưu bản nháp quầy.'}</p>
                  </div>
                  <button
                    className="cult-btn gold"
                    data-action="save-draft"
                    disabled={!!draftReason}
                    onClick={saveDraft}
                  >
                    {editId ? 'Lưu thay đổi' : 'Lưu bản nháp'}
                  </button>
                  <small className="market-feature-note">
                    Chợ người chơi chưa mở. Bản nháp chỉ lưu trên thiết bị; vật phẩm vẫn ở trong
                    túi.
                  </small>
                </section>
              </div>
            ) : (
              <div className="market-drafts">
                {local.drafts.map((d) => (
                  <article key={d.id}>
                    <ItemArt id={d.item} />
                    <div>
                      <b>{itemName(d.item)}</b>
                      <p>
                        ×{d.quantity} · {money(d.price)} Linh Thạch / món · {d.hours} giờ
                      </p>
                      <small>Chưa đăng bán</small>
                    </div>
                    <button
                      className="cult-btn"
                      onClick={() => {
                        setItem(d.item);
                        setQuantity(d.quantity);
                        setPrice(d.price);
                        setHours(d.hours);
                        setEditId(d.id);
                        setStallTab('create');
                        setNotice('');
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      className="cult-btn"
                      onClick={() => {
                        persist({ ...local, drafts: local.drafts.filter((x) => x.id !== d.id) });
                        setNotice('Đã xóa bản nháp.');
                      }}
                    >
                      Xóa
                    </button>
                  </article>
                ))}
                {!local.drafts.length && (
                  <p className="market-empty">
                    Chưa có bản nháp quầy. Chọn vật phẩm trong túi để chuẩn bị bày bán.
                  </p>
                )}
              </div>
            )}
          </>
        )}
        {section === 'direct' && (
          <>
            <div className="market-trade-people">
              <div>
                <RosterPortrait id={heroFor(p).id} />
                <span>
                  <b>{p.name}</b>
                  <small>
                    {heroFor(p).school} · Lv.{p.level}
                  </small>
                </span>
                <em>Chưa xác nhận</em>
              </div>
              <strong>⇄</strong>
              <div>
                {peer ? (
                  <RosterPortrait id={heroFor(peer).id} />
                ) : (
                  <span className="market-person-placeholder">?</span>
                )}
                <label>
                  Đối phương
                  <select
                    aria-label="Chọn người giao dịch"
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                  >
                    <option value="">Chọn người chơi trực tuyến</option>
                    {peers.map((r) => (
                      <option key={r.userId} value={r.userId}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="market-trade-columns">
              <section>
                <CultHeading>Vật phẩm của bạn ({offered.length}/8)</CultHeading>
                <div className="market-trade-slots">
                  {Array.from({ length: 8 }, (_, i) => (
                    <button
                      key={i}
                      title={offered[i] ? `Bỏ ${itemName(offered[i])}` : 'Ô trống'}
                      disabled={!offered[i]}
                      onClick={() => setOffered((v) => v.filter((_, at) => at !== i))}
                    >
                      {offered[i] && (
                        <>
                          <ItemArt id={offered[i]} />
                          <small>1</small>
                        </>
                      )}
                    </button>
                  ))}
                </div>
                <label className="market-trade-currency">
                  Linh Thạch
                  <input
                    aria-label="Linh Thạch đặt giao dịch"
                    type="number"
                    min="0"
                    max={p.inventory.linh_thach ?? 0}
                    value={coins}
                    onChange={(e) =>
                      setCoins(
                        Math.max(
                          0,
                          Math.min(
                            p.inventory.linh_thach ?? 0,
                            Math.floor(Number(e.target.value) || 0),
                          ),
                        ),
                      )
                    }
                  />
                </label>
                <select
                  aria-label="Thêm vật phẩm giao dịch"
                  value=""
                  disabled={offered.length >= 8}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) setOffered((v) => [...v, id]);
                  }}
                >
                  <option value="">+ Chọn vật phẩm từ túi</option>
                  {bag
                    .filter(([id]) => !offered.includes(id))
                    .map(([id, n]) => (
                      <option key={id} value={id}>
                        {itemName(id)} · Có {n}
                      </option>
                    ))}
                </select>
              </section>
              <section>
                <CultHeading>Vật phẩm đối phương (0/8)</CultHeading>
                <div className="market-trade-slots">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span key={i} />
                  ))}
                </div>
                <p className="market-feature-note">
                  Vật phẩm đối phương sẽ hiển thị tại đây khi mở giao dịch.
                </p>
              </section>
            </div>
            <footer className="market-direct-footer">
              <button className="cult-btn gold" disabled>
                Xác nhận giao dịch
              </button>
              <p>Giao dịch trực tiếp chưa mở. Bạn có thể xem trước và chuẩn bị vật phẩm.</p>
            </footer>
          </>
        )}
        {section === 'history' && (
          <div className="market-history">
            <CultHeading>Lịch sử mua hàng NPC</CultHeading>
            <small>Lưu trên thiết bị này · Tối đa 50 giao dịch gần nhất</small>
            {local.purchases.map((r) => (
              <article key={r.id}>
                <ItemArt id={r.item} />
                <div>
                  <b>
                    {itemName(r.item)} ×{r.quantity}
                  </b>
                  <small>{new Date(r.at).toLocaleString('vi-VN')}</small>
                </div>
                <Price cost={r.price} />
                <span className="market-success">Đã nhận</span>
              </article>
            ))}
            {!local.purchases.length && (
              <p className="market-empty">
                Chưa có giao dịch mua hàng được ghi nhận trên thiết bị.
              </p>
            )}
          </div>
        )}
        {notice && (
          <p className="market-notice" role="status">
            {notice}
          </p>
        )}
      </main>
    </section>
  );
}
