import type { ResourceProgress } from '../game/art/startupCache';

type Action = 'continue' | 'retry';

/** The HTML shell paints before React/Phaser downloads, so even a cold boot has feedback. */
export function startupScreen() {
  const screen = document.getElementById('startup-splash');
  const root = document.getElementById('root');
  const status = screen?.querySelector<HTMLElement>('[data-startup-status]');
  const detail = screen?.querySelector<HTMLElement>('[data-startup-detail]');
  const meter = screen?.querySelector<HTMLElement>('[role="progressbar"]');
  const fill = screen?.querySelector<HTMLElement>('[data-startup-fill]');
  const value = screen?.querySelector<HTMLElement>('[data-startup-value]');
  const next = screen?.querySelector<HTMLButtonElement>('[data-startup-continue]');
  const retry = screen?.querySelector<HTMLButtonElement>('[data-startup-retry]');
  let action: ((action: Action) => void) | undefined;
  let pending: Action | undefined;
  let finished = false;
  const choose = (choice: Action) => {
    if (action) {
      const resolve = action;
      action = undefined;
      resolve(choice);
    } else pending = choice;
  };
  if (next) next.onclick = () => choose('continue');
  if (retry) retry.onclick = () => choose('retry');
  const finish = () => {
    if (finished) return;
    finished = true;
    root?.removeAttribute('inert');
    root?.removeAttribute('aria-hidden');
    screen?.remove();
    action = undefined;
  };
  return {
    phase(text: string) {
      if (status) status.textContent = text;
    },
    progress({ completed, total, failed }: ResourceProgress) {
      const ready = Math.max(0, completed - failed);
      if (meter) {
        meter.classList.remove('is-indeterminate');
        meter.setAttribute('aria-valuenow', String(ready));
        meter.setAttribute('aria-valuemax', String(total));
      }
      const percent = total ? Math.round((ready / total) * 100) : 100;
      if (fill) fill.style.width = `${percent}%`;
      if (value) value.textContent = `${percent}%`;
      if (detail)
        detail.textContent = `${ready} / ${total} tài nguyên sẵn sàng${failed ? ` · ${failed} cần tải lại` : ''}`;
    },
    allowContinue() {
      if (next) next.hidden = false;
    },
    renderer() {
      if (status) status.textContent = 'Đang chuẩn bị đồ họa và giao diện…';
      if (detail) detail.textContent = 'Đang đưa ảnh đã chuẩn bị vào bộ nhớ đồ họa.';
      meter?.classList.add('is-indeterminate');
      meter?.removeAttribute('aria-valuenow');
      if (fill) fill.style.width = '';
      if (value) value.textContent = '…';
      if (retry) retry.hidden = true;
      // The entry UI must exist before a player can bypass the GPU warmup.
      if (next)
        next.onclick = () => {
          if (root?.firstElementChild) finish();
        };
    },
    waitForAction(): Promise<Action> {
      if (pending) {
        const choice = pending;
        pending = undefined;
        return Promise.resolve(choice);
      }
      return new Promise((resolve) => {
        action = resolve;
      });
    },
    assetsFailed() {
      if (status)
        status.textContent =
          'Một số tài nguyên chưa tải được. Thử lại hoặc tiếp tục để game tải bổ sung.';
      if (retry) {
        retry.hidden = false;
        retry.onclick = () => choose('retry');
      }
    },
    fatal() {
      if (status) {
        status.textContent = 'Chưa khởi động được game. Kiểm tra kết nối rồi thử lại nhé.';
        status.setAttribute('role', 'alert');
      }
      if (next) next.hidden = true;
      if (retry) {
        retry.hidden = false;
        retry.onclick = () => location.reload();
      }
    },
    finish,
  };
}
