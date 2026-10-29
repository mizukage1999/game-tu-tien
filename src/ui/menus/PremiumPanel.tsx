import { useEffect, useId, useState } from 'react';
import { JADE_ENTITLEMENT, JADE_PACK_PREVIEWS, JADE_SHOP } from '../../data/premiumCatalog';
import { itemIconUrl } from '../../game/art/icons';
import { useGame } from '../../store/gameStore';
import { getAccountState, useAccount } from '../../net/session';
import {
  exchangePremium,
  refreshPremium,
  refreshPremiumHistory,
  usePremium,
} from '../../net/premium';
import { CultHeading } from './CultivationUI';
import './premium.css';

type Page = 'overview' | 'topup' | 'shop' | 'history' | 'earn';
const PAGES = [
  ['overview', 'Tổng quan'],
  ['topup', 'Nạp Tiên Ngọc'],
  ['shop', 'Shop Tiên Ngọc'],
  ['history', 'Lịch sử'],
  ['earn', 'Cách nhận'],
] as const;
const n = (v: number) => v.toLocaleString('vi-VN');

export function JadeBundle({ index, className = '' }: { index: number; className?: string }) {
  const clip = useId().replace(/:/g, ''),
    x = (index % 2) * 512,
    row = Math.floor(index / 2),
    y = [0, 366, 753, 1120][row],
    height = [360, 370, 351, 416][row];
  return (
    <svg
      className={`jade-bundle ${className}`}
      viewBox={`${x} ${y} 512 ${height}`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y} width="512" height={height} />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clip})`}
        href="/assets/ui/premium-bundles-v1.png"
        width="1024"
        height="1536"
      />
    </svg>
  );
}
export function JadeCoin() {
  return (
    <span className="jade-coin" aria-hidden="true">
      <i />
    </span>
  );
}

export function PremiumPanel() {
  const account = useAccount();
  return <PremiumSession key={account.user?.id ?? 'offline'} />;
}
function PremiumSession() {
  const { user } = useAccount(),
    premium = usePremium(),
    sync = useGame((s) => s.syncPremium);
  const [page, setPage] = useState<Page>('overview'),
    [topupTab, setTopupTab] = useState('packs'),
    [group, setGroup] = useState('all'),
    [selected, setSelected] = useState<string>(JADE_ENTITLEMENT.id),
    [notice, setNotice] = useState('');
  useEffect(() => {
    const id = user?.id;
    if (id)
      void refreshPremium().then(() => {
        if (getAccountState().user?.id === id) sync();
      });
  }, [user?.id, sync]);
  useEffect(() => {
    if (page === 'history' && user?.id) void refreshPremiumHistory();
  }, [page, user?.id]);
  const changePage = (next: Page) => {
    setPage(next);
    setNotice('');
  };
  const products = JADE_SHOP.filter((p) => group === 'all' || p.group === group);
  const product = products.find((p) => p.id === selected) ?? products[0];
  const owned = premium.items.includes(JADE_ENTITLEMENT.id);
  const buy = async () => {
    if (
      !user ||
      !premium.loaded ||
      premium.busy ||
      owned ||
      premium.balance < JADE_ENTITLEMENT.price ||
      !product?.live
    )
      return;
    setNotice('');
    if (await exchangePremium()) {
      sync();
      setNotice('Đã đổi Thiên Ngọc Tiên Ấn. Pháp bảo đã có trong túi đồ.');
      void refreshPremiumHistory();
    }
  };
  const balance = premium.loaded && user ? n(premium.balance) : '—';
  return (
    <section className="jade-shell feature-focused" aria-label="Tiên Ngọc">
      <main className={`jade-main jade-page-${page}`}>
        <nav className="jade-pages" aria-label="Mục Tiên Ngọc">
          {PAGES.map(([id, label]) => (
            <button
              key={id}
              data-jade-page={id}
              className={page === id ? 'active' : ''}
              aria-pressed={page === id}
              onClick={() => changePage(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {!user && (
          <p className="jade-message">Đăng nhập tài khoản để xem số dư và sử dụng Tiên Ngọc.</p>
        )}
        {user && premium.error && (
          <div className="jade-message error" role="alert">
            <span>Chưa tải được ví: {premium.error}</span>
            <button onClick={() => void refreshPremium()}>Thử lại</button>
          </div>
        )}
        {page === 'overview' && (
          <div className="jade-overview">
            <div className="jade-hero">
              <div className="jade-hero-title">
                <small>LINH NGỌC · TIÊN DUYÊN</small>
                <h2>Tiên Ngọc</h2>
                <p>Ngọc quý hội tụ linh khí trời đất</p>
              </div>
              <section className="jade-balance-card">
                <CultHeading>Số dư Tiên Ngọc</CultHeading>
                <div className="jade-balance">
                  <JadeCoin />
                  <strong data-jade-balance>{balance}</strong>
                  <button aria-label="Xem gói nạp Tiên Ngọc" onClick={() => changePage('topup')}>
                    ＋
                  </button>
                </div>
                <div className="jade-wallet-line">
                  <span>Tiên Ngọc khả dụng</span>
                  <b>{balance}</b>
                </div>
                <div className="jade-wallet-line">
                  <span>Pháp bảo Tiên Ngọc</span>
                  <b>{premium.loaded && user ? (owned ? 'Đã sở hữu' : 'Chưa đổi') : '—'}</b>
                </div>
                <p>Số dư theo tài khoản. Tiên Ngọc dùng để đổi pháp bảo và vật phẩm đặc biệt.</p>
                <button
                  className="cult-btn"
                  disabled={!user || premium.busy}
                  onClick={() => void refreshPremium()}
                >
                  ↻ Cập nhật số dư
                </button>
              </section>
              <div className="jade-hero-caption">
                Tiên Ngọc lưu chuyển qua giao thương giữa các đạo hữu.
                <br />
                Nạp và chợ người chơi sẽ mở trong bản cập nhật sau.
              </div>
            </div>
            <div className="jade-quick-links">
              {(
                [
                  ['topup', 3, 'Nạp Tiên Ngọc'],
                  ['shop', 5, 'Shop Tiên Ngọc'],
                  ['history', 4, 'Lịch sử ví'],
                  ['earn', 0, 'Cách nhận ngọc'],
                ] as const
              ).map(([id, art, label]) => (
                <button key={id} data-jade-quick={id} onClick={() => changePage(id)}>
                  <JadeBundle index={art} />
                  <b>{label}</b>
                  <span>›</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {page === 'topup' && (
          <>
            <nav className="jade-subtabs" aria-label="Gói Tiên Ngọc">
              {(
                [
                  ['packs', 'Nạp Tiên Ngọc'],
                  ['offers', 'Gói ưu đãi'],
                  ['month', 'Thẻ tháng'],
                  ['growth', 'Quỹ trưởng thành'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  data-jade-topup={id}
                  aria-pressed={topupTab === id}
                  className={topupTab === id ? 'active' : ''}
                  onClick={() => setTopupTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            <p className="jade-message preview">
              Gói xem trước · Giá và quyền lợi tham khảo. Chưa mở thanh toán.
            </p>
            {topupTab === 'packs' ? (
              <div className="jade-pack-grid">
                {JADE_PACK_PREVIEWS.map((pack) => (
                  <article className="jade-pack" key={pack.jade}>
                    <h3>{n(pack.jade)} Tiên Ngọc</h3>
                    <JadeBundle index={pack.art} />
                    <span className={`jade-bonus ${!pack.bonus ? 'none' : ''}`}>
                      {pack.bonus ? `+${n(pack.bonus)} thưởng thêm` : 'Gói khởi hành'}
                    </span>
                    <strong>
                      {n(pack.vnd)} <small>VNĐ</small>
                    </strong>
                    <button className="cult-btn gold" disabled>
                      Chưa mở nạp
                    </button>
                  </article>
                ))}
              </div>
            ) : topupTab === 'month' ? (
              <div className="jade-months">
                <article className="jade-month blue">
                  <span>THẺ HỘ ĐẠO</span>
                  <h2>Thẻ Tháng Tiên Ngọc</h2>
                  <JadeBundle index={5} />
                  <p>
                    Dự kiến nhận ngọc khi kích hoạt
                    <br />
                    và quà mỗi ngày trong 30 ngày.
                  </p>
                  <strong>149.000 VNĐ</strong>
                  <button className="cult-btn" disabled>
                    Chưa mở mua
                  </button>
                </article>
                <article className="jade-month gold">
                  <span>TIÊN DUYÊN TRƯỜNG TỒN</span>
                  <h2>Thẻ Vĩnh Cửu</h2>
                  <JadeBundle index={7} />
                  <p>
                    Quyền lợi dài hạn đang được chuẩn bị.
                    <br />
                    Chi tiết sẽ công bố khi mở bán.
                  </p>
                  <strong>299.000 VNĐ</strong>
                  <button className="cult-btn gold" disabled>
                    Chưa mở mua
                  </button>
                </article>
                <section className="jade-benefits">
                  <CultHeading>Đặc quyền dự kiến</CultHeading>
                  <p>◇ Quà Tiên Ngọc định kỳ</p>
                  <p>◇ Biểu tượng dành riêng</p>
                  <p>◇ Phần thưởng hành trình</p>
                  <small>Các quyền lợi chưa được kích hoạt.</small>
                  <JadeBundle index={6} />
                </section>
              </div>
            ) : (
              <div className="jade-coming">
                <JadeBundle index={topupTab === 'growth' ? 7 : 2} />
                <h2>{topupTab === 'growth' ? 'Quỹ trưởng thành' : 'Gói ưu đãi Tiên Ngọc'}</h2>
                <p>
                  {topupTab === 'growth'
                    ? 'Đồng hành cùng các mốc cảnh giới trên tiên lộ.'
                    : 'Ưu đãi theo mùa dành cho các đạo hữu.'}
                </p>
                <span>Chưa mở bán</span>
                <button className="cult-btn" onClick={() => setTopupTab('packs')}>
                  Xem các gói ngọc
                </button>
              </div>
            )}
          </>
        )}
        {page === 'shop' && (
          <>
            <div className="jade-shop-toolbar">
              <nav aria-label="Loại vật phẩm Tiên Ngọc">
                {(
                  [
                    ['all', 'Tất cả'],
                    ['rare', 'Vật phẩm hiếm'],
                    ['outfit', 'Ngoại trang'],
                    ['power', 'Tăng lực'],
                    ['other', 'Khác'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    data-jade-group={id}
                    className={group === id ? 'active' : ''}
                    aria-pressed={group === id}
                    onClick={() => setGroup(id)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              <span>
                <JadeCoin />
                {balance}
              </span>
            </div>
            <div className="jade-shop-layout">
              <div className="jade-product-grid">
                {products.map((p) => (
                  <button
                    key={p.id}
                    data-jade-product={p.id}
                    className={`jade-product ${product?.id === p.id ? 'selected' : ''}`}
                    onClick={() => setSelected(p.id)}
                  >
                    <span className={`jade-product-status ${p.live ? 'live' : ''}`}>
                      {p.live ? (owned ? 'Đã sở hữu' : 'Đang mở') : 'Sắp mở'}
                    </span>
                    <img src={itemIconUrl('icon' in p ? p.icon : p.id)} alt="" />
                    <h3>{p.name}</h3>
                    <b>
                      <JadeCoin />
                      {n(p.price)}
                    </b>
                    <small>{p.live ? 'Giới hạn: 1 / tài khoản' : 'Giá tham khảo'}</small>
                  </button>
                ))}
              </div>
              {product && (
                <section className="jade-product-detail">
                  <div className="jade-product-description">
                    <img src={itemIconUrl('icon' in product ? product.icon : product.id)} alt="" />
                    <small>{product.live ? 'TIÊN PHÁP BẢO' : 'VẬT PHẨM XEM TRƯỚC'}</small>
                    <h2>{product.name}</h2>
                    <p>{product.detail}</p>
                    {product.live && (
                      <dl>
                        <div>
                          <dt>Công</dt>
                          <dd>+40</dd>
                        </div>
                        <div>
                          <dt>Phòng thủ</dt>
                          <dd>+25</dd>
                        </div>
                        <div>
                          <dt>Sinh lực</dt>
                          <dd>+220</dd>
                        </div>
                        <div>
                          <dt>Yêu cầu sử dụng</dt>
                          <dd>Lv.10 · Ô Ngọc Bội</dd>
                        </div>
                      </dl>
                    )}
                  </div>
                  <footer>
                    <span>
                      Giá đổi{' '}
                      <b>
                        <JadeCoin />
                        {n(product.price)}
                      </b>
                    </span>
                    <button
                      className="cult-btn gold"
                      data-action="exchange-jade"
                      disabled={
                        !product.live ||
                        !user ||
                        !premium.loaded ||
                        premium.busy ||
                        owned ||
                        premium.balance < JADE_ENTITLEMENT.price
                      }
                      onClick={() => void buy()}
                    >
                      {!product.live
                        ? 'Chưa mở đổi'
                        : owned
                          ? 'Đã sở hữu'
                          : premium.busy
                            ? 'Đang xác nhận…'
                            : 'Đổi pháp bảo'}
                    </button>
                    <small>
                      {product.live
                        ? !user
                          ? 'Đăng nhập để đổi pháp bảo.'
                          : !premium.loaded
                            ? 'Cần tải số dư tài khoản.'
                            : owned
                              ? 'Pháp bảo đã được ghi nhận trên tài khoản.'
                              : premium.balance < product.price
                                ? 'Chưa đủ Tiên Ngọc.'
                                : 'Đổi một lần bằng Tiên Ngọc khả dụng.'
                        : 'Chưa thu Tiên Ngọc cho vật phẩm xem trước.'}
                    </small>
                  </footer>
                </section>
              )}
            </div>
          </>
        )}
        {page === 'history' && (
          <section className="jade-history">
            <header>
              <div>
                <CultHeading>Lịch sử Tiên Ngọc</CultHeading>
                <small>50 giao dịch gần nhất trên tài khoản</small>
              </div>
              <button
                className="cult-btn"
                disabled={!user || premium.ledgerBusy}
                onClick={() => void refreshPremiumHistory()}
              >
                ↻ Làm mới
              </button>
            </header>
            {premium.ledgerError && (
              <p className="jade-message error" role="alert">
                Chưa tải được lịch sử: {premium.ledgerError}
              </p>
            )}
            <div className="jade-history-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Nội dung</th>
                    <th>Tiên Ngọc</th>
                  </tr>
                </thead>
                <tbody>
                  {user &&
                    premium.ledger.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.created_at).toLocaleString('vi-VN')}</td>
                        <td>{row.reason}</td>
                        <td className={row.delta >= 0 ? 'positive' : 'negative'}>
                          {row.delta > 0 ? '+' : ''}
                          {n(row.delta)}
                        </td>
                      </tr>
                    ))}
                  {(!user || !premium.ledger.length) && (
                    <tr>
                      <td colSpan={3}>
                        {!user
                          ? 'Đăng nhập để xem lịch sử ví.'
                          : premium.ledgerBusy
                            ? 'Đang tải lịch sử…'
                            : premium.ledgerError
                              ? 'Chưa có dữ liệu lịch sử.'
                              : premium.ledgerLoaded
                                ? 'Chưa có giao dịch Tiên Ngọc.'
                                : 'Lịch sử chưa được tải.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {page === 'earn' && (
          <div className="jade-earn">
            <section className="jade-earn-intro">
              <JadeBundle index={7} />
              <small>NGỌC QUÝ LƯU CHUYỂN</small>
              <h2>Nhận Tiên Ngọc qua giao thương</h2>
              <p>
                Khi chợ người chơi mở, đạo hữu có thể bày bán vật phẩm bằng Tiên Ngọc. Người mua trả
                ngọc, người bán nhận ngọc từ giao dịch thành công.
              </p>
            </section>
            <div className="jade-earn-steps">
              <article>
                <b>01</b>
                <div>
                  <h3>Bày bán vật phẩm</h3>
                  <p>
                    Chọn đồ trong túi, số lượng và đơn giá Tiên Ngọc. Hiện chỉ lưu bản nháp; đồ vẫn
                    ở trong túi.
                  </p>
                </div>
              </article>
              <article>
                <b>02</b>
                <div>
                  <h3>Người mua thanh toán</h3>
                  <p>
                    Tiên Ngọc chuyển giữa hai tài khoản khi giao dịch được xác nhận. Chợ người chơi
                    chưa mở.
                  </p>
                </div>
              </article>
              <article>
                <b>03</b>
                <div>
                  <h3>Nhận và sử dụng ngọc</h3>
                  <p>
                    Dùng Tiên Ngọc khả dụng tại shop. Linh Thạch, EXP và vật phẩm nhặt được không tự
                    đổi thành Tiên Ngọc.
                  </p>
                </div>
              </article>
              <div className="jade-message">Nạp thẻ và thanh toán trực tuyến chưa mở.</div>
            </div>
          </div>
        )}
        {notice && (
          <p className="jade-message success" role="status">
            {notice}
          </p>
        )}
      </main>
    </section>
  );
}
