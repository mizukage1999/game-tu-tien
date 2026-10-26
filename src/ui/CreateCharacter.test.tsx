// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { CreateCharacter } from './CreateCharacter';
import { createCharacter } from '../store/gameStore';
import { claimCharacterName } from '../net/characterName';
vi.mock('../store/gameStore', () => ({ createCharacter: vi.fn() }));
vi.mock('../net/characterName', () => ({ claimCharacterName: vi.fn() }));
beforeEach(() => {
  vi.mocked(createCharacter).mockClear();
  vi.mocked(claimCharacterName)
    .mockReset()
    .mockImplementation(async (name) => name);
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it('selects a real school, reserves its name, and starts with that identity', async () => {
  const host = document.createElement('div'),
    root = createRoot(host),
    done = vi.fn();
  try {
    act(() => root.render(<CreateCharacter onDone={done} />));
    expect(host.querySelectorAll('.roster-grid>button')).toHaveLength(8);
    act(() => host.querySelector<HTMLButtonElement>('[data-hero="hong_lien"]')!.click());
    expect(host.querySelector('input')!.value).toBe('Hồng Liên');
    expect(host.querySelectorAll('.roster-spells button')).toHaveLength(10);
    expect(host.querySelector('.roster-spell-info')!.textContent).toContain('Hỏa Ma Chỉ');
    act(() => host.querySelectorAll<HTMLButtonElement>('.roster-spells button')[4].click());
    expect(host.querySelector('.roster-spell-info')!.textContent).toContain('Vạn Hỏa Triều Thiên');
    act(() => host.querySelectorAll<HTMLButtonElement>('.roster-spells button')[9].click());
    expect(host.querySelector('.roster-spell-info')!.textContent).toContain('Hỏa Thần');
    expect(host.querySelector('.roster-spell-info')!.textContent).toContain('Lv.40');
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(createCharacter).toHaveBeenCalledWith('Hồng Liên', 'female', 'hong_lien');
    expect(done).toHaveBeenCalledOnce();
  } finally {
    act(() => root.unmount());
  }
});

it('keeps a duplicate-name error in the creation form without entering the world', async () => {
  vi.mocked(claimCharacterName).mockRejectedValueOnce(
    new Error('Tên nhân vật này đã có người sử dụng.'),
  );
  const host = document.createElement('div'),
    root = createRoot(host),
    done = vi.fn();
  try {
    act(() => root.render(<CreateCharacter onDone={done} />));
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('đã có người sử dụng');
    expect(host.querySelector('input')!.value).toBe('Vương Lâm');
    expect(createCharacter).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
    expect(host.querySelector<HTMLButtonElement>('.roster-enter')!.disabled).toBe(false);
  } finally {
    act(() => root.unmount());
  }
});

it('waits for the server and suppresses repeated submits while holding the name', async () => {
  let release!: (name: string) => void;
  vi.mocked(claimCharacterName).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const host = document.createElement('div'),
    root = createRoot(host),
    done = vi.fn();
  try {
    act(() => root.render(<CreateCharacter onDone={done} />));
    act(() => {
      for (let i = 0; i < 2; i++)
        host
          .querySelector('form')!
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(claimCharacterName).toHaveBeenCalledTimes(1);
    expect(createCharacter).not.toHaveBeenCalled();
    expect(host.querySelector<HTMLButtonElement>('.roster-enter')!.disabled).toBe(true);
    await act(async () => {
      release('Vương Lâm');
    });
    expect(createCharacter).toHaveBeenCalledOnce();
    expect(done).toHaveBeenCalledOnce();
  } finally {
    act(() => root.unmount());
  }
});
