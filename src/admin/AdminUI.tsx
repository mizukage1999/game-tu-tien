import { useEffect, useRef, type ReactNode } from 'react';
import { AdminIcon, type AdminIconName } from './AdminArt';
export const adminNumber = (v: number | undefined) =>
  v === undefined ? '—' : Number(v).toLocaleString('vi-VN');
export const adminTime = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';
export function AdminPanel({
  title,
  icon,
  action,
  children,
  className = '',
}: {
  title: string;
  icon: AdminIconName;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-panel ${className}`}>
      <header>
        <h2>
          <AdminIcon name={icon} />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
export function AdminLoadState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string;
  empty?: boolean;
}) {
  return loading ? (
    <p className="admin-empty" role="status">
      Đang tải dữ liệu…
    </p>
  ) : error ? (
    <p className="admin-error" role="alert">
      {error}
    </p>
  ) : empty ? (
    <p className="admin-empty">Chưa có dữ liệu phù hợp.</p>
  ) : null;
}
export function AdminPager({
  total,
  page,
  size,
  setPage,
  setSize,
  disabled = false,
}: {
  total: number;
  page: number;
  size: number;
  setPage: (n: number) => void;
  setSize?: (n: number) => void;
  disabled?: boolean;
}) {
  const last = Math.max(0, Math.ceil(total / size) - 1);
  return (
    <footer className="admin-pager">
      <span>
        {total
          ? `${page * size + 1}–${Math.min(total, (page + 1) * size)} / ${adminNumber(total)}`
          : '0 kết quả'}
      </span>
      <div>
        <button
          aria-label="Trang trước"
          disabled={disabled || page <= 0}
          onClick={() => setPage(page - 1)}
        >
          ‹
        </button>
        <span>
          {page + 1} / {last + 1}
        </span>
        <button
          aria-label="Trang sau"
          disabled={disabled || page >= last}
          onClick={() => setPage(page + 1)}
        >
          ›
        </button>
      </div>
      {setSize && (
        <select
          aria-label="Số dòng mỗi trang"
          value={size}
          onChange={(e) => {
            setPage(0);
            setSize(Number(e.target.value));
          }}
        >
          <option value={8}>8 / trang</option>
          <option value={20}>20 / trang</option>
          <option value={50}>50 / trang</option>
        </select>
      )}
    </footer>
  );
}
export function AdminDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button,input,select,textarea')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
      if (e.key !== 'Tab') return;
      const items = [
        ...(ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ) ?? []),
      ].filter((el) => !el.hidden);
      if (!items.length) {
        e.preventDefault();
        ref.current?.focus();
        return;
      }
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
        e.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="admin-dialog-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="admin-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header>
          <h2>{title}</h2>
          <button className="admin-button" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
