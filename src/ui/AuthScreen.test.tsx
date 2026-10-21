// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthScreen } from './AuthScreen';

declare global {
  // React 18 needs this flag for act() outside of a test renderer.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement | null = null;

function render() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<AuthScreen />));
  return host;
}

async function click(label: string) {
  const button = Array.from(host!.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(label),
  );
  if (!button) throw new Error(`Không tìm thấy nút "${label}"`);
  // Async handlers settle over several microtasks, so act has to wait a macrotask.
  await act(async () => {
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

describe('AuthScreen', () => {
  it('offers guest play, login and registration', () => {
    const el = render();
    expect(el.textContent).toContain('Chơi ngay');
    expect(el.textContent).toContain('Đăng nhập');
    expect(el.textContent).toContain('Đăng ký');
    expect(el.textContent).toContain('Vào thế giới');
  });

  it('shows a clear error when the build has no Supabase project', async () => {
    render();
    await click('Vào thế giới');
    expect(host!.textContent).toContain('chưa cấu hình Supabase');
  });

  it('switches the register form between username and email', async () => {
    render();
    await click('Đăng ký');
    expect(host!.textContent).toContain('Bằng username');
    expect(host!.querySelectorAll('input').length).toBe(2); // username + password, no email
    await click('Bằng email');
    expect(host!.querySelectorAll('input').length).toBe(3);
  });
});
