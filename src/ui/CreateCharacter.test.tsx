// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { CreateCharacter } from './CreateCharacter';
import { createCharacter } from '../store/gameStore';
vi.mock('../store/gameStore', () => ({ createCharacter: vi.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it('selects a real school, previews its own five spells and starts with that identity', () => {
  const host = document.createElement('div'),
    root = createRoot(host),
    done = vi.fn();
  try {
    act(() => root.render(<CreateCharacter onDone={done} />));
    expect(host.querySelectorAll('.roster-grid>button')).toHaveLength(8);
    act(() => host.querySelector<HTMLButtonElement>('[data-hero="hong_lien"]')!.click());
    expect(host.querySelector('input')!.value).toBe('Hồng Liên');
    expect(host.querySelectorAll('.roster-spells button')).toHaveLength(5);
    expect(host.querySelector('.roster-spell-info')!.textContent).toContain('Hỏa Ma Chỉ');
    act(() => host.querySelectorAll<HTMLButtonElement>('.roster-spells button')[4].click());
    expect(host.querySelector('.roster-spell-info')!.textContent).toContain('Vạn Hỏa Triều Thiên');
    act(() =>
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
    expect(createCharacter).toHaveBeenCalledWith('Hồng Liên', 'female', 'hong_lien');
    expect(done).toHaveBeenCalledOnce();
  } finally {
    act(() => root.unmount());
  }
});
