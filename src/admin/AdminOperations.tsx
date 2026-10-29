import { useEffect, useRef, useState } from 'react';
import { DUNGEONS, ITEMS, MONSTERS, ZONE_NAMES } from '../data';
import { AdminDialog, AdminLoadState, AdminPanel } from './AdminUI';
import { useAdminRequest } from './useAdminRequest';
import {
  operationsApi,
  operationsError,
  type AdminCommand,
  type CommandKind,
  type PendingAuth,
  type SnapshotRead,
} from './adminOperationsApi';
const LABELS: Record<CommandKind, string> = {
  auth_create: 'Tạo tài khoản Auth',
  auth_delete: 'Xóa tài khoản Auth',
  auth_ban: 'Khóa tài khoản',
  auth_unban: 'Mở khóa tài khoản',
  item_grant: 'Gửi vật phẩm qua thư',
  item_remove: 'Xóa vật phẩm',
  save_edit: 'Sửa save nhân vật',
  maintenance: 'Bảo trì toàn server',
  boss_reset: 'Reset boss thế giới',
  dungeon_reset: 'Reset lượt phó bản',
};
const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export function AdminOperations({
  initialTarget = '',
  revision,
  onSaved,
}: {
  initialTarget?: string;
  revision: number;
  onSaved: () => void;
}) {
  const {
    data: status,
    loading,
    error,
  } = useAdminRequest(() => operationsApi.status(), 'ops', revision);
  const [kind, setKind] = useState<CommandKind>('item_grant'),
    [target, setTarget] = useState(initialTarget),
    [scope, setScope] = useState('one'),
    [item, setItem] = useState('hoi_xuan_dan'),
    [quantity, setQuantity] = useState(1),
    [reason, setReason] = useState(''),
    [username, setUsername] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [enabled, setEnabled] = useState(false),
    [message, setMessage] = useState(''),
    [boss, setBoss] = useState(''),
    [dungeon, setDungeon] = useState('all');
  const [read, setRead] = useState<SnapshotRead | null>(null),
    [readTarget, setReadTarget] = useState(''),
    [reading, setReading] = useState(false),
    [saveText, setSaveText] = useState(''),
    [failure, setFailure] = useState(''),
    [success, setSuccess] = useState(''),
    [review, setReview] = useState<AdminCommand | null>(null),
    [typed, setTyped] = useState(''),
    [busy, setBusy] = useState(false),
    [resume, setResume] = useState<PendingAuth | null>(null);
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    setRead(null);
    setReadTarget('');
    setSaveText('');
  }, [target]);
  const isAuth = kind.startsWith('auth_'),
    global =
      kind === 'maintenance' ||
      kind === 'boss_reset' ||
      (kind === 'dungeon_reset' && scope === 'all'),
    needsTarget = kind !== 'auth_create' && !global;
  const load = async () => {
    if (!UUID.test(target)) {
      setFailure('Nhập ID tài khoản hợp lệ; có thể chọn từ Danh sách tài khoản.');
      return;
    }
    const selected = target;
    setReading(true);
    setFailure('');
    try {
      const data = await operationsApi.snapshot(selected);
      if (targetRef.current !== selected) return;
      setRead(data);
      setReadTarget(selected);
      setSaveText(data.snapshot ? JSON.stringify(data.snapshot, null, 2) : '');
    } catch (e) {
      if (targetRef.current === selected) setFailure(operationsError(e));
    } finally {
      setReading(false);
    }
  };
  const prepare = (e: React.FormEvent) => {
    e.preventDefault();
    setFailure('');
    setSuccess('');
    try {
      if (reason.trim().length < 3) throw new Error('Hãy ghi lý do ít nhất 3 ký tự.');
      if (kind === 'item_grant' && status?.item_delivery !== 'mail')
        throw new Error('MAIL_DELIVERY_NOT_INSTALLED');
      if (kind === 'maintenance' && enabled && status?.maintenance_notice_seconds !== 300)
        throw new Error(
          'Cần cài supabase/player-access.sql để bảo trì sau 5 phút và chặn mọi tài khoản trong game.',
        );
      if (needsTarget && (!UUID.test(target) || (!resume && readTarget !== target)))
        throw new Error('Hãy tải thông tin tài khoản trước khi thao tác.');
      if (isAuth && kind !== 'auth_create' && read?.protected) throw new Error('PROTECTED_ADMIN');
      if (
        kind === 'auth_create' &&
        (!/^[\p{L}\p{N}_.]{3,16}$/u.test(username) || password.length < 8)
      )
        throw new Error('INVALID_AUTH_INPUT');
      let payload: Record<string, unknown> = {};
      if (kind === 'item_grant' || kind === 'item_remove') {
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000 || !item)
          throw new Error('Số lượng từ 1 đến 100.000.');
        payload = { item, quantity };
      } else if (kind === 'save_edit') {
        if (!read?.snapshot || !read.token) throw new Error('SAVE_NOT_FOUND');
        payload = { snapshot: JSON.parse(saveText) };
      } else if (kind === 'maintenance') payload = { enabled, message };
      else if (kind === 'boss_reset') {
        const selected = boss || status?.bosses[0]?.id;
        const definition = status?.bosses.find((b) => b.id === selected);
        if (!definition) throw new Error('Chưa chọn boss thế giới.');
        payload = { map: definition.map, monster: definition.monster };
      } else if (kind === 'dungeon_reset') payload = { dungeon };
      setReview({
        id: resume?.id ?? crypto.randomUUID(),
        kind,
        target: needsTarget ? target : null,
        payload,
        reason: reason.trim(),
        confirm: global ? 'TOAN SERVER' : target,
        token: needsTarget ? (read?.token ?? null) : null,
        ...(kind === 'auth_create' ? { username, email, password } : {}),
      });
      setTyped('');
    } catch (e) {
      setFailure(operationsError(e));
    }
  };
  const execute = async () => {
    if (!review || busy) return;
    setBusy(true);
    setFailure('');
    try {
      await operationsApi.execute(review);
      setSuccess(
        `Đã thực hiện: ${LABELS[review.kind]}.${review.kind === 'item_grant' ? ' Người chơi vào Thư để nhận vật phẩm.' : ''} Mã: ${review.id}`,
      );
      setReview(null);
      setRead(null);
      setReadTarget('');
      setPassword('');
      setResume(null);
      onSaved();
    } catch (e) {
      setFailure(operationsError(e));
    } finally {
      setBusy(false);
    }
  };
  const resumeJob = (job: PendingAuth) => {
    setKind(job.kind);
    setTarget(job.target);
    setReason(job.reason);
    setUsername(job.payload.username ?? '');
    setEmail(job.payload.email ?? '');
    setResume(job);
    setReview(null);
    setFailure('');
  };
  const downloadBackup = async (id: string) => {
    try {
      const data = await operationsApi.backup(id, target);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `save-before-${target}-${id}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      setFailure(operationsError(e));
    }
  };
  const inventory =
    (read?.snapshot?.player as { inventory?: Record<string, number>; linhKhi?: number } | undefined)
      ?.inventory ?? {};
  const itemChoices =
    kind === 'item_remove'
      ? Object.keys(inventory).filter((id) => inventory[id] > 0)
      : Object.keys(ITEMS);
  const danger = review && (review.kind === 'auth_delete' || review.confirm === 'TOAN SERVER');
  return (
    <AdminPanel title="Điều hành tài khoản và server" icon="settings">
      <AdminLoadState loading={loading} error={error} />
      {status && (
        <div className="admin-ops-body">
          <p>
            Server: <b>{status.maintenance ? 'Đã lên lịch / đang bảo trì' : 'Đang mở'}</b>. Quà vật
            phẩm gửi qua thư, người chơi tự nhận và tiếp tục chơi. Sửa save hoặc xóa đồ sẽ ngắt
            phiên chơi của tài khoản bị tác động. Reset lượt không xóa thành tích hay thưởng lần
            đầu.
          </p>
          <form className="admin-ops-form" onSubmit={prepare}>
            <label>
              Thao tác
              <select
                aria-label="Thao tác quản trị"
                value={kind}
                disabled={!!resume}
                onChange={(e) => {
                  setKind(e.target.value as CommandKind);
                  setFailure('');
                }}
              >
                {Object.entries(LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {kind === 'dungeon_reset' && (
              <label>
                Phạm vi
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  aria-label="Phạm vi reset"
                >
                  <option value="one">Một tài khoản</option>
                  <option value="all">Toàn server</option>
                </select>
              </label>
            )}
            {needsTarget && (
              <div className="admin-ops-target">
                <label>
                  ID tài khoản
                  <input
                    aria-label="ID tài khoản thao tác"
                    value={target}
                    disabled={!!resume}
                    onChange={(e) => setTarget(e.target.value.trim())}
                  />
                </label>
                <button
                  type="button"
                  className="admin-button"
                  disabled={reading || !UUID.test(target)}
                  onClick={() => void load()}
                >
                  {reading ? 'Đang tải…' : 'Tải thông tin / save'}
                </button>
              </div>
            )}
            {readTarget === target && read && (
              <p className="admin-note">
                Nhân vật: {String((read.snapshot?.player as { name?: string })?.name ?? 'Chưa tạo')}{' '}
                · {read.blocked ? 'Đang khóa' : 'Không khóa'}
                {read.protected ? ' · Admin được bảo vệ' : ''}
              </p>
            )}
            {kind === 'auth_create' && (
              <>
                <label>
                  Tên đăng nhập
                  <input
                    aria-label="Tên đăng nhập mới"
                    value={username}
                    disabled={!!resume}
                    maxLength={16}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <label>
                  Email (để trống nếu đăng nhập bằng username)
                  <input
                    aria-label="Email tài khoản mới"
                    value={email}
                    disabled={!!resume}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Mật khẩu ban đầu
                  <input
                    aria-label="Mật khẩu tài khoản mới"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    minLength={8}
                    maxLength={128}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <p className="admin-note">
                  Mật khẩu không được ghi vào nhật ký. Khi thử lại tài khoản đã tạo thành công, mật
                  khẩu cũ được giữ nguyên.
                </p>
              </>
            )}
            {(kind === 'item_grant' || kind === 'item_remove') && (
              <>
                <label>
                  Vật phẩm
                  <select
                    aria-label="Vật phẩm thao tác"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                  >
                    <option value="">Chọn vật phẩm</option>
                    {[
                      ...new Set([
                        ...itemChoices,
                        ...(kind === 'item_remove' ? ['linh_khi', 'tien_phap_bao'] : []),
                      ]),
                    ].map((id) => (
                      <option key={id} value={id}>
                        {ITEMS[id]?.name ?? id} · {id}
                        {kind === 'item_remove' ? ` (${inventory[id] ?? 0})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Số lượng
                  <input
                    aria-label="Số lượng vật phẩm thao tác"
                    type="number"
                    min={1}
                    max={100000}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </label>
                <p className="admin-note">
                  Trang bị cấp mới có mã riêng từng món; mỗi lệnh tối đa 100 trang bị. Xóa đồ đang
                  mặc sẽ tháo món đó và xóa mức cường hóa của chính món đó.
                </p>
              </>
            )}
            {kind === 'save_edit' && (
              <label className="admin-ops-wide">
                Save JSON
                <textarea
                  aria-label="Save JSON"
                  spellCheck={false}
                  value={saveText}
                  onChange={(e) => setSaveText(e.target.value)}
                  rows={15}
                />
                <small>
                  Giữ tên nhân vật và mailRevision. Server lưu bản sao trước khi sửa; dữ liệu thay
                  đổi trong lúc xem sẽ báo xung đột.
                </small>
              </label>
            )}
            {kind === 'save_edit' && readTarget === target && !!read?.backups?.length && (
              <div className="admin-ops-wide">
                Bản sao trước thay đổi:{' '}
                {read.backups.map((b) => (
                  <button
                    type="button"
                    className="admin-button"
                    key={b.command_id}
                    onClick={() => void downloadBackup(b.command_id)}
                  >
                    {new Date(b.created_at).toLocaleString('vi-VN')}
                  </button>
                ))}
              </div>
            )}
            {kind === 'maintenance' && (
              <>
                <label>
                  Trạng thái
                  <select
                    aria-label="Trạng thái bảo trì"
                    value={enabled ? 'on' : 'off'}
                    onChange={(e) => setEnabled(e.target.value === 'on')}
                  >
                    <option value="off">Mở server</option>
                    <option value="on">Thông báo và bảo trì sau 5 phút</option>
                  </select>
                </label>
                <label>
                  Thông báo cho người chơi
                  <textarea
                    aria-label="Thông báo bảo trì"
                    value={message}
                    maxLength={500}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </label>
                <p className="admin-note">
                  Bật bảo trì chặn vào game và ngắt các phiên thường; admin vẫn truy cập được
                  dashboard.
                </p>
              </>
            )}
            {kind === 'boss_reset' && (
              <label>
                Boss công khai
                <select
                  aria-label="Boss cần reset"
                  value={boss || status.bosses[0]?.id || ''}
                  onChange={(e) => setBoss(e.target.value)}
                >
                  {status.bosses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {ZONE_NAMES[b.map] ?? b.map} · {MONSTERS[b.monster]?.name ?? b.monster}
                    </option>
                  ))}
                </select>
                <small>
                  Boss hồi đầy máu tại điểm sinh; không phát thưởng. Map đang mở nhận lệnh qua kiểm
                  tra server định kỳ.
                </small>
              </label>
            )}
            {kind === 'dungeon_reset' && (
              <label>
                Phó bản
                <select
                  aria-label="Phó bản cần reset"
                  value={dungeon}
                  onChange={(e) => setDungeon(e.target.value)}
                >
                  <option value="all">Tất cả lượt phó bản</option>
                  {Object.entries(DUNGEONS).map(([id, d]) => (
                    <option key={id} value={id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <small>
                  Trả lượt đã dùng. Phiên đang chạy của người bị tác động sẽ dừng; đăng nhập lại trở
                  về vị trí ngoài phó bản đã lưu.
                </small>
              </label>
            )}
            <label className="admin-ops-wide">
              Lý do
              <textarea
                aria-label="Lý do thao tác"
                value={reason}
                disabled={!!resume}
                minLength={3}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {resume && (
              <p>
                Đang tiếp tục yêu cầu {resume.id}.{' '}
                <button type="button" className="admin-button" onClick={() => setResume(null)}>
                  Rời chế độ tiếp tục
                </button>
              </p>
            )}
            <button
              className="admin-button gold"
              disabled={busy || reading || loading}
              type="submit"
            >
              Xem lại thao tác
            </button>
          </form>
          {failure && !review && (
            <p className="admin-error" role="alert">
              {failure}
            </p>
          )}
          {success && (
            <p className="admin-success" role="status">
              {success}
            </p>
          )}
          {!!status.pending_auth.length && (
            <section>
              <h3>Yêu cầu Auth của bạn chưa xác nhận hoàn tất</h3>
              {status.pending_auth.map((job) => (
                <p key={job.id}>
                  {LABELS[job.kind]} · {job.target}{' '}
                  <button className="admin-button" onClick={() => resumeJob(job)}>
                    Tiếp tục cùng mã
                  </button>
                </p>
              ))}
            </section>
          )}
        </div>
      )}
      {review && (
        <AdminDialog
          title="Xác nhận thao tác quản trị"
          onClose={() => {
            if (!busy) setReview(null);
          }}
        >
          <div className="admin-ops-review">
            <h3>{LABELS[review.kind]}</h3>
            <p>
              Đối tượng:{' '}
              <b>
                {review.target ?? (review.kind === 'auth_create' ? review.username : 'TOÀN SERVER')}
              </b>
            </p>
            <p>Lý do: {review.reason}</p>
            <pre>{JSON.stringify(review.payload, null, 2)}</pre>
            {review.kind === 'auth_create' && (
              <p>
                {review.username} · {review.email || 'Email đăng nhập nội bộ'} · Mật khẩu được ẩn
              </p>
            )}
            <small>Mã yêu cầu: {review.id}</small>
            {danger && (
              <label>
                Nhập <b>{review.confirm}</b> để xác nhận
                <input
                  aria-label="Nhập xác nhận thao tác"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                />
              </label>
            )}
            {failure && (
              <p className="admin-error" role="alert">
                {failure}
              </p>
            )}
            <button
              className="admin-button gold"
              disabled={busy || (!!danger && typed !== review.confirm)}
              onClick={() => void execute()}
            >
              {busy ? 'Đang thực hiện…' : failure ? 'Thử lại cùng yêu cầu' : 'Xác nhận thực hiện'}
            </button>
            <button className="admin-button" disabled={busy} onClick={() => setReview(null)}>
              Quay lại
            </button>
          </div>
        </AdminDialog>
      )}
    </AdminPanel>
  );
}
