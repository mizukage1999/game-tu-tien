export type BootMode = 0 | 1 | 2;
export const BOOT_GUARD_KEY = 'tu-tien-boot-pending-v1';
export const CANVAS_RECOVERY_KEY = 'tu-tien-canvas-recovery-v1';
const RETRY_KEY = 'tu-tien-boot-retry-v1';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function beginGameBoot(storage: StorageAccess | undefined, now = Date.now()): BootMode {
  let mode: BootMode = 0;
  try {
    if (storage?.getItem(CANVAS_RECOVERY_KEY) === '1') mode = 2;
    else {
      const last = JSON.parse(storage?.getItem(BOOT_GUARD_KEY) ?? 'null');
      if (last && Number.isFinite(last.at) && now >= last.at && now - last.at < 300_000)
        mode = last.mode === 0 ? 1 : 2;
    }
    storage?.setItem(BOOT_GUARD_KEY, JSON.stringify({ at: now, mode }));
  } catch {
    /* Restricted browser storage must not prevent entry. */
  }
  return mode;
}
export function finishGameBoot(storage: StorageAccess | undefined) {
  try {
    storage?.removeItem(BOOT_GUARD_KEY);
  } catch {
    /* Storage is optional. */
  }
}
export function requestCanvasRecovery(storage: StorageAccess | undefined) {
  try {
    storage?.setItem(CANVAS_RECOVERY_KEY, '1');
    storage?.setItem(RETRY_KEY, '1');
  } catch {
    /* The reload remains available. */
  }
}
export function consumeBootRetry(storage: StorageAccess | undefined) {
  try {
    const retry = storage?.getItem(RETRY_KEY) === '1';
    storage?.removeItem(RETRY_KEY);
    return retry;
  } catch {
    return false;
  }
}
export function bootStorage(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}
