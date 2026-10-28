/** All daily activities reset at midnight in Vietnam, independent of device timezone. */
export function activityDay(at: number | Date = Date.now()): string {
  const ms = at instanceof Date ? at.getTime() : at;
  return new Date(ms + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function activityDayNumber(at = Date.now()): number {
  return Math.floor((at + 7 * 60 * 60 * 1000) / 86400000);
}
