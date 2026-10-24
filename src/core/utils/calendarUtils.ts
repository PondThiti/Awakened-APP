/**
 * Calendar helpers – everything is derived from the phone's local clock (`new Date()`),
 * so month / year / "today" always follow the device date & timezone.
 */

export const MONTH_NAMES_TH = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const MONTH_NAMES_TH_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_NAMES_EN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Weekday labels ordered Monday..Sunday (ISO weekday 1..7). */
export const WEEKDAY_LABELS_TH = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
export const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function toDayKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** ISO weekday (1 = Monday .. 7 = Sunday) of the 1st day of the month. */
export function getFirstWeekdayOfMonth(year: number, monthIndex: number): number {
  const jsDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(); // 0 = Sun
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Builds a classic month grid: an array of weeks (7 cells each).
 * Cells outside the month are `null`. `weekStartDay` is the ISO weekday the week starts on
 * (1 = Monday ... 7 = Sunday).
 */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
  weekStartDay: number = 1
): (string | null)[][] {
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const firstWeekday = getFirstWeekdayOfMonth(year, monthIndex);
  const leading = (firstWeekday - weekStartDay + 7) % 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toDayKey(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Weekday header labels starting from `weekStartDay`. */
export function getWeekdayHeaders(weekStartDay: number, isTh: boolean): string[] {
  const labels = isTh ? WEEKDAY_LABELS_TH : WEEKDAY_LABELS_EN;
  return Array.from({ length: 7 }, (_, i) => labels[(weekStartDay - 1 + i) % 7]);
}

/** Month name for a UI language. */
export function getMonthName(monthIndex: number, isTh: boolean, short = false): string {
  if (isTh) return (short ? MONTH_NAMES_TH_SHORT : MONTH_NAMES_TH)[monthIndex];
  return (short ? MONTH_NAMES_EN_SHORT : MONTH_NAMES_EN)[monthIndex];
}

/** Thai users read years as Buddhist Era (พ.ศ. = ค.ศ. + 543). */
export function formatCalendarYear(year: number, isTh: boolean): string {
  return isTh ? String(year + 543) : String(year);
}

/** Moves (year, monthIndex) by `delta` months, wrapping across years. */
export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number
): { year: number; monthIndex: number } {
  const total = year * 12 + monthIndex + delta;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
}

export function parseDayKey(dayKey: string): { year: number; monthIndex: number; day: number } {
  const [y, m, d] = dayKey.split('-').map(Number);
  return { year: y, monthIndex: m - 1, day: d };
}
