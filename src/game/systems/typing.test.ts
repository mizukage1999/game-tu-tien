import { describe, expect, it } from 'vitest';
import { isTypingTarget } from './typing';

const el = (tagName: string, extra: Record<string, unknown> = {}) =>
  ({ tagName, ...extra }) as unknown as HTMLElement;

describe('isTypingTarget', () => {
  it('treats text fields as typing targets', () => {
    expect(isTypingTarget(el('INPUT'))).toBe(true);
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
    expect(isTypingTarget(el('SELECT'))).toBe(true);
  });

  it('ignores tag name casing', () => {
    expect(isTypingTarget(el('input'))).toBe(true);
  });

  it('treats contenteditable elements as typing targets', () => {
    expect(isTypingTarget(el('DIV', { isContentEditable: true }))).toBe(true);
  });

  it('lets the game keep keys everywhere else', () => {
    expect(isTypingTarget(el('BODY'))).toBe(false);
    expect(isTypingTarget(el('CANVAS'))).toBe(false);
    expect(isTypingTarget(el('BUTTON'))).toBe(false);
    expect(isTypingTarget(el('DIV'))).toBe(false);
  });

  it('survives missing targets', () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(undefined)).toBe(false);
    // window has no tagName
    expect(isTypingTarget({} as EventTarget)).toBe(false);
  });
});
