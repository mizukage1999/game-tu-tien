import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { gameStore, useGame } from '../store/gameStore';
import type { PkMode } from '../net/worldProtocol';
import './pk-mode.css';

export const PK_MODES = [
  { id: 'peace', label: 'Hòa bình', hint: 'Không chủ động PK' },
  { id: 'sect', label: 'Tông môn', hint: 'PK người khác tông môn' },
  { id: 'all', label: 'Toàn bộ', hint: 'PK mọi người, cả đồng môn' },
] as const;
export function CrossedSwords() {
  return (
    <svg className="pk-swords" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m3 2 5 2 10 12-2 2L4 8 3 2Zm18 0-5 2L6 16l2 2L20 8l1-6Z"
        fill="currentColor"
        fillOpacity=".28"
      />
      <path
        d="m3 2 5 2 10 12-2 2L4 8 3 2Zm18 0-5 2L6 16l2 2L20 8l1-6ZM13 19l6-6M5 13l6 6M17 18l3 3M7 18l-3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function PkModeDropdown() {
  const mode = useGame((s) => s.player.pkMode ?? 'peace');
  const [open, setOpen] = useState(false),
    root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const selected = PK_MODES.find((m) => m.id === mode) ?? PK_MODES[0];
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const choose = (value: PkMode) => {
    gameStore.setState((s) => ({ player: { ...s.player, pkMode: value } }));
    setOpen(false);
    trigger.current?.focus();
  };
  const focus = (index: number) =>
    requestAnimationFrame(() =>
      root.current?.querySelectorAll<HTMLButtonElement>('[role=option]')[index]?.focus(),
    );
  const keyboard = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const options = [...root.current!.querySelectorAll('[role=option]')],
      at = options.indexOf(document.activeElement!);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? 2
          : at < 0
            ? PK_MODES.findIndex((m) => m.id === mode)
            : (at + (e.key === 'ArrowDown' ? 1 : 2)) % 3;
    setOpen(true);
    focus(next);
  };
  return (
    <div className="pk-dropdown" data-mode={mode} ref={root} onKeyDown={keyboard}>
      <button
        ref={trigger}
        className="pk-mode-trigger"
        aria-label={`Chế độ PK: ${selected.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selected.hint}
        onClick={() => setOpen((v) => !v)}
      >
        <CrossedSwords />
        <span>{selected.label}</span>
        <svg className="pk-chevron" viewBox="0 0 12 8" aria-hidden="true">
          <path d="m2 2 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="pk-mode-list" role="listbox" aria-label="Chọn chế độ PK">
          {PK_MODES.map((m) => (
            <button
              role="option"
              aria-selected={mode === m.id}
              data-mode={m.id}
              key={m.id}
              onClick={() => choose(m.id)}
            >
              <CrossedSwords />
              <span>
                <b>{m.label}</b>
                <small>{m.hint}</small>
              </span>
              <i aria-hidden="true">{mode === m.id ? '✓' : ''}</i>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
