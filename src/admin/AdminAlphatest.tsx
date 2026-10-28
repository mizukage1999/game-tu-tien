import { useState } from 'react';
import { adminApi, adminError } from './adminApi';
import { useAdminRequest } from './useAdminRequest';
import { AdminLoadState, AdminPanel, adminNumber } from './AdminUI';

export function AdminAlphatest({ revision, onSaved }: { revision: number; onSaved: () => void }) {
  const { data, loading, error } = useAdminRequest(
    () => adminApi.alphatest(),
    'alphatest',
    revision,
  );
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState('');
  async function toggle() {
    if (!data || busy) return;
    setBusy(true);
    setFailure('');
    try {
      await adminApi.setAlphatest(!data.enabled, data.version);
      onSaved();
    } catch (e) {
      setFailure(adminError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminPanel title="Phát quà Alphatest qua thư" icon="events">
      <AdminLoadState loading={loading} error={error} />
      {data && (
        <div className="admin-alpha-body">
          <h3>{data.enabled ? 'Đang phát thư khi đăng nhập' : 'Đã dừng phát thư mới'}</h3>
          <p>
            Thư được gửi một lần cho mỗi tài khoản. Người chơi chỉ nhận quà sau khi nhập môn thành
            công.
          </p>
          <dl>
            {[
              ['Cấp tối thiểu', String(data.rewards.targetLevel)],
              ['Tiên Ngọc', adminNumber(data.rewards.jade)],
              ['Linh Thạch', adminNumber(data.rewards.linhThach)],
              ['Linh Khí', adminNumber(data.rewards.linhKhi)],
              ['Đã gửi', adminNumber(data.delivered)],
              ['Đã nhận', adminNumber(data.claimed)],
            ].map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>
            EXP được dùng để đưa nhân vật lên cấp 99. Nhân vật từ cấp 99 trở lên giữ nguyên cấp và
            EXP. Tài nguyên được cộng thêm.
          </p>
          <p>
            Dừng phát thư chỉ áp dụng cho tài khoản chưa nhận thư. Các thư đã gửi vẫn nhận quà được.
          </p>
          <button
            className="admin-button gold"
            disabled={busy || loading}
            onClick={() => void toggle()}
          >
            {busy ? 'Đang lưu…' : data.enabled ? 'Dừng phát thư mới' : 'Mở phát thư Alphatest'}
          </button>
          {failure && (
            <p className="admin-error" role="alert">
              {failure}
            </p>
          )}
        </div>
      )}
    </AdminPanel>
  );
}
