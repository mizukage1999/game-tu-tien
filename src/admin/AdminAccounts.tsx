import { useState } from 'react';
import { ITEMS, QUESTS, REALMS } from '../data';
import { equipmentBaseId } from '../game/systems/equipment';
import { adminApi, downloadAdminCsv } from './adminApi';
import { AdminIcon, AdminPortrait, AdminItemArt } from './AdminArt';
import { useAdminRequest } from './useAdminRequest';
import {
  AdminDialog,
  AdminLoadState,
  AdminPager,
  AdminPanel,
  adminNumber,
  adminTime,
} from './AdminUI';

export function AdminAccounts({
  revision,
  onGrant,
  onManage,
}: {
  revision: number;
  onGrant: (username: string) => void;
  onManage?: (id: string) => void;
}) {
  const [input, setInput] = useState(''),
    [query, setQuery] = useState(''),
    [activity, setActivity] = useState('all'),
    [page, setPage] = useState(0),
    [size, setSize] = useState(8),
    [selected, setSelected] = useState<string | null>(null);
  const { data, loading, error } = useAdminRequest(
    () => adminApi.accounts(query, activity, page * size, size),
    JSON.stringify([query, activity, page, size]),
    revision,
  );
  const rows = data?.rows ?? [];
  return (
    <>
      <AdminPanel
        title="Danh sách tài khoản"
        icon="accounts"
        action={
          <button
            className="admin-button"
            disabled={!data || loading}
            onClick={() =>
              downloadAdminCsv('tai-khoan-trang-hien-tai.csv', [
                ['ID', 'Tên đăng nhập', 'Tên nhân vật', 'Cấp', 'Tiên Ngọc', 'Lần đồng bộ'],
                ...rows.map((r) => [
                  r.id,
                  r.username,
                  r.character_name,
                  r.level,
                  r.balance,
                  r.updated_at,
                ]),
              ])
            }
          >
            <AdminIcon name="export" />
            Xuất trang
          </button>
        }
      >
        <form
          className="admin-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setQuery(input.trim());
          }}
        >
          <div className="admin-search">
            <AdminIcon name="search" />
            <input
              aria-label="Tìm tài khoản"
              placeholder="Tên đăng nhập, nhân vật, email, ID…"
              maxLength={100}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <select
            aria-label="Hoạt động tài khoản"
            value={activity}
            onChange={(e) => {
              setActivity(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả hoạt động</option>
            <option value="recent">Vừa đồng bộ</option>
            <option value="inactive">Chưa đồng bộ gần đây</option>
          </select>
          <button className="admin-button gold" type="submit">
            Tìm
          </button>
        </form>
        <AdminLoadState loading={loading} error={error} empty={!rows.length} />
        {!!rows.length && (
          <div className="admin-table-scroll">
            <table className="admin-table admin-accounts-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Nhân vật</th>
                  <th>Cấp</th>
                  <th>Tiên Ngọc</th>
                  <th>Hoạt động</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} data-admin-account={a.id}>
                    <td>
                      <div className="admin-person">
                        <AdminPortrait hero={a.hero_id} />
                        <span>
                          <b>{a.username}</b>
                          <small title={a.id}>
                            {a.id.slice(0, 8)}… {a.admin ? '· Admin' : a.guest ? '· Khách' : ''}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      {a.character_name ?? 'Chưa tạo nhân vật'}
                      <small className="admin-cell-sub">{REALMS[a.realm_index]?.name ?? '—'}</small>
                    </td>
                    <td>{adminNumber(a.level)}</td>
                    <td className="admin-jade-text">◉ {adminNumber(a.balance)}</td>
                    <td>
                      <span
                        className={`admin-status ${a.recent ? 'recent' : ''}`}
                        title={
                          a.recent ? 'Có bản lưu trong 90 giây gần nhất.' : adminTime(a.updated_at)
                        }
                      >
                        {a.recent ? 'Vừa đồng bộ' : 'Chưa hoạt động gần đây'}
                      </span>
                    </td>
                    <td className="admin-date">
                      {a.created_at
                        ? new Date(a.created_at).toLocaleDateString('vi-VN', {
                            timeZone: 'Asia/Ho_Chi_Minh',
                          })
                        : '—'}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        {onManage && (
                          <button
                            className="admin-button icon-only"
                            aria-label={`Quản lý ${a.username}`}
                            onClick={() => onManage(a.id)}
                          >
                            <AdminIcon name="settings" />
                          </button>
                        )}
                        <button
                          className="admin-button icon-only"
                          aria-label={`Xem ${a.username}`}
                          onClick={() => setSelected(a.id)}
                        >
                          <AdminIcon name="eye" />
                        </button>
                        <button
                          className="admin-button icon-only"
                          aria-label={`Cấp Tiên Ngọc cho ${a.username}`}
                          onClick={() => onGrant(a.username)}
                        >
                          <AdminIcon name="jade" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPager
          total={data?.total ?? 0}
          page={page}
          size={size}
          setPage={setPage}
          setSize={setSize}
          disabled={loading}
        />
      </AdminPanel>
      {selected && (
        <AdminAccountDialog
          user={selected}
          revision={revision}
          onClose={() => setSelected(null)}
          onGrant={onGrant}
        />
      )}
    </>
  );
}
function AdminAccountDialog({
  user,
  revision,
  onClose,
  onGrant,
}: {
  user: string;
  revision: number;
  onClose: () => void;
  onGrant: (username: string) => void;
}) {
  const { data, loading, error } = useAdminRequest(() => adminApi.account(user), user, revision),
    [tab, setTab] = useState('info');
  const a = data?.account;
  return (
    <AdminDialog title="Thông tin tài khoản" onClose={onClose}>
      <AdminLoadState loading={loading} error={error} />
      {a && (
        <>
          <div className="admin-inspection-heading">
            <AdminPortrait hero={a.hero_id} />
            <div>
              <h3>{a.character_name ?? a.username}</h3>
              <p>
                {a.username} · {a.email ?? 'Đăng nhập bằng username'}
              </p>
              <small>{a.id}</small>
            </div>
            <button
              className="admin-button gold"
              onClick={() => {
                onClose();
                onGrant(a.username);
              }}
            >
              Cấp Tiên Ngọc
            </button>
          </div>
          <nav className="admin-tabs" aria-label="Chi tiết tài khoản">
            {[
              ['info', 'Tổng quan'],
              ['inventory', 'Túi đồ'],
              ['quests', 'Nhiệm vụ'],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                className={tab === id ? 'active' : ''}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === 'info' && (
            <dl className="admin-detail-grid">
              {[
                ['Tên nhân vật', a.character_name ?? 'Chưa tạo'],
                ['Cấp / Cảnh giới', `${a.level} · ${REALMS[a.realm_index]?.name ?? '—'}`],
                ['Map lưu gần nhất', a.map_id ?? '—'],
                ['Tiên Ngọc', adminNumber(a.balance)],
                ['Ngày tạo', adminTime(a.created_at)],
                ['Đồng bộ gần nhất', adminTime(a.updated_at)],
                ['Quyền tài khoản', a.admin ? 'Admin' : 'Người chơi'],
                [
                  'Trang bị đang dùng',
                  Object.values(data!.equipment)
                    .map((id) => ITEMS[equipmentBaseId(id)]?.name ?? id)
                    .join(', ') || 'Chưa có',
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {tab === 'inventory' && (
            <div className="admin-inspection-items">
              {Object.entries(data!.inventory)
                .filter(([, qty]) => Number.isFinite(Number(qty)) && Number(qty) > 0)
                .map(([id, qty]) => (
                  <article key={id}>
                    <AdminItemArt id={id} />
                    <span>
                      {ITEMS[equipmentBaseId(id)]?.name ?? id}
                      <small>{id}</small>
                    </span>
                    <b>×{adminNumber(Number(qty))}</b>
                  </article>
                ))}
              <p className="admin-note">Tối đa 300 loại vật phẩm trong bản lưu gần nhất.</p>
            </div>
          )}
          {tab === 'quests' && (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nhiệm vụ</th>
                    <th>Trạng thái</th>
                    <th>Tiến độ lưu</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data!.quests).map(([id, q]) => (
                    <tr key={id}>
                      <td>{QUESTS[id]?.name ?? id}</td>
                      <td>
                        {q.status === 'done'
                          ? 'Hoàn thành'
                          : q.status === 'ready'
                            ? 'Chờ trả'
                            : 'Đang làm'}
                      </td>
                      <td>{Array.isArray(q.progress) ? q.progress.join(' / ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminDialog>
  );
}
