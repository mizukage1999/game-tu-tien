import { useState } from 'react';
import { ITEMS, MONSTERS, QUESTS, RARITIES } from '../data';
import { bossCatalog } from '../data/bossCatalog';
import { getMap } from '../game/maps';
import { downloadAdminCsv } from './adminApi';
import { AdminIcon, AdminItemArt } from './AdminArt';
import { AdminDialog, AdminPanel, AdminPager, adminNumber } from './AdminUI';
export const ADMIN_ITEM_COUNT = Object.keys(ITEMS).length;
const normalized = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');
const KINDS: Record<string, string> = {
  equipment: 'Trang bị',
  consumable: 'Đan dược',
  material: 'Nguyên liệu',
  currency: 'Tài nguyên',
};
export function AdminItems({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState('all'),
    [rarity, setRarity] = useState('all'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const rows = Object.entries(ITEMS).filter(
    ([id, d]) =>
      normalized(`${id} ${d.name}`).includes(normalized(query)) &&
      (kind === 'all' || d.kind === kind) &&
      (rarity === 'all' || d.rarity === rarity),
  );
  const size = compact ? 6 : 12,
    shown = rows.slice(page * size, page * size + size),
    def = selected ? ITEMS[selected] : null;
  return (
    <>
      <AdminPanel
        title={`Danh mục vật phẩm (${ADMIN_ITEM_COUNT})`}
        icon="items"
        action={
          <button
            className="admin-button"
            onClick={() =>
              downloadAdminCsv('danh-muc-vat-pham.csv', [
                ['ID', 'Tên', 'Loại', 'Phẩm chất', 'Cấp yêu cầu'],
                ...rows.map(([id, d]) => [
                  id,
                  d.name,
                  KINDS[d.kind] ?? d.kind,
                  d.rarity ?? '',
                  d.reqLevel ?? 0,
                ]),
              ])
            }
          >
            <AdminIcon name="export" />
            Xuất CSV
          </button>
        }
      >
        <div className="admin-toolbar">
          <div className="admin-search">
            <AdminIcon name="search" />
            <input
              aria-label="Tìm vật phẩm quản trị"
              placeholder="Tên hoặc mã vật phẩm…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="Loại vật phẩm"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả loại</option>
            {Object.entries(KINDS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Phẩm chất vật phẩm"
            value={rarity}
            onChange={(e) => {
              setRarity(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả phẩm chất</option>
            {RARITIES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vật phẩm</th>
                <th>Loại</th>
                <th>Phẩm chất</th>
                <th>Cấp yêu cầu</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(([id, d]) => (
                <tr key={id} data-admin-item={id}>
                  <td>
                    <div className="admin-person">
                      <AdminItemArt id={id} />
                      <span>
                        <b>{d.name}</b>
                        <small>{id}</small>
                      </span>
                    </div>
                  </td>
                  <td>{KINDS[d.kind] ?? d.kind}</td>
                  <td>
                    {d.rarity ? (
                      <span
                        className="admin-rarity"
                        style={{ color: RARITIES.find((r) => r.id === d.rarity)?.color }}
                      >
                        {RARITIES.find((r) => r.id === d.rarity)?.name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{d.reqLevel ?? '—'}</td>
                  <td>
                    <button
                      className="admin-button icon-only"
                      aria-label={`Xem vật phẩm ${d.name}`}
                      onClick={() => setSelected(id)}
                    >
                      <AdminIcon name="eye" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="admin-empty">Không có vật phẩm phù hợp.</p>}
        </div>
        <AdminPager total={rows.length} page={page} size={size} setPage={setPage} />
      </AdminPanel>
      {def && (
        <AdminDialog title={def.name} onClose={() => setSelected(null)}>
          <div className="admin-catalog-detail">
            <AdminItemArt id={selected!} />
            <div>
              <p>{def.desc}</p>
              <p>
                Mã: <code>{selected}</code>
              </p>
              <p>
                {KINDS[def.kind] ?? def.kind} · Cấp yêu cầu: {def.reqLevel ?? 'Không'}
              </p>
            </div>
          </div>
          <pre className="admin-json">{JSON.stringify(def, null, 2)}</pre>
          <p className="admin-note">
            Định nghĩa thuộc bản phát hành hiện tại. Không sửa túi đồ hoặc chỉ số người chơi từ bảng
            danh mục.
          </p>
        </AdminDialog>
      )}
    </>
  );
}
export function AdminQuests() {
  const [query, setQuery] = useState(''),
    [kind, setKind] = useState('all'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const kinds = [...new Set(Object.values(QUESTS).map((q) => q.kind ?? 'main'))];
  const rows = Object.entries(QUESTS).filter(
    ([id, q]) =>
      normalized(`${id} ${q.name} ${q.desc}`).includes(normalized(query)) &&
      (kind === 'all' || (q.kind ?? 'main') === kind),
  );
  const labels: Record<string, string> = {
    main: 'Chính tuyến',
    side: 'Nhiệm vụ phụ',
    daily: 'Hàng ngày',
    sect: 'Tông môn',
  };
  return (
    <>
      <AdminPanel
        title="Nhiệm vụ trong bản phát hành"
        icon="quests"
        action={
          <button
            className="admin-button"
            onClick={() =>
              downloadAdminCsv('danh-muc-nhiem-vu.csv', [
                ['ID', 'Tên', 'Loại', 'Điều kiện trước', 'EXP'],
                ...rows.map(([id, q]) => [
                  id,
                  q.name,
                  q.kind ?? 'main',
                  q.requires ?? '',
                  q.rewards.exp ?? 0,
                ]),
              ])
            }
          >
            Xuất CSV
          </button>
        }
      >
        <div className="admin-toolbar">
          <div className="admin-search">
            <AdminIcon name="search" />
            <input
              aria-label="Tìm nhiệm vụ"
              placeholder="Tìm nhiệm vụ…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="Loại nhiệm vụ"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {labels[k] ?? k}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên nhiệm vụ</th>
                <th>Loại</th>
                <th>Điều kiện trước</th>
                <th>Mục tiêu</th>
                <th>EXP</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 12, page * 12 + 12).map(([id, q]) => (
                <tr key={id}>
                  <td>
                    <b>{q.name}</b>
                    <small className="admin-cell-sub">{id}</small>
                  </td>
                  <td>{labels[q.kind ?? 'main'] ?? q.kind}</td>
                  <td>{q.requires ? (QUESTS[q.requires]?.name ?? q.requires) : '—'}</td>
                  <td>{q.objectives.length}</td>
                  <td>{adminNumber(q.rewards.exp ?? 0)}</td>
                  <td>
                    <button className="admin-button" onClick={() => setSelected(id)}>
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPager total={rows.length} page={page} size={12} setPage={setPage} />
      </AdminPanel>
      {selected && (
        <AdminDialog title={QUESTS[selected].name} onClose={() => setSelected(null)}>
          <p className="admin-detail-intro">{QUESTS[selected].desc}</p>
          <p className="admin-note">{QUESTS[selected].story}</p>
          <pre className="admin-json">{JSON.stringify(QUESTS[selected], null, 2)}</pre>
        </AdminDialog>
      )}
    </>
  );
}
export function AdminBosses() {
  const [catalog] = useState(bossCatalog),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const rows = catalog.filter(
    (e) =>
      normalized(`${MONSTERS[e.type].name} ${getMap(e.mapId).name}`).includes(normalized(query)) &&
      (category === 'all' || e.category === category),
  );
  const labels: Record<string, string> = {
    world: 'Thế giới',
    elite: 'Tinh anh',
    personal: 'Phó bản',
  };
  const detail = selected ? catalog.find((e) => e.key === selected) : null;
  return (
    <>
      <AdminPanel title="Boss và điểm sinh" icon="boss">
        <p className="admin-note admin-inset-note">
          Cấu hình điểm sinh của bản phát hành; trạng thái boss đang sống/chết không được lưu toàn
          server.
        </p>
        <div className="admin-toolbar">
          <div className="admin-search">
            <AdminIcon name="search" />
            <input
              aria-label="Tìm boss"
              placeholder="Tên boss hoặc khu vực…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="Loại boss"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả</option>
            {Object.entries(labels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Boss</th>
                <th>Nhóm</th>
                <th>Cấp</th>
                <th>Khu vực</th>
                <th>Điểm sinh</th>
                <th>Sinh lực</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(page * 12, page * 12 + 12).map((e) => (
                <tr key={e.key}>
                  <td>
                    <b>{MONSTERS[e.type].name}</b>
                    <small className="admin-cell-sub">{e.type}</small>
                  </td>
                  <td>{labels[e.category]}</td>
                  <td>{MONSTERS[e.type].level}</td>
                  <td>{getMap(e.mapId).name}</td>
                  <td>
                    {e.x}, {e.y}
                  </td>
                  <td>{adminNumber(MONSTERS[e.type].hp)}</td>
                  <td>
                    <button className="admin-button" onClick={() => setSelected(e.key)}>
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPager total={rows.length} page={page} size={12} setPage={setPage} />
      </AdminPanel>
      {detail && (
        <AdminDialog title={MONSTERS[detail.type].name} onClose={() => setSelected(null)}>
          <p className="admin-detail-intro">
            {getMap(detail.mapId).name} · Tọa độ {detail.x}, {detail.y}
          </p>
          <pre className="admin-json">{JSON.stringify(MONSTERS[detail.type], null, 2)}</pre>
        </AdminDialog>
      )}
    </>
  );
}
