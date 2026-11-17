/** Prepared sheets: original idle/cast plus eight authored running poses per facing. */
export const HERO_SHEET_COLUMNS = 8;
export const HERO_IDLE_ROW = 0;
export const HERO_CAST_ROW = 1;
export const HERO_RUN_ROWS = [2, 3, 4, 5, 6, 7, 8, 9] as const;
export const HERO_SHEET_ROWS = 10;
export const HERO_RUN_RATE = 12;

export function heroSheetMetrics(child: boolean) {
  return child
    ? { cell: 128, foot: 118, bodyHeight: 76 }
    : { cell: 160, foot: 150, bodyHeight: 108 };
}

export function heroRunPhase(frameY: number, cell = 160) {
  const row = frameY / cell;
  return Number.isInteger(row) && row >= HERO_RUN_ROWS[0] && row < HERO_SHEET_ROWS
    ? row - HERO_RUN_ROWS[0]
    : -1;
}

export function isHeroCastingFrame(frameY: number, cell: number) {
  return frameY === HERO_CAST_ROW * cell;
}
