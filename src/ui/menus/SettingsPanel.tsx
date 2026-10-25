import { useEffect, useState, type ReactNode } from 'react';
import { ZONE_NAMES } from '../../data';
import { useGame } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import { accountLabel, isGuest, useAccount } from '../../net/session';
import { signOutPlayer } from '../../net/auth';
import { heroName, isChildhood } from '../../game/systems/origin';
import { realmNameAtLevel } from '../../game/systems/progression';
import { adventure } from '../../game/systems/adventure';
import { childProfileUrl } from '../../game/art/skillIcons';
import { usesChildSprite } from '../../game/systems/origin';
import { RosterPortrait } from '../HeroArt';
import { loadGame } from '../../game/systems/save';
import { EventBus } from '../../game/EventBus';
import { AccountPanel } from '../AccountPanel';
import { CultHeading } from './CultivationUI';
import './settings.css';

type SettingsTab = 'general' | 'graphics' | 'controls' | 'account' | 'data';
const TABS = [
  ['general', 'Chung'],
  ['graphics', 'Đồ họa'],
  ['controls', 'Điều khiển'],
  ['account', 'Tài khoản'],
  ['data', 'Khác'],
] as const;
const SAVE_STATUS = {
  offline: 'Lưu trên thiết bị',
  idle: 'Đã kết nối',
  syncing: 'Đang đồng bộ…',
  saved: 'Đã đồng bộ',
  error: 'Cần đồng bộ lại',
};

function SettingsGlyph({ kind }: { kind: SettingsTab | 'save' | 'moon' }) {
  return (
    <svg className="settings-glyph" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {kind === 'graphics' ? (
        <>
          <rect x="3" y="5" width="26" height="18" rx="2" />
          <path d="M16 23v5M10 28h12M8 18l5-5 4 3 7-7" />
        </>
      ) : kind === 'controls' ? (
        <>
          <path d="M9 10h14c5 0 9 16 4 17-3 1-6-6-11-6s-8 7-11 6C0 26 4 10 9 10Z" />
          <path d="M10 13v7m-3-4h7m8-2v1m3 3v1" />
        </>
      ) : kind === 'account' ? (
        <>
          <circle cx="16" cy="10" r="6" />
          <path d="M5 29v-4a11 11 0 0 1 22 0v4H5Z" />
        </>
      ) : kind === 'save' || kind === 'data' ? (
        <>
          <path d="M5 3h20l4 4v22H3V3h2ZM9 3v9h14V3M9 29V18h14v11M18 6v3" />
        </>
      ) : kind === 'moon' ? (
        <>
          <path d="M24 5A12 12 0 1 0 27 24 12 12 0 0 1 24 5Z" />
          <path d="m9 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
        </>
      ) : (
        <>
          <path d="m13 3-1 4-4 2-4-1-2 5 4 2v4l-4 2 2 5 4-1 4 2 1 4h6l1-4 4-2 4 1 2-5-4-2v-4l4-2-2-5-4 1-4-2-1-4h-6Z" />
          <circle cx="16" cy="17" r="5" />
        </>
      )}
    </svg>
  );
}
function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div>
        <span>{title}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}
function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className={`settings-switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function SettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>('general'),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const player = useGame((s) => s.player),
    map = useGame((s) => s.mapId);
  const prefs = useSettings((s) => s.preferences),
    update = useSettings((s) => s.update),
    reset = useSettings((s) => s.reset),
    persisted = useSettings((s) => s.persisted);
  const account = useAccount(),
    child = isChildhood(player);
  const portrait = child
    ? childProfileUrl(player.sex ?? 'female')
    : `/assets/ui/cultivation/${player.sex === 'male' ? 'wang' : 'li'}-full-v1.png`;
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  function switchTab(next: SettingsTab) {
    setTab(next);
    setNotice('');
  }
  function save() {
    try {
      EventBus.emit('cmd:save');
      setNotice('Đã lưu hành trình trên thiết bị.');
    } catch {
      setNotice('Chưa lưu được. Hãy thử lại.');
    }
  }
  function download() {
    try {
      EventBus.emit('cmd:save');
      const snapshot = loadGame();
      if (!snapshot) {
        setNotice('Chưa có bản lưu để tải.');
        return;
      }
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `tu-tien-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Đã tải bản lưu nhân vật.');
    } catch {
      setNotice('Chưa tải được bản lưu. Hãy thử lại.');
    }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice('Thiết bị chưa cho phép chế độ toàn màn hình.');
    }
  }
  async function signOut() {
    setBusy(true);
    setNotice('');
    try {
      EventBus.emit('cmd:save');
      await signOutPlayer();
      window.location.reload();
    } catch {
      setNotice('Chưa đăng xuất được. Hãy thử lại.');
      setBusy(false);
    }
  }
  async function copyId() {
    try {
      await navigator.clipboard.writeText(account.user!.id);
      setNotice('Đã sao chép ID tài khoản.');
    } catch {
      setNotice('Bạn có thể chọn và sao chép ID bên dưới.');
    }
  }

  const graphics = (
    <section className="settings-card">
      <CultHeading>Cài đặt hiển thị</CultHeading>
      <SettingRow title="Hiển thị giao diện">
        <span className="settings-static-value">Tự vừa màn hình</span>
        {!!document.documentElement.requestFullscreen && (
          <button className="cult-btn" onClick={() => void toggleFullscreen()}>
            {fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          </button>
        )}
      </SettingRow>
      <SettingRow title="Độ nét hình ảnh" hint="Điều chỉnh độ nét khi vẽ thế giới.">
        <select
          aria-label="Độ nét hình ảnh"
          value={prefs.quality}
          onChange={(e) => {
            update({ quality: e.target.value as typeof prefs.quality });
            setNotice('Đã áp dụng độ nét hình ảnh.');
          }}
        >
          <option value="light">Nhẹ</option>
          <option value="balanced">Cân bằng</option>
          <option value="sharp">Sắc nét</option>
        </select>
      </SettingRow>
      <SettingRow title="Độ sáng thế giới">
        <label className="settings-range">
          <span aria-hidden="true">☀</span>
          <input
            type="range"
            min="70"
            max="130"
            value={prefs.brightness}
            aria-label="Độ sáng thế giới"
            onChange={(e) => update({ brightness: Number(e.target.value) })}
          />
          <output>{prefs.brightness}%</output>
        </label>
      </SettingRow>
      <SettingRow title="Hiệu ứng va chạm" hint="Chớp sáng và tia sáng khi trúng đòn.">
        <Switch
          label="Hiệu ứng va chạm"
          checked={prefs.hitEffects}
          onChange={(hitEffects) => update({ hitEffects })}
        />
      </SettingRow>
      <SettingRow title="Hiển thị số sát thương">
        <Switch
          label="Hiển thị số sát thương"
          checked={prefs.showDamage}
          onChange={(showDamage) => update({ showDamage })}
        />
      </SettingRow>
      <SettingRow title="Tên người chơi khác">
        <Switch
          label="Tên người chơi khác"
          checked={prefs.showNames}
          onChange={(showNames) => update({ showNames })}
        />
      </SettingRow>
    </section>
  );
  const controls = (
    <section className="settings-card settings-controls-card">
      <CultHeading>Điều khiển</CultHeading>
      <div className="settings-input-methods">
        <article>
          <SettingsGlyph kind="controls" />
          <div>
            <h4>Trên điện thoại</h4>
            <p>Kéo trên bản đồ để di chuyển. Chạm nút chiêu để đánh và dùng nút lướt để né.</p>
            <small>4 ô chiến đấu, gồm đánh thường · 1 nút lướt</small>
          </div>
        </article>
        <article>
          <SettingsGlyph kind="graphics" />
          <div>
            <h4>Trên máy tính</h4>
            <p>Dùng bàn phím hoặc nhấp bản đồ để di chuyển.</p>
          </div>
        </article>
      </div>
      <dl className="settings-keybinds">
        {[
          ['Di chuyển', 'W A S D / ↑ ↓ ← →'],
          ['Đánh thường', 'J / Space'],
          ['Ô chiến đấu', '1 · 2 · 3 · 4'],
          ['Lướt', 'Shift'],
          ['Tương tác', 'E'],
          ['Tu luyện', 'F'],
          ['Tự động chiến đấu', 'T'],
          ['Đổi mục tiêu', 'Tab'],
          ['Hồi Xuân Đan', 'Q'],
          ['Đóng giao diện', 'Esc'],
        ].map(([name, key]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>
              <kbd>{key}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
  const data = (
    <section className="settings-card settings-data-card">
      <CultHeading>Lưu hành trình</CultHeading>
      <p>Game tự lưu mỗi 5 giây và khi chuyển bản đồ.</p>
      <dl className="settings-data-facts">
        <div>
          <dt>Trên thiết bị</dt>
          <dd>Lưu tự động</dd>
        </div>
        <div>
          <dt>Tài khoản</dt>
          <dd>{account.user ? SAVE_STATUS[account.status] : 'Chơi trên thiết bị'}</dd>
        </div>
        <div>
          <dt>Ngôn ngữ</dt>
          <dd>Tiếng Việt</dd>
        </div>
      </dl>
      {isGuest(account.user) && (
        <p className="settings-hint">Tạo tài khoản để giữ hành trình khi đổi thiết bị.</p>
      )}
      <div className="settings-data-actions">
        <button className="cult-btn gold" onClick={save}>
          Lưu ngay
        </button>
        <button className="cult-btn" onClick={download}>
          Tải bản lưu
        </button>
      </div>
    </section>
  );

  return (
    <div className="cult-settings">
      <nav className="cult-side settings-side" aria-label="Mục cài đặt">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => switchTab(key)}
          >
            <SettingsGlyph kind={key} />
            <span>{label}</span>
          </button>
        ))}
        <div className="settings-side-foot">
          <SettingsGlyph kind="moon" />
          <span>TU TIÊN</span>
          <small>Phiên bản 0.1.0</small>
        </div>
      </nav>
      <div className="settings-content">
        <div className="settings-center-scroll">
          {(tab === 'general' || tab === 'graphics') && graphics}
          {tab === 'general' && (
            <section className="settings-card settings-quick-help">
              <CultHeading>Đồng hành trên tiên lộ</CultHeading>
              <div>
                <SettingsGlyph kind="controls" />
                <p>Kéo để di chuyển, chạm để thi triển. Đổi chiêu tại mục Kỹ Năng.</p>
                <button className="cult-btn" onClick={() => switchTab('controls')}>
                  Xem điều khiển
                </button>
              </div>
            </section>
          )}
          {tab === 'general' && (
            <section className="settings-card">
              <CultHeading>Ngôn ngữ</CultHeading>
              <SettingRow title="Ngôn ngữ hiển thị">
                <span className="settings-static-value">Tiếng Việt</span>
              </SettingRow>
            </section>
          )}
          {tab === 'graphics' && (
            <section className="settings-card settings-graphics-note">
              <SettingsGlyph kind="graphics" />
              <div>
                <h4>Chọn độ nét phù hợp</h4>
                <p>
                  Nhẹ giảm độ phân giải vẽ; Sắc nét ưu tiên chi tiết trên màn hình mật độ cao. Độ
                  sáng chỉ áp dụng cho thế giới trong game.
                </p>
              </div>
            </section>
          )}
          {tab === 'controls' && controls}
          {tab === 'account' && (
            <section className="settings-card settings-account-management">
              <CultHeading>Quản lý tài khoản</CultHeading>
              <AccountPanel showSignOut={false} />
            </section>
          )}
          {tab === 'data' && (
            <>
              {data}
              <section className="settings-card">
                <CultHeading>Tùy chỉnh thiết bị</CultHeading>
                <p className="settings-hint">
                  Độ sáng, độ nét và hiển thị được lưu riêng trên thiết bị này.
                </p>
                <button
                  className="cult-btn"
                  onClick={() => {
                    reset();
                    setNotice('Đã khôi phục cài đặt mặc định.');
                  }}
                >
                  Khôi phục cài đặt
                </button>
              </section>
            </>
          )}
        </div>
        <aside className="settings-right-scroll" aria-label="Tài khoản và lưu game">
          <section className="settings-card settings-profile">
            <CultHeading>Tài khoản</CultHeading>
            <div className="settings-profile-summary">
              <span className={`settings-portrait ${child ? 'child' : ''}`}>
                {player.heroId && !usesChildSprite(player) ? <RosterPortrait id={player.heroId}/> : portrait ? <img src={portrait} alt="" /> : <SettingsGlyph kind="account" />}
              </span>
              <div>
                <h2>{heroName(player)}</h2>
                <span className="settings-profile-account">
                  {account.user ? accountLabel(account.user) : 'Chơi trên thiết bị'}
                </span>
                <p>
                  Lv.{player.level} · {realmNameAtLevel(player.level)}
                </p>
                <p>
                  {child
                    ? 'Vương Gia Thôn · Chưa nhập môn'
                    : ZONE_NAMES[adventure(player).boundSect]}
                </p>
                <p>Khu vực: {ZONE_NAMES[map] ?? 'Đang du ngoạn'}</p>
              </div>
            </div>
            {account.user && (
              <div className="settings-account-id">
                <span>ID: {account.user.id}</span>
                <button aria-label="Sao chép ID tài khoản" onClick={() => void copyId()}>
                  ⧉
                </button>
              </div>
            )}
            <span className={`settings-sync-status ${account.status === 'error' ? 'error' : ''}`}>
              <i />
              {SAVE_STATUS[account.status]}
            </span>
          </section>
          <section className="settings-card settings-account-links">
            <CultHeading>Hành trình của bạn</CultHeading>
            <p>
              {account.user
                ? isGuest(account.user)
                  ? 'Bạn đang chơi bằng tài khoản khách.'
                  : 'Nhân vật gắn với tài khoản đang đăng nhập.'
                : 'Hành trình đang được lưu trên trình duyệt này.'}
            </p>
            <button className="cult-btn" onClick={() => switchTab('account')}>
              Quản lý tài khoản
            </button>
          </section>
          {tab !== 'data' && data}
          {account.user && (
            <button
              className="cult-btn settings-signout"
              disabled={busy}
              onClick={() => void signOut()}
            >
              {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          )}
        </aside>
        <footer className="settings-bottom-bar">
          <p role="status">
            {notice ||
              (persisted
                ? 'Tùy chỉnh được lưu tự động trên thiết bị.'
                : 'Đã áp dụng cho phiên chơi này. Thiết bị chưa cho phép lưu tùy chỉnh.')}
          </p>
          <button
            className="cult-btn"
            onClick={() => {
              reset();
              setNotice('Đã khôi phục cài đặt mặc định.');
            }}
          >
            Mặc định
          </button>
        </footer>
      </div>
    </div>
  );
}
