import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { SUPABASE_URL } from '../net/config';
import { adminApi } from './adminApi';
import { AdminIcon, type AdminIconName } from './AdminArt';
import { AdminAccounts } from './AdminAccounts';
import { AdminBosses, AdminItems, AdminQuests, ADMIN_ITEM_COUNT } from './AdminCatalog';
import { AdminEvents, AdminJade, AdminLogs } from './AdminManage';
import { useAdminRequest } from './useAdminRequest';
import { AdminPanel, adminNumber, adminTime } from './AdminUI';
type Tab =
  'overview' | 'accounts' | 'items' | 'logs' | 'quests' | 'boss' | 'events' | 'jade' | 'settings';
const TABS: readonly [Tab, string, AdminIconName][] = [
  ['overview', 'Tổng quan', 'overview'],
  ['accounts', 'Tài khoản', 'accounts'],
  ['items', 'Vật phẩm', 'items'],
  ['logs', 'Nhật ký hệ thống', 'logs'],
  ['quests', 'Nhiệm vụ', 'quests'],
  ['boss', 'Săn Boss', 'boss'],
  ['events', 'Sự kiện', 'events'],
  ['jade', 'Cấp Tiên Ngọc', 'jade'],
  ['settings', 'Cài đặt', 'settings'],
];
export function AdminDashboard({
  user,
  onSignOut,
  onRecheck,
}: {
  user: User;
  onSignOut: () => void;
  onRecheck: () => void;
}) {
  const [tab, setTab] = useState<Tab>('overview'),
    [revision, setRevision] = useState(0),
    [auto, setAuto] = useState(false),
    [target, setTarget] = useState(''),
    [now, setNow] = useState(Date.now);
  const {
    data: overview,
    error: overviewError,
    loading,
  } = useAdminRequest(() => adminApi.overview(), 'overview', revision);
  const refresh = () => setRevision((n) => n + 1);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') setRevision((n) => n + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [auto]);
  const grant = (username: string) => {
    setTarget(username);
    setTab('jade');
  };
  const label =
    typeof user.user_metadata?.username === 'string'
      ? user.user_metadata.username
      : (user.email ?? 'Admin');
  return (
    <div className="admin-root">
      <header className="admin-topbar">
        <a className="admin-brand" href="/">
          Cửu Huyền<small>NGHỊCH MỆNH TRƯỜNG SINH</small>
        </a>
        <div className="admin-dashboard-title">
          <span>♜</span>
          <h1>Admin Dashboard</h1>
        </div>
        <div className="admin-top-actions">
          <span className="admin-identity">♙ {label}</span>
          <button
            className="admin-button icon-only"
            aria-label="Đăng xuất quản trị"
            onClick={onSignOut}
          >
            ⇥
          </button>
          <time>{adminTime(new Date(now).toISOString())}</time>
        </div>
      </header>
      <aside className="admin-sidebar">
        <nav aria-label="Điều hướng quản trị">
          {TABS.map(([id, title, icon]) => (
            <button
              key={id}
              data-admin-tab={id}
              aria-current={tab === id ? 'page' : undefined}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              <AdminIcon name={icon} />
              <span>{title}</span>
            </button>
          ))}
        </nav>
        <a href="/">← Về game</a>
        <small>
          Quản trị tài khoản
          <br />
          Cửu Huyền
        </small>
      </aside>
      <main className={`admin-main admin-section-${tab}`}>
        <div className="admin-page-toolbar">
          <div>
            <h2>{TABS.find((t) => t[0] === tab)?.[1]}</h2>
            <p>
              {overview
                ? `Đồng bộ lúc ${adminTime(overview.server_time)}`
                : 'Dữ liệu server cần quyền quản trị'}
            </p>
          </div>
          <div>
            <label className="admin-auto-refresh">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
              Tự làm mới 30s
            </label>
            <button className="admin-button" disabled={loading} onClick={refresh}>
              <AdminIcon name="refresh" />
              Làm mới
            </button>
          </div>
        </div>
        {overviewError && (
          <p className="admin-error admin-global-error" role="alert">
            {overviewError}
          </p>
        )}
        {(tab === 'overview' || tab === 'accounts') && (
          <div className="admin-stats">
            {[
              ['accounts', 'Tổng tài khoản', overview?.accounts, 'accounts', 'Toàn bộ tài khoản'],
              ['recent', 'Vừa đồng bộ', overview?.recent, 'overview', 'Bản lưu trong 90 giây'],
              ['items', 'Danh mục vật phẩm', ADMIN_ITEM_COUNT, 'items', 'Trong bản phát hành'],
              ['logs', 'Log hôm nay', overview?.logs_today, 'logs', 'Quản trị và Tiên Ngọc'],
            ].map(([id, title, value, icon, note]) => (
              <article key={String(id)} className={`admin-stat ${id}`}>
                <div>
                  <AdminIcon name={icon as AdminIconName} />
                </div>
                <span>
                  <small>{title}</small>
                  <strong>{adminNumber(typeof value === 'number' ? value : undefined)}</strong>
                  <em>{note}</em>
                </span>
              </article>
            ))}
          </div>
        )}
        {tab === 'overview' && (
          <div className="admin-overview-grid">
            <AdminAccounts revision={revision} onGrant={grant} />
            <AdminLogs revision={revision} compact onAll={() => setTab('logs')} />
            <AdminItems compact />
            <AdminPanel title="Thao tác nhanh" icon="settings" className="admin-quick-panel">
              <div className="admin-quick-grid">
                {(
                  [
                    ['accounts', 'accounts', 'Tìm tài khoản'],
                    ['items', 'items', 'Tra cứu vật phẩm'],
                    ['jade', 'jade', 'Cấp Tiên Ngọc'],
                    ['events', 'events', 'Lập kế hoạch'],
                    ['quests', 'quests', 'Xem nhiệm vụ'],
                    ['boss', 'boss', 'Điểm sinh boss'],
                    ['logs', 'logs', 'Xem nhật ký'],
                    ['settings', 'settings', 'Cài đặt'],
                  ] as const
                ).map(([id, icon, title]) => (
                  <button key={id} onClick={() => setTab(id)}>
                    <AdminIcon name={icon} />
                    <span>{title}</span>
                  </button>
                ))}
              </div>
              <div className="admin-quick-summary">
                <span>
                  Nhân vật đã tạo<b>{adminNumber(overview?.characters)}</b>
                </span>
                <span>
                  Tiên Ngọc đang lưu hành<b>{adminNumber(overview?.jade)}</b>
                </span>
                <span>
                  Kế hoạch bản nháp<b>{adminNumber(overview?.plans)}</b>
                </span>
              </div>
            </AdminPanel>
          </div>
        )}
        {tab === 'accounts' && <AdminAccounts revision={revision} onGrant={grant} />}
        {tab === 'items' && <AdminItems />}
        {tab === 'quests' && <AdminQuests />}
        {tab === 'boss' && <AdminBosses />}
        {tab === 'logs' && <AdminLogs revision={revision} />}
        {tab === 'jade' && <AdminJade key={target} initialTarget={target} onSaved={refresh} />}
        {tab === 'events' && <AdminEvents revision={revision} onSaved={refresh} />}
        {tab === 'settings' && (
          <AdminPanel title="Kết nối và quyền quản trị" icon="settings">
            <div className="admin-settings">
              <dl className="admin-detail-grid">
                <div>
                  <dt>Tài khoản quản trị</dt>
                  <dd>{label}</dd>
                </div>
                <div>
                  <dt>ID tài khoản</dt>
                  <dd>{user.id}</dd>
                </div>
                <div>
                  <dt>Server dữ liệu</dt>
                  <dd>{SUPABASE_URL ? new URL(SUPABASE_URL).hostname : 'Chưa cấu hình'}</dd>
                </div>
                <div>
                  <dt>Khung giờ nhật ký</dt>
                  <dd>Việt Nam · UTC+7</dd>
                </div>
                <div>
                  <dt>Trạng thái dữ liệu</dt>
                  <dd>{overview ? 'Đã tải dữ liệu quản trị' : 'Chưa tải được'}</dd>
                </div>
                <div>
                  <dt>Phạm vi danh mục</dt>
                  <dd>Định nghĩa của bản phát hành hiện tại</dd>
                </div>
              </dl>
              <button className="admin-button gold" onClick={onRecheck}>
                Kiểm tra lại quyền truy cập
              </button>
              <p className="admin-note">
                Trang quản trị chạy riêng với màn chơi. Bảng hoạt động dựa trên bản lưu, chưa phải
                số online trực tiếp.
              </p>
            </div>
          </AdminPanel>
        )}
      </main>
    </div>
  );
}
