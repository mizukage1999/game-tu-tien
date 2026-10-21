/**
 * Phaser's keyboard plugin captures game keys (W/A/S/D, arrows, SPACE...) and calls
 * preventDefault on them for the whole page. That stops the browser from inserting
 * those characters into a focused <input>, so a player renaming their character or
 * typing an account password sees nothing happen for exactly those letters.
 *
 * Game key handling must therefore stand down while an editable element has focus.
 */
export function isTypingTarget(target: EventTarget | null | undefined): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable === true;
}
