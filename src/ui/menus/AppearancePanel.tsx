import { useState } from 'react';
import { useStore } from 'zustand';
import {
  OUTFITS,
  WEAPON_SKINS,
  cosmeticDefinition,
  compatibleWeaponSkin,
  type CosmeticSlot,
} from '../../data/cosmetics';
import { HERO_WEAPONS } from '../../data/heroWeapons';
import { heroFor } from '../../data/heroes';
import { isChildhood } from '../../game/systems/origin';
import { ownsCosmetic, wornCosmetics } from '../../game/systems/cosmetics';
import { useGame } from '../../store/gameStore';
import { appearanceStore, stopAppearancePreview, tryAppearance } from '../../store/appearanceStore';
import { EventBus } from '../../game/EventBus';
import { HERO_DIRECTIONS } from '../../game/art/heroDirections';
import { CosmeticArt } from '../CosmeticArt';
import { HudFrame } from '../HudGlyph';
import './appearance.css';

export function AppearancePanel() {
  const p = useGame((s) => s.player),
    wear = useGame((s) => s.wearCosmetic),
    setMenu = useGame((s) => s.setMenu),
    selection = useStore(appearanceStore, (s) => s.selection),
    hero = heroFor(p),
    worn = wornCosmetics(p),
    child = isChildhood(p);
  const initial = cosmeticDefinition(selection ?? ''),
    [slot, setSlot] = useState<CosmeticSlot>(
      initial && WEAPON_SKINS.some((x) => x.id === initial.id) ? 'weapon' : 'outfit',
    ),
    [selected, setSelected] = useState<string>(initial?.id ?? worn.outfit ?? OUTFITS[0].id),
    [ownedOnly, setOwnedOnly] = useState(false),
    [direction, setDirection] = useState(0),
    [notice, setNotice] = useState('');
  const options = slot === 'outfit' ? OUTFITS : WEAPON_SKINS,
    weaponUnavailable =
      slot === 'weapon' && !WEAPON_SKINS.some((s) => compatibleWeaponSkin(hero.id, s.id)),
    items = options.filter((x) => !ownedOnly || ownsCosmetic(p, x.id)),
    product = options.find((x) => x.id === selected) ?? options[0],
    owned = ownsCosmetic(p, product.id),
    equipped = worn[slot] === product.id,
    look = { ...worn, [slot]: product.id },
    dir = HERO_DIRECTIONS[direction];
  const chooseSlot = (next: CosmeticSlot) => {
    setSlot(next);
    setSelected(
      next === 'outfit' ? (worn.outfit ?? OUTFITS[0].id) : (worn.weapon ?? WEAPON_SKINS[0].id),
    );
    setNotice('');
  };
  const equip = (id: string | null) => {
    if (!wear(slot, id)) return;
    stopAppearancePreview();
    EventBus.emit('cmd:save');
    setNotice(id ? `Đã mặc ${cosmeticDefinition(id)?.name}.` : 'Đã tháo ngoại trang.');
  };
  return (
    <section className="appearance-panel" aria-label="Ngoại trang">
      <nav className="appearance-tabs" aria-label="Loại ngoại trang">
        <button className={slot === 'outfit' ? 'active' : ''} onClick={() => chooseSlot('outfit')}>
          ♜ Thời Trang
        </button>
        <button className={slot === 'weapon' ? 'active' : ''} onClick={() => chooseSlot('weapon')}>
          ⚔ Vũ Khí
        </button>
        <span>Diện mạo riêng · Giữ nguyên sức mạnh</span>
      </nav>
      <div className="appearance-body">
        {weaponUnavailable ? (
          <section
            className="appearance-native-weapon appearance-frame"
            data-native-weapon={hero.id}
          >
            <HudFrame />
            <CosmeticArt kind="world" hero={hero.id} look={worn} direction={dir} />
            <div>
              <h2>
                {HERO_WEAPONS[hero.id]} · {hero.school}
              </h2>
              <p>Nhân vật sử dụng {HERO_WEAPONS[hero.id]} đúng theo phái.</p>
              <p>
                Ngoại trang {HERO_WEAPONS[hero.id]} chưa mở. Skin Kiếm chỉ dành cho Kiếm Tu; không
                gắn thêm kiếm lên nhân vật này.
              </p>
              <button className="cult-btn" onClick={() => chooseSlot('outfit')}>
                Xem thời trang
              </button>
            </div>
          </section>
        ) : (
          <>
            <aside className="appearance-list appearance-frame">
              <HudFrame />
              <select
                aria-label="Lọc ngoại trang"
                value={ownedOnly ? 'owned' : 'all'}
                onChange={(e) => setOwnedOnly(e.target.value === 'owned')}
              >
                <option value="all">Toàn bộ</option>
                <option value="owned">Đã sở hữu</option>
              </select>
              <div className="appearance-cards">
                {items.map((item) => (
                  <button
                    key={item.id}
                    data-cosmetic={item.id}
                    className={product.id === item.id ? 'selected' : ''}
                    aria-pressed={product.id === item.id}
                    onClick={() => {
                      setSelected(item.id);
                      setNotice('');
                    }}
                  >
                    <CosmeticArt kind="icon" id={item.id} />
                    <b>{item.name}</b>
                    <small className={ownsCosmetic(p, item.id) ? 'owned' : ''}>
                      {worn[slot] === item.id
                        ? '✓ Đang mặc'
                        : ownsCosmetic(p, item.id)
                          ? '✓ Đã sở hữu'
                          : 'Có thể xem thử'}
                    </small>
                  </button>
                ))}
              </div>
              {!items.length && (
                <p>Chưa có ngoại trang thuộc nhóm này. Chọn Toàn bộ để xem và thử.</p>
              )}
            </aside>
            <div className="appearance-stage">
              {slot === 'outfit' ? (
                <CosmeticArt hero={hero.id} look={look} className="appearance-portrait" />
              ) : (
                <CosmeticArt
                  kind="world"
                  hero={hero.id}
                  look={look}
                  direction={dir}
                  className="appearance-world-large"
                />
              )}
              <div className="appearance-stage-title">
                <b>{product.name}</b>
                <small>
                  {slot === 'outfit'
                    ? 'Phối màu trên bộ dáng của nhân vật'
                    : 'Kiếm ảnh đi kèm · đổi cả khi ngự kiếm'}
                </small>
              </div>
              {slot === 'outfit' && (
                <div className="appearance-world-proof">
                  <CosmeticArt kind="world" hero={hero.id} look={look} direction={dir} />
                  <small>Diện mạo trong thế giới</small>
                </div>
              )}
              <div className="appearance-rotate">
                <button aria-label="Xoay trái" onClick={() => setDirection((direction + 7) % 8)}>
                  ❮
                </button>
                <span>Xoay xem nhân vật</span>
                <button aria-label="Xoay phải" onClick={() => setDirection((direction + 1) % 8)}>
                  ❯
                </button>
              </div>
            </div>
            <aside className="appearance-detail appearance-frame">
              <HudFrame />
              <div className="appearance-detail-scroll">
                <h2>{product.name}</h2>
                <CosmeticArt kind="icon" id={product.id} />
                <div className="appearance-tags">
                  <span>{slot === 'outfit' ? 'Thời trang' : 'Skin kiếm'}</span>
                  <span>Vĩnh viễn</span>
                </div>
                <h3>Hiệu ứng ngoại hình</h3>
                <p>
                  {slot === 'outfit'
                    ? 'Đổi màu vải và tà áo, giữ dáng bộ đồ, tóc và gương mặt riêng của nhân vật.'
                    : 'Hiện kiếm ảnh theo hướng nhân vật. Khi ngự kiếm, đổi luôn diện mạo phi kiếm.'}
                </p>
                <p className="appearance-cosmetic-only">
                  Không cộng chỉ số. Trang bị, lực chiến và kỹ năng giữ nguyên.
                </p>
                <dl>
                  <div>
                    <dt>Thời trang đang mặc</dt>
                    <dd>{cosmeticDefinition(worn.outfit ?? '')?.name ?? 'Nguyên bản'}</dd>
                  </div>
                  <div>
                    <dt>Vũ khí ngoại trang</dt>
                    <dd>{cosmeticDefinition(worn.weapon ?? '')?.name ?? 'Không dùng'}</dd>
                  </div>
                </dl>
                {child && <p>Nhập môn để sử dụng ngoại trang.</p>}
                {!owned && (
                  <p className="appearance-locked">
                    Chưa sở hữu. Các mẫu này chưa mở bán bằng Tiên Ngọc; bạn có thể thử trước.
                  </p>
                )}
                {notice && (
                  <p className="appearance-notice" role="status">
                    {notice}
                  </p>
                )}
              </div>
              <div className="appearance-actions">
                <button
                  className="cult-btn gold"
                  data-action="wear-cosmetic"
                  disabled={child || !owned || equipped}
                  onClick={() => equip(product.id)}
                >
                  {equipped ? '✓ Đang mặc' : owned ? 'Mặc ngoại trang' : 'Chưa sở hữu'}
                </button>
                <button
                  className="cult-btn"
                  disabled={child}
                  onClick={() => {
                    tryAppearance(look);
                    setMenu(null);
                  }}
                >
                  Thử trong map · 30 giây
                </button>
                <button className="cult-btn" disabled={!worn[slot]} onClick={() => equip(null)}>
                  Tháo {slot === 'outfit' ? 'thời trang' : 'skin vũ khí'}
                </button>
              </div>
            </aside>
          </>
        )}
      </div>
      <footer className="appearance-footer">
        <span>Đang sử dụng</span>
        {(['outfit', 'weapon'] as const).map((s) => (
          <button key={s} onClick={() => chooseSlot(s)}>
            {worn[s] ? (
              <CosmeticArt kind="icon" id={worn[s]!} />
            ) : (
              <i>{s === 'outfit' ? '♜' : '⚔'}</i>
            )}
            <span>
              {cosmeticDefinition(worn[s] ?? '')?.name ??
                (s === 'outfit' ? 'Trang phục nguyên bản' : 'Không dùng skin kiếm')}
            </span>
          </button>
        ))}
        <button onClick={() => setMenu('premium')}>Shop Tiên Ngọc ›</button>
      </footer>
    </section>
  );
}
