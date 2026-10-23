/**
 * Date & Time utilities following Section 10 & 11.4 of Awakened.md
 * - Stores timestamps as UTC epoch milliseconds + timezone offset in minutes
 * - Local day string format: 'YYYY-MM-DD'
 */

export function getLocalDayKey(epochMs: number = Date.now(), tzOffsetMin?: number): string {
  const date =
    tzOffsetMin !== undefined
      ? new Date(epochMs - tzOffsetMin * 60 * 1000)
      : new Date(epochMs);

  if (tzOffsetMin !== undefined) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentTzOffsetMin(): number {
  return new Date().getTimezoneOffset();
}

export function addDaysToDayKey(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

export function getWeekdayOneBased(dayKey: string): number {
  // Returns 1 (Monday) .. 7 (Sunday)
  const [y, m, d] = dayKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const jsDay = dt.getUTCDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

export function getWeekStartDayKey(dayKey: string, weekStartDay: number = 1): string {
  const currentWeekday = getWeekdayOneBased(dayKey);
  const diff = (currentWeekday - weekStartDay + 7) % 7;
  return addDaysToDayKey(dayKey, -diff);
}

export function getDaysInWeekRange(dayKey: string, weekStartDay: number = 1): string[] {
  const start = getWeekStartDayKey(dayKey, weekStartDay);
  return Array.from({ length: 7 }, (_, i) => addDaysToDayKey(start, i));
}

export function formatTimeHHMM(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatDurationMMSS(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
