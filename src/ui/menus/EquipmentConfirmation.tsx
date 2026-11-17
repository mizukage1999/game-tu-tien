import { useEffect, useId, useRef } from 'react';
import { ITEMS } from '../../data';
import { itemIconUrl } from '../../game/art/icons';
import {
  ENHANCEMENT_STONE,
  MAX_ENHANCEMENT,
  enhanceChance,
  enhanceCost,
  enhancementLevel,
} from '../../game/systems/enhancement';
import { gameStore, itemName, useGame } from '../../store/gameStore';
import './equipment-confirmation.css';

export type EquipmentRequest = { kind: 'enhance' | 'salvage'; id: string; level: number };

export function EquipmentConfirmation({
  request,
  onClose,
  onResult,
}: {
  request: EquipmentRequest;
  onClose: () => void;
  onResult: (message: string) => void;
}) {
  const p = useGame((s) => s.player),
    status = useGame((s) => s.status),
    tribulation = useGame((s) => s.tribulation);
  const title = useId(),
    description = useId(),
    panel = useRef<HTMLElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    committed = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;
  const { id, level, kind } = request,
    def = ITEMS[id],
    enhancing = kind === 'enhance';
  const cost = enhanceCost(level)[ENHANCEMENT_STONE] ?? 0;
  const worn = Object.values(p.equipment).includes(id),
    inBag = (p.inventory[id] ?? 0) > 0;
  const changed = enhancementLevel(p.adventure?.enhancements[id]) !== level || (!worn && !inBag);
  const unavailable =
    changed ||
    status !== 'alive' ||
    !!tribulation ||
    !def?.slot ||
    (enhancing
      ? level >= MAX_ENHANCEMENT || (p.inventory[ENHANCEMENT_STONE] ?? 0) < cost
      : worn || !inBag || def.slot === 'weapon');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close.current();
      } else if (e.key === 'Tab') {
        const buttons = [
          ...(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
        ];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        e.preventDefault();
        buttons[next]?.focus();
      }
    };
    const focus = (e: FocusEvent) => {
      if (e.target instanceof Node && !panel.current?.contains(e.target)) cancel.current?.focus();
    };
    document.addEventListener('keydown', key, true);
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('focusin', focus);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  const confirm = () => {
    if (committed.current || unavailable) return;
    // Recheck the exact physical item and quoted level at the moment of approval.
    const s = gameStore.getState(),
      currentLevel = enhancementLevel(s.player.adventure?.enhancements[id]);
    const currentWorn = Object.values(s.player.equipment).includes(id),
      currentBag = (s.player.inventory[id] ?? 0) > 0;
    if (
      currentLevel !== level ||
      (!currentWorn && !currentBag) ||
      s.status !== 'alive' ||
      s.tribulation ||
      (enhancing ? (s.player.inventory[ENHANCEMENT_STONE] ?? 0) < cost : currentWorn || !currentBag)
    )
      return;
    committed.current = true;
    if (enhancing) {
      s.adventureAction({ type: 'enhance', id });
      const next = enhancementLevel(gameStore.getState().player.adventure?.enhancements[id]);
      onResult(
        next > level
          ? `Cường hóa thành công lên +${next}.`
          : `Cường hóa thất bại. Trang bị giữ +${level}; đã tiêu hao ${cost} Đá Cường Hóa.`,
      );
    } else {
      s.salvageLegacy(id);
      onResult('Đã phân giải thành 2 Huyền Thiết.');
    }
    onClose();
  };

  return (
    <div
      className="equipment-confirm-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        className="equipment-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title}
        aria-describedby={description}
      >
        <h2 id={title}>{enhancing ? 'Xác nhận cường hóa' : 'Xác nhận phân giải'}</h2>
        <div className="equipment-confirm-item">
          <img src={itemIconUrl(id, 192)} alt="" />
          <div>
            <b>{itemName(id)}</b>
            <span>
              +{level}
              {enhancing ? ` → +${level + 1}` : ' · 1 món'}
            </span>
          </div>
        </div>
        <div id={description}>
          {enhancing ? (
            <>
              <p>
                Tiêu hao: <strong>{cost} Đá Cường Hóa</strong>
              </p>
              <p>
                Tỷ lệ thành công: <strong>{Math.round(enhanceChance(level) * 100)}%</strong>
              </p>
              <p className="equipment-confirm-warning">
                Thất bại vẫn mất đá, trang bị giữ +{level}. Đá đã dùng không được hoàn lại.
              </p>
            </>
          ) : (
            <>
              <p>
                Nhận lại: <strong>2 Huyền Thiết</strong>
              </p>
              <p className="equipment-confirm-warning">
                Vật phẩm và cấp cường hóa +{level} của món này sẽ bị xóa vĩnh viễn. Không thể khôi
                phục.
              </p>
            </>
          )}
        </div>
        {unavailable && (
          <p className="equipment-confirm-warning" role="status">
            Vật phẩm hoặc tài nguyên đã thay đổi, hoặc nhân vật đang bận. Hãy hủy và chọn lại.
          </p>
        )}
        <footer>
          <button
            ref={cancel}
            className="cult-btn"
            data-action="cancel-equipment"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className={`cult-btn ${enhancing ? 'gold' : 'equipment-confirm-danger'}`}
            data-action="confirm-equipment"
            disabled={unavailable}
            onClick={confirm}
          >
            {enhancing ? 'Đồng ý cường hóa' : 'Đồng ý phân giải'}
          </button>
        </footer>
      </section>
    </div>
  );
}
