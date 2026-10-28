import { useRef, useState } from 'react';
import { adminApi, adminError, downloadAdminCsv, type EventPlan } from './adminApi';
import { useAdminRequest } from './useAdminRequest';
import { AdminIcon } from './AdminArt';
import {
  AdminDialog,
  AdminLoadState,
  AdminPanel,
  AdminPager,
  adminNumber,
  adminTime,
} from './AdminUI';

const LOG_KINDS: Record<string, string> = {
  auth_pending: 'Auth đang chờ',
  auth_create: 'Tạo tài khoản',
  auth_delete: 'Xóa tài khoản',
  auth_ban: 'Khóa tài khoản',
  auth_unban: 'Mở khóa tài khoản',
  item_grant: 'Cấp vật phẩm',
  item_remove: 'Xóa vật phẩm',
  save_edit: 'Sửa save',
  maintenance: 'Bảo trì',
  boss_reset: 'Reset boss',
  dungeon_reset: 'Reset phó bản',
  alphatest: 'Phát thư Alphatest',
  jade_grant: 'Cấp Tiên Ngọc',
  jade_exchange: 'Đổi pháp bảo',
  event_plan: 'Kế hoạch sự kiện',
};
export function AdminLogs({
  revision,
  compact = false,
  onAll,
}: {
  revision: number;
  compact?: boolean;
  onAll?: () => void;
}) {
  const [input, setInput] = useState(''),
    [query, setQuery] = useState(''),
    [kind, setKind] = useState('all'),
    [page, setPage] = useState(0);
  const size = compact ? 8 : 20,
    { data, loading, error } = useAdminRequest(
      () => adminApi.logs(query, kind, page * size, size),
      JSON.stringify([query, kind, page, size]),
      revision,
    ),
    rows = data?.rows ?? [];
  return (
    <AdminPanel
      title="Nhật ký quản trị"
      icon="logs"
      action={
        compact ? (
          <button className="admin-button" onClick={onAll}>
            Xem tất cả
          </button>
        ) : (
          <button
            className="admin-button"
            disabled={!data || loading}
            onClick={() =>
              downloadAdminCsv('nhat-ky-trang-hien-tai.csv', [
                ['Thời gian', 'Loại', 'Nội dung', 'Người thực hiện', 'Người nhận', 'Tiên Ngọc'],
                ...rows.map((r) => [
                  r.created_at,
                  LOG_KINDS[r.kind] ?? r.kind,
                  r.message,
                  r.actor,
                  r.target,
                  r.delta,
                ]),
              ])
            }
          >
            <AdminIcon name="export" />
            Xuất trang CSV
          </button>
        )
      }
    >
      {!compact && (
        <form
          className="admin-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(input.trim());
            setPage(0);
          }}
        >
          <div className="admin-search">
            <AdminIcon name="search" />
            <input
              aria-label="Tìm nhật ký"
              placeholder="Nội dung, người thực hiện, người nhận…"
              maxLength={100}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <select
            aria-label="Loại nhật ký"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả loại</option>
            {Object.entries(LOG_KINDS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <button className="admin-button gold">Tìm</button>
        </form>
      )}
      <AdminLoadState loading={loading} error={error} empty={!rows.length} />
      {!!rows.length && (
        <div className="admin-table-scroll">
          <table className={`admin-table ${compact ? 'admin-compact-logs' : ''}`}>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Loại</th>
                <th>Nội dung</th>
                <th>Người thực hiện</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="admin-date">{adminTime(r.created_at)}</td>
                  <td>
                    <span className={`admin-log-badge ${r.kind}`}>
                      {LOG_KINDS[r.kind] ?? r.kind}
                    </span>
                  </td>
                  <td>
                    {r.message}
                    {r.target && (
                      <small className="admin-cell-sub">
                        Người nhận: {r.target}
                        {r.delta !== null
                          ? ` · ${r.delta > 0 ? '+' : ''}${adminNumber(r.delta)} ngọc`
                          : ''}
                      </small>
                    )}
                  </td>
                  <td>{r.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!compact && (
        <AdminPager
          total={data?.total ?? 0}
          page={page}
          size={size}
          setPage={setPage}
          disabled={loading}
        />
      )}
      {compact && (
        <p className="admin-note admin-inset-note">Log Tiên Ngọc và thay đổi kế hoạch quản trị.</p>
      )}
    </AdminPanel>
  );
}
export function AdminJade({
  initialTarget,
  onSaved,
}: {
  initialTarget: string;
  onSaved: () => void;
}) {
  const [username, setUsername] = useState(initialTarget),
    [amount, setAmount] = useState(100),
    [note, setNote] = useState(''),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const request = useRef<{ signature: string; key: string } | null>(null);
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const signature = JSON.stringify([username.trim(), amount, note.trim()]);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await adminApi.grant(username, amount, note, request.current.key);
      if (!result.ok) throw new Error('Server chưa xác nhận yêu cầu.');
      setReview(false);
      setNotice(`Đã xác nhận cấp ${adminNumber(amount)} Tiên Ngọc cho ${username.trim()}.`);
      request.current = null;
      onSaved();
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <AdminPanel title="Cấp Tiên Ngọc" icon="jade">
        <div className="admin-grant-layout">
          <form
            className="admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              setNotice('');
              setError('');
              if (
                !username.trim() ||
                !Number.isSafeInteger(amount) ||
                amount < 1 ||
                amount > 1000000 ||
                note.trim().length < 3
              ) {
                setError('Nhập tài khoản, số ngọc từ 1 đến 1.000.000 và lý do tối thiểu 3 ký tự.');
                return;
              }
              setReview(true);
            }}
          >
            <label>
              Username người nhận
              <input
                aria-label="Username nhận Tiên Ngọc"
                required
                maxLength={100}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label>
              Số Tiên Ngọc
              <input
                aria-label="Số Tiên Ngọc quản trị"
                type="number"
                required
                min="1"
                max="1000000"
                step="1"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
            <label>
              Lý do cấp ngọc
              <textarea
                aria-label="Lý do cấp ngọc"
                required
                minLength={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mã giao dịch đã xác nhận, hoàn tiền hoặc lý do xử lý…"
              />
            </label>
            {error && !review && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="admin-success" role="status">
                {notice}
              </p>
            )}
            <button className="admin-button gold" data-action="review-admin-jade">
              Kiểm tra yêu cầu
            </button>
          </form>
          <aside className="admin-grant-note">
            <AdminIcon name="jade" />
            <h3>Ngọc quý lưu chuyển</h3>
            <p>
              Tiên Ngọc được cấp vào ví tài khoản người nhận sau khi server xác nhận quyền admin.
            </p>
            <p>
              Mỗi yêu cầu có mã riêng để tránh cấp lặp khi thử lại. Nhật ký ghi người thực hiện,
              người nhận, số lượng và lý do.
            </p>
            <p>Cổng nạp thẻ và thanh toán trực tuyến hiện chưa mở.</p>
          </aside>
        </div>
      </AdminPanel>
      {review && (
        <AdminDialog
          title="Xác nhận cấp Tiên Ngọc"
          onClose={() => {
            if (!busy) setReview(false);
          }}
        >
          <dl className="admin-detail-grid">
            <div>
              <dt>Người nhận</dt>
              <dd>{username.trim()}</dd>
            </div>
            <div>
              <dt>Tiên Ngọc</dt>
              <dd className="admin-jade-text">{adminNumber(amount)}</dd>
            </div>
            <div>
              <dt>Lý do</dt>
              <dd>{note.trim()}</dd>
            </div>
          </dl>
          {error && (
            <>
              <p className="admin-error" role="alert">
                {error}
              </p>
              <p className="admin-note">Thử lại sẽ dùng cùng mã yêu cầu để tránh cấp lặp.</p>
            </>
          )}
          <footer className="admin-dialog-actions">
            <button className="admin-button" disabled={busy} onClick={() => setReview(false)}>
              Quay lại
            </button>
            <button
              className="admin-button gold"
              data-action="confirm-admin-jade"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? 'Đang xác nhận…' : error ? 'Thử lại cùng yêu cầu' : 'Xác nhận cấp ngọc'}
            </button>
          </footer>
        </AdminDialog>
      )}
    </>
  );
}

const newPlan = (): EventPlan => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  starts_at: null,
  ends_at: null,
  map_id: null,
  status: 'draft',
  version: 0,
});
const dateInput = (value: string | null) =>
  value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : '';
const fromDateInput = (value: string) => (value ? new Date(value + '+07:00').toISOString() : null);
export function AdminEvents({ revision, onSaved }: { revision: number; onSaved: () => void }) {
  const { data, loading, error } = useAdminRequest(() => adminApi.plans(), 'plans', revision),
    [editor, setEditor] = useState(newPlan),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(''),
    [notice, setNotice] = useState('');
  const select = (p: EventPlan) => {
    setEditor({ ...p });
    setFailure('');
    setNotice('');
  };
  return (
    <AdminPanel
      title="Kế hoạch sự kiện"
      icon="events"
      action={
        <button className="admin-button gold" disabled={busy} onClick={() => select(newPlan())}>
          ＋ Tạo kế hoạch
        </button>
      }
    >
      <p className="admin-note admin-inset-note">
        Kế hoạch nội bộ — chưa kích hoạt sự kiện hoặc phát thưởng trong game. Thời gian hiển thị
        theo Việt Nam (UTC+7).
      </p>
      <div className="admin-events-layout">
        <section className="admin-plan-list">
          <AdminLoadState loading={loading} error={error} empty={!data?.length} />
          {data?.map((p) => (
            <button
              key={p.id}
              className={p.id === editor.id ? 'selected' : ''}
              disabled={busy}
              onClick={() => select(p)}
            >
              <b>{p.title}</b>
              <span>
                {p.status === 'archived' ? 'Đã lưu trữ' : 'Bản nháp'} · v{p.version}
              </span>
              <small>{adminTime(p.starts_at)}</small>
            </button>
          ))}
        </section>
        <form
          className="admin-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setFailure('');
            setNotice('');
            try {
              if (
                editor.starts_at &&
                editor.ends_at &&
                Date.parse(editor.ends_at) <= Date.parse(editor.starts_at)
              )
                throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
              const saved = await adminApi.savePlan(editor);
              setEditor(saved);
              setNotice('Đã lưu kế hoạch. Chưa kích hoạt sự kiện trong game.');
              onSaved();
            } catch (e) {
              setFailure(adminError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Tên kế hoạch
            <input
              aria-label="Tên kế hoạch sự kiện"
              required
              minLength={3}
              maxLength={120}
              disabled={busy}
              value={editor.title}
              onChange={(e) => setEditor({ ...editor, title: e.target.value })}
            />
          </label>
          <label>
            Nội dung
            <textarea
              aria-label="Nội dung kế hoạch"
              required
              maxLength={4000}
              disabled={busy}
              value={editor.description}
              onChange={(e) => setEditor({ ...editor, description: e.target.value })}
            />
          </label>
          <div className="admin-form-row">
            <label>
              Bắt đầu
              <input
                aria-label="Bắt đầu sự kiện"
                type="datetime-local"
                disabled={busy}
                value={dateInput(editor.starts_at)}
                onChange={(e) => setEditor({ ...editor, starts_at: fromDateInput(e.target.value) })}
              />
            </label>
            <label>
              Kết thúc
              <input
                aria-label="Kết thúc sự kiện"
                type="datetime-local"
                disabled={busy}
                value={dateInput(editor.ends_at)}
                onChange={(e) => setEditor({ ...editor, ends_at: fromDateInput(e.target.value) })}
              />
            </label>
          </div>
          <div className="admin-form-row">
            <label>
              Mã khu vực (tùy chọn)
              <input
                maxLength={80}
                disabled={busy}
                value={editor.map_id ?? ''}
                onChange={(e) => setEditor({ ...editor, map_id: e.target.value || null })}
                placeholder="vd: linh_thu_lam"
              />
            </label>
            <label>
              Trạng thái
              <select
                disabled={busy}
                value={editor.status}
                onChange={(e) =>
                  setEditor({ ...editor, status: e.target.value as EventPlan['status'] })
                }
              >
                <option value="draft">Bản nháp</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </label>
          </div>
          {failure && (
            <p className="admin-error" role="alert">
              {failure}
            </p>
          )}
          {notice && (
            <p className="admin-success" role="status">
              {notice}
            </p>
          )}
          <button className="admin-button gold" data-action="save-admin-plan" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu kế hoạch'}
          </button>
        </form>
      </div>
    </AdminPanel>
  );
}
